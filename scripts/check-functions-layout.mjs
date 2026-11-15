import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {origin,browserOptions,geometry,exercise} from './lib/functions-browser.mjs';
const published=process.argv.includes('--published');
const plan=JSON.parse(await readFile(published?'.local-publication/functions-verified.json':'.local-publication/functions.json','utf8')),articles=published?plan.sources:plan.articles;
assert.equal(articles.length,22);
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch(browserOptions),page=await browser.newPage({bypassCSP:true,reducedMotion:'reduce'}),screenshots=await mkdtemp('/tmp/stepik-functions-native-'),records=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const width of [320,390,420,640,768,1024])for(const article of articles){
  await page.setViewportSize({width:width+48,height:1200});await page.goto(origin.replace('localhost','127.0.0.1')+'/layout-qa-host');
  const text=article.block.text.replaceAll('https://zak618.github.io/stepik-course-pages/',origin+'/');
  await page.setContent(`<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#fff;font-family:Arial,sans-serif}article{max-width:1024px;margin:auto}</style><article>${text}</article>`,{waitUntil:'domcontentloaded'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Native text overflows '+article.position+'/'+width);
  if(article.cost){assert.equal(await page.locator('iframe,form,input,button,textarea,details').count(),0);if(article.block.name==='code'){const n=JSON.parse(article.block.source.code.match(/^TESTS = (.+)/)[1]).length;assert.equal(await page.locator('h3').count(),0);assert.equal(await page.locator('[style*="background"]').count(),0);assert.equal(article.block.source.samples_count,n);}continue;}
  const iframe=page.locator('iframe');await iframe.scrollIntoViewIfNeeded();const child=await(await iframe.elementHandle()).contentFrame();await child.waitForSelector('.is-embed .world');
  const check=async state=>{await child.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const m=await child.evaluate(geometry);assert.ok(m.x<=0&&m.y<=1,`Scroll ${article.position}/${width}/${state}: ${JSON.stringify(m)}`);assert.ok(m.width>=Math.min(width,1024)-1,'Compressed scene');assert.deepEqual(m.clipped,[],`Clipped ${article.position}/${width}/${state}`);const gap=await iframe.evaluate((frame,bottom)=>{const next=frame.parentElement.nextElementSibling;return next?next.getBoundingClientRect().top-frame.getBoundingClientRect().top-bottom:0;},m.inkBottom);assert.ok(gap>=0&&gap<=84,`Gap ${article.position}/${width}/${state}: ${gap}`);assert.ok(m.viewport-m.inkBottom<=80,'Empty frame tail');records.push({step:article.position,width,state,gap,tail:m.viewport-m.inkBottom});};
  await check('initial');await exercise(child,article.position,check);if([390,1024].includes(width))await iframe.screenshot({path:`${screenshots}/step-${article.position}-${width}.png`});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({published,states:records.length,maxGap:Math.max(...records.map(r=>r.gap)),maxTail:Math.max(...records.map(r=>r.tail)),errors,screenshots},null,2));
}finally{await browser.close();}
