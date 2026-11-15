// Prepare local publication artifacts only; no credentials or API mutations.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {origin,version,target,frameSteps,filename,files,browserOptions,geometry,exercise} from './lib/functions-browser.mjs';
const {steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile('assets/go-mini-functions-content.js','utf8')).toString('base64'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true});
const heights={},measurements=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 if(process.argv.includes('--text-only')){
  // Reuse already validated scene geometry when changing native task prose
  // only. The preserved graders are checked again by the publisher.
  const prior=JSON.parse(await readFile('.local-publication/functions.json','utf8'));
  assert.equal(prior.version,version);assert.equal(prior.lesson,target.lesson);
  for(const step of frameSteps)assert.ok(prior.heights[step]>=300&&prior.heights[step]<=1800);
  Object.assign(heights,prior.heights);measurements.push(...prior.measurements);
 }else{
 for(const step of frameSteps){
 let height=step===19?1500:1100;
 for(const width of [320,390,600,768,1024]){
  await page.setViewportSize({width,height});await page.goto(`${origin}/${filename(step)}?panel=scene&embed=1`);await page.waitForSelector('.is-embed .world');
  const measure=async state=>{
   let m;
   for(let attempt=0;attempt<4;attempt++){
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));m=await page.evaluate(geometry);
    if(m.y<=1&&m.inkBottom<=height)break;
    height=Math.ceil(Math.max(height+m.y,m.inkBottom))+8;assert.ok(height<=1800,`Unbounded frame ${step}/${width}/${state}: ${JSON.stringify(m)}`);await page.setViewportSize({width,height});
   }
   assert.ok(m.x<=0,`Overflow ${step}/${width}/${state}`);assert.ok(m.width>=width-1,`Compressed scene ${step}/${width}`);assert.deepEqual(m.clipped,[],`Clipped ${step}/${width}/${state}`);measurements.push({step,width,state,...m});
  };
  await measure('initial');await exercise(page,step,measure);
 }
 heights[step]=height;console.log('Measured scene',step,height);
 }
 }
 const articles=[];
 for(let position=1;position<=steps.length;position++){
 const item=steps[position-1],task=tasks[item.task];let block;
 if(task){
  const grader=`TESTS = ${JSON.stringify(task.tests)}\n\ndef generate():\n    return [(data, answer) for data, answer in TESTS]\n\ndef solve(dataset):\n    return dict(TESTS)[dataset]\n\ndef check(reply, clue):\n    return reply.replace("\\r\\n", "\\n").strip() == clue.replace("\\r\\n", "\\n").strip()\n`;
  block={name:'code',source:{code:grader,execution_time_limit:5,execution_memory_limit:256,samples_count:task.tests.length,templates_data:'::go\n'+task.starter,is_time_limit_scaled:false,is_memory_limit_scaled:false,manual_time_limits:[],manual_memory_limits:[],test_archive:[]},feedback_correct:'',feedback_wrong:''};
 }else if(item.kind==='quiz')block={name:'choice',source:{is_multiple_choice:false,is_always_correct:false,sample_size:4,preserve_order:true,is_html_enabled:true,is_options_feedback:false,options:item.options.map((text,i)=>({text:text.split('\n').map(line=>line.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')).join('<br>'),is_correct:i===item.answer,feedback:''}))},feedback_correct:item.explanation,feedback_wrong:'Проследите вызов, возврат результата и продолжение вызывающего кода.'};
 else block={name:'text',source:{}};
 const text=await page.evaluate(({item,task,height,file,version})=>{
  const root=document.createElement('div'),h=document.createElement('h1');h.textContent=item.title;root.append(h);
  if(item.kind==='scene')root.insertAdjacentHTML('beforeend',item.lead+`<div data-visual="true"><iframe src="https://zak618.github.io/stepik-course-pages/${file}?panel=scene&amp;embed=1&amp;v=${version}" title="${item.title}" width="100%" height="${height}" style="border:0;display:block;width:100%;max-width:100%;background:#fff;margin:0 auto;vertical-align:top;"></iframe></div>`+item.after);
  else if(task){const p=document.createElement('p');p.textContent=task.text;root.append(p);}
  else{const p=document.createElement('p'),pre=document.createElement('pre');p.textContent=item.prompt;pre.textContent=item.program;root.append(p,pre);}
  for(const pre of root.querySelectorAll('pre')){const box=document.createElement('div');box.dataset.code='true';for(const line of pre.textContent.replace(/\r\n/g,'\n').split('\n')){const row=document.createElement('div'),c=document.createElement('code'),indent=line.match(/^\s*/)[0];row.dataset.indent=String(indent.replace(/\t/g,'    ').length);c.textContent=line.slice(indent.length);if(c.textContent)row.append(c);else row.append(document.createElement('br'));box.append(row,document.createTextNode('\n'));}pre.replaceWith(box);}
  const styles={H1:'font-size:38px;line-height:1.2;font-weight:700;margin:20px 0 22px;color:#17243a;',H2:'font-size:28px;line-height:1.4;font-weight:650;margin:26px 0 16px;color:#24334a;',H3:'font-size:23px;line-height:1.4;font-weight:650;margin:24px 0 14px;color:#24334a;',P:'font-size:20px;line-height:1.8;margin:0 0 20px;color:#26364f;overflow-wrap:anywhere;',CODE:'font-size:17px;line-height:1.8;color:#305bb0;overflow-wrap:anywhere;',STRONG:'font-weight:700;',ASIDE:'font-size:17px;line-height:1.7;padding:10px 0 10px 18px;border-left:3px solid #c8d9ec;color:#536780;margin:22px 0;'};
  for(const n of root.querySelectorAll('*')){if(n.tagName==='IFRAME')continue;const{visual,code,indent}=n.dataset;for(const a of [...n.attributes])n.removeAttribute(a.name);if(styles[n.tagName])n.style.cssText=styles[n.tagName];if(n.tagName==='CODE'&&n.parentElement.tagName==='DIV')n.style.fontSize='16px';if(visual)n.style.cssText='margin:4px 0 0;font-size:0;line-height:0;text-align:center;';if(code)n.style.cssText='padding:12px 14px;background:#f3f6fc;margin:14px 0 22px;overflow-wrap:anywhere;';if(indent!==undefined)n.style.cssText=`margin:0 0 4px ${Math.min(Number(indent)*4,24)}px;font-size:16px;line-height:1.8;overflow-wrap:anywhere;`;}
  const next=root.querySelector('iframe')?.parentElement.nextElementSibling;if(next)next.style.marginTop='10px';return root.innerHTML;
 },{item,task:task||null,height:heights[position]||0,file:filename(position),version});
 assert.ok(!/localhost:|10 баллов|Команда WEB HACKER/.test(text));articles.push({position,cost:item.kind==='scene'?0:10,block:{...block,text}});
 }
 assert.deepEqual(errors,[]);assert.equal(articles.length,22);assert.equal(articles.reduce((n,a)=>n+a.cost,0),140);
 await mkdir('.local-publication',{recursive:true});await writeFile('.local-publication/functions.json',JSON.stringify({...target,version,files,heights,measurements,articles},null,2));
 console.log(JSON.stringify({steps:22,points:140,openCases:Object.values(tasks).reduce((n,t)=>n+t.tests.length,0),heights,measurements:measurements.length},null,2));
}finally{await browser.close();}
