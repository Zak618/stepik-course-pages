import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const origin=process.env.STEPIK_INPUT_URL||'http://localhost:8773';
const content=await readFile(new URL('../assets/go-mini-input-content.js',import.meta.url),'utf8');
const {steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(content).toString('base64'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--no-proxy-server','--disable-dev-shm-usage']});
const artifacts=await mkdtemp(path.join(os.tmpdir(),'go-mini-input-qa-'));
const errors=[],external=[];let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
// Playwright's waitForFunction uses eval internally. Bypass only in the QA
// browser; the served page retains its no-eval Content Security Policy.
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',bypassCSP:true});
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:'))external.push(r.url());});
const navigate=async n=>{await page.goto(origin+'/input#'+n);await page.waitForSelector('h1');};
const api=async(code,input='')=>{const res=await fetch(origin+'/api/input/run',{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,'X-Go-Mini-Preview':'1'},body:JSON.stringify({code,input})});return {status:res.status,...await res.json()};};
try{
 for(const [name,t]of Object.entries(tasks)){
  for(const [input,expected]of t.tests){const r=await api(t.solution,input);check(r.ok,`${name}: ${r.diagnostic}`);check(r.stdout===expected,`${name}: incorrect stdout ${JSON.stringify(r.stdout)}`);}
 }
 const {solution}=tasks.echo;
 for(const [input,expected]of [['👨‍👩‍👧‍👦 🏳️‍🌈\n','👨‍👩‍👧‍👦 🏳️‍🌈\n'],['A\r\n','A\n'],['last line','last line\n']]){const r=await api(solution,input);check(r.ok&&r.stdout===expected,'Unicode, CRLF or final line');}
 for(const code of ['package main\nimport "os"\nfunc main(){ os.RemoveAll("/tmp/x") }','package main\nfunc main(){ for {} }','package main\nimport "fmt"\nfunc main(){ fmt.Println(func() string{return "x"}()) }','//go:linkname x y\npackage main\nfunc main(){}','package main\nimport "bufio"\nimport "os"\nfunc main(){ scanner:=bufio.NewScanner(os.Stdin); scanner.Buffer(nil, 999999999) }']){const r=await api(code);check(!r.ok&&r.phase==='limit','Unsafe construct allowed');}
 const big=await api(solution,'x'.repeat(4097));check(!big.ok,'Input limit');
 const wrong=await api(solution.replace('fmt.Println(query)','fmt.Println("fixed")\n_ = query'),'Go\n');check(wrong.ok&&wrong.stdout!=='Go\n','Hardcoded answer not distinguishable');
 const compile=await api(solution.replace('query :=','query ='),'Go\n');check(!compile.ok&&compile.phase==='compile','Compile errors');
 for(const url of ['/.env','/.env.stepik','/scripts/authorize-webhacker.mjs','/assets/../README.md']){check((await fetch(origin+url)).status===404,'File allowlist');}
 check((await fetch(origin+'/api/input/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:solution})})).status===403,'Origin guard');
 await navigate(1);await page.fill('#sky-input','<img src=x onerror=alert(1)>');await page.click('#sky-send');await page.waitForFunction(()=>!document.querySelector('#sky-send').disabled);check((await page.locator('#sky-query').textContent()).includes('<img'),'Safe user content');check(await page.locator('.sky-world img').count()===0,'HTML injection');
 await navigate(3);check((await page.locator('#harbor-lines li').nth(2).getAttribute('class'))===null,'Waiting program already printed answer');await page.fill('#harbor-input','');await page.click('#harbor-send');await page.waitForFunction(()=>!document.querySelector('#harbor-reset').disabled);check((await page.locator('#harbor-lines li').nth(2).textContent()).includes('Ищем:'),'Harbor empty line');await page.click('#harbor-reset');check(await page.locator('#harbor-lines li.active').count()===1,'Harbor reset');
 await navigate(5);for(let i=0;i<3;i++){await page.click('#machine-next');await page.waitForFunction(()=>!document.querySelector('#machine-reset').disabled);}check((await page.locator('#scanner-query').textContent()).includes('первые команды'),'Machine sequence');await page.click('#machine-reset');check((await page.locator('#scanner-query').textContent()).includes('Ещё'),'Machine reset');
 await navigate(7);for(const text of ['Go  👋','','42','x'.repeat(64),'👨‍👩‍👧‍👦']){await page.fill('#train-input',text);await page.click('#train-send');await page.waitForFunction(()=>!document.querySelector('#train-send').disabled);check(await page.locator('#train-result').textContent()==='['+text+']','Train loses data');}
 await navigate(9);check(await page.locator('#history-read').isDisabled(),'History order');await page.click('#history-save');await page.fill('#history-input','второй запрос');await page.click('#history-read');await page.waitForFunction(()=>!document.querySelector('#history-reset').disabled);check((await page.locator('#history-saved').textContent()).includes('циклы'),'Saved changed');check((await page.locator('#history-query').textContent()).includes('второй запрос'),'Query did not change');
 await navigate(11);await page.fill('#find-query','  <b>Go</b>  ');await page.click('#find-run');check((await page.locator('#find-output').textContent()).includes('  <b>Go</b>  '),'Find escaping or whitespace');check(await page.locator('#find-output b').count()===0,'Find injection');await page.locator('[data-origin="query"]').click();check((await page.locator('#find-status').textContent()).includes('второй строки'),'Output provenance');
 await navigate(8);await page.locator('#quiz button').click();check((await page.locator('#quiz-feedback').textContent()).includes('Выберите'),'Quiz no selection');await page.check('input[value="2"]');await page.locator('#quiz button').click();check(await page.locator('#quiz-feedback.error').count()===1,'Quiz wrong answer');await page.check('input[value="0"]');await page.locator('#quiz button').click();check(await page.locator('#quiz-feedback.success').count()===1,'Quiz correct');
 for(const n of [2,4,6,10,12]){const t=tasks[steps[n-1].task];await navigate(n);await page.fill('#code-editor',t.solution);await page.click('#check-code');await page.waitForFunction(()=>!document.querySelector('#check-code').disabled,{},{timeout:120000});check(await page.locator('#task-feedback.success').count()===1,'Editor checks '+n);await page.fill('#code-editor',t.starter);check(await page.locator('#task-feedback.success').count()===0,'Stale success');check((await page.locator('#code-editor').inputValue())===t.starter,'Draft');await page.reload();await page.waitForSelector('#code-editor');check(await page.locator('#code-editor').inputValue()===t.starter,'Draft reload');}
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  for(let n=1;n<=12;n++){
   await navigate(n);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const metric=await page.evaluate(()=>({x:document.documentElement.scrollWidth-innerWidth,h1:document.querySelector('h1').textContent,gap:document.querySelector('.world')?document.querySelector('.article-after').getBoundingClientRect().top-document.querySelector('.world').getBoundingClientRect().bottom:0}));
   check(metric.x<=1,`Horizontal scroll at ${width}, step ${n}: ${metric.x}`);check(metric.h1===steps[n-1].title,'Heading');check(metric.gap<=32,`Large gap ${metric.gap}`);
   if([1,3,5,7,9,11].includes(n)&&[390,1440].includes(width))await page.screenshot({path:path.join(artifacts,`step-${n}-${width}.png`),fullPage:true});
  }
 }
 for(let n=1;n<=12;n++){await page.goto(origin+`/go-mini-module-03-lesson-03-step-${String(n).padStart(2,'0')}.html`);await page.waitForSelector('h1');check(await page.locator('h1').textContent()===steps[n-1].title,'Standalone '+n);}
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1280,height:950});await navigate(1);await page.click('#sky-send');await page.waitForTimeout(150);check(await page.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')),'No actual animation');await page.click('[data-goto="3"]');await page.waitForTimeout(200);check(await page.locator('#harbor-send').isEnabled(),'Navigation left animation running');
 await page.click('#harbor-send');await page.waitForFunction(()=>!document.querySelector('#harbor-reset').disabled,{},{timeout:6000});check((await page.locator('#harbor-boat').getAttribute('style')).includes('725px'),'Boat final position');
 await navigate(1);await page.click('#motion-toggle');await page.fill('#sky-input','Enter работает');await page.locator('#sky-input').press('Enter');await page.waitForFunction(()=>!document.querySelector('#sky-send').disabled);check((await page.locator('#sky-query').textContent()).includes('Enter работает'),'Keyboard enter');await page.click('#phone-toggle');check(await page.locator('body.phone-preview').count()===1,'Phone mode');
 await page.click('#motion-toggle');
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:950});await navigate(7);await page.fill('#train-input','Go 👋');
  check(await page.locator('.locomotive svg').count()===1,'Actual locomotive missing');
  await page.click('#train-send');await page.waitForTimeout(300);const x1=await page.locator('#phrase-train').evaluate(n=>n.getBoundingClientRect().x);await page.waitForTimeout(800);const x2=await page.locator('#phrase-train').evaluate(n=>n.getBoundingClientRect().x);
  check(x2>x1+100,'Train does not travel across the scene');
  await page.waitForFunction(()=>!document.querySelector('#train-send').disabled,{},{timeout:6000});
  check(await page.locator('#train-result').textContent()==='[Go 👋]','Train lost its payload');
 }
 await navigate(1);check(!(await page.locator('.world').innerText()).includes('Программа уже собрана'),'Unwanted caption');check(await page.locator('#sky-satellite rect').count()===3,'Satellite parts');
 await navigate(11);check(!(await page.locator('.world').innerText()).includes('Вход · две строки'),'Unwanted input caption');
 check(errors.length===0,'JavaScript errors: '+errors.join('\n'));check(external.length===0,'External requests: '+external.join('\n'));
 console.log(JSON.stringify({checks,errors,external,artifacts},null,2));
}finally{await browser.close();}
