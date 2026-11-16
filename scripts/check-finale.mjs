import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const origin=process.env.STEPIK_FINALE_URL||'http://localhost:8787';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce',bypassCSP:true}),page=await context.newPage();
const screenshots=await mkdtemp(path.join(os.tmpdir(),'go-finale-qa-')),errors=[];let checks=0;
const ok=(value,label)=>{checks++;assert.ok(value,label);};
const observe=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith(origin))errors.push('External request: '+r.url());});};observe(page);
try{
  ok(!/AudioContext|applause|take-bow|Поклониться|Со звуком/.test(await readFile('assets/go-mini-finale.js','utf8')),'No audio, applause or bow code');
  for(const width of[320,390,640,1024,1360]){
    await page.setViewportSize({width,height:950});await page.goto(origin+'/finale');
    ok(await page.locator('h1').innerText()==='Вы это сделали.','Opening title');
    ok(await page.locator('.finale-page button,.finale-page input,audio').count()===0,'No stage controls or audio');
    ok(await page.locator('.hand').count()===0,'No clapping hands');
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Theatre width '+width);
    await page.locator('#finale-next').waitFor({state:'visible'});
    ok(await page.locator('.encore-message').getAttribute('aria-hidden')==='false','Hint is accessible');
    ok(Number(await page.locator('.stage-dimmer').evaluate(el=>getComputedStyle(el).opacity))>=.8,'Lights dim');
    ok(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)===0,'Reduced motion');
    await page.locator('.theatre').screenshot({path:path.join(screenshots,'closed-'+width+'.png')});
    await page.locator('#finale-next').press('Enter');await page.waitForSelector('.pro-title');await page.waitForFunction(()=>document.querySelector('.city-status').textContent.includes('Доставлено'));
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Pro width '+width);
    ok(await page.locator('.primary-link').getAttribute('href')==='https://stepik.org/course/300562/promo','Verified course link');
    ok((await page.locator('.paid-note').innerText()).includes('платный'),'Paid course identified');
    ok((await page.locator('.team-signature').innerText())==='Команда WEB HACKER','Team sign-off');
    await page.locator('.city-replay').click();await page.waitForFunction(()=>!document.querySelector('.city-replay').disabled);
    const courier=await page.locator('.delivery-courier').evaluate(el=>{const t=el.transform.baseVal.consolidate().matrix,p=document.querySelector('#delivery-path'),end=p.getPointAtLength(p.getTotalLength());return Math.hypot(t.e-end.x,t.f-end.y);});
    ok(courier<1,'Courier ends on the road');await page.screenshot({path:path.join(screenshots,'pro-'+width+'.png'),fullPage:true});
  }
  for(const url of['/curtain','/next','/courses/305666-go-mini/modules/06-project/lesson-01-step-13.html','/courses/305666-go-mini/modules/06-project/lesson-02-step-01.html']){const r=await page.goto(origin+url);ok(r.status()===200,'Standalone '+url);}
  ok((await context.request.get(origin+'/.env.stepik')).status()===404,'Credentials refused');
  ok((await context.request.get(origin+'/assets/go-mini-project.js')).status()===404,'Other files refused');
  ok((await context.request.post(origin+'/finale')).status()===405,'Read-only server');
  const live=await browser.newContext({viewport:{width:1024,height:850},bypassCSP:true}),p=await live.newPage();observe(p);
  await p.addInitScript(()=>{window.audioCalls=0;window.AudioContext=function(){window.audioCalls++;throw Error('Audio should never start');};});
  await p.goto(origin+'/finale');await p.waitForTimeout(2300);
  ok(await p.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')),'Theatre starts itself');
  const dim=await p.locator('.stage-dimmer').evaluate(el=>Number(getComputedStyle(el).opacity));
  await p.screenshot({path:path.join(screenshots,'closing.png'),fullPage:true});
  await p.waitForTimeout(1400);ok(await p.locator('.stage-dimmer').evaluate(el=>Number(getComputedStyle(el).opacity))>dim,'Dimming is gradual');
  await p.locator('#finale-next').waitFor({state:'visible'});
  ok(await p.locator('.encore-message').evaluate(el=>Number(getComputedStyle(el).opacity))>.99,'Closing message readable');
  ok(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)===0,'Theatre settles');
  const seam=await p.evaluate(()=>{const a=document.querySelector('.curtain-left').getBoundingClientRect(),b=document.querySelector('.curtain-right').getBoundingClientRect();return a.right-b.left;});ok(seam>=0,'Curtains meet without gap');
  ok(await p.evaluate(()=>window.audioCalls)===0,'Silent throughout');await p.screenshot({path:path.join(screenshots,'closed-live.png'),fullPage:true});
  await p.locator('#finale-next').click();await p.waitForFunction(()=>document.querySelector('.city-status')?.textContent.includes('Доставлено'));ok(true,'Live city animation finishes');
  await p.locator('.city-replay').click();await p.waitForTimeout(200);await p.locator('.preview-bar a').first().click();await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#finale-next').waitFor({state:'visible'});ok(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)===0,'Navigation cancels city and motion preference settles theatre');
  await live.close();ok(errors.length===0,errors.join('\n'));console.log(JSON.stringify({checks,errors,screenshots},null,2));
}finally{await browser.close();}
