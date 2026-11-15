import { readFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const origin=process.env.STEPIK_PROJECT_URL||'http://localhost:8785';
const {steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../assets/go-mini-project-content.js',import.meta.url))).toString('base64'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1360,height:1000},bypassCSP:true,reducedMotion:'reduce'});
const page=await context.newPage(), errors=[],screenshots=await mkdtemp(path.join(os.tmpdir(),'find-project-qa-'));
let assertions=0,goRuns=0;
const assert=(condition,message)=>{assertions++;if(!condition)errors.push(message);};
page.on('pageerror',e=>errors.push('Browser: '+e.message));
page.on('request',r=>{if(!r.url().startsWith(origin))errors.push('Unexpected external request: '+r.url());});
const open=async(n,width=1360)=>{await page.setViewportSize({width,height:1000});await page.goto(`${origin}/project?step=${n}`);await page.locator('h1').waitFor();};
const click=async()=>{await page.locator('.project-primary').click();await page.waitForFunction(()=>!document.querySelector('.project-primary').disabled);};
const text=sel=>page.locator(sel).innerText();
try {
  for(const width of [320,390,768,1360])for(let n=1;n<=steps.length;n++){
    await open(n,width);
    assert(await page.locator('h1').innerText()===steps[n-1].title,`Title ${n}/${width}`);
    const g=await page.evaluate(()=>({x:document.documentElement.scrollWidth-innerWidth,gap:document.querySelector('.theory')&&document.querySelector('.theory').getBoundingClientRect().top-document.querySelector('.world').getBoundingClientRect().bottom,buttons:document.querySelectorAll('.world button').length}));
    assert(g.x<=1,`Horizontal overflow ${n}/${width}: ${g.x}`);
    if(steps[n-1].kind==='scene'){assert(g.gap<=40,`Scene gap ${n}/${width}: ${g.gap}`);assert(g.buttons===1,`Primary action count ${n}/${width}`);}
  }
  for(const width of [390,1360]){
    await open(1,width);await click();assert((await text('.project-receipt')).includes('Найдено: 2'),'Demo search');
    await page.selectOption('#desk-command','3');await click();assert(await page.locator('[data-folder]').count()===4,'Demo add');
    await page.selectOption('#desk-command','2');await page.fill('#desk-value','Go');await click();assert((await text('.project-receipt')).includes('Найдено: 3'),'Demo retained catalogue');
    await page.fill('#desk-value',' ');await click();assert(await text('.project-receipt')==='Введите запрос','Demo empty query');assert(await page.locator('[data-folder]').count()===4,'Demo error preserves state');
    await page.selectOption('#desk-command','0');await click();assert(await text('.project-receipt')==='До встречи!','Demo exit');await click();assert(await page.locator('[data-folder]').count()===3,'Demo explicit restart');
    await open(3,width);await click();assert(await page.locator('.found-paper').count()===3,'Filter matches');
    await page.fill('#search-value','Циклы');await click();assert(await page.locator('.found-paper').count()===1,'Filter repeated query');assert(await page.locator('[data-folder]').count()===4,'Filter original preserved');
    await page.fill('#search-value','<script>');await click();assert(await page.locator('.found-paper').count()===0,'Filter no results');
    await open(6,width);await click();assert(await page.locator('[data-command="2"]').evaluate(el=>el.classList.contains('chosen')),'Loop chooses requested branch');assert((await text('.route-return')).includes('Следующая команда'),'Loop returns to next command');
    await page.fill('#route-command','"[]');await click();assert((await text('.project-status')).includes('Нет такой команды'),'Unknown arbitrary command');
    await page.fill('#route-command','0');await click();assert((await text('.route-return')).includes('завершена'),'Return exits main');
    await open(9,width);await click();assert(await page.locator('[data-folder]').count()===4,'Memory added');assert((await text('.project-receipt')).includes('Go: срезы'),'Memory found added');await page.fill('#memory-title',' ');await click();assert(await page.locator('[data-folder]').count()===4,'Memory blank not added');
    await open(11,width);for(let i=0;i<7;i++)await click();assert(await text('.evidence-count')==='4','Rehearsal preserves addition');assert(await text('.project-receipt')==='Ничего не выводим','Rehearsal does not execute after exit');await click();assert(await text('.evidence-count')==='3','Rehearsal restart');
    for(const n of [1,3,6,9,11]){await open(n,width);await page.locator('.world').screenshot({path:path.join(screenshots,`scene-${n}-${width}.png`)});}
  }
  if(!process.argv.includes('--ui-only')){
    for(const [name,t]of Object.entries(tasks)){
      for(const [input,expected]of t.tests){
        const response=await context.request.post(origin+'/api/project/run',{headers:{Origin:origin,'Content-Type':'application/json','X-Go-Mini-Preview':'1'},data:{code:t.solution,input}});
        const r=await response.json();goRuns++;
        assert(response.ok()&&r.ok&&r.stdout===expected,`${name}/${goRuns}: ${r.diagnostic||JSON.stringify({expected,actual:r.stdout})}`);
      }
      console.log(`Go: ${name} (${t.tests.length})`);
    }
    const forbidden=await context.request.get(origin+'/.env.stepik');assert(forbidden.status()===404,'Credentials not served');
    const originless=await context.request.post(origin+'/api/project/run',{data:{code:tasks.final.solution,input:'0\n'}});assert(originless.status()===403,'Runner needs same origin');
    const bad=await context.request.post(origin+'/api/project/run',{headers:{Origin:origin,'Content-Type':'application/json','X-Go-Mini-Preview':'1'},data:{code:'package main\nimport "os"\nfunc main(){ os.Remove("x") }',input:''}});assert(!(await bad.json()).ok,'File API denied');
    await open(12);await page.fill('#code-editor',tasks.final.solution);await page.fill('#task-input','3\nGo: срезы\n2\nсрезы\n0\n');await page.click('#run-code');await page.waitForFunction(()=>!document.querySelector('#run-code').disabled);assert((await text('#task-result')).includes('1 Go: срезы'),'Actual final editor run');
    await page.reload();assert(await page.locator('#code-editor').inputValue()===tasks.final.solution,'Draft persisted');
    await page.fill('#code-editor',tasks.final.starter);await page.locator('#code-editor').dispatchEvent('input');
  }
  await context.close();
  const live=await browser.newContext({viewport:{width:1024,height:900},bypassCSP:true});const p=await live.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/project?step=6');await p.locator('.project-primary').click();await p.waitForTimeout(180);assert(await p.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')),'Real animation runs');await p.locator('.sidebar a').first().click();await p.waitForTimeout(900);assert(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)===0,'Animation cancelled on navigation');await live.close();
} finally {await browser.close();}
console.log(JSON.stringify({steps:steps.length,openCases:Object.values(tasks).reduce((n,t)=>n+t.tests.length,0),goRuns,assertions,errors,screenshots},null,2));
if(errors.length)process.exitCode=1;
