import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const origin = process.env.STEPIK_FINALE_URL || 'http://localhost:8787';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server']});
const context = await browser.newContext({reducedMotion: 'reduce', bypassCSP: true, permissions: ['clipboard-read', 'clipboard-write']});
const page = await context.newPage();
const screenshots = await mkdtemp(path.join(tmpdir(), 'pro-gift-qa-'));
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let checks = 0;
const ok = (value, message) => { checks++; assert.ok(value, message); };
async function scratch(p) {
  const rect = await p.locator('#cover').boundingBox();
  await p.mouse.move(rect.x + 10, rect.y + 10);
  await p.mouse.down();
  for (let y = 12; y < rect.height; y += 24) {
    await p.mouse.move(rect.x + 10, rect.y + y);
    await p.mouse.move(rect.x + rect.width - 10, rect.y + y, {steps: 10});
    if (await p.locator('#copy').isVisible()) break;
  }
  await p.mouse.up();
  await p.locator('#copy').waitFor({state: 'visible'});
}
try {
  for (const width of [280, 320, 350, 390, 580, 581, 640, 1024, 1360]) {
    await page.setViewportSize({width, height: 230});
    await page.goto(origin + '/courses/305666-go-mini/modules/06-project/pro-ticket.html');
    await page.waitForSelector('#cover:not([hidden])');
    ok(await page.locator('#copy').isHidden(), 'Copy appears only after scratching');
    const size = await page.evaluate(() => ({x: document.documentElement.scrollWidth - innerWidth, height: document.querySelector('main').getBoundingClientRect().height}));
    ok(size.x <= 0, 'No horizontal overflow at ' + width);
    ok(size.height <= 230 && size.height >= 210, 'Compact iframe height at ' + width + ': ' + size.height);
    ok(await page.locator('button').count() === 1, 'Only one button');
    ok(await page.locator('#promo').inputValue() === 'GOSHECHKA10', 'Exact promo');
    ok(await page.locator('h1,a').count() === 0, 'No repeated course heading or link');
    await scratch(page);
    await page.locator('#copy').click();
    await page.waitForFunction(() => document.querySelector('#copy-status').textContent === 'Скопировано!');
    ok(await page.evaluate(() => navigator.clipboard.readText()) === 'GOSHECHKA10', 'Real clipboard at ' + width);
    ok(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length) === 0, 'Reduced motion');
    await page.locator('main').screenshot({path: path.join(screenshots, width + '.png')});
  }
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.reload();
  await page.waitForSelector('#cover:not([hidden])');
  ok(await page.locator('#copy').isHidden(), 'No automatic ticket reveal');
  await page.locator('#cover').focus();
  await page.keyboard.press('Enter');
  ok(await page.locator('#copy').evaluate(el => document.activeElement === el), 'Keyboard reveal focuses copy');
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
  ok(await page.locator('#cover').evaluate(el => getComputedStyle(el).opacity === '0'), 'Cover removed');

  const touch = await browser.newContext({viewport: {width: 390, height: 600}, hasTouch: true, isMobile: true, deviceScaleFactor: 2, bypassCSP: true});
  const touchPage = await touch.newPage();
  await touchPage.goto(origin + '/ticket');
  const box = await touchPage.locator('#cover').boundingBox();
  const cdp = await touch.newCDPSession(touchPage);
  for (let y = 15; y < box.height && await touchPage.locator('#copy').isHidden(); y += 24) {
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: box.x + 8, y: box.y + y}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: box.x + box.width - 8, y: box.y + y}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  }
  await touchPage.locator('#copy').waitFor({state: 'visible'});
  ok(true, 'Real touch scratching at 2x DPR');
  await touch.close();

  const fallback = await context.newPage();
  await fallback.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {value: undefined}));
  await fallback.goto(origin + '/ticket');
  await fallback.locator('#cover').press('Enter');
  await fallback.locator('#copy').click();
  await fallback.waitForFunction(() => document.querySelector('#copy-status').textContent === 'Скопировано!');
  ok(await page.evaluate(() => navigator.clipboard.readText()) === 'GOSHECHKA10', 'Legacy copy fallback');
  await fallback.close();
  const denied = await context.newPage();
  await denied.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {value: {writeText: () => Promise.reject(Error('Denied'))}});
    document.execCommand = () => false;
  });
  await denied.goto(origin + '/ticket');
  await denied.locator('#cover').press('Enter');
  await denied.locator('#copy').click();
  await denied.waitForFunction(() => document.querySelector('#copy-status').textContent.includes('Выделите'));
  ok(await denied.locator('#promo').evaluate(el => el.selectionStart === 0 && el.selectionEnd === el.value.length), 'Manual selection when denied');
  ok(!(await denied.locator('#copy-status').innerText()).includes('Скопировано'), 'No false success');
  await denied.close();
  const noJS = await browser.newContext({javaScriptEnabled: false});
  const staticPage = await noJS.newPage();
  await staticPage.goto(origin + '/ticket');
  ok(await staticPage.locator('#promo').isVisible(), 'Code usable without JavaScript');
  ok(await staticPage.locator('#copy').isHidden(), 'No broken button without JavaScript');
  await noJS.close();
  ok(errors.length === 0, errors.join('\n'));
  console.log(JSON.stringify({checks, height: 230, screenshots, errors}, null, 2));
} finally {
  await browser.close();
}
