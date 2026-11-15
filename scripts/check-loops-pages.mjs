// Read-only checks against static hosting; no local Go calls or submissions.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {files,version,filename,browserOptions,frameSteps,exercise,geometry} from './lib/loops-browser.mjs';
const base=process.env.STEPIK_LOOPS_PAGES||'https://zak618.github.io/stepik-course-pages';
const hash=x=>createHash('sha256').update(x).digest('hex');
for(const file of files){const r=await fetch(base+'/'+file+'?v='+version,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(await readFile(file)),'Stale file '+file);}
const {steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile('assets/go-mini-loops-content.js','utf8')).toString('base64'));
const plan=JSON.parse(await readFile('.local-publication/loops.json','utf8'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true}),errors=[],runs=[];let checks=files.length;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/loops/run'))runs.push(r.url());});
try{
 for(let i=0;i<steps.length;i++)if(steps[i].kind==='code'){
  await page.goto(base+'/'+filename(i+1)+'?v='+version);await page.waitForSelector('#code-editor');
  assert.equal(await page.locator('#code-editor').getAttribute('readonly'),'');
  assert.equal(await page.locator('.task-example').count(),tasks[steps[i].task].tests.length);
  assert.equal(await page.locator('.task-examples').getAttribute('open'),null);
  assert.equal(await page.locator('.stepik-task-link').getAttribute('href'),`https://stepik.org/lesson/2706564/step/${i+1}?unit=2746579`);
  await page.locator('#code-editor').press('Control+Enter');checks+=4;
 }
 for(const width of [390,1024])for(const step of frameSteps){
  const height=plan.heights[step];await page.setViewportSize({width,height});await page.goto(base+'/'+filename(step)+'?panel=scene&embed=1&v='+version);await page.waitForSelector('.is-embed .world');
  const measure=async state=>{const m=await page.evaluate(geometry);assert.ok(m.x<=0&&m.y<=1,`Static overflow ${step}/${width}/${state}`);assert.deepEqual(m.clipped,[]);checks++;};
  await measure('initial');await exercise(page,step,measure);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(runs,[]);console.log(JSON.stringify({checks,files:files.length,staticGoCalls:runs.length,errors},null,2));
}finally{await browser.close();}
