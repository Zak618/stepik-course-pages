// Measures the exact generated files that will be embedded in Stepik.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const origin=process.env.STEPIK_UNIFIED_URL||'http://localhost:8795';
const directory='.local-publication/unified-intros-preview-20261116';
const build=JSON.parse(await readFile(directory+'/build.json','utf8'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce'});
const screenshots=await mkdtemp(path.join(tmpdir(),'unified-intros-check-'));
const errors=[],measurements=[],heights={};
const unique=new Map();
for(const update of build.updates)for(const match of update.text.matchAll(/HEIGHT_(\w+)/g)){
  const part=match[1],course=build.courses.find(c=>c.id===update.course);
  const key=['telegram','map'].includes(part)?part:part==='rules'?(course.id===290059?'rules-language':'rules'):course.id+':'+part;
  unique.set(key,{course,part});
}
const jobs=[...unique.values()].flatMap(item=>(item.part==='welcome'||item.part==='start'?[280,390,1100]:[320,1100]).map(width=>({...item,width})));
let index=0;
try{
  await Promise.all(Array.from({length:4},async()=>{
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    while(index<jobs.length){
      const {course,part,width}=jobs[index++];
      const fixed={welcome:700,telegram:620,map:860,start:680};
      await page.setViewportSize({width,height:fixed[part]||900});
      await page.goto(origin+'/'+course.pages[part]+'?embed=1',{waitUntil:'load'});
      await page.locator('main').waitFor();
      if(part==='map')await page.locator('.map-node').first().waitFor();
      const target=part==='welcome'?'.intro':part==='telegram'?'.content':part==='start'?'.launch-content':'main';
      let height=await page.locator(target).evaluate(el=>Math.ceil(el.getBoundingClientRect().height));
      if(part==='rules')for(let n=0;n<await page.locator('.rule summary').count();n++){
        await page.locator('.rule summary').nth(n).click();
        height=Math.max(height,await page.locator('main').evaluate(el=>Math.ceil(el.getBoundingClientRect().height)));
      }
      const minimum={welcome:600,telegram:540,map:860,start:520};
      height=part==='map'?860:Math.max(minimum[part]||0,height+(['welcome','telegram','start'].includes(part)?60:14));
      const x=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(x<=1,JSON.stringify({course:course.id,part,width,x}));
      if(part==='welcome'){
        assert.ok((await page.locator('.course-name').innerText()).replace(/\s+/g,' ').includes(course.title));
        assert.equal(await page.locator('.byline').innerText(),'На связи команда WEB HACKER');
      }
      if(part==='start')assert.ok((await page.locator('#continue-link').getAttribute('href')).includes('stepik.org/'));
      const key=course.id+':'+part;heights[key]=Math.max(heights[key]||0,height);measurements.push({course:course.id,part,width,height});
      if(width===390&&[135466,300153,290423].includes(course.id))await page.screenshot({path:path.join(screenshots,course.id+'-'+part+'.png'),fullPage:true});
    }
    await page.close();
  }));
  const common={};for(const m of measurements)if(['telegram','rules','map'].includes(m.part))common[m.part]=Math.max(common[m.part]||0,m.height);
  for(const course of build.courses)for(const [part,height]of Object.entries(common))heights[course.id+':'+part]=height;
  for(const update of build.updates)for(const match of update.text.matchAll(/HEIGHT_(\w+)/g))assert.ok(heights[update.course+':'+match[1]]);
  // Keep source formatting and the original next-lesson links; only resolve measured heights.
  const updates=build.updates.map(u=>({...u,text:u.text.replace(/HEIGHT_(\w+)/g,(_,part)=>heights[u.course+':'+part])}));
  assert.deepEqual(errors,[]);
  await writeFile(directory+'/layout.json',JSON.stringify({version:build.version,measurements,heights,updates,screenshots,errors},null,2),{mode:0o600});
  console.log(JSON.stringify({pagesChecked:measurements.length,updates:updates.length,screenshots,errors}));
}finally{await browser.close();}
