// Read-only native lesson check. Never send progress, answers, or enrollment.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {lesson, unit, folder, privateDir} from './config.mjs';
import {pages} from '../../courses/305734-go-pro-max/introduction/content.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const token = JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context = await browser.newContext({reducedMotion:'reduce',bypassCSP:true,serviceWorkers:'block'});
await context.route('https://stepik.org/api/**', async route => {
  if (route.request().method() !== 'GET') return route.abort();
  return route.continue({headers:{...route.request().headers(),authorization:'Bearer ' + token}});
});
const page = await context.newPage();
const results = [];
try {
  for (const width of [1366,800,390]) {
    await page.setViewportSize({width,height:1100});
    for (let index = 0; index < pages.length; index++) {
      const definition = pages[index];
      if(width===800 && !['experience','goal'].includes(definition.part)) continue;
      await page.goto(`https://stepik.org/lesson/${lesson}/step/${index+1}?unit=${unit}`,{waitUntil:'domcontentloaded',timeout:45000});
      const element = page.locator('iframe[src*="' + folder + '/' + definition.file + '"]');
      await element.waitFor({timeout:30000});
      const frame = await (await element.elementHandle()).contentFrame();
      await frame.locator('h1').waitFor();
      await frame.waitForLoadState('load');
      if (definition.part === 'experience') await frame.locator('[data-experience=other]').click();
      if (definition.part === 'goal') await frame.locator('[data-goal=service]').click();
      if (definition.part === 'start') await frame.locator('#build-project').click();
      const metrics = await frame.evaluate(() => ({width:innerWidth,height:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,contentHeight:document.querySelector('main').getBoundingClientRect().height}));
      assert.ok(metrics.x<=1 && metrics.y<=1,definition.part + ' native overflow at ' + width + ': ' + JSON.stringify(metrics));
      assert.ok(metrics.height - metrics.contentHeight < 160,definition.part + ' excessive empty area at ' + width);
      const text = await frame.locator('body').innerText();
      assert.ok(!/[—–]/.test(text),'Dash in native lesson');
      if (definition.type === 'free-answer') assert.equal(await frame.locator('textarea,#copy-answer').count(),0);
      results.push({part:definition.part,viewport:width,...metrics});
      await page.screenshot({path:privateDir + '/' + definition.part + '-' + width + '.png',fullPage:true});
      console.log('Native ' + definition.part + ' at ' + width + ': OK');
    }
  }
  await writeFile(privateDir + '/browser.json',JSON.stringify({results,stepikWrites:0,actualNativeStepLoads:true},null,2),{mode:0o600});
} finally {
  await context.unrouteAll({behavior:'ignoreErrors'});
  await browser.close();
}
