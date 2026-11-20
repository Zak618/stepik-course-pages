// Read-only: account for the real Stepik sidebar before emitting height formulas.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {version,folder,privateDir,lesson,unit} from './config.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const token = JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const plan = JSON.parse(await readFile(folder + '/publication.json','utf8'));
const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context = await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
await context.route('https://stepik.org/api/**', route => route.request().method()==='GET' ? route.continue({headers:{...route.request().headers(),authorization:'Bearer ' + token}}) : route.abort());
const page = await context.newPage();
const samples = [];
try {
  await page.goto(`https://stepik.org/lesson/${lesson}/step/1?unit=${unit}`,{waitUntil:'domcontentloaded'});
  const frame = page.locator('iframe[src*="' + folder + '/01-welcome"]');
  await frame.waitFor();
  for (const viewport of [320,360,390,430,480,580,640,760,767,768,769,800,900,960,991,992,1024,1099,1100,1198,1280,1366,1440,1600,1920]) {
    await page.setViewportSize({width:viewport,height:1100});
    await page.waitForTimeout(220);
    samples.push({viewport,width:Math.floor((await frame.boundingBox()).width)});
  }
  const heightAt = (points,width) => {
    if(width<=points[0].width)return points[0].height;
    for(let index=1;index<points.length;index++) {
      const a=points[index-1],b=points[index];
      if(width<=b.width)return a.height+(b.height-a.height)*(width-a.width)/(b.width-a.width);
    }
    return points.at(-1).height;
  };
  for(const definition of plan.pages) {
    definition.nativeSamples=samples.map(sample=>({width:sample.viewport,height:Math.ceil(heightAt(definition.samples,sample.width)) + (['welcome','map'].includes(definition.part)?0:40)}));
    assert.ok(definition.nativeSamples.every(sample=>sample.height>0));
  }
  plan.version=version;
  plan.nativeWidths=samples;
  await writeFile(folder + '/publication.json',JSON.stringify(plan,null,2));
  await writeFile(privateDir + '/native-widths.json',JSON.stringify(samples,null,2),{mode:0o600});
  console.log(JSON.stringify({nativeWidths:samples.length,pages:plan.pages.length,version,stepikWrites:0}));
} finally {await context.unrouteAll({behavior:'ignoreErrors'});await browser.close();}
