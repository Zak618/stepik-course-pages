/* Generate Stepik-native articles with bounded live experiments; no network writes. */
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const origin=process.env.STEPIK_PREVIEW_ORIGIN || 'http://localhost:8767';
const published='https://zak618.github.io/stepik-course-pages/';
const version='20261114-find';
const extras={2:['locker'],6:['carry'],9:['rgb'],10:['trace']};
const selector={scene:'.scene',locker:'.prediction',carry:'.carry-lab',rgb:'.rgb-lab',trace:'.search-trace'};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();
const heights={};const failures=[];
page.on('pageerror',error=>failures.push(error.message));
const filename=step=>`go-mini-module-02-lesson-01-step-${String(step).padStart(2,'0')}.html`;
async function exercise(step,panel){
  if(panel==='scene'){
    if(step===1)await page.locator('#message').fill('🤖'.repeat(12));
    if(step===2)await page.locator('[data-count="4"]').click();
    if([4,5].includes(step))await page.locator('#answer-form').evaluate(form=>form.requestSubmit());
    if(step===6){await page.locator('#byte-max').click();await page.locator('#byte-add').click();}
    if(step===7){await page.locator('[data-bytes="8"]').click();await page.locator('#answer-form').evaluate(form=>form.requestSubmit());}
    if(step===8){await page.locator('[data-char="🤖"]').click();await page.locator('#show-utf8').click();}
    if(step===9)await page.locator('#answer-form').evaluate(form=>form.requestSubmit());
    if(step===10)await page.locator('#query').fill('');
  }
  if(panel==='locker')await page.locator('[data-locker-bits="1"]').click();
  if(panel==='carry')for(let i=0;i<4;i++)await page.locator('#carry-next').click();
  if(panel==='trace'){await page.locator('#query').fill('');for(let i=0;i<4;i++)await page.locator('#trace-next').click();}
}
try{
  for(let step=1;step<=10;step++)for(const panel of ['scene',...(extras[step]||[])]){
    let max=0;
    for(const width of [320,390,768,1024]){
      await page.setViewportSize({width,height:900});await page.goto(`${origin}/${filename(step)}?panel=${panel}`);await page.locator('html.fragment').waitFor();await exercise(step,panel);
      const size=await page.evaluate(()=>({height:document.querySelector('main').getBoundingClientRect().height,scroll:document.documentElement.scrollWidth,width:innerWidth}));
      if(size.scroll>size.width)throw new Error(`Panel overflow: ${step}/${panel}, ${width} → ${size.scroll}`);
      max=Math.max(max,size.height);
    }
    heights[`${step}-${panel}`]=Math.ceil((max+30)/20)*20;
  }
  const articles=[];
  await page.setViewportSize({width:1024,height:900});
  for(let step=1;step<=10;step++){
    await page.goto(`${origin}/${filename(step)}`);await page.locator('.explanation').waitFor();
    const html=await page.evaluate(({step,heights,published,version,filename})=>{
      const iframe=(panel,title)=>{
        const frame=document.createElement('iframe');frame.src=`${published}${filename}?v=${version}&panel=${panel}`;frame.width='100%';frame.height=heights[`${step}-${panel}`];frame.title=title;frame.loading='lazy';frame.style.cssText='border:0;display:block;width:100%;max-width:100%;background:#fff;';return frame;
      };
      const container=document.createElement('div');
      container.append(document.querySelector('h1').cloneNode(true));
      container.append(document.querySelector('.lead').cloneNode(true));
      container.append(document.querySelector('.story-opening').cloneNode(true));
      container.append(iframe('scene','Интерактивный эксперимент'));
      const article=document.querySelector('.explanation').cloneNode(true);
      for(const [name,selector] of Object.entries({locker:'.prediction',carry:'.carry-lab',rgb:'.rgb-lab',trace:'.search-trace'})){
        const experiment=article.querySelector(selector);if(experiment)experiment.replaceWith(iframe(name,experiment.querySelector('h3')?.textContent||'Цветовые каналы RGB'));
      }
      for(const details of article.querySelectorAll('details')){
        const heading=document.createElement('h3');heading.textContent=details.querySelector('summary').textContent;
        const extra=document.createElement('div');extra.append(heading,...details.querySelector('.inside').childNodes);details.replaceWith(extra);
      }
      container.append(article);
      // Stepik sanitises HTML: keep semantic tags and simple inline typography.
      const allowed=new Set(['DIV','P','H1','H2','H3','STRONG','EM','SPAN','CODE','PRE','A','OL','UL','LI','BR','SMALL','B','IFRAME','BLOCKQUOTE']);
      for(const element of [...container.querySelectorAll('*')]){
        if(element.tagName==='IFRAME')continue;
        if(!allowed.has(element.tagName)){
          const replacement=document.createElement(element.tagName==='ASIDE'?'blockquote':'div');replacement.append(...element.childNodes);element.replaceWith(replacement);
        }
      }
      const chapter=getComputedStyle(document.body).getPropertyValue('--chapter').trim()||'#466fd6';
      for(const element of container.querySelectorAll('*')){
        if(element.tagName==='IFRAME')continue;
        const tag=element.tagName;
        const href=tag==='A'?element.getAttribute('href'):null;
        const terminal=element.classList.contains('project-terminal');
        const worked=element.classList.contains('worked-example');
        const mono=element.classList.contains('mono');
        const insight=element.tagName==='BLOCKQUOTE';
        for(const attr of [...element.attributes])element.removeAttribute(attr.name);
        if(href&&/^https:\/\//.test(href)){element.href=href;element.target='_blank';element.rel='noopener';}
        const styles={H1:'font-size:38px;line-height:1.2;font-weight:700;margin:20px 0 24px;color:#172033;',H2:'font-size:28px;line-height:1.35;font-weight:650;margin:36px 0 18px;color:#22334d;',H3:'font-size:23px;line-height:1.4;font-weight:650;margin:28px 0 16px;color:#334d6c;',P:'font-size:20px;line-height:1.85;margin:0 0 22px;color:#26364f;',LI:'font-size:20px;line-height:1.8;margin:0 0 12px;',OL:'padding-left:28px;margin:20px 0 28px;',CODE:'font-family:monospace;font-size:18px;color:#516fa7;background:#f2f5fb;white-space:normal;overflow-wrap:anywhere;',PRE:'font-family:monospace;font-size:16px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;background:#19253b;color:#e4eefd;padding:22px;border-radius:18px;',BLOCKQUOTE:'border-left:3px solid #637acb;padding-left:20px;margin:28px 0;',EM:'font-style:normal;color:#466fd6;',A:'color:#5675ae;text-decoration:underline;',SMALL:'font-size:14px;line-height:1.6;'};
        if(styles[tag])element.setAttribute('style',styles[tag]);
        if(terminal)element.setAttribute('style','background:#19253b;color:#e4eefd;padding:22px;border-radius:20px;margin:28px 0;');
        if(worked)element.setAttribute('style','background:#f1f6fd;padding:24px;border-radius:20px;margin:26px 0;');
        if(mono)element.style.fontFamily='monospace';
        if(tag==='EM')element.style.color=chapter;
        if(insight)element.style.borderLeftColor=chapter;
        if(insight)element.style.fontStyle='normal';
      }
      return container.innerHTML;
    },{step,heights,published,version,filename:filename(step)});
    const finalTask={
      4:{name:'number',prompt:'Прочитайте двоичное число 00101. В ответе укажите его десятичное значение.',source:{options:[{answer:'5',max_error:'0'}]}},
      5:{name:'choice',prompt:'Как записать число 14 ровно пятью битами? Выберите одну запись.',source:{is_multiple_choice:false,is_always_correct:false,sample_size:4,preserve_order:true,is_html_enabled:false,is_options_feedback:false,options:[{text:'01110',is_correct:true,feedback:''},{text:'11100',is_correct:false,feedback:''},{text:'00111',is_correct:false,feedback:''},{text:'01101',is_correct:false,feedback:''}]}},
      7:{name:'number',prompt:'В сообщении 6 байтов. Сколько это битов? Введите только число.',source:{options:[{answer:'48',max_error:'0'}]}},
      9:{name:'choice',prompt:'Вы получили байт 01000001. Можно ли по одним этим битам установить, хотел ли автор сохранить число, букву или яркость?',source:{is_multiple_choice:false,is_always_correct:false,sample_size:3,preserve_order:true,is_html_enabled:false,is_options_feedback:false,options:[{text:'Да: автор обязательно сохранил число 65.',is_correct:false,feedback:''},{text:'Нет: нужно знать формат и правила интерпретации.',is_correct:true,feedback:''},{text:'Да: автор обязательно сохранил букву A.',is_correct:false,feedback:''}]}}
    }[step];
    const taskHtml=finalTask?`<h2 style="font-size:28px;margin:36px 0 18px;">Задание для зачёта</h2><p style="font-size:20px;line-height:1.8;">${finalTask.prompt}</p>`:'';
    articles.push({position:step,block:{name:finalTask?.name||'text',text:html+taskHtml,source:finalTask?.source||{},feedback_correct:finalTask?'Верно. Можно переходить к следующему шагу.':'',feedback_wrong:finalTask?'Проверьте правило из разбора и попробуйте ещё раз.':''}});
  }
  if(failures.length)throw new Error(failures.join('\n'));
  await mkdir('.local-publication',{recursive:true});
  await writeFile('.local-publication/information.json',JSON.stringify({course:305666,lesson:2706555,unit:2746570,version,heights,articles},null,2));
  console.log(JSON.stringify({steps:articles.length,heights,types:articles.map(a=>a.block.name),output:'.local-publication/information.json'},null,2));
}finally{await browser.close();}
