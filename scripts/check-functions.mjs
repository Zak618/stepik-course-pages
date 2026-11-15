import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import checkBrowser from './lib/functions-browser-check.mjs';
const origin=process.env.STEPIK_FUNCTIONS_URL||'http://localhost:8779';
const{steps,tasks}=await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../assets/go-mini-functions-content.js',import.meta.url),'utf8')).toString('base64'));
let checks=0;const failures=[];
const verify=(ok,label)=>{checks++;if(!ok)failures.push(label);};
async function run(code,input=''){
 const response=await fetch(origin+'/api/functions/run',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Go-Mini-Preview':'1'},body:JSON.stringify({code,input})});
 assert.equal(response.status,200);return response.json();
}
verify(steps.length===22&&steps.filter(s=>s.kind==='scene').length===8&&steps.filter(s=>s.kind==='quiz').length===2,'Lesson structure');
verify(Object.keys(tasks).length===12,'Twelve programming tasks');
for(const name of ['first','summary','final'])verify(tasks[name].starter.trim()==='package main\n\nfunc main() {\n}','Independent starter: '+name);
for(const[name,t]of Object.entries(tasks)){
 verify(t.tests.length>=12&&new Set(t.tests.map(x=>x[0])).size===t.tests.length,'Distinct inputs '+name);
 for(const[input,expected]of t.tests){const r=await run(t.solution,input);verify(r.ok&&r.stdout===expected,`${name} ${JSON.stringify(input)}: ${JSON.stringify(r)}`);}
 const result=await run(t.starter,t.input);verify(!result.ok||result.stdout!==t.output,'Starter does not solve '+name);console.log('Go checked:',name,t.tests.length);
}
for(const[name,source,expected]of[
 ['declared-not-called','package main;import "fmt";func helper(){fmt.Println("No")};func main(){fmt.Println("Yes")}','Yes\n'],
 ['copy','package main;import "fmt";func next(n int) int{n++;return n};func main(){n:=4;r:=next(n);fmt.Println(n,r)}','4 5\n'],
 ['nested','package main;import "fmt";func a(n int) int{return n*2};func b(n int) int{return a(n)+1};func main(){fmt.Println(b(3))}','7\n'],
 ['return-in-loop','package main;import "fmt";func f(n int) int{for i:=0;i<3;i++{if n>0{return i}};return 9};func main(){for j:=0;j<2;j++{fmt.Println(f(1))};fmt.Println("Done")}','0\n0\nDone\n'],
 ['string-return','package main;import "fmt";func f(s string) string{return "("+s+")"};func main(){fmt.Println(f("Go"))}','(Go)\n'],
 ['void-value','package main;import "fmt";func f(){fmt.Println("x")};func main(){x:=f();fmt.Println(x)}',false],
 ['missing-return','package main;func f(n int) int{if n>0{return n}};func main(){f(1)}',false],
 ['unused','package main;func f()int{x:=1;return 2};func main(){f()}',false],
 ['recursive','package main;func f()int{return f()};func main(){f()}',false],
 ['indirect-recursive','package main;func f(){g()};func g(){f()};func main(){f()}',false],
 ['call-main','package main;func main(){main()}',false],
 ['function-budget','package main;func a(){for i:=0;i<10;i++{b()}};func b(){for j:=0;j<1000;j++{}};func main(){a()}',false],
 ['helper-prefix','package main;func main(){__goMiniFunctionBudget:=0;for __goMiniFunctionBudget<1{break}}',false],
 ['file','package main;import "os";func f(){os.ReadFile(".env")};func main(){f()}',false],
 ['network','package main;import "net/http";func main(){http.Get("https://example.com")}',false],
 ['global','package main;var x=1;func main(){}',false],
 ['pointer','package main;func f(n *int){};func main(){}',false],
 ['closure','package main;func main(){f:=func(){};f()}',false],
 ['defer','package main;func f(){};func main(){defer f()}',false],
 ['range','package main;func main(){for range 3{}}',false],
 ['directive','//go:linkname x runtime.fastrand\npackage main;func main(){}',false],
 ['growth','package main;import "fmt";func f(s string)string{for i:=0;i<20;i++{s=s+s};return s};func main(){fmt.Println(f("a"))}',false]
]){const r=await run(source);verify(expected===false?!r.ok:r.ok&&r.stdout===expected,`Runner ${name}: ${JSON.stringify(r)}`);}
for(const file of ['/.env','/.env.stepik-webhacker-session','/README.md','/scripts/preview-functions.mjs','/assets/../.env'])verify((await fetch(origin+file)).status===404,'Do not serve '+file);
verify((await fetch(origin+'/api/functions/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status===403,'Origin required');
console.log('Runner/API:',{checks,failures});
const screenshots=await checkBrowser({steps,tasks,origin,verify});
console.log(JSON.stringify({checks,failures,screenshots},null,2));assert.deepEqual(failures,[]);
