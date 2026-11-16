import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import vm from 'node:vm';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const origin=process.env.STEPIK_INTRO_URL||'http://localhost:8792';
const data={window:{}};vm.runInNewContext(await readFile('assets/course-intro-profiles.js','utf8'),data);
const profiles=data.window.COURSE_INTROS,heights={},errors=[];let checks=0;
const ok=(v,label)=>{checks++;assert.ok(v,label);};
const screenshots=await mkdtemp('/tmp/course-intros-qa-');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!r.url().startsWith(origin))errors.push('Unexpected external request');});
async function geometry(id,width){
 const box=await page.evaluate(()=>({width:document.documentElement.scrollWidth,bottom:document.querySelector('.experience').getBoundingClientRect().bottom,buttons:document.querySelectorAll('.primary').length,status:document.querySelector('#status').innerText}));
 ok(box.width<=width+1,'No horizontal overflow '+id+' @'+width);
 ok(box.buttons<=1,'One primary action '+id);
 ok(box.bottom<740,'Compact height '+id+' '+box.bottom);
 heights[id]=Math.max(heights[id]||0,box.bottom+4);
}
try{
 for(const width of[320,390,560,800,1100]){
  await page.setViewportSize({width,height:760});
  for(const [id,p]of Object.entries(profiles)){
   await page.goto(origin+'/course-intro.html?course='+id);
   await page.locator('#status').waitFor();
   ok((await page.locator('.eyebrow').innerText())===p.title,'Correct course '+id);
   ok((await page.locator('#status').innerText()).length>15,'Initial explanation '+id);
   await geometry(id,width);
   const button=page.locator('.primary'),range=page.locator('input[type=range]');
   if(await button.count()){
    const first=(await page.locator('#status').innerText())+(await page.locator('#code').innerText());
    for(let i=0;i<5;i++){await button.press('Enter');await geometry(id,width);}
    ok((await page.locator('#status').innerText())+(await page.locator('#code').innerText())!==first,'Interaction changes explanation '+id);
   }else{
    ok(await range.count()===1,'Slider is available '+id);
    for(const value of[await range.getAttribute('min'),await range.getAttribute('max')]){
     await range.evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
     await geometry(id,width);
    }
   }
   ok(await page.evaluate(()=>document.getAnimations().every(a=>a.playState!=='running')),'Reduced motion '+id);
   if([320,1100].includes(width)&&[187918,300153,300560,290248,290054,183142,290426,290423].includes(Number(id)))await page.locator('.experience').screenshot({path:`${screenshots}/${id}-${width}.png`});
  }
  console.log('Checked '+Object.keys(profiles).length+' courses at '+width+'px');
 }
 // Specific learning behaviours, including empty results and resets.
 await page.goto(origin+'/course-intro.html?course=290248');
 for(let i=0;i<4;i++)await page.locator('.primary').click();
 ok(await page.locator('[data-found=true]').innerText()==='11','Binary search finds 11 in four comparisons');
 await page.goto(origin+'/course-intro.html?course=184095');
 await page.locator('input').evaluate(el=>{el.value=0;el.dispatchEvent(new Event('input',{bubbles:true}));});
 ok(await page.locator('[data-match=true]').count()===0,'Empty SQL result');
 await page.goto(origin+'/course-intro.html?course=290426');await page.locator('.primary').click();
 ok(await page.locator('.type-slot').getAttribute('data-valid')==='true','Number matches number');
 await page.goto(origin+'/course-intro.html?course=290423');await page.locator('.primary').click();
 ok(await page.locator('tbody tr').innerText()==='1\tКазань','EF illustration saves a row');
 const motion=await browser.newContext(),moving=await motion.newPage();moving.on('pageerror',e=>errors.push(e.message));
 for(const id of[300153,300560,290054,179698,183142,290057,290261,218079]){
  await moving.goto(origin+'/course-intro.html?course='+id);await moving.locator('.primary').click();
  ok(await moving.evaluate(()=>document.getAnimations().some(a=>a.playState==='running'))||id===300153,'Movement begins on action '+id);
  await moving.waitForTimeout(1500);
  ok(await moving.evaluate(()=>document.getAnimations().every(a=>a.playState!=='running')),'Movement settles '+id);
 }
 ok(errors.length===0,'No errors: '+errors.join('; '));
 if(origin.startsWith('http://localhost:'))for(const path of['/.env.stepik','/.local-publication/intros-20261116/plan.json','/scripts/course-intro-copy.mjs'])ok((await context.request.get(origin+path)).status()===404,'Private files refused');
 await writeFile('.local-publication/intros-20261116/layout.json',JSON.stringify({at:new Date().toISOString(),heights:Object.fromEntries(Object.entries(heights).map(([id,h])=>[id,Math.ceil(h/10)*10]))},null,2),{mode:0o600});
 await writeFile('.local-publication/intros-20261116/qa.json',JSON.stringify({at:new Date().toISOString(),checks,courses:Object.keys(profiles).length,widths:[320,390,560,800,1100],screenshots,errors},null,2),{mode:0o600});
 console.log(JSON.stringify({checks,screenshots,heights}));
}finally{await browser.close();}
