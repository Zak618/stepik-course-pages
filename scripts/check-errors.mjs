import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
const origin=process.env.STEPIK_ERRORS_URL||'http://localhost:8783';
const {steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile('assets/go-mini-errors-content.js')).toString('base64'));
assert.equal(steps.length,22);assert.equal(Object.keys(tasks).length,12);
assert.equal(Object.values(tasks).reduce((n,t)=>n+t.tests.length,0),148);
for(const t of Object.values(tasks))assert.equal(new Set(t.tests.map(x=>x[0])).size,t.tests.length);
for(const k of ['queryHelper','pick','final'])assert.equal(tasks[k].starter,'package main\n\nfunc main() {\n}\n');
async function run(code,input=''){
 const r=await fetch(origin+'/api/errors/run',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Go-Mini-Preview':'1'},body:JSON.stringify({code,input})});
 assert.equal(r.status,200);return r.json();
}
let goRuns=0;
if(!process.argv.includes('--ui-only')){
for(const[name,t]of Object.entries(tasks)){
 for(const[input,expected]of t.tests){const r=await run(t.solution,input);assert.ok(r.ok,`${name}: ${r.diagnostic}`);assert.equal(r.stdout,expected,name+' '+JSON.stringify(input));goRuns++;}
 console.log('Go:',name,t.tests.length);
}
for(const[source,expected]of[
 ['package main;import("fmt";"strconv");func main(){n,err:=strconv.Atoi("0");fmt.Println(n,err==nil)}','0 true\n'],
 ['package main;import("fmt";"errors");func f(s string)(string,error){if s==""{return "",errors.New("empty")};return s,nil};func main(){s,err:=f("Go");fmt.Println(s,err==nil)}','Go true\n'],
 ['package main;import("fmt";"strconv");func f(s string)(int,error){return strconv.Atoi(s)};func main(){n,err:=f("3");fmt.Println(n,err==nil)}','3 true\n'],
 ['package main;import("fmt";"bufio";"os");func main(){s:=bufio.NewScanner(os.Stdin);fmt.Println(s.Scan(),s.Err()==nil)}','false true\n'],
 ['package main;import "os";func main(){os.ReadFile(".env")}',false],
 ['package main;import "net/http";func main(){http.Get("https://example.com")}',false],
 ['package main;func f()(int,error){return f()};func main(){f()}',false],
 ['package main;func main(){for{}}',false],
 ['package main;import("fmt";"strings");func f(s string)(string,error){for i:=0;i<20;i++{s=s+s};return s,nil};func main(){s,err:=f(strings.TrimSpace("x"));fmt.Println(s,err)}',false],
 ['package main;func main(){__goMiniErrorsTick()}',false],
 ['package main;import "fmt";func main(){a:=[]string{"Go"};fmt.Println(a[1])}',false],
]){const r=await run(source);if(expected===false)assert.equal(r.ok,false);else{assert.ok(r.ok,r.diagnostic);assert.equal(r.stdout,expected);}goRuns++;}
}
assert.equal((await fetch(origin+'/.env')).status,404);
assert.equal((await fetch(origin+'/api/errors/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']}),p=await b.newPage({reducedMotion:'reduce',bypassCSP:true}),errors=[],shots=await mkdtemp('/tmp/errors-preview-');
p.on('pageerror',e=>errors.push(e.message));
const open=async n=>{await p.goto(origin+'/errors?step='+n);await p.waitForSelector('h1');};
const click=async s=>{await p.click(s);await p.waitForFunction(s=>!document.querySelector(s).disabled,s);};
try{
 for(const width of[390,768,1360]){await p.setViewportSize({width,height:1000});for(let n=1;n<=22;n++){await open(n);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+width+'/'+n);assert.equal(await p.locator('h1').textContent(),steps[n-1].title);}}
 await open(1);await click('#clean-run');assert.equal(await p.locator('#clean-after').textContent(),'""');await p.fill('#clean-input','  Go  notes  ');await click('#clean-run');assert.equal(await p.locator('#clean-after').textContent(),'Go··notes');
 await open(3);for(const[s,n,err]of[['кот','0','не nil'],['0','0','nil'],[' 12 ','0','не nil'],['12','12','nil']]){await p.fill('#machine-input',s);await click('#machine-run');assert.equal(await p.locator('#machine-n').textContent(),n);assert.equal(await p.locator('#machine-err').textContent(),err);}
 await open(6);await click('#lift-run');assert.equal(await p.locator('[data-floor="2"]').getAttribute('class'),'floor-room chosen');for(const width of[390,1360]){await p.setViewportSize({width,height:1000});await p.waitForTimeout(100);assert.ok(await p.evaluate(()=>{const a=document.querySelector('#lift-cab').getBoundingClientRect(),b=document.querySelector('[data-floor="2"]').getBoundingClientRect();return Math.abs(a.y+a.height/2-b.y-b.height/2)<2;}));}await p.fill('#lift-input','9');await click('#lift-run');assert.ok((await p.locator('#lift-check-range').getAttribute('class')).includes('refused'));await p.fill('#lift-input','два');await click('#lift-run');assert.ok((await p.locator('#lift-check-number').getAttribute('class')).includes('refused'));
 await open(9);await click('#mail-run');await click('#mail-run');assert.equal(await p.locator('#mail-text').textContent(),'""');assert.equal(await p.locator('#mail-scan').textContent(),'true');await click('#mail-run');await click('#mail-run');assert.equal(await p.locator('#mail-scan').textContent(),'false');assert.equal(await p.locator('#mail-err').textContent(),'nil');await p.selectOption('#mail-mode','broken');await click('#mail-run');await click('#mail-run');assert.equal(await p.locator('#mail-err').textContent(),'не nil');
 await open(12);await click('#belt-run');assert.equal(await p.locator('#belt-total').textContent(),'3');await p.selectOption('#belt-mode','continue');await click('#belt-run');assert.equal(await p.locator('#belt-total').textContent(),'8');assert.equal(await p.locator('.order-crate.processed').count(),4);
 await open(15);for(const key of['compile','runtime','logic']){await p.selectOption('#workshop-case',key);await click('#workshop-run');assert.equal(await p.locator('.workshop-station.refused').count(),1);}
 await open(17);await click('#bakery-run');assert.equal(await p.locator('.fresh-bun').count(),2);await p.fill('#bakery-input','9');await click('#bakery-run');assert.equal(await p.locator('#bakery-error').textContent(),'Количество от 1 до 4');assert.equal(await p.locator('.fresh-bun').count(),0);
 await open(19);await click('#find-run');assert.equal(await p.locator('#find-answer').textContent(),'Открываем: Go: функции');await p.fill('#find-number','9');await click('#find-run');assert.equal(await p.locator('#find-answer').textContent(),'Нет такого результата');await p.fill('#find-query',' ');await click('#find-run');assert.equal(await p.locator('#find-answer').textContent(),'Введите запрос');assert.equal(await p.locator('.find-folder').count(),4);
 for(const n of[8,16]){await open(n);await p.click('[data-option="0"]');await p.click('#quiz-check');assert.ok((await p.locator('#quiz-feedback').getAttribute('class')).includes('success'));}
 await open(20);await p.fill('#code-editor',tasks.queryHelper.solution);await p.click('#check-code');await p.waitForFunction(()=>!document.querySelector('#check-code').disabled,null,{timeout:60000});assert.ok((await p.locator('#task-feedback').textContent()).includes('Верно'));await p.reload();assert.equal(await p.locator('#code-editor').inputValue(),tasks.queryHelper.solution);
 for(const width of[390,1360]){await p.setViewportSize({width,height:1000});for(const n of[1,3,6,9,12,15,17,19]){await open(n);await p.locator('.world').screenshot({path:`${shots}/step-${n}-${width}.png`});}}
 await p.emulateMedia({reducedMotion:'no-preference'});await open(1);await p.click('#clean-run');await p.waitForTimeout(120);assert.ok(await p.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')));await p.click('#next');await p.waitForSelector('#code-editor');assert.equal(await p.locator('.error-fly,.error-spark').count(),0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({steps:22,openCases:148,goRuns,screenshots:shots,errors},null,2));
}finally{await b.close();}
