// Read-only verification of the actual static host. Never calls the Go runner.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {files,version,filename,browserOptions} from './lib/conditions-browser.mjs';
const base=process.env.STEPIK_CONDITIONS_PAGES||'https://zak618.github.io/stepik-course-pages';
const hash=x=>createHash('sha256').update(x).digest('hex');
for(const file of files){const r=await fetch(base+'/'+file+'?v='+version,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(await readFile(file)),'Stale file '+file);}
const {steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile('assets/go-mini-conditions-content.js','utf8')).toString('base64'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true}),errors=[],runs=[];let checks=files.length;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/conditions/run'))runs.push(r.url());});
try{
 for(let i=0;i<steps.length;i++)if(steps[i].kind==='code'){
  await page.goto(base+'/'+filename(i+1)+'?v='+version);await page.waitForSelector('#code-editor');
  assert.equal(await page.locator('#code-editor').getAttribute('readonly'),'');
  assert.equal(await page.locator('.task-example').count(),tasks[steps[i].task].tests.length);
  assert.equal(await page.locator('.stepik-task-link').getAttribute('href'),`https://stepik.org/lesson/2706562/step/${i+1}?unit=2746577`);
  await page.locator('#code-editor').press('Control+Enter');checks+=3;
 }
 await page.goto(base+'/'+filename(7)+'?panel=scene&embed=1&v='+version);await page.waitForSelector('#lamp-a');await page.click('#lamp-a');await page.click('#lamp-b');assert.equal(await page.locator('#circuit-out').textContent(),'true');checks++;
 await page.goto(base+'/'+filename(3)+'?panel=scene&embed=1&v='+version);await page.waitForSelector('#rail-run');await page.click('#rail-run');await page.waitForFunction(()=>!document.querySelector('#rail-run').disabled);assert.ok((await page.locator('.status').textContent()).includes('Поиск завершён'));checks++;
 assert.deepEqual(errors,[]);assert.deepEqual(runs,[]);console.log(JSON.stringify({checks,files:files.length,staticGoCalls:runs.length,errors},null,2));
}finally{await browser.close();}
