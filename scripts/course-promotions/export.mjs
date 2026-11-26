// Export only public placement links after the complete verification succeeded.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {variants} from '../../shared/course-promotions/go-pro-max/offer.mjs';
const dir='.local-publication/go-max-course-promotions-20261126';
const verified=JSON.parse(await readFile(dir+'/verified.json','utf8'));
const plan=JSON.parse(await readFile(dir+'/plan.json','utf8'));
const snapshot=JSON.parse(await readFile(dir+'/snapshot.json','utf8'));
assert.equal(verified.revision,plan.revision);assert.equal(verified.steps.length,75);
assert.ok(verified.originalScoresPreserved&&verified.courseSettingsPreserved);
const courses=snapshot.courses.map(course=>{
  const steps=verified.steps.filter(s=>s.course===course.id);
  assert.ok(steps.length===1||steps.length===2);
  const intro=steps.find(s=>s.placement.startsWith('introduction'));
  const final=steps.find(s=>s.placement==='final')||intro;
  const entry=step=>({source:step.source,lesson:step.lesson,unit:step.unit,position:step.position,url:step.url});
  return {id:course.id,title:course.title.trim(),discount:intro.discount,introduction:entry(intro),final:entry(final)};
});
assert.equal(courses.length,39);
await writeFile('shared/course-promotions/go-pro-max/publication.json',JSON.stringify({course:305734,revision:plan.revision,assetRevision:plan.assetRevision,verifiedAt:verified.verifiedAt,discounts:variants,courses},null,2)+'\n');
console.log(JSON.stringify({courses:courses.length,publicLinks:78,privateDataExported:false}));
