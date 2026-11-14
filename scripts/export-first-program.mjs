import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import vm from 'node:vm';
import{origin,file,browserOptions,exercise,frameSteps}from'./lib/first-program-browser.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const context={window:{}};vm.runInNewContext(await readFile('assets/go-mini-first-program-content.js','utf8'),context);
const content=context.window.FirstProgramContent;
const tasks=JSON.parse(await readFile('.local-publication/first-program-tasks.json','utf8')).tasks;
const base='https://zak618.github.io/stepik-course-pages/',version='first-program-20261114';
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true});
const errors=[],heights={},measurements=[];page.on('pageerror',e=>errors.push(e.message));
try{
  for(const step of frameSteps)for(const width of [320,390,420,640]){
    await page.setViewportSize({width,height:1800});await page.goto(`${origin}/${file(step)}?panel=scene&runtime=model`);await page.locator('.scene').waitFor();
    const measure=async state=>{const m=await page.locator('main').evaluate(n=>({height:Math.ceil(n.getBoundingClientRect().height),overflow:document.documentElement.scrollWidth-innerWidth,overlapping:[...n.querySelectorAll('.anatomy-explanation,.source-sheet,.program-artifact,.lab-status,.printer-paper')].filter(e=>e.scrollHeight>e.clientHeight+1).map(e=>e.className)}));assert.ok(m.overflow<=0,`Overflow ${step}/${width}/${state}`);assert.deepEqual(m.overlapping,[],`Clipping ${step}/${width}/${state}`);heights[step]=Math.max(heights[step]||0,m.height+2);measurements.push({step,width,state,height:m.height});};
    await measure('initial');await exercise(page,step,measure);
  }
  await mkdir('.local-publication',{recursive:true});await writeFile('.local-publication/first-program-measurements.json',JSON.stringify({heights,measurements},null,2));
  for(const m of measurements)assert.ok(heights[m.step]-m.height<=40,`Blank tail ${m.step}/${m.width}/${m.state}: ${heights[m.step]-m.height}`);
  const articles=[];
  for(let step=1;step<=10;step++){
    await page.setViewportSize({width:1024,height:1600});await page.goto(`${origin}/${file(step)}?runtime=model`);await page.locator('.story').first().waitFor();
    const task=tasks.find(t=>t.position===step);
    const text=await page.evaluate(({step,task,base,version,filename,height})=>{
      const data=window.FirstProgramContent[step],root=document.createElement('div');
      const h=document.createElement('h1');h.textContent=data.title;root.append(h);
      const intro=document.createElement('p');intro.textContent=data.intro;root.append(intro);
      const before=document.createElement('div');before.innerHTML=data.before||'';root.append(...before.childNodes);
      const visual=document.createElement('div');visual.setAttribute('data-visual','true');root.append(visual);
      if(!task){const frame=document.createElement('iframe');frame.src=`${base}${filename}?panel=scene&runtime=model&v=${version}`;frame.title='Опыт: '+data.nav;frame.width='100%';frame.height=height;frame.style.cssText='border:0;vertical-align:top;width:min(100%,640px);background:#fff;margin:0 auto;';visual.append(frame);}
      else if(task.type==='code'){const p=document.createElement('p');p.textContent='Ожидаемый вывод:';const pre=document.createElement('pre');pre.textContent=task.expected;visual.append(p,pre);}
      else if(step===8||step===10){const pre=document.createElement('pre');pre.textContent=step===8?'package main\n\nfunc main() {\n    fmt.Println("Готово")\n}':'fmt.Print("Go")\nfmt.Println("Find")';visual.append(pre);}
      const after=document.createElement('div');after.innerHTML=data.after;root.append(...after.childNodes);
      if(task?.prompt){const p=document.createElement('p');p.textContent=task.prompt;root.append(p);}
      for(const a of root.querySelectorAll('*')){
        if(a.tagName==='IFRAME')continue;const isVisual=a.hasAttribute('data-visual');
        for(const attr of [...a.attributes])if(!['href','target','rel'].includes(attr.name))a.removeAttribute(attr.name);
        const styles={H1:'font-size:38px;line-height:1.2;font-weight:700;margin:20px 0 22px;color:#17243a;',H2:'font-size:28px;line-height:1.4;font-weight:650;margin:30px 0 16px;color:#24334a;',P:'font-size:20px;line-height:1.8;margin:0 0 20px;color:#26364f;',CODE:'font-size:18px;line-height:1.7;color:#305bb0;',PRE:'font-size:19px;line-height:1.8;padding:18px 20px;background:#f2f6ff;white-space:pre-wrap;overflow-wrap:anywhere;color:#244d83;margin:14px 0 22px;',STRONG:'font-weight:700;',SUMMARY:'font-size:18px;line-height:1.7;cursor:pointer;',DETAILS:'margin:22px 0;'};if(styles[a.tagName])a.setAttribute('style',styles[a.tagName]);if(isVisual)a.style.cssText=task?'':'text-align:center;line-height:0;margin:4px 0;';
      }
      for(const f of root.querySelectorAll('iframe'))if(f.parentElement.nextElementSibling?.tagName==='H2')f.parentElement.nextElementSibling.style.marginTop='10px';
      return root.innerHTML;
    },{step,task,base,version,filename:file(step),height:heights[step]});
    assert.ok(!/Настоящий запуск Go|Замедленная модель|Локальная проверка|10 баллов/.test(text));
    articles.push({position:step,cost:task?10:0,block:{name:task?.block.name||'text',text,source:task?.block.source||{},feedback_correct:task?.block.feedback_correct||'',feedback_wrong:task?.block.feedback_wrong||''}});
  }
  assert.deepEqual(errors,[]);assert.equal(articles.reduce((s,a)=>s+a.cost,0),50);
  await mkdir('.local-publication',{recursive:true});await writeFile('.local-publication/first-program.json',JSON.stringify({course:305666,lesson:2706559,unit:2746574,version,heights,measurements,articles},null,2));
  console.log(JSON.stringify({steps:10,points:50,heights,measurements:measurements.length},null,2));
}finally{await browser.close();}
