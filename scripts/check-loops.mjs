import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
const origin=process.env.STEPIK_LOOPS_URL||'http://localhost:8777';
const {steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../assets/go-mini-loops-content.js',import.meta.url),'utf8')).toString('base64'));
let checks=0;const failures=[];
const verify=(ok,label)=>{checks++;if(!ok)failures.push(label);};
async function run(code,input=''){
 const response=await fetch(origin+'/api/loops/run',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Go-Mini-Preview':'1'},body:JSON.stringify({code,input})});
 assert.equal(response.status,200);return response.json();
}
verify(steps.length===20&&steps.filter(s=>s.kind==='scene').length===8&&steps.filter(s=>s.kind==='quiz').length===2,'Lesson structure');
verify(Object.keys(tasks).length===10,'Ten programming tasks');
for(const name of ['first','limit','final'])verify(tasks[name].starter.trim()==='package main\n\nfunc main() {\n}','Independent starter: '+name);
for(const [name,task]of Object.entries(tasks)){
 for(const [input,expected]of task.tests){const result=await run(task.solution,input);verify(result.ok&&result.stdout===expected,`${name}: ${JSON.stringify(input)}: ${JSON.stringify(result)}`);}
 const result=await run(task.starter,task.input);verify(!result.ok||result.stdout!==task.output,'Starter does not solve '+name);
 console.log('Go checked:',name,task.tests.length);
}
for(const [name,source,expected]of [
 ['infinite','package main;func main(){for{}}',false],
 ['break','package main;import "fmt";func main(){for{fmt.Println("Go");break}}','Go\n'],
 ['post','package main;import "fmt";func main(){for i:=0;i<3;i=i+1{fmt.Println(i)}}','0\n1\n2\n'],
 ['unused','package main;func main(){x:=1}',false],
 ['helper','package main;func main(){__goMiniLoopBudget:=0;for __goMiniLoopBudget<1{break}}',false],
 ['file','package main;import "os";func main(){os.ReadFile(".env")}',false],
 ['network','package main;import "net/http";func main(){http.Get("https://example.com")}',false],
 ['function','package main;func main(){f()};func f(){}',false],
 ['range','package main;func main(){for range 3{}}',false],
 ['directive','//go:linkname x runtime.fastrand\npackage main;func main(){}',false],
 ['growth','package main;import "fmt";func main(){s:="a";for i:=0;i<20;i++{s=s+s};fmt.Println(s)}',false],
 ['nested-budget','package main;func main(){for i:=0;i<100;i++{for j:=0;j<100;j++{}}}',false]
]){const result=await run(source);verify(expected===false?!result.ok:result.ok&&result.stdout===expected,`Runner ${name}: ${JSON.stringify(result)}`);}
for(const file of ['/.env','/README.md','/scripts/preview-loops.mjs','/assets/../.env'])verify((await fetch(origin+file)).status===404,'Private file not served: '+file);
verify((await fetch(origin+'/api/loops/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status===403,'Origin required');
console.log('Go/API complete:',{checks,failures});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const page=await browser.newPage({reducedMotion:'reduce',bypassCSP:true}),errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:'))external.push(r.url());});
const screenshots=await mkdtemp('/tmp/go-mini-loops-qa-');
const scene=async(n,only=false)=>{await page.goto(`${origin}/go-mini-module-04-lesson-02-step-${String(n).padStart(2,'0')}.html${only?'?panel=scene':''}`);await page.waitForSelector('.world');};
const settled=async selector=>page.waitForFunction(s=>!document.querySelector(s).disabled,selector);
const geometry=async label=>{const m=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,clipped:[...document.querySelectorAll('.phase-box,.record-card,.metric,.paper-ticket')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className)}));verify(m.overflow<=1&&!m.clipped.length,'Geometry '+label+': '+JSON.stringify(m));};
try{
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  for(let n=1;n<=steps.length;n++){await page.goto(`${origin}/go-mini-module-04-lesson-02-step-${String(n).padStart(2,'0')}.html`);await page.waitForSelector('h1');verify(await page.locator('h1').textContent()===steps[n-1].title,'Title '+n);await geometry(width+'/'+n);}
  for(const [index,s]of steps.entries())if(s.kind==='scene'){await scene(index+1,true);await geometry('scene '+width+'/'+s.scene);verify(await page.locator('.world').evaluate(e=>e.getBoundingClientRect().width)>=Math.min(width,1024)-1,'Full width '+width+'/'+s.scene);if(width===390||width===1024)await page.locator('.world').screenshot({path:`${screenshots}/${s.scene}-${width}.png`});}
 }
 await page.setViewportSize({width:1024,height:1000});
 await scene(1);await page.selectOption('#ticket-count','0');await page.click('#ticket-run');verify(await page.locator('.paper-ticket').count()===0,'Zero tickets');await page.selectOption('#ticket-count','3');await page.click('#ticket-once');await settled('#ticket-once');verify(await page.locator('.paper-ticket').count()===1,'if prints once');await page.click('#ticket-run');await settled('#ticket-run');verify(await page.locator('.paper-ticket').count()===3,'Three tickets');
 await scene(3);await page.click('#mech-play');await settled('#mech-play');verify(await page.locator('#mech-checks').textContent()==='4'&&await page.locator('#mech-runs').textContent()==='3','Three body runs four checks');await page.selectOption('#mech-count','0');await page.click('#mech-play');await settled('#mech-play');verify(await page.locator('#mech-checks').textContent()==='1'&&await page.locator('#mech-runs').textContent()==='0','Zero body still checked');await page.fill('#mech-timeline','0');verify(await page.locator('#mech-checks').textContent()==='0','Rewind execution');
 await scene(5);for(const [start,op,count]of [['0','<','5'],['0','<=','6'],['1','<=','5'],['1','<','4']]){await page.selectOption('#park-start',start);await page.selectOption('#park-op',op);await page.click('#park-run');await settled('#park-run');verify(await page.locator('#park-count').textContent()===count,'Parking '+start+op);verify(await page.locator('.car').count()===Number(count),'Cars '+count);}
 await scene(9);await page.selectOption('#charge-step','40');await page.click('#charge-play');await settled('#charge-play');verify(await page.locator('#charge-runs').textContent()==='3'&&await page.locator('#charge-checks').textContent()==='4','Battery clamp and last check');await page.click('#charge-reset');await page.check('#charge-stuck');await page.click('#charge-play');await settled('#charge-play');verify((await page.locator('.status').textContent()).includes('останов'),'Stuck illustration bounded');await page.uncheck('#charge-stuck');await page.fill('#charge-start','100');await page.click('#charge-next');verify(await page.locator('#charge-runs').textContent()==='0','Full battery zero body');
 await scene(11);await page.click('#stream-next');verify((await page.locator('#stream-result').textContent()).startsWith('true'),'First Scan true');await page.click('#stream-next');verify((await page.locator('#stream-result').textContent()).includes('пустая'),'Blank Scan true');await page.click('#stream-next');await page.click('#stream-next');verify((await page.locator('#stream-result').textContent()).startsWith('Ждём'),'Open source waits');await page.click('#stream-close');await page.click('#stream-next');verify((await page.locator('#stream-result').textContent()).startsWith('false'),'Closed EOF false');await page.fill('#stream-input','хвост');await page.click('#stream-next');verify((await page.locator('#stream-result').textContent()).startsWith('Ждём'),'Unterminated open tail waits');await page.click('#stream-close');await page.click('#stream-next');verify((await page.locator('#stream-result').textContent()).includes('хвост'),'Closed tail read');
 await scene(13);for(let i=0;i<4;i++){await page.click('#sort-next');await settled('#sort-next');}verify(await page.locator('#sort-checked').textContent()==='4'&&await page.locator('#sort-shown').textContent()==='3','Skip blank not spaces');verify(await page.locator('#sort-skipped .tray-paper').count()===1,'One skipped');
 await scene(15);await page.click('#stop-next');verify(await page.locator('#stop-shown').textContent()==='1'&&await page.locator('#stop-pending').textContent()==='7','First match break');await page.click('#stop-next');verify(await page.locator('#stop-checked').textContent()==='1','Break prevents subsequent reads');await page.selectOption('#stop-mode','three');for(let i=0;i<6;i++)await page.click('#stop-next');verify(await page.locator('#stop-shown').textContent()==='3'&&await page.locator('#stop-checked').textContent()==='5','Three match bound');
 await scene(19);await page.click('#search-run');await settled('#search-run');verify(await page.locator('#search-checked').textContent()==='5'&&await page.locator('#search-found').textContent()==='3','Find counts all inclblank and duplicates');verify((await page.locator('#search-output').textContent()).endsWith('Проверено: 5\nНайдено: 3\n'),'Find final summary');await page.fill('#search-query','');await page.click('#search-run');await settled('#search-run');verify(await page.locator('#search-output').textContent()==='Введите запрос'&&await page.locator('#search-checked').textContent()==='0','Empty query no reading');
 for(const [i,s]of steps.entries())if(s.kind==='code'){await page.goto(origin+'/loops?step='+(i+1));await page.waitForSelector('.task-examples');verify(await page.locator('.task-examples').getAttribute('open')===null,'Examples initially collapsed '+s.task);await page.locator('.task-examples>summary').click();verify(await page.locator('.task-example').count()===tasks[s.task].tests.length,'All cases accessible '+s.task);await page.click(`[data-use-example="${tasks[s.task].tests.length-1}"]`);verify(await page.locator('#task-input').inputValue()===tasks[s.task].tests.at(-1)[0].replace(/\r\n/g,'\n'),'Example input '+s.task);}
 await page.goto(origin+'/loops?step=2');await page.waitForSelector('#code-editor');await page.fill('#code-editor',tasks.tickets.solution);await page.click('#check-code');await page.waitForFunction(()=>!document.querySelector('#check-code').disabled,null,{timeout:60000});verify((await page.locator('#task-feedback').textContent()).includes('Верно'),'Editor real Go grading');await page.reload();verify(await page.locator('#code-editor').inputValue()===tasks.tickets.solution,'Draft restored');await page.click('#reset-code');verify(await page.locator('#code-editor').inputValue()===tasks.tickets.starter,'Draft reset');
 for(const n of [6,16]){await page.goto(origin+'/loops?step='+n);await page.click('[data-option="1"]');await page.click('#quiz-check');verify((await page.locator('#quiz-feedback').getAttribute('class')).includes('error'),'Wrong quiz '+n);await page.click('[data-option="0"]');await page.click('#quiz-check');verify((await page.locator('#quiz-feedback').getAttribute('class')).includes('success'),'Correct quiz '+n);}
 await page.goto(origin+'/loops');await page.click('#width-toggle');await geometry('Simulated phone');verify(await page.locator('main').evaluate(e=>e.getBoundingClientRect().width)<=390,'Phone preview');await page.click('#next');verify(await page.locator('h1').textContent()===steps[1].title,'Preview navigation');
 await page.emulateMedia({reducedMotion:'no-preference'});await scene(1,true);await page.selectOption('#ticket-count','3');await page.click('#ticket-run');await page.waitForTimeout(120);verify(await page.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')),'Real finite animation running');await settled('#ticket-run');verify(await page.locator('.paper-ticket').count()===3,'Motion completion');await page.click('#ticket-run');await page.goto(origin+'/loops?step=3');await page.waitForSelector('#mech-next');verify(await page.locator('.paper-ticket').count()===0,'Scene cancellation');
 verify(errors.length===0,'Browser errors '+JSON.stringify(errors));verify(external.length===0,'No external requests '+JSON.stringify(external));
}finally{await browser.close();}
console.log(JSON.stringify({checks,failures,screenshots},null,2));
assert.deepEqual(failures,[]);
