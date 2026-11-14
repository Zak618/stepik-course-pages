/* Reproduce native Stepik flow, not only isolated pages: cross-origin frames,
   real frame heights, gaps to the next paragraph, and expanded states. */
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.STEPIK_PREVIEW_ORIGIN||'http://localhost:8767';
const live=process.argv.includes('--published');
const input=JSON.parse(await readFile(live?'.local-publication/stepik-v2-verified.json':'.local-publication/information-v2.json','utf8'));
const articles=live?input.sources:input.articles;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({reducedMotion:'reduce'}),screenshots=await mkdtemp('/tmp/stepik-native-spacing-');
const errors=[],records=[];page.on('pageerror',error=>errors.push(error.message));
let host='';
const close=async child=>{for(const d of await child.locator('dialog[open]').all())await d.locator('button').last().click();};
try{
  for(const width of [320,390,650,651,768,1024])for(const article of articles){
    assert.ok(!article.block.text.includes('Задание Stepik'));
    const text=article.block.text.replaceAll('https://zak618.github.io/stepik-course-pages/',origin+'/');
    host=`<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:24px;font-family:Arial,sans-serif;background:white}article{width:100%;max-width:1024px;margin:auto}*{box-sizing:border-box}</style><article>${text}</article></html>`;
    await page.setViewportSize({width:width+48,height:1100});
    // A genuine loopback response establishes the local address space before
    // injecting markup; a synthetic route.fulfill response is public by default
    // and Chrome correctly blocks its loopback iframe requests.
    await page.goto(origin.replace('localhost','127.0.0.1')+'/layout-qa-host');
    await page.setContent(host,{waitUntil:'domcontentloaded'});
    // Stepik removes display/max-width from iframe styles. Emulate only when
    // using an unuploaded plan; --published uses exact saved HTML unchanged.
    if(!live)await page.locator('iframe').evaluateAll(frames=>frames.forEach(f=>{f.style.removeProperty('display');f.style.removeProperty('max-width');}));
    for(const frame of await page.locator('iframe').all()){
      await frame.scrollIntoViewIfNeeded();const child=await(await frame.elementHandle()).contentFrame();await child.waitForFunction(()=>document.documentElement.classList.contains('fragment'));
      const panel=new URL(await frame.getAttribute('src')).searchParams.get('panel'),step=article.position;
      const check=async state=>{
        const inner=await child.evaluate(()=>({main:document.querySelector('main').getBoundingClientRect().height,bottom:document.querySelector('main').lastElementChild.getBoundingClientRect().bottom,height:innerHeight,overflow:document.documentElement.scrollWidth-innerWidth,vertical:document.documentElement.scrollHeight-innerHeight}));
        assert.ok(inner.main<=inner.height+1,`Clipped step ${step}/${panel}/${width}/${state}: ${inner.main}>${inner.height}`);
        assert.ok(inner.overflow<=0&&inner.vertical<=1,`Scrollbar step ${step}/${panel}/${width}/${state}: ${JSON.stringify(inner)}`);
        if(step===10){
          assert.ok(await child.locator('.search-note').evaluateAll(notes=>notes.every(note=>note.querySelector('p').getBoundingClientRect().bottom<=note.getBoundingClientRect().bottom-10)),`Note text does not fit: ${width}/${state}`);
          assert.ok(await child.locator('.notes-folder').evaluate(folder=>folder.querySelector('.folder-content').getBoundingClientRect().bottom<=folder.getBoundingClientRect().bottom-10),`Results do not fit: ${width}/${state}`);
        }
        const gap=await frame.evaluate((frame,bottom)=>{const next=frame.nextElementSibling;return next?Math.round(next.getBoundingClientRect().top-frame.getBoundingClientRect().top-bottom):0;},inner.bottom);
        assert.ok(gap>=0&&gap<=64,`Native blank gap ${gap}px: step ${step}/${panel}/${width}/${state}`);
        for(const dialog of await child.locator('dialog[open]').all()){
          const box=await dialog.boundingBox();assert.ok(box.width<=width&&box.height<=inner.height,'Dialog does not fit its iframe');
        }
        records.push({step,panel,width,state,gap,tail:Math.round(inner.height-inner.main)});
      };
      await check('initial');
      if(panel==='carry'){for(let i=0;i<5;i++)await child.locator('#carry-next').click();}
      else if(panel==='rgb'){for(const c of await child.locator('[data-channel]').all())await c.fill('255');}
      else{
        if(step===1){
          await child.locator('#message').fill('');await child.locator('#send').click();await check('empty');
          await child.locator('#message').fill('👋'.repeat(12));await child.locator('#send').click();await check('received');await child.locator('#show-bytes').click();await check('byte-dialog');await close(child);
        }
        if(step===2){await child.locator('[data-count="4"]').click();await child.locator('[data-capacity-answer="no"]').click();await check('answer-dialog');await close(child);for(let i=0;i<3;i++)await child.getByRole('button',{name:'Следующие шкафчики',exact:true}).click();}
        if(step===3){for(const w of [8,4,1])await child.locator(`[data-weight="${w}"]`).click();}
        if([4,5,7].includes(step)){await child.locator('#answer').fill('999');await child.locator('#answer-form').evaluate(f=>f.requestSubmit());await check('feedback-dialog');await close(child);}
        if(step===4)for(let i=0;i<5;i++)await child.locator('#read-step').click();
        if(step===5){await child.locator('#answer').fill('10011');await child.locator('#answer-form').evaluate(f=>f.requestSubmit());await close(child);}
        if(step===6){await child.locator('#all-one').click();await child.locator('#byte-add').click();}
        if(step===7){for(let i=0;i<5;i++)await child.locator('#add-box').click();await child.locator('#unpack').click();await child.getByRole('button',{name:'Предыдущие коробки',exact:true}).click();}
        if(step===8){await child.locator('[data-char="👋"]').click();await child.locator('#xray').click();}
        if(step===9){await child.locator('[data-mode="color"]').click();await child.locator('[data-meaning-answer="no"]').click();await check('meaning-dialog');await close(child);}
        if(step===10){
          for(const [query,count]of[['цикл',2],['пицца',0],['и',4],['',0]]){
            await child.locator('#query').fill(query);await child.locator('#find-form').evaluate(form=>form.requestSubmit());assert.equal(await child.locator('.folder-result').count(),count);await check('search-'+(query||'empty'));
          }
        }
      }
      await check('expanded');
      if(step===1&&panel==='scene'&&[390,1024].includes(width)){
        await child.locator('#message').fill('Привет');await child.locator('#send').click();
        await frame.evaluate(f=>scrollTo(0,f.getBoundingClientRect().top+scrollY+Number(f.height)-250));
        await page.screenshot({path:`${screenshots}/native-step1-${width}.png`});
      }
    }
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({publishedMarkup:live,checks:records.length,maxNativeGap:Math.max(...records.map(r=>r.gap)),maxIframeTail:Math.max(...records.map(r=>r.tail)),errors,screenshots},null,2));
}finally{await browser.close();}
