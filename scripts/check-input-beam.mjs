// Regression for the actual path, not just document dimensions.
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {origin,browserOptions} from './lib/input-browser.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch(browserOptions),page=await browser.newPage({bypassCSP:true,reducedMotion:'no-preference'});
const screenshots=await mkdtemp('/tmp/input-beam-'),errors=[];page.on('pageerror',e=>errors.push(e.message));let checks=0,maxDistance=0;
try{
 for(const width of [320,640,1024]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/courses/305666-go-mini/modules/03-go-basics/lesson-03-step-01.html?panel=scene&r=beam-3');await page.waitForSelector('#sky-send');await page.fill('#sky-input','функции');await page.click('#sky-send');
  await page.evaluate(()=>{window.beamAnimation=document.querySelector('#sky-message').getAnimations()[0];window.beamAnimation.pause();});
  for(const fraction of [0,.125,.25,.375,.5,.625,.75,.875,.9999]){
   await page.evaluate(fraction=>{window.beamAnimation.currentTime=1700*fraction;},fraction);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
   const m=await page.evaluate(()=>{
    const line=document.querySelector('#sky-beam'),length=line.getTotalLength(),from=line.getPointAtLength(0),to=line.getPointAtLength(length),message=document.querySelector('#sky-message'),receiver=document.querySelector('#sky-receiver');
    const center=new DOMPoint(0,0).matrixTransform(message.getScreenCTM()).matrixTransform(line.getScreenCTM().inverse());
    const dx=to.x-from.x,dy=to.y-from.y,projection=((center.x-from.x)*dx+(center.y-from.y)*dy)/(length*length);
    return {distance:Math.abs((center.x-from.x)*dy-(center.y-from.y)*dx)/length,projection,targetDistance:Math.hypot(to.x-receiver.cx.baseVal.value,to.y-receiver.cy.baseVal.value),x:document.documentElement.scrollWidth-innerWidth};
   });
   assert.ok(m.distance<.1,`Message off the path: ${width}/${fraction}: ${JSON.stringify(m)}`);assert.ok(m.projection>=-.001&&m.projection<=1.001);assert.equal(m.targetDistance,0);assert.ok(m.x<=0);checks+=4;maxDistance=Math.max(maxDistance,m.distance);
   if(fraction===.5)await page.locator('.world').screenshot({path:`${screenshots}/midpoint-${width}.png`});
  }
  await page.evaluate(()=>window.beamAnimation.finish());await page.waitForFunction(()=>!document.querySelector('#sky-send').disabled);
  assert.equal(await page.locator('#sky-query').textContent(),'"функции"');checks++;
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.fill('#sky-input','Go 👋');await page.click('#sky-send');await page.waitForFunction(()=>!document.querySelector('#sky-send').disabled);assert.equal(await page.locator('#sky-query').textContent(),'"Go 👋"');checks++;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,maxDistance,errors,screenshots},null,2));
}finally{await browser.close();}
