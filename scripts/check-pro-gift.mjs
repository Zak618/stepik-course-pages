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
try {
  for (const width of [280, 320, 350, 390, 580, 581, 640, 1024, 1360]) {
    await page.setViewportSize({width, height: 500});
    await page.goto(origin + '/go-mini-module-06-lesson-02-step-01.html');
    await page.waitForSelector('#copy:not([hidden])');
    const size = await page.evaluate(() => ({x: document.documentElement.scrollWidth - innerWidth, height: document.querySelector('main').getBoundingClientRect().height}));
    ok(size.x <= 0, 'No horizontal overflow at ' + width);
    ok(size.height <= 500 && size.height >= 470, 'Compact iframe height at ' + width + ': ' + size.height);
    ok(await page.locator('button').count() === 1, 'Only one button');
    ok(await page.locator('#promo').inputValue() === 'GOSHECHKA10', 'Exact promo');
    ok(await page.locator('.course-link').getAttribute('href') === 'https://stepik.org/course/300562/promo', 'Exact course');
    await page.locator('#copy').click();
    await page.waitForFunction(() => document.querySelector('#copy-status').textContent === 'Скопировано!');
    ok(await page.evaluate(() => navigator.clipboard.readText()) === 'GOSHECHKA10', 'Real clipboard at ' + width);
    ok(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length) === 0, 'Reduced motion');
    await page.locator('main').screenshot({path: path.join(screenshots, width + '.png')});
  }
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.reload();
  await page.waitForSelector('.animate');
  ok(await page.evaluate(() => document.getAnimations().some(a => a.playState === 'running')), 'Automatic reveal');
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
  ok(await page.locator('.lid').evaluate(el => getComputedStyle(el).opacity === '0'), 'Lid leaves the coupon');
  ok(await page.locator('.reveal').evaluate(el => getComputedStyle(el).opacity === '1'), 'Code revealed');

  const fallback = await context.newPage();
  await fallback.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {value: undefined}));
  await fallback.goto(origin + '/next');
  await fallback.locator('#copy').click();
  await fallback.waitForFunction(() => document.querySelector('#copy-status').textContent === 'Скопировано!');
  ok(await page.evaluate(() => navigator.clipboard.readText()) === 'GOSHECHKA10', 'Legacy copy fallback');
  await fallback.close();
  const denied = await context.newPage();
  await denied.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {value: {writeText: () => Promise.reject(Error('Denied'))}});
    document.execCommand = () => false;
  });
  await denied.goto(origin + '/next');
  await denied.locator('#copy').click();
  await denied.waitForFunction(() => document.querySelector('#copy-status').textContent.includes('Выделите'));
  ok(await denied.locator('#promo').evaluate(el => el.selectionStart === 0 && el.selectionEnd === el.value.length), 'Manual selection when denied');
  ok(!(await denied.locator('#copy-status').innerText()).includes('Скопировано'), 'No false success');
  await denied.close();
  const noJS = await browser.newContext({javaScriptEnabled: false});
  const staticPage = await noJS.newPage();
  await staticPage.goto(origin + '/next');
  ok(await staticPage.locator('#promo').isVisible(), 'Code usable without JavaScript');
  ok(await staticPage.locator('#copy').isHidden(), 'No broken button without JavaScript');
  await noJS.close();
  ok(errors.length === 0, errors.join('\n'));
  console.log(JSON.stringify({checks, height: 500, screenshots, errors}, null, 2));
} finally {
  await browser.close();
}
