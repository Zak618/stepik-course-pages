// Local preparation only: no credentials, HTTP calls, submissions or publication.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context={window:{}};vm.runInNewContext(await readFile(path.join(root,'assets/go-mini-first-program-content.js'),'utf8'),context);
const content=context.window.FirstProgramContent;
const tasks=Array.from(content.entries()).filter(([,s])=>s?.assessment).map(([position,s])=>({position,title:s.title,...JSON.parse(JSON.stringify(s.assessment))}));
assert.equal(tasks.length,5);assert.equal(tasks.reduce((sum,t)=>sum+t.cost,0),50);
assert.deepEqual(tasks.filter(t=>t.type==='code').map(t=>t.position),[6,9]);
for(const task of tasks){
  if(task.type==='code'){
    assert.equal(task.language,'go');assert.ok(task.expected.endsWith('\n'));assert.ok(task.starter.includes('func main()'));
    // Current authoring contract is verified after creation: Go-only template,
    // generated empty input, reference output and a line-sensitive checker.
    const expected=JSON.stringify(task.expected),code=`EXPECTED = ${expected}\n\ndef generate():\n    return [("", EXPECTED)]\n\ndef solve(dataset):\n    return EXPECTED\n\ndef check(reply, clue):\n    actual = reply.replace("\\r\\n", "\\n").strip("\\n")\n    expected = clue.replace("\\r\\n", "\\n").strip("\\n")\n    return actual == expected\n`;
    task.block={name:'code',text:'',source:{code,execution_time_limit:5,execution_memory_limit:256,samples_count:1,templates_data:'::go\n'+task.starter,is_time_limit_scaled:false,is_memory_limit_scaled:false,manual_time_limits:[],manual_memory_limits:[],test_archive:[]},feedback_correct:'',feedback_wrong:''};
  }else{
    const source={is_multiple_choice:false,is_always_correct:false,sample_size:task.options.length,preserve_order:true,is_html_enabled:false,is_options_feedback:false,options:task.options.map((text,i)=>({text,is_correct:i===task.correct,feedback:''}))};
    task.block={name:'choice',text:task.prompt,source,feedback_correct:task.success,feedback_wrong:task.retry};
  }
}
const dir=path.join(root,'.local-publication');await mkdir(dir,{recursive:true});
await writeFile(path.join(dir,'first-program-tasks.json'),JSON.stringify({localOnly:true,published:false,course:305666,lesson:2706559,module:3,lessonPosition:1,totalCost:50,tasks},null,2)+'\n');
console.log('Подготовлено локально: 3 теста и 2 задачи на Go, по 10 баллов. Публикации нет.');
