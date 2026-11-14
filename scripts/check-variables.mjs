import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.STEPIK_VARIABLES_URL||'http://localhost:8771';
const moduleFrom=async file=>import('data:text/javascript;base64,'+Buffer.from(await readFile(path.join(project,file),'utf8')).toString('base64'));
const {tasks,quiz}=await moduleFrom('assets/go-mini-variables-tasks.js');
const {articles}=await moduleFrom('assets/go-mini-variables-content.js');
let checks=0;
function check(condition,message){checks++;assert.ok(condition,message);}
const api=async code=>{
  const response=await fetch(base+'/api/variables/run',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Go-Mini-Preview':'1'},body:JSON.stringify({code})});
  const result=await response.json();return {...result,http:response.status};
};
const program=body=>`package main\nimport "fmt"\nfunc main(){\n${body}\n}`;
for(const [number,task]of Object.entries(tasks)){
  const result=await api(task.solution);check(result.ok,`Task ${number}: ${result.diagnostic}`);check(result.stdout===task.expected,`Task ${number} output`);
  for(const rule of task.requirements||[])check(new RegExp(rule.pattern).test(task.solution),`Task ${number} requirement: ${rule.message}`);
  for(const variant of task.variants||[]){check(task.solution.includes(variant.from),`Task ${number}: variant source`);const changed=task.solution.replace(variant.from,()=>variant.to),r=await api(changed);check(r.ok&&r.stdout===variant.expected,`Task ${number} variant ${variant.from}: ${JSON.stringify(r)}`);}
}
check(Object.keys(tasks).length===8,'Eight code tasks');check(Object.keys(quiz).length===1,'One quiz');check(Object.keys(articles).length===7,'Seven illustrations');
check([...Object.values(tasks),...Object.values(quiz)].reduce((n,t)=>n+t.cost,0)===90,'90 planned native points');
for(const body of ['x := "3"\nx = 3\nfmt.Println(x)','query := "a"\nquery := "b"\nfmt.Println(query)','unused := 3\nfmt.Println("ok")']){
  const r=await api(program(body));check(!r.ok&&r.phase==='compile','Real compiler diagnostic');
}
for(const code of [
  'package main\nimport "os"\nfunc main(){os.Remove("x")}',
  program('for {}'),program('go fmt.Println("x")'),program('defer fmt.Println("x")'),
  program('f := func(){fmt.Println("x")}\nf()'),program('fmt.Println(make([]byte, 1000000000))'),
  program('x := "a"\n'+Array.from({length:20},()=> 'x = x + x').join('\n')+'\nfmt.Println(x)'),
  program('fmt.Println(1 << 999999999)'),program('fmt.Println(1e999999999)'),
  'package main\nimport "fmt"\n//go:linkname main.main os.Exit\nfunc main(){fmt.Println("x")}',
  program('fmt.Printf("%s", "x")'),program('fmt.Println(fmt.Sprint("x"))')
]){const r=await api(code);check(!r.ok&&r.phase==='limit','Disallowed syntax rejected');}
for(const location of ['/.env','/.env.stepik','/README.md','/scripts/preview-variables.mjs','/assets/go-mini-first-program.js','/go-mini-module-03-lesson-01-preview.html']){
  const r=await fetch(base+location);check(r.status===404,`Serving allowlist ${location}`);
}
check((await fetch(base+'/api/variables/run')).status===405,'POST required');
check((await fetch(base+'/api/variables/run',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json','X-Go-Mini-Preview':'1'},body:JSON.stringify({code:program('fmt.Println("x")')})})).status===403,'Cross-origin blocked');
console.log(`Go/API: ${checks} checks passed.`);

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1280,height:1000},bypassCSP:true});
const page=await context.newPage();const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
const shots=await mkdtemp(path.join(os.tmpdir(),'go-mini-variables-qa-'));
async function go(n){await page.goto(base+'/variables#'+String(n).padStart(2,'0'));await page.locator('h1').waitFor();await page.waitForFunction(n=>document.querySelector('.eyebrow')?.textContent.includes(String(n).padStart(2,'0')+' / 16'),n);}
async function geometry(label){const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,main:document.querySelector('main').getBoundingClientRect().width,bad:[...document.querySelectorAll('main *')].filter(n=>{if(n.closest('.code-editor,[aria-hidden=true]')||n.tagName==='INPUT')return false;const s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&n.clientWidth>0&&n.scrollWidth>n.clientWidth+2&&!['hidden','clip','auto','scroll'].includes(s.overflowX);}).map(n=>n.className||n.tagName)}));check(dimensions.scroll<=dimensions.width+1,`${label}: document overflow ${JSON.stringify(dimensions)}`);check(dimensions.bad.length===0,`${label}: element overflow ${JSON.stringify(dimensions)}`);}
try{
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:1000});
    for(let n=1;n<=16;n++){await go(n);await geometry(`${n} / ${width}`);const title=await page.locator('h1').innerText();check(title.length>3,'Step has content');check(/[.?]$/.test(title)||title==='Проверим знания','Heading punctuation matches previous lessons');
      if(n===1)check((await page.locator('.lead').innerText()).includes('мы рады видеть'),'Plural team narrator');
      if(n===5)for(const mode of ['strings','numbers']){await page.click(`[data-scale=${mode}]`);const aligned=await page.evaluate(()=>{const [a,plus,b,result]=['scale-three',null,'scale-two','scale-result'].map(id=>(id?document.getElementById(id):document.querySelector('.scale-plus')).getBBox());return [a,plus,b,result].every(r=>r.y>110&&r.y+r.height<=205)&&a.x+a.width<plus.x&&plus.x+plus.width<b.x&&result.x>446&&result.x+result.width<614;});check(aligned,`Scale labels stay above the pans and below the beam: ${width}/${mode}`);}
    }
  }
  await page.setViewportSize({width:1280,height:1000});
  await go(1);await page.click('[data-query-mode=variable]');await page.fill('#query-input','функции 👋');check(await page.locator('#ticket-value').innerText()==='циклы','Editing code does not change stored value');await page.click('#query-send');check(await page.locator('#ticket-value').innerText()==='функции 👋','Query stored');check((await page.locator('.query-destination b').allTextContents()).every(s=>s==='функции 👋'),'Three outputs read the stored value');await page.fill('#query-input','');await page.click('#query-send');check(await page.locator('#ticket-value').innerText()==='""','Empty string valid');await page.screenshot({path:path.join(shots,'01-desk.png'),fullPage:true});
  await go(3);for(let n=1;n<=4;n++)await page.click('#trace-next');check((await page.locator('#trace-output').innerText()).trim()==='циклы\nфункции','Timeline output history');await page.locator('#trace-time').fill('1');check(await page.locator('#trace-value').innerText()==='циклы','Timeline rewind');await page.click('#trace-play');await page.waitForTimeout(100);await page.click('#trace-play');const paused=await page.locator('#trace-position').innerText();await page.waitForTimeout(1700);check(await page.locator('#trace-position').innerText()===paused,'Pause stable');await page.screenshot({path:path.join(shots,'03-timeline.png'),fullPage:true});
  await go(5);await page.click('[data-slot=found]');check(await page.locator('[role=status]').getAttribute('data-result')==='error','String rejected by int');await page.click('[data-slot=query]');check(await page.locator('#slot-query').innerText()==='"3"','String accepted');await page.click('[data-token="1"]');await page.click('[data-slot=found]');check(await page.locator('#slot-found').innerText()==='3','Int accepted');await page.click('[data-token="2"]');await page.click('[data-slot=exact]');check(await page.locator('#slot-exact').innerText()==='true','Bool accepted');await page.screenshot({path:path.join(shots,'05-types.png'),fullPage:true});
  await go(7);for(let n=0;n<6;n++)await page.click('#count-next');check(await page.locator('#count-value').innerText()==='3','Counter exactly three');check(await page.locator('#count-next').isDisabled(),'Counter finite');await page.click('#count-reset');check(await page.locator('#count-value').innerText()==='0','Counter reset');await page.click('#count-next');await page.waitForTimeout(1000);await page.screenshot({path:path.join(shots,'07-counter.png'),fullPage:true});
  await go(9);await page.click('#copy-next');await page.waitForTimeout(1600);await page.click('#copy-next');check(await page.locator('#copy-query').innerText()==='функции'&&await page.locator('#copy-saved').innerText()==='циклы','Copy independence');await page.screenshot({path:path.join(shots,'09-copier.png'),fullPage:true});
  await go(11);await page.click('#drawer-open');check(await page.locator('[data-drawer][aria-expanded=true]').count()===3,'All drawers open');await page.waitForTimeout(650);await geometry('drawers open');await page.screenshot({path:path.join(shots,'11-zero.png'),fullPage:true});
  await go(13);await page.uncheck('#type-with-space');check(await page.locator('#type-output').innerText()==='Поиск:циклы','Concat no magic space');await page.click('[data-print-mode=arguments]');check(await page.locator('#type-output').innerText()==='Поиск: циклы','Println argument space');await page.check('#type-with-space');check(await page.locator('#type-output').innerText()==='Поиск:  циклы','Two spaces visible');await page.screenshot({path:path.join(shots,'13-typesetter.png'),fullPage:true});
  await go(1);await page.click('[data-query-edit="0"]');check((await page.locator('.query-destination b').allTextContents()).every(s=>s==='циклы'),'Editing a literal does not change previous output');await page.click('#query-send');check(await page.locator('.query-destination.stale').count()===2,'One edited literal leaves two stale outputs');check(await page.locator('.query-destination[data-destination="0"] b').innerText()==='функции','Only the edited source changes its output');check(await page.locator('.query-destination[data-destination="1"] b').innerText()==='циклы','Old history visible');for(const i of[1,2])await page.click(`[data-query-edit="${i}"]`);check(await page.locator('#ticket-value').innerText()==='3 из 3','All three literals explicitly edited');await page.click('#query-send');check(await page.locator('.query-destination.stale').count()===0,'All manual edits take effect after run');await page.click('[data-query-mode=variable]');await page.fill('#query-input','строки');await page.click('#query-send');check(await page.locator('.query-destination.stale').count()===0,'Variable run removes stale values');check((await page.locator('.query-destination b').allTextContents()).every(s=>s==='строки'),'All three commands use query');
  await go(3);await page.click('[data-prediction=same]');for(let n=0;n<4;n++)await page.click('#trace-next');check((await page.locator('[role=status]').innerText()).includes('два разных слова'),'Prediction has meaningful feedback');
  await go(5);await page.click('[data-scale=strings]');check(await page.locator('#scale-result').textContent()==='"32"','String concatenation demonstration');await page.click('[data-scale=numbers]');check(await page.locator('#scale-result').textContent()==='5','Number addition demonstration');
  check(await page.locator('.type-heading code').allTextContents().then(a=>a.join(',')==='string,int,bool'),'Type names are part of the explanatory headings');check(await page.locator('.type-heading code').evaluateAll(ns=>ns.every(n=>parseFloat(getComputedStyle(n).fontSize)>=28)),'Type names are large, not small detached labels');
  await go(7);await page.locator('#remaining-total').fill('1');check(await page.locator('#remaining-number').innerText()==='0','Checked clamped to collection size');await page.locator('#remaining-checked').fill('0');check(await page.locator('#remaining-number').innerText()==='1','Remainder recalculated');await page.click('#count-next');await page.click('#count-reset');check(await page.locator('.record-flight-layer').count()===0,'Reset removes moving papers');
  check((await page.locator('.remaining-legend').innerText()).includes('Ещё не проверены'),'Record colors have a visible legend');check((await page.locator('.remaining-answer').innerText()).includes('Осталось проверить'),'The large remainder has a label');await page.locator('#remaining-total').fill('24');await page.locator('#remaining-checked').fill('5');check(await page.locator('.remaining-dots i.checked').count()===5&&await page.locator('.remaining-dots i:not(.checked)').count()===19,'Each cell matches its labeled state');check((await page.locator('#remaining-explanation').innerText()).includes('19 записей'),'Remainder is explained in words');
  await go(9);await page.click('#copy-next');await page.click('#copy-reset');check(await page.locator('#copy-saved').innerText()==='Снимка ещё нет','Camera reset before motion ends');check(await page.locator('.world-camera').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)===0,'Shutter and photo animations cancelled on reset');
  await go(11);await page.click('[data-empty=space]');check((await page.locator('#empty-description').innerText()).startsWith('1 символ'),'Space is not empty');await page.click('[data-empty=word]');check((await page.locator('#empty-description').innerText()).startsWith('5 символов'),'String false has five characters');await page.click('[data-empty=empty]');check(await page.locator('#empty-content').innerText()==='','Empty string truly empty');
  await go(13);await page.click('#heading-change');check(await page.locator('#heading-query').innerText()==='функции','Query changes in heading example');check(await page.locator('#heading-saved').innerText()==='Поиск: циклы','Computed heading stays frozen');await page.click('#heading-rebuild');check(await page.locator('#heading-saved').innerText()==='Поиск: функции','Reassignment recomputes heading');
  for(const [number,t]of Object.entries(tasks)){
    await go(Number(number));await page.fill('#code-source',t.solution);await page.click('#code-check');await page.waitForFunction(()=>['success','error'].includes(document.querySelector('#code-verdict')?.dataset.result),{},{timeout:90000});check(await page.locator('#code-verdict').getAttribute('data-result')==='success',`Browser accepts task ${number}: ${await page.locator('#code-verdict').innerText()}`);if([6,8,16].includes(Number(number))){check(await page.locator('#code-artifact').isVisible(),`Task ${number} visual output appears`);await geometry(`Task ${number} visual output`);}
  }
  await page.screenshot({path:path.join(shots,'16-final.png'),fullPage:true});
  await go(2);await page.fill('#code-source',program('query := "циклы"\nfmt.Println("query")\nfmt.Println("циклы")\n_ = query'));await page.click('#code-check');await page.waitForFunction(()=>document.querySelector('#code-verdict')?.dataset.result==='error');check(await page.locator('#code-verdict').getAttribute('data-result')==='error','Hardcoded response rejected');
  await page.fill('#code-source',tasks[2].solution);await page.locator('#code-source').press('Control+Enter');await page.waitForFunction(()=>document.querySelector('#code-verdict')?.textContent.includes('Программа выполнена'));check((await page.locator('#code-output').innerText()).trim()==='query\nциклы','Keyboard run');
  await page.goto(base+'/variables#03');await page.goto(base+'/variables#02');check(await page.locator('#code-source').inputValue()===tasks[2].solution,'Draft persists after reload');
  await go(10);await page.check('input[value="0"]');await page.click('button[type=submit]');check((await page.locator('#quiz-feedback').innerText()).includes('В какой момент'),'Quiz wrong');await page.check('input[value="1"]');await page.click('button[type=submit]');check((await page.locator('#quiz-feedback').innerText()).startsWith('Верно.'),'Quiz correct');
  await page.emulateMedia({reducedMotion:'reduce'});await go(1);await page.click('#query-send');check(await page.locator('.flight').count()===0,'Reduced motion no flying tickets');await page.setViewportSize({width:390,height:900});for(const n of[1,3,5,7,9,11,13,16]){await go(n);if(n===11)await page.click('#drawer-open');await geometry(`Mobile state ${n}`);await page.screenshot({path:path.join(shots,`${String(n).padStart(2,'0')}-mobile.png`),fullPage:true});}
  for(const n of[6,8,16]){await go(n);await page.fill('#code-source',tasks[n].solution);await page.click('#code-run');await page.waitForFunction(()=>document.querySelector('#code-verdict')?.textContent.includes('Программа выполнена'));check(await page.locator('#code-artifact').isVisible(),`Mobile task ${n} output visible`);await geometry(`Mobile task ${n} output`);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(shots,`${n}-mobile-output.png`),fullPage:true});}
  await page.goto(base+'/go-mini-module-03-lesson-02-step-09.html');await page.click('#copy-next');check(await page.locator('#copy-saved').innerText()==='циклы','Separate page works');
  check(errors.length===0,`Browser errors: ${errors.join('\n')}`);check(external.length===0,'No external requests');
  console.log(JSON.stringify({checks,errors,externalRequests:external.length,screenshots:shots,steps:16,codeTasks:8,plannedPoints:90},null,2));
}finally{await context.close();await browser.close();}
