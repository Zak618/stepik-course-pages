/* Prepare native Stepik checkers locally. This script never calls an API. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(await readFile('assets/go-mini-algorithms-content.js','utf8'),context);
const content=context.window.AlgorithmsContent;
const tasks=content.flatMap((step,position)=>{
  if(!step?.assessment)return[];const a=step.assessment;assert.equal(a.cost,10);
  const source=a.type==='number'?{options:[{answer:String(a.answer),max_error:'0'}]}:{is_multiple_choice:false,is_always_correct:false,sample_size:a.options.length,preserve_order:true,is_html_enabled:false,is_options_feedback:false,options:a.options.map((text,i)=>({text,is_correct:i===a.correct,feedback:''}))};
  if(a.type==='choice')assert.equal(source.options.filter(o=>o.is_correct).length,1);
  return [{position,cost:a.cost,block:{name:a.type,text:a.prompt,source,feedback_correct:a.success,feedback_wrong:a.retry}}];
});
assert.deepEqual(Array.from(tasks,t=>t.position),[3,6,9]);assert.equal(tasks.reduce((sum,t)=>sum+t.cost,0),30);
await mkdir('.local-publication',{recursive:true});
await writeFile('.local-publication/algorithms-tasks.json',JSON.stringify({course:305666,lesson:2706556,localOnly:true,tasks},null,2));
console.log(JSON.stringify({localOnly:true,graded:tasks.length,points:30,types:tasks.map(t=>t.block.name),output:'.local-publication/algorithms-tasks.json'},null,2));
