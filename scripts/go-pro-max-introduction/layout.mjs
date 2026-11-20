// Measure the approved content, then verify the actual responsive iframe markup.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {pages} from '../../courses/305734-go-pro-max/introduction/content.mjs';
import {version, folder, frameText} from './config.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const origin = process.env.GO_MAX_INTRO_URL || 'http://localhost:8796';
const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context = await browser.newContext({reducedMotion:'reduce'});
const page = await context.newPage();
const widths = [280,290,320,350,360,390,430,480,520,580,581,640,738,760,761,820,960,1024,1100,1198,1366];
const output = [];
try {
  for (const definition of pages) {
    const samples = [];
    for (const width of widths) {
      await page.setViewportSize({width,height:1200});
      const fixed = definition.part === 'welcome' ? width <= 600 ? 720 : 650 : definition.part === 'map' ? width <= 600 ? 900 : 820 : 0;
      if (fixed) {samples.push({width,height:fixed});continue;}
      await page.goto(origin + '/' + folder + '/' + definition.file);
      let height = await page.locator('.lesson').evaluate(element => element.getBoundingClientRect().height);
      const buttons = definition.part === 'experience' ? '[data-experience]' : definition.part === 'goal' ? '[data-goal]' : definition.part === 'telegram' ? '[data-post]' : '#build-project';
      for (const button of await page.locator(buttons).all()) {
        await button.click();
        height = Math.max(height, await page.locator('.lesson').evaluate(element => element.getBoundingClientRect().height));
      }
      samples.push({width,height:Math.ceil(height)+8});
    }
    const result = {...definition,samples};
    // Adjust intermediate text-wrap boundaries. No iframe may clip its content.
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      const tests = [...new Set([...widths,...widths.slice(1).map((width,index) => Math.floor((width+widths[index])/2))])].sort((a,b)=>a-b);
      for (const width of tests) {
        await page.setViewportSize({width,height:1500});
        const html = frameText(result).replace('https://zak618.github.io/stepik-course-pages/', origin + '/');
        await page.setContent('<!doctype html><html><head><style>body{margin:0}</style></head><body>' + html + '</body></html>');
        const frame = await (await page.waitForSelector('iframe')).contentFrame();
        await frame.waitForLoadState('load');
        await frame.locator('h1').waitFor();
        let needed = ['welcome','map'].includes(definition.part) ? 0 : await frame.locator('.lesson').evaluate(element => element.getBoundingClientRect().height);
        if (definition.part === 'experience' || definition.part === 'goal') {
          for (const button of await frame.locator(definition.part === 'experience' ? '[data-experience]' : '[data-goal]').all()) {
            await button.click();
            needed = Math.max(needed, await frame.locator('.lesson').evaluate(element => element.getBoundingClientRect().height));
          }
        }
        const metrics = await frame.evaluate(() => ({height:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}));
        assert.ok(metrics.x <= 1, definition.part + ' horizontal overflow at ' + width);
        if (metrics.y > 1 || needed > metrics.height) {
          assert.ok(pass < 3, definition.part + ' still overflows at ' + width);
          const existing = result.samples.find(sample => sample.width === width);
          const height = Math.ceil(Math.max(needed, metrics.height + metrics.y)) + 10;
          if (existing) existing.height = Math.max(existing.height, height);
          else result.samples.push({width,height});
          result.samples.sort((a,b)=>a.width-b.width);
          changed = true;
        }
      }
      if (!changed) break;
    }
    output.push(result);
    console.log(definition.part + ': responsive iframe verified');
  }
  await writeFile(folder + '/publication.json', JSON.stringify({version,pages:output},null,2));
} finally {await browser.close();}
