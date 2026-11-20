import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {pages} from '../../courses/305734-go-pro-max/introduction/content.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const origin = process.env.GO_MAX_INTRO_URL || 'http://localhost:8796';
const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context = await browser.newContext({reducedMotion:'reduce'});
const page = await context.newPage();
const screenshots = await mkdtemp('/tmp/go-max-intro-check-');
const errors = [];
const layouts = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {if(response.status() >= 400 && !response.url().endsWith('/favicon.ico')) errors.push(response.status() + ' ' + response.url());});
let checks = 0;
const ok = (condition, message) => {checks++; assert.ok(condition, message);};
async function open(part) {
  await page.goto(origin + '/?step=' + part + '#' + part);
  await page.locator('#steps button[aria-current=step]').waitFor();
  await page.frameLocator('#lesson-frame').locator('h1').waitFor();
  const frame = await (await page.$('#lesson-frame')).contentFrame();
  await frame.waitForLoadState('load');
  return frame;
}
try {
  for (const width of [320,390,768,1280]) {
    await page.setViewportSize({width,height:1000});
    for (const definition of pages) {
      const frame = await open(definition.part);
      await frame.waitForFunction(() => document.documentElement.scrollHeight <= innerHeight + 1, null, {timeout:3000});
      const metrics = await frame.evaluate(() => ({width:innerWidth,height:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}));
      layouts.push({part:definition.part,width,...metrics});
      ok(metrics.x <= 1, 'No horizontal overflow: ' + JSON.stringify(layouts.at(-1)));
      ok(metrics.y <= 1, 'No inner vertical scroll: ' + JSON.stringify(layouts.at(-1)));
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Review shell fits at ' + width);
      ok(!/[—–]/.test(await frame.locator('body').innerText()), 'No dashes in lesson text');
      if (definition.type === 'free-answer') {
        ok(await frame.locator('textarea,select,#copy-answer').count() === 0, 'No duplicate answer fields or copy buttons');
        ok(await page.locator('#native-response').isVisible(), 'Answer stays outside the iframe in Stepik field');
      }
      if (definition.part === 'welcome') {
        ok((await frame.locator('.byline').innerText()) === 'На связи команда WEB HACKER', 'Shared signature');
        ok((await frame.locator('.course-name').innerText()).includes('Pro MAX'), 'Course name');
        await frame.locator('#helloAgain').click();
      }
      if (definition.part === 'map') {
        await frame.locator('#map-world .map-node').first().waitFor({state:'attached'});
        ok(await frame.locator('#map-world .map-node').count() > 0, 'Existing map loads');
        await frame.locator('[data-view=list]').click();
        await frame.locator('#course-search').fill('Go');
        ok(await frame.locator('.list-course').count() > 0, 'Map search works');
      }
      if (width === 390) await page.screenshot({path:screenshots + '/' + definition.part + '-phone.png',fullPage:true});
    }
  }
  await page.setViewportSize({width:1280,height:1000});
  let frame = await open('telegram');
  for (const value of ['materials','updates','news']) {
    await frame.locator('[data-post=' + value + ']').click();
    ok(await frame.locator('[data-post=' + value + ']').getAttribute('aria-pressed') === 'true', 'Postcard selected');
  }
  ok(await frame.locator('a').getAttribute('href') === 'https://t.me/webosnovy', 'Correct Telegram link');
  frame = await open('experience');
  await frame.locator('[data-experience=other]').click();
  await page.locator('#native-response').fill('Писал на Python. Хочу освоить Go.');
  ok((await frame.locator('#experience-title').innerText()).includes('Новый язык'), 'Experience card reacts');
  await page.reload();
  await page.frameLocator('#lesson-frame').locator('[data-experience=other]').waitFor();
  frame = await (await page.$('#lesson-frame')).contentFrame();
  ok(await frame.locator('[data-experience=other]').getAttribute('aria-pressed') === 'true', 'Choice restored');
  frame = await open('goal');
  for (const value of ['api','database','language','service']) {
    await frame.locator('[data-goal=' + value + ']').click();
    ok(await frame.locator('.delivery-scene').getAttribute('data-focus') === value, 'Goal changes project focus');
  }
  await page.locator('#native-response').fill('Хочу сделать доставку для своего района.');
  await page.locator('#steps button').nth(3).click();
  await page.frameLocator('#lesson-frame').locator('[data-experience=other]').waitFor();
  ok(await page.locator('#native-response').inputValue() === '', 'Review responses are separate for each step');
  await page.locator('#steps button').nth(4).click();
  await page.frameLocator('#lesson-frame').locator('[data-goal=service]').waitFor();
  ok(await page.locator('#native-response').inputValue() === 'Хочу сделать доставку для своего района.', 'Review answer survives step navigation');
  await page.screenshot({path:screenshots + '/goal-desktop.png',fullPage:true});
  frame = await open('start');
  await frame.locator('#build-project').click();
  ok(await frame.locator('.build-scene').getAttribute('data-stage') === '4', 'Reduced motion skips build sequence');
  ok(await frame.locator('.study-details,.start-note,.lesson-head>p').count() === 0, 'Final step has no extra text');
  ok(await frame.locator('#build-status').evaluate(element => getComputedStyle(element).position === 'absolute'), 'Build status is screen-reader only');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await frame.locator('#build-project').click();
  await frame.waitForFunction(() => document.querySelector('.build-scene').dataset.stage === '2');
  ok(await frame.locator('#build-project').isDisabled(), 'No repeated build timers');
  await frame.waitForFunction(() => document.querySelector('.build-scene').dataset.stage === '4');
  ok(await frame.locator('#build-project').isEnabled(), 'Animation completes');
  await page.screenshot({path:screenshots + '/start-desktop.png',fullPage:true});
  ok(errors.length === 0, errors.join('\n'));
  console.log(JSON.stringify({checks,layouts,screenshots,errors,stepikWrites:0},null,2));
} finally {await browser.close();}
