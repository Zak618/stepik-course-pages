import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
const origin=process.env.STEPIK_CONDITIONS_URL||'http://localhost:8775';
const {steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../assets/go-mini-conditions-content.js',import.meta.url),'utf8')).toString('base64'));
let checks=0;const failures=[];
const verify=(value,label)=>{checks++;if(!value)failures.push(label);};
async function run(code,input=''){
 const r=await fetch(origin+'/api/conditions/run',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Go-Mini-Preview':'1'},body:JSON.stringify({code,input})});
 assert.equal(r.status,200);return r.json();
}
for(const [key,t]of Object.entries(tasks)){
 for(const [input,output]of t.tests){const r=await run(t.solution,input);verify(r.ok&&r.stdout===output,`${key}: ${JSON.stringify(input)}: ${JSON.stringify(r)}`);}
 const r=await run(t.starter,t.input);verify(!r.ok||r.stdout!==t.output,`Starter already solves ${key}`);
 console.log('Go task checked:',key);
}
for(const [name,code]of [
 ['loop','package main;func main(){for{}}'],
 ['file','package main;import "os";func main(){os.ReadFile(".env")}'],
 ['network','package main;import "net/http";func main(){http.Get("https://example.com")}'],
 ['function','package main;func main(){f()};func f(){}'],
 ['directive','//go:linkname x runtime.fastrand\npackage main;func main(){}'],
 ['grow','package main;import "fmt";func main(){s:="'+('a'.repeat(1000))+'";if true{s=s+s;s=s+s};if true{s=s+s};fmt.Println(s+s)}']
]){const r=await run(code);verify(!r.ok&&r.phase==='limit',`Expected bounded rejection: ${name}: ${JSON.stringify(r)}`);}
for(const p of ['/.env','/.env.stepik','/README.md','/scripts/preview-conditions.mjs','/assets/../.env'])verify((await fetch(origin+p)).status===404,`Do not serve ${p}`);
const denied=await fetch(origin+'/api/conditions/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});verify(denied.status===403,'Foreign origin blocked');
console.log('Runner/API:',{checks,failures});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true}),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:'))external.push(r.url());});
const screenshots=await mkdtemp('/tmp/go-mini-conditions-qa-');
const sceneSteps=steps.flatMap((s,i)=>s.kind==='scene'?[[i+1,s.scene]]:[]);
const scene=async(n,only=false)=>{await page.goto(`${origin}/courses/305666-go-mini/modules/04-control-flow/lesson-01-step-${String(n).padStart(2,'0')}.html${only?'?panel=scene':''}`);await page.waitForSelector('.world');};
async function geometry(label){const m=await page.evaluate(()=>{const scene=document.querySelector('.world');return{x:document.documentElement.scrollWidth-innerWidth,scene:scene?.getBoundingClientRect().width||0,root:document.querySelector('main').getBoundingClientRect().width,clipped:[...document.querySelectorAll('.rule,.floor-screen,.find-result,.flow-item')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className)};});verify(m.x<=1,`Horizontal overflow: ${label}: ${JSON.stringify(m)}`);verify(!m.clipped.length,`Clipping: ${label}: ${JSON.stringify(m)}`);}
try{
 for(const width of [320,390,768,1024,1440]){
 await page.setViewportSize({width,height:1000});
 for(let n=1;n<=steps.length;n++){await page.goto(`${origin}/courses/305666-go-mini/modules/04-control-flow/lesson-01-step-${String(n).padStart(2,'0')}.html`);await page.waitForSelector('h1');verify((await page.locator('h1').textContent())===steps[n-1].title,`Title ${n}`);await geometry(`${width}/${n}`);}
 for(const [n,name]of sceneSteps){await scene(n,true);await geometry(`frame ${width}/${name}`);const w=await page.locator('.world').evaluate(e=>e.getBoundingClientRect().width);verify(w>=Math.min(1024,width)-1,`Full width ${width}/${name}: ${w}`);if(width===390||width===1024)await page.locator('.world').screenshot({path:`${screenshots}/${name}-${width}.png`});}
 }
 await page.setViewportSize({width:1024,height:1000});
 await scene(1);await page.selectOption('#compare-op','<=');await page.fill('#compare-a','10');await page.fill('#compare-b','10');verify(await page.locator('#compare-value').textContent()==='true','10<=10');await page.selectOption('#compare-op','<');verify(await page.locator('#compare-value').textContent()==='false','10<10');await page.selectOption('#compare-type','text');verify(await page.locator('#compare-value').textContent()==='false','Go!=go');await page.click('#compare-same');verify(await page.locator('#compare-value').textContent()==='true','Same strings');
 await scene(3);for(const v of [true,false]){await page.locator('#rail-found').setChecked(v);await page.click('#rail-run');await page.waitForFunction(()=>!document.querySelector('#rail-run').disabled);verify((await page.locator('.status').textContent()).includes(v?'Найдено':'Совпадений нет'),'Rail branch '+v);verify((await page.locator('.status').textContent()).includes('Поиск завершён'),'Rail join');}
 await scene(5);for(const [t,out]of [[19,'Окна закрыты'],[20,'Проветривание'],[29,'Проветривание'],[30,'Охлаждение']]){await page.locator('#temp-range').fill(String(t));verify(await page.locator('#temp-mode').textContent()===out,'Climate '+t);}
 await scene(7);for(const mode of ['and','or','not']){await page.click(`[data-mode=${mode}]`);for(const a of [false,true])for(const b of [false,true]){await page.evaluate(({a,b,mode})=>{const one=document.querySelector('#lamp-a'),two=document.querySelector('#lamp-b');if(one.getAttribute('aria-pressed')!==String(a))one.click();if(mode!=='not'&&two.getAttribute('aria-pressed')!==String(b))two.click();},{a,b,mode});verify(await page.locator('#circuit-out').textContent()===String(mode==='and'?a&&b:mode==='or'?a||b:!a),`Lamp ${mode}/${a}/${b}`);}}
 await scene(10);for(const [floor,out]of [['1','Аквариум'],['2','Сад бабочек'],['3','Телескопы'],['0','Вестибюль'],['ground','Вестибюль'],['?','Неизвестный этаж']]){await page.click(`[data-floor="${floor}"]`);verify((await page.locator('.floor-screen').textContent()).includes(out),'Elevator '+floor);}
 await scene(12);verify((await page.locator('.status').textContent()).includes('Проветривание'),'Wrong order');await page.click('#priority-order');verify((await page.locator('.status').textContent()).includes('Охлаждение'),'Correct order');
 await scene(14);for(const [preset,v]of [['text','true'],['blank','true'],['none','false']]){await page.selectOption('#scanner-preset',preset);await page.click('#scanner-next');verify(await page.locator('#scan-value').textContent()===v,'Scan '+preset);await page.click('#scanner-next');verify(await page.locator('#scan-value').textContent()==='false','Scan EOF '+preset);}
 await scene(16);for(const [query,mode,v]of [['Go','part',true],['go','part',false],['','part',true],['Go','exact',false],['Первые команды Go','exact',true]]){await page.fill('#find-query',query);await page.selectOption('#find-mode',mode);await page.click('#find-run');verify((await page.locator('.find-result').textContent()).startsWith(String(v)),`Contains ${query}/${mode}`);}
 await scene(19);for(const [query,mode,out]of [['Go','part','Найдено'],['Go','exact','Не найдено'],['','other','Введите запрос'],['Go','other','Неизвестный режим']]){await page.fill('#final-query',query);await page.selectOption('#final-mode',mode);await page.click('#final-run');await page.waitForFunction(()=>document.querySelector('.terminal').textContent!=='Параметры изменены. Нажмите «Найти».');verify(await page.locator('.terminal').textContent()===out,`Final ${query}/${mode}`);}
 await page.goto(origin+'/conditions?step=2');await page.waitForSelector('#code-editor');await page.fill('#code-editor',tasks.compare.solution);await page.click('#check-code');await page.waitForFunction(()=>!document.querySelector('#check-code').disabled,{timeout:30000});verify((await page.locator('#task-feedback').textContent()).includes('Верно'),'Editor checks Go');await page.fill('#code-editor',tasks.compare.starter);verify(await page.locator('#task-feedback').isHidden(),'Edit invalidates success');
 await page.fill('#code-editor',tasks.compare.solution);await page.reload();verify(await page.locator('#code-editor').inputValue()===tasks.compare.solution,'Draft reload');await page.click('#reset-code');verify(await page.locator('#code-editor').inputValue()===tasks.compare.starter,'Reset draft');
 for(let i=0;i<steps.length;i++)if(steps[i].kind==='code'){
 const t=tasks[steps[i].task];await page.goto(origin+'/conditions?step='+(i+1));await page.waitForSelector('.task-example');
 verify(await page.locator('.task-example').count()===t.tests.length,'Every test is visible: '+steps[i].task);
 verify(await page.locator('details .task-example').count()===0,'Examples are not collapsed: '+steps[i].task);
 // HTML textarea normalizes CRLF to LF. The grader still receives the original
 // dataset; both newline forms have the same Scanner semantics.
 await page.click(`[data-use-example="${t.tests.length-1}"]`);verify(await page.locator('#task-input').inputValue()===t.tests.at(-1)[0].replace(/\r\n/g,'\n'),'Use final example: '+steps[i].task);
 }
 await page.goto(origin+'/conditions?step=9');await page.waitForSelector('#quiz-check');await page.click('[data-option="1"]');await page.click('#quiz-check');verify((await page.locator('#quiz-feedback').getAttribute('class')).includes('error'),'Wrong quiz');await page.click('[data-option="0"]');await page.click('#quiz-check');verify((await page.locator('#quiz-feedback').getAttribute('class')).includes('success'),'Correct quiz');
 await page.goto(origin+'/conditions?step=7');await page.waitForSelector('#lamp-a');await page.click('#width-toggle');await geometry('Simulated phone');verify(await page.locator('main').evaluate(e=>e.getBoundingClientRect().width)<=390,'Phone toggle');await page.click('#motion-toggle');await page.click('#next');verify(await page.locator('h1').textContent()===steps[7].title,'Navigation');
 // Real motion as well as reduced-motion states: both branches, no ghost
 // animation after navigation, and short-circuit explanation from the lamp.
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>localStorage.removeItem('go-conditions:motion'));
 await page.goto(origin+'/conditions?step=3');await page.waitForSelector('#rail-run');
 for(const branch of [true,false]){
 await page.locator('#rail-found').setChecked(branch);await page.click('#rail-run');
 await page.waitForTimeout(600);
 const middle=await page.locator('#rail-train').evaluate(el=>({matrix:getComputedStyle(el).transform,busy:document.querySelector('#rail-run').disabled}));verify(middle.busy&&middle.matrix!=='none','Train actually moves '+branch);
 await page.waitForFunction(()=>!document.querySelector('#rail-run').disabled);
 verify(await page.locator('#rail-train').getAttribute('transform')==='translate(850 170)','Train arrives after join '+branch);
 }
 await page.click('#rail-run');await page.click('#next');verify(await page.locator('#rail-train').count()===0,'Navigation disposes train');
 await page.goto(origin+'/conditions?step=7');await page.waitForSelector('#lamp-trace');
 await page.click('#lamp-trace');await page.waitForFunction(()=>!document.querySelector('#lamp-trace').disabled);
 verify((await page.locator('.status').textContent()).includes('не вычисляется'),'Short circuit trace');
 verify(await page.locator('svg circle[r="8"]').count()===0,'Signal cleaned up');
 await page.click('#lamp-a');await page.click('#lamp-b');await page.click('#lamp-trace');await page.waitForFunction(()=>!document.querySelector('#lamp-trace').disabled);verify((await page.locator('.status').textContent()).includes('результат true'),'Two-operand trace');
 await page.goto(origin+'/conditions?step=10');await page.waitForSelector('.cab');await page.click('[data-floor="3"]');await page.waitForTimeout(1300);
 verify(await page.locator('.cab').evaluate(e=>Math.abs(parseFloat(getComputedStyle(e).bottom)/(e.parentElement.clientHeight)*100-75)<1),'Lift reaches floor 3');
 verify(!errors.length,'JS errors: '+errors.join(';'));verify(!external.length,'External requests: '+external.join(';'));
 console.log(JSON.stringify({checks,failures,errors,external,screenshots},null,2));assert.equal(failures.length,0,failures.join('\n'));
}finally{await browser.close();}
