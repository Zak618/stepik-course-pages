// Local artifact generation only. No credentials, API writes or submissions.
import assert from 'node:assert/strict';
import{readFile,writeFile,mkdir,stat}from'node:fs/promises';
import{origin,version,target,frameSteps,filename,browserOptions,geometry,exercise,files}from'./lib/variables-browser.mjs';
const load=async file=>import('data:text/javascript;base64,'+Buffer.from(await readFile(file,'utf8')).toString('base64'));
const {articles}=await load('assets/go-mini-variables-content.js'),{tasks,quiz}=await load('assets/go-mini-variables-tasks.js');
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true});
const heights={},measurements=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  const reuseLayout=process.argv.includes('--reuse-layout');
  if(reuseLayout){const file='.local-publication/variables-measurements.json',measuredAt=(await stat(file)).mtimeMs;for(const asset of files)assert.ok((await stat(asset)).mtimeMs<=measuredAt,'Scene changed; run a full layout measurement: '+asset);const saved=JSON.parse(await readFile(file,'utf8'));Object.assign(heights,saved.heights);measurements.push(...saved.measurements);}
  else for(const step of frameSteps)for(const width of[320,390,420,480]){
    await page.setViewportSize({width,height:1800});await page.goto(`${origin}/${filename(step)}?panel=scene`);await page.waitForFunction(()=>document.body.classList.contains('scene-only'));
    const measure=async state=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const m=await page.evaluate(geometry);assert.ok(m.x<=0,`Horizontal overflow ${step}/${width}/${state}`);assert.deepEqual(m.overflow,[],`Element overflow ${step}/${width}/${state}`);const height=Math.max(m.main,m.inkBottom+4);heights[step]=Math.max(heights[step]||0,height);measurements.push({step,width,state,...m});};
    await measure('initial');await exercise(page,step,measure);
  }
  await mkdir('.local-publication',{recursive:true});if(!reuseLayout)await writeFile('.local-publication/variables-measurements.json',JSON.stringify({heights,measurements},null,2));
  for(const m of measurements)assert.ok(heights[m.step]-m.inkBottom<=64,`Visible empty tail ${m.step}/${m.width}/${m.state}: ${heights[m.step]-m.inkBottom}`);
  const exported=[];
  for(let step=1;step<=16;step++){
    const item=articles[step]||tasks[step]||quiz[step],task=tasks[step],q=quiz[step];let block;
    assert.ok(/[.?]$/.test(item.title)||item.title==='Проверим знания','Heading punctuation');
    if(task){const code=`EXPECTED = ${JSON.stringify(task.expected)}\n\ndef generate():\n    return [("", EXPECTED)]\n\ndef solve(dataset):\n    return EXPECTED\n\ndef check(reply, clue):\n    return reply.replace("\\r\\n", "\\n").rstrip("\\n") == clue.replace("\\r\\n", "\\n").rstrip("\\n")\n`;
      block={name:'code',source:{code,execution_time_limit:5,execution_memory_limit:256,samples_count:1,templates_data:'::go\n'+task.starter,is_time_limit_scaled:false,is_memory_limit_scaled:false,manual_time_limits:[],manual_memory_limits:[],test_archive:[]},feedback_correct:'',feedback_wrong:''};
    }else if(q){block={name:'choice',source:{is_multiple_choice:false,is_always_correct:false,sample_size:4,preserve_order:true,is_html_enabled:false,is_options_feedback:false,options:['Первая строка: функции. Вторая строка: функции.','Первая строка: циклы. Вторая строка: функции.','Первая строка: циклы. Вторая строка: циклы.','Ошибка сборки: saved нельзя присвоить значение другой переменной.'].map((text,i)=>({text,is_correct:i===q.correct,feedback:''}))},feedback_correct:q.explanation,feedback_wrong:q.hints[1]};}
    else block={name:'text',source:{}};
    const raw=articles[step]?`<h1>${item.title}</h1><p>${item.lead}</p>${item.before}<div data-visual="true"><iframe src="https://zak618.github.io/stepik-course-pages/${filename(step)}?panel=scene&v=${version}" title="Опыт: ${item.nav}" width="100%" height="${heights[step]}" style="border:0;display:block;width:min(100%,480px);max-width:100%;background:#fff;margin:0 auto;vertical-align:top;"></iframe></div>${item.after}`:`<h1>${item.title}</h1>${task?task.brief:q.prompt}`;
    const text=await page.evaluate(({raw,task,q})=>{
      const root=document.createElement('div');root.innerHTML=raw;
      if(task){const label=document.createElement('p'),pre=document.createElement('pre');label.textContent='Ожидаемый вывод:';pre.textContent=task.expected;root.append(label,pre);}
      if(q){const pre=document.createElement('pre');pre.textContent=q.code;root.append(pre);}
      // Stepik removes display:flex, white-space and overflow-wrap. Use ordinary
      // block flow for syntax labels and code lines, so the sanitized result
      // still wraps on a phone. Indentation is visual, not non-Go NBSP text.
      for(const sentence of root.querySelectorAll('.syntax-sentence'))for(const piece of [...sentence.children]){const row=document.createElement('div');row.className='syntax-piece';row.append(...piece.childNodes);row.querySelector('code')?.classList.add('syntax-value');piece.replaceWith(row);}
      for(const pre of root.querySelectorAll('pre')){const box=document.createElement('div');box.className='native-code';for(const line of pre.textContent.split('\n')){const row=document.createElement('div'),code=document.createElement('code'),prefix=line.match(/^\s*/)[0];row.className='native-code-line';row.dataset.indent=String(prefix.replace(/\t/g,'    ').length);code.textContent=line.slice(prefix.length);if(code.textContent)row.append(code);else row.append(document.createElement('br'));box.append(row,document.createTextNode('\n'));}pre.replaceWith(box);}
      const styles={H1:'font-size:38px;line-height:1.2;font-weight:700;margin:20px 0 22px;color:#17243a;',H2:'font-size:28px;line-height:1.4;font-weight:650;margin:30px 0 16px;color:#24334a;',H3:'font-size:23px;line-height:1.4;font-weight:650;margin:22px 0 14px;color:#24334a;',P:'font-size:20px;line-height:1.8;margin:0 0 20px;color:#26364f;',CODE:'font-size:18px;line-height:1.7;color:#305bb0;overflow-wrap:anywhere;',PRE:'font-size:18px;line-height:1.8;padding:18px 20px;background:#f3f6fc;white-space:pre-wrap;overflow-wrap:anywhere;color:#244d83;margin:14px 0 22px;',STRONG:'font-weight:700;',SMALL:'font-size:15px;line-height:1.6;color:#60708a;',LI:'font-size:20px;line-height:1.8;margin:10px 0;',ASIDE:'font-size:17px;line-height:1.7;padding:10px 0 10px 18px;border-left:3px solid #c8d9ec;color:#536780;margin:22px 0;'};
      for(const n of root.querySelectorAll('*')){if(n.tagName==='IFRAME')continue;const cls=n.className,visual=n.hasAttribute('data-visual'),indent=n.dataset.indent;for(const a of[...n.attributes])if(!['href','target','rel'].includes(a.name))n.removeAttribute(a.name);if(styles[n.tagName])n.style.cssText=styles[n.tagName];if(visual)n.style.cssText='margin:4px 0 16px;font-size:0;line-height:0;text-align:center;';if(cls==='story-section'||cls==='sentence-lab')n.style.cssText='margin:28px 0 0;';if(cls==='thought')n.style.cssText='padding:12px 0 12px 20px;border-left:3px solid #a0b9ec;margin:20px 0;';if(cls==='pullquote')n.style.cssText='font-size:28px;line-height:1.5;color:#6843bd;font-weight:700;margin:22px 0;';if(cls==='syntax-sentence')n.style.cssText='font-size:24px;line-height:2;padding:16px 0;';if(cls==='syntax-piece')n.style.cssText='margin:10px 0;';if(cls==='syntax-value')n.style.marginRight='18px';if(cls==='native-code')n.style.cssText=styles.PRE.replace('white-space:pre-wrap;','');if(cls==='native-code-line')n.style.cssText=`margin:0 0 4px ${Number(indent)*8}px;font-size:18px;line-height:1.8;`;}
      for(const n of root.querySelectorAll('script,form,input,button,textarea'))n.remove();return root.innerHTML;
    },{raw,task:task||null,q:q||null});
    assert.ok(!/рад видеть|localhost:|Команда WEB HACKER|10 баллов/.test(text));exported.push({position:step,cost:task||q?10:0,block:{...block,text}});
  }
  assert.equal(exported.length,16);assert.equal(exported.reduce((sum,a)=>sum+a.cost,0),90);assert.equal(exported.filter(a=>a.block.name==='code').length,8);assert.deepEqual(errors,[]);
  await writeFile('.local-publication/variables.json',JSON.stringify({...target,version,files,heights,measurements,articles:exported},null,2));
  console.log(JSON.stringify({steps:16,codeTasks:8,points:90,heights,measurements:measurements.length,maxVisibleTail:Math.max(...measurements.map(m=>heights[m.step]-m.inkBottom))},null,2));
}finally{await browser.close();}
