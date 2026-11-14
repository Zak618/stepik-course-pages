import assert from 'node:assert/strict';
import{readFile,mkdtemp}from'node:fs/promises';
import{origin,browserOptions,exercise}from'./lib/first-program-browser.mjs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const published=process.argv.includes('--published'),input=JSON.parse(await readFile(published?'.local-publication/first-program-verified.json':'.local-publication/first-program.json','utf8')),articles=published?input.sources:input.articles;
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true});
const screenshots=await mkdtemp('/tmp/stepik-first-program-native-'),errors=[],records=[];page.on('pageerror',e=>errors.push(e.message));
try{
  for(const width of[320,390,420,640,768,1024])for(const article of articles){
    const step=article.position;await page.setViewportSize({width:width+48,height:1200});await page.goto(origin.replace('localhost','127.0.0.1')+'/layout-qa-host');
    const text=article.block.text.replaceAll('https://zak618.github.io/stepik-course-pages/',origin+'/');
    await page.setContent(`<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#fff;font-family:Arial,sans-serif}article{max-width:1024px;margin:auto}</style><article>${text}</article>`,{waitUntil:'domcontentloaded'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.ok(!/Настоящий запуск Go|Замедленная модель|Локальная проверка|10 баллов/.test(text));
    if(article.cost){assert.equal(await page.locator('iframe,form,input,button,textarea').count(),0);assert.equal(await page.locator('h1').count(),1);continue;}
    const frame=page.locator('iframe');await frame.scrollIntoViewIfNeeded();const child=await(await frame.elementHandle()).contentFrame();await child.waitForFunction(()=>document.documentElement.classList.contains('first-fragment'));
    const check=async state=>{
      const inner=await child.evaluate(()=>({height:innerHeight,main:document.querySelector('main').getBoundingClientRect().height,bottom:document.querySelector('main').getBoundingClientRect().bottom,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,overflow:[...document.querySelectorAll('.lab-status,.anatomy-explanation,.printer-paper,.code-window pre')].filter(n=>n.scrollHeight>n.clientHeight+1).map(n=>n.className)}));
      assert.ok(inner.x<=0&&inner.y<=1&&inner.main<=inner.height+1,`Scroll ${step}/${width}/${state}: ${JSON.stringify(inner)}`);assert.deepEqual(inner.overflow,[],`Content overflow ${step}/${width}/${state}`);
      const gap=await frame.evaluate((f,bottom)=>{const next=f.parentElement.nextElementSibling;return next?Math.round(next.getBoundingClientRect().top-f.getBoundingClientRect().top-bottom):0;},inner.bottom);assert.ok(gap>=0&&gap<=64,`Gap ${step}/${width}/${state}: ${gap}`);records.push({step,width,state,gap,tail:Math.round(inner.height-inner.main)});
    };
    await check('initial');await exercise(child,step,check);await check('final');
    if([390,1024].includes(width)&&[1,2,5,7].includes(step))await frame.screenshot({path:`${screenshots}/step-${step}-${width}.png`});
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({publishedMarkup:published,checks:records.length,maxGap:Math.max(...records.map(r=>r.gap)),maxTail:Math.max(...records.map(r=>r.tail)),errors,screenshots},null,2));
}finally{await browser.close();}
