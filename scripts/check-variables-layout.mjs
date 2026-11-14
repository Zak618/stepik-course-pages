// Validate native theory and the actual iframe boundary, including all scene states.
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {origin,browserOptions,exercise,geometry} from './lib/variables-browser.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const published=process.argv.includes('--published'),partial=process.argv.includes('--partial');
const input=JSON.parse(await readFile(published?'.local-publication/variables-verified.json':partial?'.local-publication/variables-partial.json':'.local-publication/variables.json','utf8'));
const articles=published||partial?input.sources:input.articles;
if(!partial)assert.equal(articles.length,16);
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true});
const screenshots=await mkdtemp('/tmp/stepik-variables-native-'),records=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
  for(const width of [320,390,420,640,768,1024])for(const article of articles){
    const step=article.position;
    await page.setViewportSize({width:width+48,height:1200});
    await page.goto(origin.replace('localhost','127.0.0.1')+'/layout-qa-host');
    const text=article.block.text.replaceAll('https://zak618.github.io/stepik-course-pages/',origin+'/');
    await page.setContent(`<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#fff;font-family:Arial,sans-serif}article{max-width:1024px;margin:auto}</style><article>${text}</article>`,{waitUntil:'domcontentloaded'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Native text overflows');
    assert.ok(!/рад видеть|10 баллов|Команда WEB HACKER/.test(text));
    assert.equal(await page.locator('h1').count(),1);
    if(step===5){const labels=page.locator('h2>code');assert.deepEqual(await labels.allTextContents(),['string','int','bool']);assert.ok(await labels.evaluateAll(ns=>ns.every(n=>parseFloat(getComputedStyle(n).fontSize)>=28)),'Native type headings lost their size');}
    if(article.cost){assert.equal(await page.locator('iframe,form,input,button,textarea').count(),0);continue;}
    const iframe=page.locator('iframe');await iframe.scrollIntoViewIfNeeded();
    const child=await(await iframe.elementHandle()).contentFrame();
    await child.waitForFunction(()=>document.body.classList.contains('scene-only'));
    const check=async state=>{
      await child.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const inner=await child.evaluate(geometry);
      assert.ok(inner.x<=0&&inner.y<=1&&inner.main<=inner.viewport+1,`Scroll ${step}/${width}/${state}: ${JSON.stringify(inner)}`);
      assert.deepEqual(inner.overflow,[],`Content overflow ${step}/${width}/${state}`);
      const gap=await iframe.evaluate((frame,bottom)=>{
        const next=frame.parentElement.nextElementSibling;
        return next?Math.round(next.getBoundingClientRect().top-frame.getBoundingClientRect().top-bottom):0;
      },inner.inkBottom);
      assert.ok(gap>=0&&gap<=84,`Visible gap ${step}/${width}/${state}: ${gap}`);
      records.push({step,width,state,gap,tail:inner.viewport-inner.inkBottom});
    };
    await check('initial');await exercise(child,step,check);await check('final');
    if([390,1024].includes(width)&&[1,5,9,13].includes(step)){
      await iframe.screenshot({path:`${screenshots}/step-${step}-${width}.png`});
      await iframe.evaluate(frame=>scrollTo(0,frame.getBoundingClientRect().bottom+scrollY-210));
      await page.screenshot({path:`${screenshots}/gap-${step}-${width}.png`});
    }
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({publishedMarkup:published||partial,steps:articles.length,checks:records.length,maxGap:Math.max(...records.map(r=>r.gap)),maxTail:Math.max(...records.map(r=>r.tail)),errors,screenshots},null,2));
}finally{await browser.close();}
