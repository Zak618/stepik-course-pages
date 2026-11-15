// Check the actual iframe reservation, not just the standalone scene page.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {origin,browserOptions,frameSteps,exercise,geometry} from './lib/slices-browser.mjs';
const plan=JSON.parse(await readFile('.local-publication/slices.json','utf8'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true});
const errors=[],measurements=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const width of[390,640,1024]){
  await page.setViewportSize({width,height:1200});
  for(const n of frameSteps){
   const article=plan.articles[n-1].block.text.replaceAll('https://zak618.github.io/stepik-course-pages',origin);
   await page.setContent('<style>body{margin:0;font-family:Arial,sans-serif}iframe{border:0}h1,h2,h3,p{overflow-wrap:anywhere}</style><main>'+article+'</main>');
   const frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForSelector('.world');
   const measure=async state=>{
    const m=await frame.evaluate(geometry),gap=await page.evaluate(sceneBottom=>{const f=document.querySelector('iframe'),after=f.parentElement.nextElementSibling;return after.getBoundingClientRect().top-f.getBoundingClientRect().top-sceneBottom;},m.sceneBottom);
    assert.ok(m.y<=1&&m.x<=1,`Frame overflow ${n}/${width}/${state}`);
    assert.ok(gap>=-1,`Scene clipped ${n}/${width}/${state}`);
    if(n===1||n===3)assert.ok(gap<=64,`Large gap ${n}/${width}/${state}: ${gap}`);
    measurements.push({step:n,width,state,gap:Math.ceil(gap)});
   };
   await measure('initial');await exercise(frame,n,measure);
   if(width===1024&&[1,3].includes(n)){
    await frame.goto(frame.url());await frame.waitForSelector('.world');
    await page.locator('iframe').scrollIntoViewIfNeeded();
    await page.screenshot({path:`/tmp/slices-native-compact-${n}.png`,fullPage:true});
   }
  }
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({states:measurements.length,reportedScenesMaxGap:Math.max(...measurements.filter(m=>[1,3].includes(m.step)).map(m=>m.gap)),initialMaxGap:Math.max(...measurements.filter(m=>m.state==='initial').map(m=>m.gap)),errors},null,2));
}finally{await browser.close();}
