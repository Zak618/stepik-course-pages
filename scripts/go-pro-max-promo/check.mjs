import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {fields,facts} from '../../courses/305734-go-pro-max/promo/content.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.GO_MAX_PROMO_URL||'http://localhost:8797';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce'});
const page=await context.newPage();
const screenshots=await mkdtemp('/tmp/go-max-promo-qa-');
const errors=[];let checks=0;
const ok=(value,message)=>{checks++;assert.ok(value,message);};
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))errors.push(response.status()+' '+response.url());});
try{
  const before=JSON.parse(await readFile('.local-publication/go-pro-max-promo-20261120/before.json','utf8'));
  ok(facts.modules===before.sections.length && facts.lessons===before.total_units,'Counts match the current course');
  ok(fields.summary.length<=300,'Short description fits Stepik');
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:1000});
    for(const path of ['/','/fields.html']){
      await page.goto(origin+path);
      ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow: '+width+' '+path);
      const text=await page.locator('body').innerText();
      ok(!/[—–]/.test(text),'No dashes in visible copy');
      ok(!text.includes('213 задач')&&!text.includes('113 уроков')&&!text.includes('22 модуля'),'No stale course counts');
      if(path==='/'){
        await page.locator('#run-demo').click();
        ok(await page.locator('.project-visual').getAttribute('data-stage')==='4','Reduced-motion demo completes');
        await page.locator('.topic').nth(4).locator('summary').click();
        await page.waitForFunction(()=>document.querySelectorAll('.topic[open]').length===1);
        ok((await page.locator('.topic[open]').innerText()).includes('Pinia'),'Vue program expands');
        await page.locator('.faq-list details').nth(2).locator('summary').click();
        ok((await page.locator('.faq-list details[open]').innerText()).includes('Малая часть'),'Prior-course overlap stays explicit');
      }else{
        ok(await page.locator('[data-field]').count()===7,'All seven additional description fields shown');
      }
      if([390,1440].includes(width))await page.screenshot({path:screenshots+'/'+width+(path==='/'?'-promo.png':'-fields.png'),fullPage:true});
    }
  }
  await page.goto(origin);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#run-demo').click();
  await page.waitForFunction(()=>document.querySelector('.project-visual').dataset.stage==='2');
  ok(await page.locator('#run-demo').isDisabled(),'No overlapping demo timers');
  await page.waitForFunction(()=>document.querySelector('.project-visual').dataset.stage==='4');
  ok(await page.locator('#run-demo').isEnabled(),'Normal animation completes');
  await page.locator('.preview-bar a[href="fields.html"]').click();
  ok(new URL(page.url()).pathname==='/fields.html','Field navigation works');
  await page.goBack();
  await page.locator('#run-demo').waitFor();
  ok(await page.locator('#run-demo').isEnabled(),'Demo usable after browser Back');
  ok(errors.length===0,errors.join('\n'));
  console.log(JSON.stringify({checks,screenshots,errors,stepikWrites:0},null,2));
}finally{await browser.close();}
