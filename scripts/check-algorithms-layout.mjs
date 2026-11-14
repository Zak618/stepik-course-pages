import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {origin,browserOptions,exercise} from './lib/algorithms-browser.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const published=process.argv.includes('--published');
const input=JSON.parse(await readFile(published?'.local-publication/algorithms-verified.json':'.local-publication/algorithms.json','utf8')),articles=published?input.sources:input.articles;
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce'}),screenshots=await mkdtemp('/tmp/stepik-algorithms-native-');
const errors=[],records=[];page.on('pageerror',e=>errors.push(e.message));
try{
  for(const width of [320,390,420,640,768,1024])for(const article of articles){
    const step=article.position;assert.ok(!article.block.text.includes('Задание Stepik'));
    await page.setViewportSize({width:width+48,height:1200});await page.goto(origin.replace('localhost','127.0.0.1')+'/layout-qa-host');
    const text=article.block.text.replaceAll('https://zak618.github.io/stepik-course-pages/',origin+'/');
    await page.setContent(`<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#fff;font-family:Arial,sans-serif}article{max-width:1024px;margin:auto}</style><article>${text}</article>`,{waitUntil:'domcontentloaded'});
    if(!published)await page.locator('iframe').evaluateAll(frames=>frames.forEach(f=>{f.style.removeProperty('display');f.style.removeProperty('max-width');}));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(article.cost){assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.locator('form,input,button').count(),0);await page.locator('img').waitFor();await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));if([390,1024].includes(width)&&step===3)await page.screenshot({path:`${screenshots}/native-quiz-${width}.png`,fullPage:true});continue;}
    const frame=page.locator('iframe');await frame.scrollIntoViewIfNeeded();const child=await(await frame.elementHandle()).contentFrame();await child.waitForFunction(()=>document.documentElement.classList.contains('algorithm-fragment'));
    const check=async state=>{
      const inner=await child.evaluate(()=>({height:innerHeight,main:document.querySelector('main').getBoundingClientRect().height,bottom:document.querySelector('main').getBoundingClientRect().bottom,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,statusFit:[...document.querySelectorAll('.lab-status')].every(n=>n.scrollHeight<=n.clientHeight+1)}));
      assert.ok(inner.x<=0&&inner.y<=1&&inner.main<=inner.height+1,`Scroll/crop ${step}/${width}/${state}: ${JSON.stringify(inner)}`);assert.ok(inner.statusFit,`Status cropped ${step}/${width}/${state}`);
      const gap=await frame.evaluate((f,bottom)=>{const next=f.nextElementSibling||f.parentElement.nextElementSibling;return next?Math.round(next.getBoundingClientRect().top-f.getBoundingClientRect().top-bottom):0;},inner.bottom);assert.ok(gap>=0&&gap<=64,`Gap ${step}/${width}/${state}: ${gap}`);
      for(const d of await child.locator('dialog[open]').all()){const bounds=await d.boundingBox();assert.ok(bounds.width<=Math.min(width,640)&&bounds.height<=inner.height);assert.ok(await d.evaluate(n=>n.scrollHeight<=n.clientHeight+1),'Dialog scrolls');}
      records.push({step,width,state,gap,tail:Math.round(inner.height-inner.main)});
    };
    await check('initial');await exercise(child,step,check);await check('final');
    if([390,1024].includes(width)&&[1,2,4,8].includes(step)){await frame.screenshot({path:`${screenshots}/native-step${step}-${width}.png`});await frame.evaluate(f=>scrollTo(0,f.getBoundingClientRect().bottom+scrollY-230));await page.screenshot({path:`${screenshots}/native-gap${step}-${width}.png`});}
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({publishedMarkup:published,checks:records.length,maxGap:Math.max(...records.map(r=>r.gap)),maxTail:Math.max(...records.map(r=>r.tail)),errors,screenshots},null,2));
}finally{await browser.close();}
