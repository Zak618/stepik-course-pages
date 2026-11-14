// Local preparation only. No API calls, credentials, or learner submissions.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {origin,version,target,frameSteps,filename,browserOptions,geometry,exercise,files} from './lib/input-browser.mjs';
const {steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile('assets/go-mini-input-content.js','utf8')).toString('base64'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true});
const heights={},measurements=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const step of frameSteps)for(const width of[320,360,390,420]){
  await page.setViewportSize({width,height:1800});await page.goto(`${origin}/${filename(step)}?panel=scene`);await page.waitForSelector('.scene-only .world');
  const measure=async state=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const m=await page.evaluate(geometry);assert.ok(m.x<=0,`Horizontal overflow ${step}/${width}/${state}`);heights[step]=Math.max(heights[step]||0,m.main,m.inkBottom+4);measurements.push({step,width,state,...m});};
  await measure('initial');await exercise(page,step,measure);
 }
 const exported=[];
 for(let position=1;position<=12;position++){
  const item=steps[position-1],task=tasks[item.task];let block;
  if(task){
   const grader=`TESTS = ${JSON.stringify(task.tests)}\n\ndef generate():\n    return [(data, answer) for data, answer in TESTS]\n\ndef solve(dataset):\n    return dict(TESTS)[dataset]\n\ndef check(reply, clue):\n    return reply.replace("\\r\\n", "\\n").rstrip("\\n") == clue.replace("\\r\\n", "\\n").rstrip("\\n")\n`;
   block={name:'code',source:{code:grader,execution_time_limit:5,execution_memory_limit:256,samples_count:1,templates_data:'::go\n'+task.starter,is_time_limit_scaled:false,is_memory_limit_scaled:false,manual_time_limits:[],manual_memory_limits:[],test_archive:[]},feedback_correct:'',feedback_wrong:''};
  }else if(item.kind==='quiz')block={name:'choice',source:{is_multiple_choice:false,is_always_correct:false,sample_size:4,preserve_order:true,is_html_enabled:true,is_options_feedback:false,options:item.options.map((text,i)=>({text:text.split('\n').map(line=>line.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')).join('<br>'),is_correct:i===item.answer,feedback:''}))},feedback_correct:item.explanation,feedback_wrong:'Каждый Scan читает очередную строку целиком. Затем проследите порядок Println.'};
  else block={name:'text',source:{}};
  const text=await page.evaluate(({item,task,height,filename,version})=>{
   const root=document.createElement('div');
   const h=document.createElement('h1');h.textContent=item.title;root.append(h);
   if(item.kind==='scene')root.insertAdjacentHTML('beforeend',item.lead+`<div data-visual="true"><iframe src="https://zak618.github.io/stepik-course-pages/${filename}?panel=scene&v=${version}" title="${item.title}" width="100%" height="${height}" style="border:0;display:block;width:100%;max-width:420px;background:#fff;margin:0 auto;vertical-align:top;"></iframe></div>`+item.after);
   else if(task){const p=document.createElement('p');p.textContent=task.text;root.append(p);}
   else{const p=document.createElement('p'),pre=document.createElement('pre');p.textContent=item.prompt;pre.textContent=item.program;root.append(p,pre);}
   for(const pre of root.querySelectorAll('pre')){const box=document.createElement('div');box.dataset.code='true';for(const line of pre.textContent.split('\n')){const row=document.createElement('div'),c=document.createElement('code'),indent=line.match(/^\s*/)[0];row.dataset.indent=String(indent.replace(/\t/g,'    ').length);c.textContent=line.slice(indent.length);if(c.textContent)row.append(c);else row.append(document.createElement('br'));box.append(row,document.createTextNode('\n'));}pre.replaceWith(box);}
   const styles={H1:'font-size:38px;line-height:1.2;font-weight:700;margin:20px 0 22px;color:#17243a;',H2:'font-size:28px;line-height:1.4;font-weight:650;margin:26px 0 16px;color:#24334a;',P:'font-size:20px;line-height:1.8;margin:0 0 20px;color:#26364f;',CODE:'font-size:18px;line-height:1.8;color:#305bb0;',STRONG:'font-weight:700;',ASIDE:'font-size:17px;line-height:1.7;padding:10px 0 10px 18px;border-left:3px solid #c8d9ec;color:#536780;margin:22px 0;'};
   for(const n of root.querySelectorAll('*')){if(n.tagName==='IFRAME')continue;const {visual,code,indent}=n.dataset;for(const a of [...n.attributes])n.removeAttribute(a.name);if(styles[n.tagName])n.style.cssText=styles[n.tagName];if(visual)n.style.cssText='margin:4px 0 0;font-size:0;line-height:0;text-align:center;';if(code)n.style.cssText='padding:18px 20px;background:#f3f6fc;margin:14px 0 22px;';if(indent!==undefined)n.style.cssText=`margin:0 0 4px ${Number(indent)*8}px;font-size:18px;line-height:1.8;`;}
   const afterScene=root.querySelector('iframe')?.parentElement.nextElementSibling;
   if(afterScene)afterScene.style.marginTop='10px';
   return root.innerHTML;
  },{item,task:task||null,height:heights[position]||0,filename:filename(position),version});
  assert.ok(!/localhost:|10 баллов|Программа уже собрана|Вход · две строки/.test(text));
  exported.push({position,cost:item.kind==='scene'?0:10,block:{...block,text}});
 }
 assert.equal(exported.length,12);assert.equal(exported.reduce((n,s)=>n+s.cost,0),60);assert.deepEqual(errors,[]);
 await mkdir('.local-publication',{recursive:true});
 await writeFile('.local-publication/input.json',JSON.stringify({...target,version,files,heights,measurements,articles:exported},null,2));
 console.log(JSON.stringify({steps:12,codeTasks:5,choiceTasks:1,points:60,heights,measurements:measurements.length,maxVisibleTail:Math.max(...measurements.map(m=>heights[m.step]-m.inkBottom))},null,2));
}finally{await browser.close();}
