// Build static, cache-versioned frames and an exact plan from the private inventory.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {variants,variantForCourse} from '../../shared/course-promotions/go-pro-max/offer.mjs';
const dir='.local-publication/go-max-course-promotions-20261126';
const folder='shared/course-promotions/go-pro-max';
const snapshot=JSON.parse(await readFile(dir+'/snapshot.json','utf8'));
assert.equal(snapshot.account,647088271);
const inputs=['card.html','card.css','card.js','offer.mjs'];
const hash=createHash('sha256');for(const file of inputs)hash.update(file).update(await readFile(folder+'/'+file));
const assetRevision=hash.digest('hex').slice(0,12);
const assetsOnly=process.argv.includes('--assets-only');
let previous;
if(assetsOnly)previous=JSON.parse(await readFile(dir+'/plan.json','utf8'));
else{
  let exists=false;try{await readFile(dir+'/journal.json');exists=true;}catch(error){if(error.code!=='ENOENT')throw error;}
  assert.ok(!exists,'Campaign already started. Use --assets-only for an asset repair, not a new plan.');
}
const revision=previous?.revision||assetRevision;
const source=await readFile(folder+'/card.html','utf8');
for(const [audience,variant] of Object.entries(variants)){
  let html=source.replace('<html lang="ru">','<html lang="ru" class="is-embedded" data-audience="'+audience+'">')
    .replace('href="card.css"','href="card.css?v='+assetRevision+'"').replace('src="card.js"','src="card.js?v='+assetRevision+'"')
    .replace('id="discount">−10%','id="discount">−'+variant.discount+'%').replace('value="GOSHECHKAMAX"','value="'+variant.code+'"');
  await writeFile(folder+'/offer-'+variant.discount+'.html',html);
}
const targets=[];
for(const boundary of snapshot.boundaries){
  const audience=variantForCourse(boundary.course),discount=variants[audience].discount;
  const text='<iframe height="400" src="https://zak618.github.io/stepik-course-pages/'+folder+'/offer-'+discount+'.html?v='+revision+'" style="width:100%;height:400px;border:0;margin:0;background:#fff;" width="100%"></iframe>';
  const intro=snapshot.sources.filter(s=>s.lesson===boundary.intro.lesson).sort((a,b)=>a.position-b.position);
  assert.ok(!intro.some(s=>s.block.text.includes('/course-promotions/go-pro-max/')),'Existing promotion needs a separate migration');
  const start=intro.find(s=>/\/(?:07-start|lesson-01-step-06)\.html/.test(s.block.text));
  const same=boundary.intro.lesson===boundary.final.lesson;
  targets.push({key:boundary.course+':intro',course:boundary.course,placement:same?'introduction-and-final':'introduction',lesson:boundary.intro.lesson,unit:boundary.intro.id,section:boundary.intro.section,position:same?intro.length+1:(start?.position||intro.length+1),audience,discount,text});
  if(!same){
    const lesson=snapshot.lessons.find(l=>l.id===boundary.final.lesson);
    const shared=lesson.courses.some(id=>id!==boundary.course);
    const sources=snapshot.sources.filter(s=>s.lesson===lesson.id);
    targets.push({key:boundary.course+':final',course:boundary.course,placement:'final',lesson:shared?null:lesson.id,unit:shared?null:boundary.final.id,section:boundary.final.section,position:shared?1:sources.length+1,audience,discount,text,...(shared?{newLessonTitle:'Что дальше',unitPosition:Math.max(...snapshot.units.filter(u=>u.section===boundary.final.section).map(u=>u.position))+1,sharedLessonPreserved:lesson.id}:{})});
  }
}
assert.equal(targets.length,75);assert.equal(targets.filter(t=>!t.lesson).length,1);
assert.equal(targets.filter(t=>t.discount===20).length,4);
assert.ok(!targets.some(t=>t.course===305734));
assert.equal(new Set(targets.filter(t=>t.lesson).map(t=>t.lesson)).size,74);
const assets=[...inputs.filter(file=>file!=='card.html'),'offer-10.html','offer-20.html'].map(file=>folder+'/'+file).concat('assets/course-covers/305734.png');
if(previous){assert.deepEqual(targets,previous.targets,'Asset repair cannot change Stepik content or positions');assert.deepEqual(assets,previous.assets);}
await writeFile(dir+'/plan.json',JSON.stringify({account:647088271,revision,assetRevision,frameHeight:400,assets,targets},null,2),{mode:0o600});
console.log(JSON.stringify({courses:39,newSteps:75,newLessons:1,discount20:4,revision,stepikWrites:0}));
