// Live Stepik layout, GET-only. Hosting bytes are verified before browser routing.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {promisify} from 'node:util';
import {base,folder} from './config.mjs';
import {readVersionFrame} from './version-links.mjs';
import {versionOptions} from '../../courses/305734-go-pro-max/introduction/versions/version-options.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const directory = folder + '/versions';
const plan = JSON.parse(await readFile(directory + '/publication.json','utf8'));
const state = JSON.parse(await readFile(directory + '/step.json','utf8'));
assert.ok(state.source, 'Сначала опубликуйте шаг');
const token = JSON.parse(await readFile('.stepik-accounts/647088271/session.json','utf8')).access_token;
const response = await fetch('https://stepik.org/api/step-sources/' + state.source,{headers:{Authorization:'Bearer ' + token},signal:AbortSignal.timeout(20000)});
assert.ok(response.ok);
const source = (await response.json())['step-sources'][0];
const currentVersion = 'v' + versionOptions(readVersionFrame(source.block.text).url.search).current;
const run = promisify(execFile), assets = new Map();
const hash = value => createHash('sha256').update(value).digest('hex');
for (const file of ['picture.html','picture.css','picture.js','version-options.mjs']) {
  const {stdout} = await run('curl',['--fail','--silent','--show-error','--location','--max-time','30',base + directory + '/' + file + '?v=' + plan.revision],{encoding:'buffer'});
  assert.equal(hash(stdout),hash(await readFile(directory + '/' + file)),'Hosting mismatch: ' + file);
  assets.set(file,stdout);
}
const privateDir = '.local-publication/go-pro-max-versions/' + plan.revision;
await mkdir(privateDir,{recursive:true,mode:0o700});
const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server','--disable-features=OverlayScrollbar']});
const context = await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
await context.route('**/*',route => ['GET','HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
await context.route('https://stepik.org/api/**',route => route.request().method() === 'GET' ? route.continue({headers:{...route.request().headers(),authorization:'Bearer ' + token}}) : route.abort());
// Render the exact hosted files even if Chromium cannot connect to GitHub Pages.
await context.route(base + directory + '/**',async route => {
  const file = new URL(route.request().url()).pathname.split('/').pop();
  assert.ok(assets.has(file));
  await route.fulfill({body:assets.get(file),contentType:file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'text/javascript'});
});
const page = await context.newPage(), results = [], errors = [];
page.on('pageerror',error => errors.push(error.message));
try {
  console.log('Открываю опубликованный шаг Stepik');
  await page.goto(`https://stepik.org/lesson/${state.lesson}/step/${state.position}?unit=${state.unit}`,{waitUntil:'domcontentloaded',timeout:45000});
  const element = page.locator('iframe[src*="/introduction/versions/picture.html"]');
  await element.waitFor({timeout:45000});
  const frame = await (await element.elementHandle()).contentFrame();
  await frame.locator('.release-main-ticket').waitFor();
  assert.equal(await page.getByRole('heading',{name:currentVersion,exact:true}).count(),1);
  for (const width of [1280,800,390]) {
    await page.setViewportSize({width,height:950});
    await element.scrollIntoViewIfNeeded();
    const metrics = await frame.evaluate(() => ({width:innerWidth,height:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}));
    assert.ok(metrics.x<=1 && metrics.y<=1,JSON.stringify(metrics));
    assert.equal(metrics.height,240);
    const scrollingAncestors = await element.evaluate(element => {
      const result = [];
      for (let node=element.parentElement;node&&node!==document.body;node=node.parentElement) {
        if (['auto','scroll'].includes(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+1) result.push(node.className);
      }
      return result;
    });
    assert.deepEqual(scrollingAncestors,[]);
    results.push({viewport:width,...metrics,scrollingAncestors});
    await page.screenshot({path:privateDir + '/native-' + width + '.png'});
    console.log('Без внутреннего скролла: ' + width);
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.mouse.move(0,0);
  await frame.waitForFunction(() => document.getAnimations().some(animation=>animation.playState==='running'),null,{timeout:3000}).catch(async error => {
    console.log(JSON.stringify(await frame.evaluate(() => ({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:document.hidden,classes:document.querySelector('.release-picture').className,hover:document.querySelector('.release-picture').matches(':hover'),focus:document.querySelector('.release-picture').matches(':focus-within'),animations:document.getAnimations().map(a=>({name:a.animationName,state:a.playState}))}))));
    throw error;
  });
  assert.ok(await frame.evaluate(() => document.getAnimations().some(animation=>animation.playState==='running')));
  await frame.locator('.release-picture').focus();
  await frame.waitForFunction(() => {
    const animations = document.getAnimations().filter(animation=>animation.constructor.name==='CSSAnimation');
    return animations.length > 0 && animations.every(animation=>animation.playState==='paused');
  },null,{timeout:3000});
  assert.deepEqual(await frame.evaluate(() => [...document.querySelectorAll('.release-main-ticket strong')].map(node=>node.textContent)),[currentVersion]);
  await writeFile(privateDir + '/native-layout.json',JSON.stringify({stepikWrites:0,hostBytesVerified:true,routedVerifiedAssets:true,results,animation:true,focusPause:true,pageErrors:errors},null,2),{mode:0o600});
  console.log(JSON.stringify({nativeStep:state.source,widths:results.length,noInnerScroll:true,animation:true,pageErrors:errors.length}));
} finally {
  await context.unrouteAll({behavior:'ignoreErrors'});
  await browser.close();
}
