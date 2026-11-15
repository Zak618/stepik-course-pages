// Focused local smoke check. No Stepik credentials, writes or submissions.
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
const origin=process.env.STEPIK_SLICES_URL||'http://localhost:8781';
const{steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile('assets/go-mini-slices-content.js')).toString('base64'));
assert.equal(steps.length,22);assert.equal(Object.keys(tasks).length,12);
assert.equal(Object.values(tasks).reduce((n,t)=>n+t.tests.length,0),148);
for(const t of Object.values(tasks))assert.equal(new Set(t.tests.map(x=>x[0])).size,t.tests.length);
for(const k of ['helper','reverseMatches','final'])assert.equal(tasks[k].starter,'package main\n\nfunc main() {\n}\n');
async function run(code,input=''){
 const r=await fetch(origin+'/api/slices/run',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Go-Mini-Preview':'1'},body:JSON.stringify({code,input})});
 assert.equal(r.status,200);return r.json();
}
let goRuns=0;
for(const[name,t]of Object.entries(tasks)){
 for(const[input,expected]of[t.tests[0],t.tests.at(-1)]){const r=await run(t.solution,input);assert.ok(r.ok,`${name}: ${r.diagnostic}`);assert.equal(r.stdout,expected,name);goRuns++;}
 console.log('Go:',name);
}
for(const[source,expected]of[
 ['package main;import "fmt";func main(){var a []string;for _,v:=range a{fmt.Println(v)};fmt.Println("done")}','done\n'],
 ['package main;import "fmt";func main(){var a []string;a=append(a,"");fmt.Println(len(a),a[0])}','1 \n'],
 ['package main;import "fmt";func main(){a:=[]string{"a","b"};p:=a[1:2];p[0]="x";fmt.Println(a[1])}','x\n'],
 ['package main;import "fmt";func main(){a:=[]string{"a"};for _,v:=range a{v="x";fmt.Println(v,a[0])}}','x a\n'],
 ['package main;import "fmt";func main(){var a []string;for i:=0;i<300;i++{a=append(a,"x")};fmt.Println(len(a))}',false],
 ['package main;import "fmt";func main(){a:=[]string{"a"};for i:=0;i<20;i++{a[0]=a[0]+a[0]};fmt.Println(a[0])}',false],
 ['package main;func append(a []string,s string)[]string{return a};func main(){}',false],
 ['package main;func main(){a:=make([]string,1000000);_ = a}',false],
 ['package main;import "os";func main(){os.ReadFile(".env")}',false],
 ['package main;import "net/http";func main(){http.Get("https://example.com")}',false],
 ['package main;func again()[]string{return again()};func main(){again()}',false],
 ['package main;import "fmt";func main(){a:=[]string{"x"};i:=len(a);fmt.Println(a[i])}',false],
]){const r=await run(source);if(expected===false)assert.equal(r.ok,false);else{assert.ok(r.ok,r.diagnostic);assert.equal(r.stdout,expected);}goRuns++;}
assert.equal((await fetch(origin+'/.env')).status,404);
assert.equal((await fetch(origin+'/api/slices/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']}),p=await b.newPage({reducedMotion:'reduce',bypassCSP:true}),errors=[],shots=await mkdtemp('/tmp/slices-preview-');
p.on('pageerror',e=>errors.push(e.message));
const open=async n=>{await p.goto(origin+'/slices?step='+n);await p.waitForSelector('h1');};
const click=async s=>{await p.click(s);await p.waitForFunction(s=>!document.querySelector(s).disabled,s);};
try{
 for(const width of[390,1280]){await p.setViewportSize({width,height:1000});for(let n=1;n<=22;n++){await open(n);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+width+'/'+n);assert.equal(await p.locator('h1').textContent(),steps[n-1].title);}}
 await open(1);await click('#library-run');assert.equal(await p.locator('#library-count').textContent(),'3');await click('#library-run');assert.equal(await p.locator('#library-results .result-chip').count(),2);await p.fill('#library-query','Циклы');await click('#library-run');assert.equal(await p.locator('#library-results .result-chip').count(),1);
 await open(3);await p.fill('#jukebox-dial','4');await click('#jukebox-play');assert.ok((await p.locator('#jukebox-result').getAttribute('class')).includes('error'));await p.fill('#jukebox-dial','0');await click('#jukebox-play');assert.equal(await p.locator('#jukebox-value').textContent(),'"Go"');
 await open(5);await p.fill('#append-title','');await click('#append-add');assert.equal(await p.locator('#append-count').textContent(),'1');await p.fill('#append-title','Go');await click('#append-add');assert.equal(await p.locator('#append-count').textContent(),'2');await p.click('#append-clear');assert.equal(await p.locator('#append-count').textContent(),'0');
 await open(7);for(let i=0;i<4;i++)await click('#courier-next');assert.equal(await p.locator('#courier-i').textContent(),'3');await p.check('#courier-empty');await click('#courier-next');assert.equal(await p.locator('#courier-log').textContent(),'');
 await open(10);await click('#camera-action');assert.equal(await p.locator('#camera-source').textContent(),'Циклы');assert.equal(await p.locator('#camera-value').textContent(),'Функции');await click('#camera-action');assert.equal(await p.locator('#camera-source').textContent(),'Функции');
 await open(13);await click('#garden-run');assert.equal(await p.locator('#garden-count').textContent(),'3');assert.equal(await p.locator('.flower-plant').count(),5);await p.fill('#garden-query','');await click('#garden-run');assert.equal(await p.locator('#garden-count').textContent(),'0');
 await open(15);await click('#film-write');assert.equal(await p.locator('[data-frame="1"] strong').textContent(),'Новый кадр');await p.fill('#film-low','3');assert.equal(await p.locator('#film-write').isDisabled(),true);await p.fill('#film-high','5');assert.equal(await p.locator('#film-length').textContent(),'2');
 await open(19);await click('#find-run');assert.equal(await p.locator('#find-count').textContent(),'3');await p.fill('#find-query','Циклы');await click('#find-run');assert.equal(await p.locator('#find-count').textContent(),'1');assert.equal(await p.locator('#find-stored').textContent(),'5');
 for(const n of[8,16]){await open(n);await p.click('[data-option="0"]');await p.click('#quiz-check');assert.ok((await p.locator('#quiz-feedback').getAttribute('class')).includes('success'));}
 await open(20);assert.equal(await p.locator('.task-examples').getAttribute('open'),null);await p.fill('#code-editor',tasks.helper.solution);await p.click('#check-code');await p.waitForFunction(()=>!document.querySelector('#check-code').disabled,null,{timeout:60000});assert.ok((await p.locator('#task-feedback').textContent()).includes('Верно'));await p.reload();assert.equal(await p.locator('#code-editor').inputValue(),tasks.helper.solution);
 for(const width of[390,1280]){await p.setViewportSize({width,height:1000});for(const n of[1,3,5,7,10,13,15,19]){await open(n);await p.locator('.world').screenshot({path:`${shots}/step-${n}-${width}.png`});}}
 await p.emulateMedia({reducedMotion:'no-preference'});await open(5);await p.click('#append-add');await p.waitForTimeout(180);assert.ok(await p.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')));await p.click('#next');await p.waitForSelector('#code-editor');assert.equal(await p.locator('.particle,.flying-note').count(),0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({steps:22,openCases:148,goRuns,screenshots:shots,errors},null,2));
}finally{await b.close();}
