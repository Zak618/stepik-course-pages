// Read-only browser audit of actual published iframe URLs and numeric heights.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {base,version} from '../../shared/course-introductions/catalog.mjs';
const dir='.local-publication/intros-deep-audit-20261116',origin=process.env.STEPIK_UNIFIED_URL||'http://localhost:8795';
const snapshot=JSON.parse(await readFile(dir+'/snapshot.json','utf8')),layout=JSON.parse(await readFile('.local-publication/unified-intros-preview-20261116/layout.json','utf8'));
const map=JSON.parse(await readFile('courses/305666-go-mini/legacy-paths.json','utf8'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce'}),jobs=new Map(),errors=[],geometry=[];
for(const s of snapshot.sources){const text=layout.updates.find(u=>u.id===s.id)?.text||s.block.text;for(const m of text.matchAll(/<iframe\b[^>]*>/g)){
  const src=m[0].match(/src="([^"]+)"/)?.[1],height=Number(m[0].match(/height="(\d+)"/)?.[1]);if(!src?.startsWith(base)||!height)continue;
  let file=src.slice(base.length).replaceAll('&amp;','&'),old=file.split(/[?#]/)[0];if(map[old])file=map[old]+file.slice(old.length);
  jobs.set(file+'|'+height,{file,height,id:s.id});
}}
// Rules removed from the combined steps still receive their own complete audit.
for(const u of layout.updates.filter(u=>u.role==='community')){const folder=u.text.match(/src="[^"]*\/(courses\/[^?]+)\/02-telegram\.html/);if(folder){const height=layout.heights[u.course+':rules'],file=folder[1]+'/05-rules.html?embed=1&v='+version;jobs.set(file+'|'+height,{file,height,id:u.id});}}
let index=0;const list=[...jobs.values()];
try{
 await Promise.all(Array.from({length:4},async()=>{const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin))errors.push(r.status()+' '+r.url());});while(index<list.length){const job=list[index++];for(const width of[360,1024]){
   await page.setViewportSize({width,height:job.height});
   // Old mini pages detect embedding via window.top, not a URL parameter.
   await page.setContent('<!doctype html><body style="margin:0"><iframe src="'+origin+'/'+job.file.replaceAll('&','&amp;')+'" style="display:block;border:0;width:100%" height="'+job.height+'"></iframe>',{waitUntil:'load'});
   const frame=await(await page.locator('iframe').elementHandle()).contentFrame();await frame.locator('main').waitFor();await page.waitForTimeout(60);
   const m=await frame.evaluate(()=>({x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,fallback:['Открыть урок','Перейти'].includes(document.body.innerText.trim())}));geometry.push({...job,width,...m});
 }}await page.close();}));
 // Hold the destination response: the intermediate page must stay text-free.
 const page=await context.newPage();const flashed=[];await page.exposeBinding('recordFlash',(_,url)=>flashed.push(url));await page.addInitScript(()=>{new MutationObserver(()=>{if(document.body&&/^(Открыть урок|Перейти)$/.test(document.body.innerText.trim()))window.recordFlash(location.href);}).observe(document,{subtree:true,childList:true});});
 for(const old of['go-mini-module-01-lesson-01-step-02.html','go-mini-module-05-lesson-01-step-01.html','go-mini-pro-ticket.html']){
   await page.route('**/courses/305666-go-mini/**',async route=>{await new Promise(r=>setTimeout(r,700));await route.continue();});
   await page.goto(origin+'/'+old+'?embed=1&keep=1#keep',{waitUntil:'load'});await page.waitForURL('**/'+map[old]+'?**');assert.equal(new URL(page.url()).searchParams.get('keep'),'1');assert.equal(new URL(page.url()).hash,'#keep');await page.unrouteAll({behavior:'ignoreErrors'});
 }
 assert.deepEqual(flashed,[]);assert.deepEqual(errors,[]);
 const problems=geometry.filter(m=>m.x>2||m.y>4||m.fallback);
 await writeFile(dir+'/browser-audit.json',JSON.stringify({version,frames:jobs.size,checks:geometry.length,geometry,problems,errors,flashTests:3},null,2),{mode:0o600});
 console.log(JSON.stringify({frames:jobs.size,checks:geometry.length,problems:problems.map(({id,file,width,x,y})=>({id,file,width,x,y})),errors,flashTests:3}));
}finally{await browser.close();}
