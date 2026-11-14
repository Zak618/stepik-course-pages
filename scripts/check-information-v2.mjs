import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.STEPIK_PREVIEW_ORIGIN||'http://localhost:8767';
const screenshots=await mkdtemp('/tmp/stepik-information-v2-');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
let checks=0;
const equal=(actual,expected)=>{assert.equal(actual,expected);checks++;};
const text=selector=>page.locator(selector).textContent().then(value=>value.trim());
async function go(step){await page.goto(`${origin}/go-mini-module-02-lesson-01-v2-step-${String(step).padStart(2,'0')}.html`);await page.locator('.story').first().waitFor();}
async function submit(value){await page.locator('#answer').fill(value);await page.locator('#answer-form').evaluate(form=>form.requestSubmit());}
try{
  await page.goto(origin+'/information-v2');await page.locator('#send').waitFor();await page.screenshot({path:screenshots+'/preview.png'});
  await page.locator('[data-guess="2"]').click();await page.locator('#send').click();await page.waitForTimeout(1250);await page.screenshot({path:screenshots+'/message-moving.png'});
  await page.locator('#message-world[data-phase="received"]').waitFor();equal(await text('#received'),'Привет');equal(await text('#byte-count'),'12');equal(await page.locator('#send').isEnabled(),true);await page.screenshot({path:screenshots+'/message-delivered.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [message,count] of [['Go',2],['Я',2],['👋',4],['👨‍👩‍👧‍👦',25],['<img src=x>',11]]){await page.locator('#message').fill(message);await page.locator('#send').click();equal(await text('#received'),message);equal(await text('#byte-count'),String(count));}
  equal(await page.locator('.message-world img').count(),0);
  await page.locator('#message').fill('');await page.locator('#send').click();assert.match(await text('#message-status'),/пока нет знаков/);checks++;
  await go(2);equal(await page.locator('.locker').count(),4);await page.locator('[data-count="4"]').click();equal(await page.locator('.locker').count(),16);equal(await text('#capacity'),'16');await page.locator('[data-bit="0"]').focus();const before=await page.locator('[data-bit="0"]').getAttribute('aria-pressed');await page.keyboard.press('Space');equal(await page.locator('[data-bit="0"]').getAttribute('aria-pressed'),String(before!=='true'));equal(await page.locator('.locker.open').count(),1);
  await go(3);for(const weight of [8,4,1])await page.locator(`[data-weight="${weight}"]`).click();assert.match(await text('#sum-line'),/13 — весы сошлись/);checks++;equal(await page.locator('#scale-binary>span').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent).join('')),'01101');await page.locator('[data-target="21"]').click();equal(await text('#scale-target'),'21');
  await go(4);await submit('');equal(await page.locator('#feedback').getAttribute('class'),'feedback retry');await submit('22');equal(await page.locator('#feedback').getAttribute('class'),'feedback success');for(let i=0;i<5;i++)await page.locator('#read-step').click();equal(await page.locator('#read-step').isDisabled(),true);await page.locator('#new-example').click();await submit('9');equal(await page.locator('#feedback').getAttribute('class'),'feedback success');
  await go(5);for(const weight of [16,2,1])await page.locator(`[data-weight="${weight}"]`).click();equal(await page.locator('#answer').inputValue(),'10011');await page.locator('#answer-form').evaluate(form=>form.requestSubmit());equal(await page.locator('#parcel-stamp').isVisible(),true);await submit('11111');assert.match(await text('#feedback'),/31/);checks++;await submit('19');equal(await page.locator('#feedback').getAttribute('class'),'feedback retry');
  await go(6);await page.locator('#all-one').click();equal(await text('#byte-value'),'255');await page.locator('#byte-add').click();equal(await text('#byte-value'),'255');equal(await page.locator('#byte-warning').isVisible(),true);await page.locator('#start-carry').click();for(let i=0;i<4;i++)await page.locator('#carry-next').click();equal(await page.locator('#carry-row b').allTextContents().then(bits=>bits.join('')),'1000');await page.locator('#all-zero').click();await page.locator('#byte-add').click();equal(await text('#byte-value'),'1');
  await go(7);equal(await text('#box-count'),'3');await submit('24');equal(await page.locator('#feedback').getAttribute('class'),'feedback success');for(let i=0;i<5;i++)await page.locator('#add-box').click();equal(await text('#box-count'),'8');equal(await page.locator('#add-box').isDisabled(),true);await page.locator('#unpack').click();equal(await page.locator('.package-cells i').count(),64);await submit('64');equal(await page.locator('#feedback').getAttribute('class'),'feedback success');
  await go(8);equal(await page.locator('#receipt').isHidden(),true);await page.locator('#print').click();equal(await page.locator('.receipt-byte').count(),1);await page.locator('[data-char="Я"]').click();equal(await page.locator('#receipt').isHidden(),true);await page.locator('#xray').click();equal(await page.locator('.prefix').count(),5);equal(await page.locator('.payload').count(),11);equal(parseInt((await page.locator('.payload').allTextContents()).join(''),2),1071);await page.locator('[data-char="👋"]').click();await page.locator('#print').click();equal(await page.locator('.receipt-byte').count(),4);equal(parseInt((await page.locator('.payload').allTextContents()).join(''),2),128075);
  await go(9);await page.locator('[data-mode="text"]').click();equal(await text('.letter-block strong'),'A');await page.locator('[data-mode="color"]').click();equal(await page.locator('.gray-sample').count(),1);for(const [channel,value]of[['r',255],['g',0],['b',0]])await page.locator(`[data-channel="${channel}"]`).evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);equal(await page.locator('#pixel-color').evaluate(node=>node.style.backgroundColor),'rgb(255, 0, 0)');equal(await text('.sealed-parcel b'),'01000001');
  await go(10);equal(await page.locator('.search-note').count(),4);
  for(const [query,count]of[['цикл',2],['функц',1],['пицца',0],['ЦИКЛ',2],['  цикл  ',2],['go',2],['и',4],['<img src=x>',0]]){
    await page.locator('#query').fill(query);await page.locator('#find-form').evaluate(form=>form.requestSubmit());
    equal(await page.locator('.search-note.matched').count(),count);equal(await page.locator('.folder-result').count(),count);equal(await text('#find-count'),String(count));equal(await page.locator('#find-submit').isEnabled(),true);
  }
  equal(await page.locator('.notes-world img').count(),0);await page.locator('#query').fill('   ');await page.locator('#query').press('Enter');assert.match(await text('#find-status'),/Введите тему/);checks++;equal(await page.locator('.search-note.matched').count(),0);
  await page.locator('[data-search="цикл"]').click();equal(await text('#find-count'),'2');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-search="функц"]').click();await page.locator('.search-note.searching').waitFor();equal(await page.locator('#find-submit').isDisabled(),true);await page.locator('#query').fill('цикл');await page.waitForTimeout(700);equal(await page.locator('.search-note.searching').count(),0);equal(await page.locator('.folder-result').count(),0);
  await page.locator('#find-submit').click();await page.waitForTimeout(800);await page.locator('.experiment').screenshot({path:screenshots+'/find-searching.png'});await page.locator('.notes-world[aria-busy="false"]').waitFor();equal(await text('#find-count'),'2');equal(await page.locator('.search-note.searching').count(),0);await page.waitForTimeout(600);equal(await page.locator('.note-flight').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [1280,768,390,320]){
    await page.setViewportSize({width,height:950});
    for(let step=1;step<=10;step++){
      await go(step);
      if(step===1){await page.locator('#message').fill('👋'.repeat(12));await page.locator('#send').click();}
      if(step===2)await page.locator('[data-count="4"]').click();
      if(step===6){await page.locator('#all-one').click();await page.locator('#byte-add').click();await page.locator('#start-carry').click();}
      if(step===7){for(let i=0;i<5;i++)await page.locator('#add-box').click();await page.locator('#unpack').click();}
      if(step===8){await page.locator('[data-char="👋"]').click();await page.locator('#print').click();await page.locator('#xray').click();}
      if(step===10)await page.locator('#find-submit').click();
      await page.locator('.extra summary').click();
      equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      equal(await page.locator('iframe').count(),0);
      const gaps=await page.evaluate(()=>{const blocks=[...document.querySelector('.lesson-flow').children];return blocks.slice(1).map((node,i)=>node.getBoundingClientRect().top-blocks[i].getBoundingClientRect().bottom);});assert.ok(gaps.every(gap=>gap>=0&&gap<=70),`Gaps ${gaps} on step ${step}`);checks++;
      if([1,2,3,8,10].includes(step)&&[1280,390].includes(width)){await page.locator('.extra summary').click();await page.locator('.experiment').screenshot({path:`${screenshots}/step${step}-${width}.png`});}
    }
  }
  await page.goto(origin+'/information-v2#03');await page.locator('#scale-target').waitFor();equal(await page.locator('#step-picker').inputValue(),'03');await page.selectOption('#step-picker','08');await page.locator('#print').waitFor();equal(new URL(page.url()).hash,'#08');
  await page.setViewportSize({width:1440,height:1000});await page.locator('#phone-v2').click();equal(await page.locator('body').evaluate(node=>node.classList.contains('phone-preview')),true);equal(await page.locator('#v2-lesson').evaluate(node=>Math.round(node.getBoundingClientRect().width)),390);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(origin+'/information-v2#01');await page.locator('#send').click();await page.locator('#v2-nav a[href="#02"]').click();await page.locator('#capacity').waitFor();await page.waitForTimeout(3200);equal(await page.locator('#capacity').count(),1);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,screenshots},null,2));
}finally{await browser.close();}
