/* Read-only export: native Stepik articles, bounded experiments, four 10-point tasks. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.STEPIK_PREVIEW_ORIGIN||'http://localhost:8767';
const published='https://zak618.github.io/stepik-course-pages/';
const version='information-v2-spacing-20261114';
const file=n=>`go-mini-module-02-lesson-01-v2-step-${String(n).padStart(2,'0')}.html`;
const panels=n=>['scene',...(n===6?['carry']:n===9?['rgb']:[])];
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const heights={},measurements=[];
async function dismiss(){for(const dialog of await page.locator('dialog[open]').all())await dialog.getByRole('button',{name:'Продолжить',exact:true}).click();}
const choice=options=>({is_multiple_choice:false,is_always_correct:false,sample_size:options.length,preserve_order:true,is_html_enabled:false,is_options_feedback:false,options:options.map(([text,is_correct])=>({text,is_correct,feedback:''}))});
const tasks={
  4:{name:'number',prompt:'Прочитайте двоичное число 00101. В ответе укажите его десятичное значение.',source:{options:[{answer:'5',max_error:'0'}]},correct:'Верно: 4 + 1 = 5. Нули не добавляют ничего к сумме.',wrong:'Подпишите веса 16, 8, 4, 2, 1. Сложите только те, над которыми стоит единица.'},
  5:{name:'choice',prompt:'Как записать число 14 ровно пятью битами? Выберите одну запись.',source:choice([['01110',true],['11100',false],['00111',false],['01101',false]]),correct:'Верно: 14 = 8 + 4 + 2. Выбраны эти три веса, остальные места — нули.',wrong:'Проверьте каждую единицу по весам 16, 8, 4, 2, 1 и сложите выбранные веса.'},
  7:{name:'number',prompt:'В сообщении 6 байтов. Сколько это битов? Введите только число.',source:{options:[{answer:'48',max_error:'0'}]},correct:'Верно: 6 байтов × 8 = 48 битов.',wrong:'В одном байте восемь битов. Здесь нужно число ячеек, а не число возможных сочетаний.'},
  9:{name:'choice',prompt:'Вы получили байт 01000001. Можно ли по одним этим битам установить, хотел ли автор сохранить число, букву или яркость?',source:choice([['Да: автор обязательно сохранил число 65.',false],['Нет: нужно знать формат и правила интерпретации.',true],['Да: автор обязательно сохранил букву A.',false]]),correct:'Верно. Значение 65 вычислить можно, но назначение данных определяет формат.',wrong:'Мы читали одни и те же биты как число, букву и яркость. Что задавало правило чтения?'}
};
async function size(step,panel,width,state){
  const result=await page.evaluate(()=>({height:Math.ceil(document.querySelector('main').getBoundingClientRect().height),overflow:document.documentElement.scrollWidth-innerWidth}));
  assert.ok(result.overflow<=0,`Horizontal overflow: ${step}/${panel}/${width}/${state}: ${result.overflow}`);
  measurements.push({step,panel,width,state,height:result.height});
  heights[`${step}-${panel}`]=Math.max(heights[`${step}-${panel}`]||0,result.height+2);
}
try{
  for(let step=1;step<=10;step++)for(const panel of panels(step))for(const width of [320,390,768,1024]){
    await page.setViewportSize({width:panel==='rgb'?Math.min(width,620):width,height:1000});
    await page.goto(`${origin}/${file(step)}?panel=${panel}`);await page.locator('html.fragment').waitFor();
    await size(step,panel,width,'initial');
    if(panel==='carry')for(let i=0;i<5;i++){await page.locator('#carry-next').click();await size(step,panel,width,'carry-'+i);}
    else if(panel==='rgb'){
      for(const input of await page.locator('[data-channel]').all())await input.fill('255');
      await size(step,panel,width,'white');
    }else{
      if(step===1){
        for(const message of ['Go','Привет','👋'.repeat(12)]){await page.locator('#message').fill(message);await page.locator('#send').click();await size(step,panel,width,'sent-'+message.length);}
        await page.locator('#show-bytes').click();
        while(await page.getByRole('button',{name:'Следующие байты',exact:true}).isEnabled())await page.getByRole('button',{name:'Следующие байты',exact:true}).click();
        assert.match(await page.locator('.byte-page-nav').textContent(),/43–48 из 48/);
        await page.getByRole('button',{name:'К компьютерам',exact:true}).click();
      }
      if(step===2){await page.locator('[data-count="4"]').click();await page.locator('[data-capacity-answer="yes"]').click();await dismiss();}
      if(step===3){for(const weight of [8,4,1])await page.locator(`[data-weight="${weight}"]`).click();}
      if([4,5,7].includes(step)){
        await page.locator('#answer').fill('abc');await page.locator('#answer-form').evaluate(form=>form.requestSubmit());await size(step,panel,width,'invalid');
        await dismiss();
        await page.locator('#answer').fill(step===5?'11111':'999');await page.locator('#answer-form').evaluate(form=>form.requestSubmit());
        await dismiss();
      }
      if(step===6){await page.locator('#all-one').click();await page.locator('#byte-add').click();}
      if(step===7){for(let i=0;i<5;i++)await page.locator('#add-box').click();await page.locator('#unpack').click();await page.locator('#answer-form').evaluate(form=>form.requestSubmit());await dismiss();}
      if(step===8){await page.locator('[data-char="👋"]').click();await page.locator('#print').click();await page.locator('#xray').click();}
      if(step===9){await page.locator('[data-mode="text"]').click();await page.locator('[data-meaning-answer="no"]').click();await dismiss();}
      if(step===10){
        for(const [query,count]of[['цикл',2],['пицца',0],['и',4]]){
          await page.locator('#query').fill(query);await page.locator('#find-form').evaluate(form=>form.requestSubmit());
          assert.equal(await page.locator('.search-note.matched').count(),count);await size(step,panel,width,'results-'+count);
        }
        await page.locator('#query').fill('');await page.locator('#find-form').evaluate(form=>form.requestSubmit());await size(step,panel,width,'empty-query');
      }
      await size(step,panel,width,'expanded');
    }
  }
  for(const key of Object.keys(heights))heights[key]=Math.ceil(heights[key]);
  for(const m of measurements)assert.ok(heights[`${m.step}-${m.panel}`]-m.height<=36,`Excessive blank iframe tail: step ${m.step}/${m.panel}, width ${m.width}, ${m.state}`);
  const articles=[];
  for(let step=1;step<=10;step++){
    await page.setViewportSize({width:1024,height:1000});await page.goto(`${origin}/${file(step)}`);await page.locator('.story').first().waitFor();
    const html=await page.evaluate(({step,heights,published,version,filename,graded})=>{
      const root=document.createElement('div');
      const iframe=panel=>{
        const el=document.createElement('iframe');el.src=`${published}${filename}?panel=${panel}&v=${version}`;el.width='100%';el.height=heights[`${step}-${panel}`];el.title=panel==='carry'?'Двоичный перенос: от семи к восьми':panel==='rgb'?'Смешайте красный, зелёный и синий свет':'Интерактивный опыт: '+window.InformationV2Content[step].nav;
        if(panel==='rgb')el.style.width='min(100%,620px)';
        el.loading='lazy';el.style.cssText=`border:0;display:block;vertical-align:top;width:${panel==='rgb'?'min(100%,620px)':'100%'};max-width:100%;background:#fff;margin:4px auto;`;return el;
      };
      const header=document.querySelector('.lesson-header').cloneNode(true);header.querySelector('.lesson-kicker').remove();root.append(...header.childNodes);
      const flow=document.querySelector('.lesson-flow').cloneNode(true);
      if(graded){const note=document.createElement('p');note.textContent='Потренируйтесь в опыте, а затем ответьте на вопрос в конце шага.';flow.querySelector('.experiment').before(note);}
      if(step===10)flow.querySelector('.experiment').before(document.querySelector('.find-task').cloneNode(true));
      flow.querySelector('.experiment').replaceWith(iframe('scene'));
      for(const box of [...flow.querySelectorAll('.duo-layout,article')])box.replaceWith(...box.childNodes);
      if(step===6){
        const anchor=[...flow.querySelectorAll('h2')].find(h=>h.textContent==='Прибавим один');
        if(anchor)anchor.before(iframe('carry'));else flow.append(iframe('carry'));
      }
      if(step===9){const anchor=[...flow.querySelectorAll('h2')].find(h=>h.textContent==='Дадим цвету три канала');if(anchor)anchor.after(iframe('rgb'));else flow.append(iframe('rgb'));}
      for(const details of [...flow.querySelectorAll('details')]){const heading=document.createElement('h3');heading.textContent=details.querySelector('summary').textContent;details.querySelector('summary').remove();details.replaceWith(heading,...details.childNodes);}
      root.append(...flow.childNodes);
      const permitted=new Set(['DIV','P','H1','H2','H3','STRONG','EM','SPAN','CODE','PRE','A','OL','UL','LI','BR','SMALL','B','IFRAME','BLOCKQUOTE']);
      for(let element of [...root.querySelectorAll('*')]){
        if(element.tagName==='IFRAME')continue;
        const worked=element.classList.contains('worked'),guide=element.classList.contains('find-task');
        if(!permitted.has(element.tagName)){const replacement=document.createElement('div');replacement.append(...element.childNodes);element.replaceWith(replacement);element=replacement;}
        for(const attr of [...element.attributes])element.removeAttribute(attr.name);
        const styles={H1:'font-size:38px;line-height:1.2;font-weight:700;margin:20px 0 22px;color:#172033;',H2:'font-size:28px;line-height:1.4;font-weight:650;margin:30px 0 16px;color:#24334a;',H3:'font-size:23px;line-height:1.4;font-weight:650;margin:28px 0 14px;color:#345381;',P:'font-size:20px;line-height:1.8;margin:0 0 20px;color:#26364f;',LI:'font-size:19px;line-height:1.75;margin:0 0 10px;',OL:'padding-left:28px;margin:18px 0 24px;',CODE:'font-family:monospace;font-size:18px;color:#6d39a9;background:#f6f0fd;overflow-wrap:anywhere;',STRONG:'font-weight:700;',SMALL:'font-size:15px;line-height:1.6;'};
        if(styles[element.tagName])element.setAttribute('style',styles[element.tagName]);
        if(worked||guide)element.setAttribute('style','padding:22px 24px;background:#f3f7ff;border-radius:18px;margin:22px 0;');
      }
      for(const frame of root.querySelectorAll('iframe')){const next=frame.nextElementSibling;if(next?.tagName==='H2')next.style.marginTop='10px';}
      return root.innerHTML;
    },{step,heights,published,version,filename:file(step),graded:Boolean(tasks[step])});
    const task=tasks[step];
    const taskHtml=task?`<h2 style="font-size:28px;line-height:1.4;margin:32px 0 16px;">Проверим знания</h2><p style="font-size:20px;line-height:1.8;">${task.prompt}</p>`:'';
    articles.push({position:step,cost:task?10:0,block:{name:task?.name||'text',text:html+taskHtml,source:task?.source||{},feedback_correct:task?.correct||'',feedback_wrong:task?.wrong||''}});
  }
  assert.deepEqual(errors,[]);assert.equal(articles.reduce((sum,a)=>sum+a.cost,0),40);
  await mkdir('.local-publication',{recursive:true});
  await writeFile('.local-publication/information-v2.json',JSON.stringify({course:305666,lesson:2706555,unit:2746570,version,heights,articles,measurements},null,2));
  console.log(JSON.stringify({steps:articles.length,totalPoints:40,heights,output:'.local-publication/information-v2.json'},null,2));
}finally{await browser.close();}
