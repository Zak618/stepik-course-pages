/* Run against the local preview. Provide PLAYWRIGHT_MODULE if not installed locally. */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const origin = process.env.STEPIK_PREVIEW_ORIGIN || 'http://localhost:8767';
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page = await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
let checks=0;
function equal(actual,expected){assert.equal(actual,expected);checks++;}
async function go(step){await page.goto(`${origin}/go-mini-module-02-lesson-01-step-${String(step).padStart(2,'0')}.html`);await page.locator('.explanation').waitFor();}
async function text(selector){return page.locator(selector).innerText();}
async function submit(value){await page.locator('#answer').fill(value);await page.locator('#answer-form').evaluate(form=>form.requestSubmit());}
try {
  await go(1);
  for(const [value,count,glyphs] of [['Go',2,2],['Привет',12,6],['Я',2,1],['🤖',4,1],['👨‍👩‍👧‍👦',25,1],['',0,0]]){
    await page.locator('#message').fill(value);equal(await text('#byte-count'),String(count));equal(await page.locator('.packet').count(),glyphs);
  }
  await page.locator('#message').fill('<img src=x>');equal(await page.locator('#packets img').count(),0);
  await page.locator('#message').fill('e\u0301');equal(await text('#byte-count'),'3');equal(await page.locator('.packet').count(),1);
  await go(2);
  for(const n of [1,2,3,4]){await page.locator(`[data-count="${n}"]`).click();equal(await text('#combination-count'),String(2**n));equal(await page.locator('.combination').count(),2**n);}
  await page.locator('.bit-key').first().focus();const old=await page.locator('.bit-key').first().getAttribute('aria-pressed');await page.keyboard.press('Space');equal(await page.locator('.bit-key').first().getAttribute('aria-pressed'),String(old!=='true'));
  await go(3);equal(await text('#sum'),'13');await page.locator('[data-weight="16"]').click();equal(await text('#sum'),'29');
  for(const value of [0,31,9]){await page.locator('#number-range').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));},value);equal(await text('#sum'),String(value));}
  await go(4);await submit('');equal(await page.locator('#feedback').getAttribute('class'),'feedback error');await submit('22');equal(await page.locator('#feedback').getAttribute('class'),'feedback success');await submit('22.5');equal(await page.locator('#feedback').getAttribute('class'),'feedback error');
  await page.locator('#new-example').click();await submit('9');equal(await page.locator('#feedback').getAttribute('class'),'feedback success');
  await go(5);await submit('10011');equal(await page.locator('#feedback').getAttribute('class'),'feedback success');await submit('19');equal(await page.locator('#feedback').getAttribute('class'),'feedback error');await submit('11111');assert.match(await text('#feedback'),/31/);checks++;
  await go(6);await page.locator('#byte-max').click();equal(await text('#byte-value'),'255');await page.locator('#byte-add').click();equal(await text('#byte-value'),'255');assert.match(await text('#feedback'),/девятый бит/);checks++;
  await page.locator('#byte-zero').click();equal(await text('#byte-value'),'0');await page.locator('#byte-add').click();equal(await text('#byte-value'),'1');await page.locator('[data-weight="128"]').click();equal(await text('#byte-value'),'129');
  await go(7);await submit('16');equal(await page.locator('#feedback').getAttribute('class'),'feedback success');await page.locator('[data-bytes="8"]').click();equal(await page.locator('.mini-byte-cells i').count(),64);await submit('64');equal(await page.locator('#feedback').getAttribute('class'),'feedback success');
  await go(8);
  for(const [char,count,numbers] of [['A',1,['65']],['Я',2,['208','175']],['🤖',4,['240','159','164','150']]]){await page.locator(`[data-char="${char}"]`).click();equal(await page.locator('.encoding-byte').count(),count);assert.deepEqual(await page.locator('.encoding-byte small').allTextContents(),numbers);checks++;}
  await go(9);await page.locator('[data-mode="text"]').click();equal(await text('#interpretation'),'A');await page.locator('[data-mode="color"]').click();equal(await page.locator('.gray-pixel').count(),1);await page.locator('[value="format"]').check();await page.locator('#answer-form').evaluate(form=>form.requestSubmit());equal(await page.locator('#feedback').getAttribute('class'),'feedback success');
  await go(10);equal(await page.locator('.search-result').count(),0);await page.locator('#ignore-case').click();equal(await page.locator('.search-result').count(),2);await page.locator('#query').fill('го:');equal(await page.locator('.search-result').count(),1);await page.locator('#query').fill('');equal(await page.locator('.search-result').count(),4);await page.locator('#query').fill('<img src=x>');equal(await page.locator('.search-result').count(),0);equal(await page.locator('#results img').count(),0);
  // New teaching interactions must agree with the original experiments.
  await go(2);await page.locator('[data-locker-bits="2"]').click();equal(await page.locator('.locker.unassigned').count(),1);await page.locator('[data-locker-bits="3"]').click();equal(await page.locator('.locker.unassigned').count(),0);assert.match(await text('#locker-result'),/три номера останутся/);checks++;
  await go(5);for(const bit of [0,3,4])await page.locator(`[data-write-bit="${bit}"]`).click();equal(await page.locator('#answer').inputValue(),'10011');await page.locator('#answer-form').evaluate(form=>form.requestSubmit());equal(await page.locator('#feedback').getAttribute('class'),'feedback success');await page.keyboard.press('Space');equal(await page.locator('#answer').inputValue(),'10010');equal(await text('#feedback'),'');
  await go(6);for(const expected of ['0110','0100','0000','1000']){await page.locator('#carry-next').click();equal(await page.locator('#carry-digits b').allTextContents().then(bits=>bits.join('')),expected);}equal(await page.locator('#carry-next').isDisabled(),true);await page.locator('#carry-reset').click();equal(await page.locator('#carry-digits b').allTextContents().then(bits=>bits.join('')),'0111');equal(await page.locator('#carry-next').isDisabled(),false);
  await go(8);await page.locator('[data-char="Я"]').click();await page.locator('#show-utf8').click();equal(await page.locator('.utf-prefix').count(),5);equal(await page.locator('.utf-payload').count(),11);equal(parseInt((await page.locator('.utf-payload').allTextContents()).join(''),2),1071);await page.locator('[data-char="🤖"]').click();equal(parseInt((await page.locator('.utf-payload').allTextContents()).join(''),2),129302);await page.locator('#show-utf8').click();equal(await page.locator('#encoding-legend').isHidden(),true);
  await go(9);for(const [channel,value] of [['r',255],['g',0],['b',0]]){await page.locator(`[data-channel="${channel}"]`).evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);}await page.waitForFunction(()=>getComputedStyle(document.getElementById('rgb-swatch')).backgroundColor==='rgb(255, 0, 0)');equal(await page.locator('#rgb-swatch').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 0, 0)');equal(await text('#rgb-status'),'RGB(255, 0, 0) · 3 байта · 24 бита');equal(await text('.raw-byte'),'01000001');
  await go(10);await page.locator('#ignore-case').click();for(let i=0;i<4;i++)await page.locator('#trace-next').click();equal(await page.locator('.trace-record.match').count(),await page.locator('.search-result').count());equal(await page.locator('#trace-next').isDisabled(),true);await page.locator('#query').fill('го');equal(await page.locator('.trace-record.match').count(),0);equal(await page.locator('#trace-next').isDisabled(),false);for(let i=0;i<4;i++)await page.locator('#trace-next').click();equal(await page.locator('.trace-record.match').count(),2);await page.locator('#trace-reset').click();equal(await page.locator('.trace-record.match,.trace-record.miss').count(),0);
  for(const width of [1280,768,390,320]){
    await page.setViewportSize({width,height:900});
    for(let step=1;step<=10;step++){
      await go(step);
      if(step===2)await page.locator('[data-count="4"]').click();
      if(step===7)await page.locator('[data-bytes="8"]').click();
      if(step===8)await page.locator('[data-char="🤖"]').click();
      if(step===2)await page.locator('[data-locker-bits="1"]').click();
      if(step===8)await page.locator('#show-utf8').click();
      assert.ok(await page.locator('.story-opening>p,.explanation>p').count()>=8,`Missing open narrative on step ${step}`);checks++;
      await page.locator('summary').click();
      equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
  }
  await page.setViewportSize({width:1440,height:900});await page.goto(`${origin}/information#08`);
  const frame=page.frameLocator('#lesson-frame');await frame.locator('[data-char="🤖"]').click();await frame.locator('summary').click();
  await page.waitForFunction(()=>{const f=document.getElementById('lesson-frame');return f.clientHeight>=f.contentDocument.querySelector('main').getBoundingClientRect().height;});
  equal((await page.locator('[aria-current="step"]').innerText()).replace(/\s+/g,' ').trim(),'08 Unicode и UTF‑8');
  await page.locator('#phone').click();await page.waitForFunction(()=>Math.abs(document.getElementById('frame-wrap').getBoundingClientRect().width-390)<1);checks++;
  await page.locator('#bottom-next').click();await frame.locator('#rgb-swatch').waitFor();equal(new URL(page.url()).hash,'#09');await page.waitForFunction(()=>scrollY<200);checks++;
  await page.locator('#bottom-next').click();await frame.locator('#trace-next').waitFor();equal(new URL(page.url()).hash,'#10');equal(await page.locator('#bottom-next').isDisabled(),true);await page.locator('#bottom-previous').click();await frame.locator('#rgb-swatch').waitFor();equal(new URL(page.url()).hash,'#09');
  await page.emulateMedia({reducedMotion:'reduce'});await go(1);equal(await page.locator('.signal-track').evaluate(node=>getComputedStyle(node,'::after').display),'none');
  equal((await page.request.get(`${origin}/.env`)).status(),404);equal((await page.request.get(`${origin}/README.md`)).status(),404);
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${checks} checks. Narrative, UTF-8 structure, lockers, bit assembly, carry, RGB, search trace, 4 widths, keyboard, preview resizing, reduced motion, private paths.`);
} finally { await browser.close(); }
