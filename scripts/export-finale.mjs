// Local export and saved-HTML layout checks. No Stepik credentials or writes.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const origin=process.env.STEPIK_FINALE_URL||'http://localhost:8787';
const base='https://zak618.github.io/stepik-course-pages/';
const version='finale-20261115-1';
const files=['courses/305666-go-mini/modules/06-project/finale-preview.html','courses/305666-go-mini/modules/06-project/lesson-01-step-13.html','courses/305666-go-mini/modules/06-project/lesson-02-step-01.html','assets/go-mini-finale.js','assets/go-mini-finale.css'];
const targets=[{lesson:2706569,unit:2746584,title:'Итоговый проект',position:13,file:files[1]},{lesson:2713291,unit:2753290,title:'Что дальше',position:1,file:files[2]}];
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true}),errors=[],measurements=[],articles=[];
page.on('pageerror',e=>errors.push(e.message));
const screenshots=await mkdtemp(path.join(tmpdir(),'finale-embed-'));
const published=process.argv.includes('--published');
try{
 for(const target of targets){
  const sizes=[];
  for(const width of [320,390,640,1024,1360]){
   await page.setViewportSize({width,height:950});await page.goto(`${origin}/${target.file}?embed=1`);
   await page.waitForFunction(()=>document.querySelector('.theatre-followup:not([hidden])')||document.querySelector('.city-status')?.textContent.includes('Доставлено'));
   const m=await page.evaluate(()=>({height:Math.ceil(document.querySelector('.finale-page').getBoundingClientRect().bottom),overflow:document.documentElement.scrollWidth>innerWidth+1}));
   assert.ok(!m.overflow);sizes.push(m.height);measurements.push({lesson:target.lesson,width,...m});
   if(target.position===13){assert.equal(await page.locator('#finale-next').getAttribute('target'),'_top');assert.equal(await page.locator('#finale-next').getAttribute('href'),'https://stepik.org/lesson/2713291/step/1?unit=2753290');}
   else assert.equal(await page.locator('.pro-story').isVisible(),false);
  }
  const height=Math.max(...sizes)+4;assert.ok(height-Math.min(...sizes)<=60,'Large frame gap');
  let text=`<div style="font-size:0;line-height:0;margin:0;"><iframe src="${base}${target.file}?embed=1&amp;v=${version}" title="${target.position===13?'Первый акт':'Go-шечка (pro)'}" width="100%" height="${height}" style="border:0;width:100%;background:#fff;margin:0;"></iframe></div>`;
  if(target.position===1){
   await page.goto(`${origin}/${target.file}`);await page.waitForSelector('.pro-story');
   text+=await page.locator('.pro-story').evaluate(el=>{
    const root=el.cloneNode(true);
    for(const n of [root,...root.querySelectorAll('*')]){
     const cls=n.className;for(const a of [...n.attributes])if(!['href','target','rel'].includes(a.name))n.removeAttribute(a.name);
     if(n.tagName==='P')n.style.cssText='font-size:20px;line-height:1.8;margin:20px 0;color:#26364f;';
     if(n.tagName==='H2')n.style.cssText='font-size:28px;line-height:1.4;margin:30px 0 18px;color:#24334a;';
     if(n.tagName==='A')n.style.cssText='font-size:20px;line-height:1.8;';
     if(cls==='paid-note')n.style.cssText='font-size:16px;line-height:1.6;margin:10px 0 24px;color:#66758b;';
     if(cls==='team-signature')n.style.cssText='font-size:18px;line-height:1.6;margin:22px 0;color:#6d5b8a;font-weight:700;';
    }
    return root.innerHTML;
   });
  }
  articles.push({...target,cost:0,block:{name:'text',source:{},text}});
 }
 const plan={account:647088271,course:305666,version,files,measurements,articles};
 await mkdir('.local-publication',{recursive:true});
 if(!published)await writeFile('.local-publication/finale.json',JSON.stringify(plan,null,2));
 const saved=published?JSON.parse(await readFile('.local-publication/finale-verified.json','utf8')):plan;
 for(const article of saved.articles){
  const html=article.block.text.replaceAll(base,origin+'/');
  for(const width of [320,390,640,1024,1360]){
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/finale');await page.setContent('<!doctype html><html lang="ru"><body style="margin:0;font-family:Arial,sans-serif">'+html+'</body></html>');
   const frame=page.frames().find(f=>f.parentFrame());assert.ok(frame);await frame.waitForFunction(()=>document.querySelector('.theatre-followup:not([hidden])')||document.querySelector('.city-status')?.textContent.includes('Доставлено'));
   const m=await frame.evaluate(()=>({gap:innerHeight-document.querySelector('.finale-page').getBoundingClientRect().bottom,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}));
   assert.ok(m.x<=1&&m.y<=1&&m.gap>=0&&m.gap<=60,JSON.stringify({width,lesson:article.lesson,...m}));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:path.join(screenshots,`${article.lesson}-${width}.png`),fullPage:true});
  }
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({mode:published?'saved Stepik HTML':'local export',heights:articles.map(a=>[a.lesson,Number(a.block.text.match(/height="(\d+)"/)[1])]),measurements:measurements.length,screenshots,errors},null,2));
}finally{await browser.close();}
