/* Local export only: measured object frames, native article and native graders. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {origin,file,browserOptions,exercise} from './lib/algorithms-browser.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const tasks=JSON.parse(await readFile('.local-publication/algorithms-tasks.json','utf8')).tasks;
const base='https://zak618.github.io/stepik-course-pages/',version='algorithms-20261114';
const browser=await chromium.launch(browserOptions),page=await browser.newPage({reducedMotion:'reduce'});
const errors=[],heights={},measurements=[];page.on('pageerror',e=>errors.push(e.message));
try{
  for(const step of [1,2,4,5,7,8])for(const width of [320,390,420,640]){
    await page.setViewportSize({width,height:1500});await page.goto(`${origin}/${file(step)}?panel=scene`);
    const measure=async state=>{const {height,overflow}=await page.locator('main').evaluate(n=>({height:Math.ceil(n.getBoundingClientRect().height),overflow:document.documentElement.scrollWidth-innerWidth}));assert.ok(overflow<=0,`Overflow ${step}/${width}/${state}`);heights[step]=Math.max(heights[step]||0,height+2);measurements.push({step,width,state,height});};
    await measure('initial');await exercise(page,step,measure);
  }
  for(const m of measurements)assert.ok(heights[m.step]-m.height<=36,`Blank tail step ${m.step}/${m.width}/${m.state}: ${heights[m.step]-m.height}`);
  const articles=[];
  for(let step=1;step<=9;step++){
    await page.setViewportSize({width:1024,height:1200});await page.goto(`${origin}/${file(step)}`);await page.locator('.story').first().waitFor();
    const task=tasks.find(t=>t.position===step);
    const text=await page.evaluate(({step,base,version,filename,height,graded,prompt})=>{
      const data=window.AlgorithmsContent[step],root=document.createElement('div');
      const title=document.createElement('h1');title.textContent=data.title;root.append(title);
      const intro=document.createElement('p');intro.textContent=data.intro;root.append(intro);
      const before=document.createElement('div');before.innerHTML=data.before;root.append(...before.childNodes);
      const visual=document.createElement('div');visual.setAttribute('data-visual','true');root.append(visual);
      if(graded){
        const image=document.createElement('img');image.src=`${base}assets/go-mini-algorithms-quiz-${String(step).padStart(2,'0')}.svg`;image.alt=step===3?'Порядок команд в заказе':step===6?'Три готовых напитка':'Подходящая запись стоит последней';image.width=280;image.style.cssText='width:min(100%,280px);height:auto;vertical-align:top;margin:12px auto;';visual.append(image);
      }else{
        const frame=document.createElement('iframe');frame.src=`${base}${filename}?panel=scene&v=${version}`;frame.width='100%';frame.height=height;frame.title='Опыт: '+data.nav;frame.style.cssText='border:0;display:block;vertical-align:top;width:min(100%,640px);max-width:100%;background:#fff;margin:0 auto;';visual.append(frame);
      }
      const after=document.createElement('div');after.innerHTML=data.after;root.append(...after.childNodes);
      if(graded){const question=document.createElement('p');question.textContent=prompt;question.setAttribute('data-question','true');root.append(question);}
      const styles={H1:'font-size:38px;line-height:1.2;font-weight:700;margin:20px 0 22px;color:#172033;',H2:'font-size:28px;line-height:1.4;font-weight:650;margin:30px 0 16px;color:#24334a;',P:'font-size:20px;line-height:1.8;margin:0 0 20px;color:#26364f;',STRONG:'font-weight:700;',EM:'font-style:normal;font-weight:600;color:#4367b3;'};
      for(const element of root.querySelectorAll('*')){
        if(['IFRAME','IMG'].includes(element.tagName))continue;
        const question=element.hasAttribute('data-question'),visual=element.hasAttribute('data-visual');for(const attr of [...element.attributes])element.removeAttribute(attr.name);
        if(styles[element.tagName])element.setAttribute('style',styles[element.tagName]);
        if(question)element.style.cssText='font-size:21px;line-height:1.7;font-weight:600;margin:25px 0 16px;color:#24334a;';
        if(visual)element.style.cssText='text-align:center;line-height:0;margin:4px 0;';
      }
      for(const media of root.querySelectorAll('iframe,img'))if(media.parentElement.nextElementSibling?.tagName==='H2')media.parentElement.nextElementSibling.style.marginTop='10px';
      return root.innerHTML;
    },{step,base,version,filename:file(step),height:heights[step],graded:Boolean(task),prompt:task?.block.text});
    articles.push({position:step,cost:task?10:0,block:{name:task?.block.name||'text',text,source:task?.block.source||{},feedback_correct:task?.block.feedback_correct||'',feedback_wrong:task?.block.feedback_wrong||''}});
  }
  assert.deepEqual(errors,[]);assert.equal(articles.reduce((sum,a)=>sum+a.cost,0),30);
  await mkdir('.local-publication',{recursive:true});await writeFile('.local-publication/algorithms.json',JSON.stringify({course:305666,lesson:2706556,unit:2746571,version,heights,measurements,articles},null,2));
  console.log(JSON.stringify({steps:articles.length,points:30,heights,measurements:measurements.length,output:'.local-publication/algorithms.json'},null,2));
}finally{await browser.close();}
