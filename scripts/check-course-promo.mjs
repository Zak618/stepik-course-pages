import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
const {fields,frameHeight}=await import('data:text/javascript;base64,'+Buffer.from(await readFile('assets/go-mini-course-info.js','utf8')).toString('base64'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const origin=process.env.STEPIK_COURSE_PROMO_URL||'http://localhost:8788',published=process.argv.includes('--published');
const screenshots=await mkdtemp(path.join(tmpdir(),'go-course-promo-')),errors=[],measures=[];
let checks=0;const ok=(v,label)=>{checks++;assert.ok(v,label);};
const page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true});page.on('pageerror',e=>errors.push(e.message));
try{
 ok(fields.summary.length>100&&fields.summary.length<512,'Summary length');
 for(const key of ['acquired_skills','acquired_assets'])ok(fields[key].join('\n').length<=2000&&fields[key].every(s=>s.trim()),key);
 for(const width of [320,390,640,1024,1360]){
  await page.setViewportSize({width,height:frameHeight});await page.goto(origin+'/go-mini-course-promo.html');await page.waitForSelector('.folder');
  const geometry=async state=>{const m=await page.evaluate(()=>({height:document.querySelector('main').getBoundingClientRect().bottom,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}));ok(m.x<=1&&m.y<=1,'No overflow '+JSON.stringify({width,state,...m}));ok(frameHeight-m.height>=0&&frameHeight-m.height<=65,'Compact height');measures.push({width,state,...m});};
  await geometry('initial');
  for(const [query,count] of [['Go',2],['Циклы',1],['go',0],['нет такого',0],['   ',0],['  Go  ',2],['<img src=x onerror=alert(1)>',0],['🦒',0]]){
   await page.locator('#query').fill(query);await page.locator('#query').press('Enter');ok(await page.locator('.is-match').count()===count,'Matches '+query);await geometry(query);ok(await page.locator('img').count()===0,'Safe text');
  }
  await page.locator('#query').fill('Go');await page.locator('button').click();await page.screenshot({path:path.join(screenshots,'demo-'+width+'.png'),fullPage:true});
  const text=published?JSON.parse(await readFile('.local-publication/course-info-verified.json','utf8')).fields.description:fields.description;
  await page.goto(origin+'/promo');await page.setContent('<!doctype html><html lang="ru"><body style="margin:0;font-family:Arial,sans-serif;font-size:20px;line-height:1.7">'+text.replaceAll('https://zak618.github.io/stepik-course-pages/',origin+'/')+'</body></html>');
  const iframe=page.frames().find(f=>f.parentFrame());assert.ok(iframe);await iframe.waitForSelector('.folder');await iframe.locator('button').click();ok(await iframe.locator('.is-match').count()===2,'Saved wrapper works');ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Native text width');await page.screenshot({path:path.join(screenshots,'description-'+width+'.png'),fullPage:true});
 }
 await page.goto(origin+'/go-mini-course-promo.html');await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('button').click();ok(await page.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')),'Animation runs');await page.waitForTimeout(900);ok(await page.evaluate(()=>document.getAnimations().every(a=>a.playState!=='running')),'Finite motion');
 if(origin.startsWith('http://localhost:')){ok((await page.request.get(origin+'/.env.stepik')).status()===404,'No credentials served');ok((await page.request.post(origin+'/promo')).status()===405,'Read only preview');}
 ok(!errors.length,errors.join('\n'));console.log(JSON.stringify({checks,mode:published?'saved Stepik HTML':'local',heights:[Math.min(...measures.map(m=>m.height)),Math.max(...measures.map(m=>m.height))],screenshots,errors},null,2));
}finally{await browser.close();}
