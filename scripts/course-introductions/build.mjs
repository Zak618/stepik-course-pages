// Generated pages are build output. Edit shared templates/copy, never individual HTML.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadPreview,renderPart,parts,esc} from './render.mjs';
import {slugs,files,version,base} from '../../shared/course-introductions/catalog.mjs';
import {welcomes} from '../../shared/course-introductions/copy.mjs';
const {profiles,snapshot} = await loadPreview();
const oldPlan = JSON.parse(await readFile('.local-publication/intros-20261116/plan.json','utf8'));
const directory = '.local-publication/unified-intros-preview-20261116';
const hash = s => createHash('sha256').update(s).digest('hex');
const generated = [],courses = [],updates = [];
async function output(file,text) {await mkdir(file.slice(0,file.lastIndexOf('/')),{recursive:true});await writeFile(file,text);generated.push(file);}
const assets = {'assets/go-mini-intro.css':'shared/course-introductions/base.css','assets/go-mini-embed.css':'shared/course-introductions/embedded.css','assets/go-mini-embed.js':'shared/course-introductions/embedded.js'};
for (const c of profiles) {
  if (c.reference) {courses.push({...c,pages:Object.fromEntries(parts.filter(p=>p[2]).map(p=>[p[0],'courses/305666-go-mini/modules/01-introduction/lesson-01-step-'+p[2]+'.html']))});continue;}
  assert.ok(slugs[c.id]);
  const folder = `courses/${c.id}-${slugs[c.id]}/introduction`;
  const pages = {};
  for (const [part] of parts) {
    let html = await renderPart(c,part);
    for (const [from,to] of Object.entries(assets)) html=html.replaceAll(from,to);
    html=html.replaceAll('/shared/course-introductions/','shared/course-introductions/');
    html=html.replaceAll('href="/shared/','href="shared/').replaceAll('href="/assets/','href="assets/');
    html=html.replace(/\/preview-interactions\.js\?course=\d+/g,'shared/course-introductions/interactions.js?v='+version);
    html=html.replace('<head>','<head><base href="../../../"><script>window.COURSE_INTRO_CONFIG='+JSON.stringify({id:c.id,title:c.title}).replaceAll('<','\\u003c')+';</script>');
    const file=folder+'/'+files[part];pages[part]=file;
    await output(file,html);
  }
  await output(folder+'/README.md',`# ${c.title}: введение\n\nКурс Stepik: ${c.id}. [Текущее введение](${c.firstUrl}).\n\n| Файл | Содержание |\n| --- | --- |\n${parts.map(([part,label])=>'| ['+files[part]+']('+files[part]+') | '+label+' |').join('\n')}\n\nЭти HTML генерируются из [общих шаблонов](../../../shared/course-introductions/README.md).\nПравьте тексты в shared/course-introductions/copy.mjs, оформление в общих шаблонах.\nЗатем выполните node scripts/course-introductions/build.mjs.\nЗадания, баллы, позиции и особые материалы не меняются этой сборкой.\n`);
  courses.push({...c,pages});
  const native=snapshot.intros.find(i=>i.course===c.id),sources=snapshot.sources.filter(s=>s.lesson===native.lesson).sort((a,b)=>a.position-b.position);
  const previous=oldPlan.plans.find(p=>p.course===c.id);
  const roleFor=s=>previous?.updates.find(u=>u.id===s.id)?.role || previous?.additions.find(u=>u.position===s.position)?.role;
  const existingRules=sources.some(s=>roleFor(s)==='rules');
  const frame=part=>`<div style="font-size:0;margin:0;"><iframe height="HEIGHT_${part}" src="${base}${pages[part]}?embed=1&amp;v=${version}" style="border:0;width:100%;margin:0;background:#fff;" width="100%"></iframe></div>`;
  for(const source of sources){
    if(source.block.name!=='text'||source.cost!==0)continue;
    const role=roleFor(source);let text;
    if(source.position===1){
      let prefix='<h2 style="color:#6742bf;">👋 Привет!</h2><p>На связи команда WEB HACKER.</p>';
      if(!c.package)prefix+='<p>'+esc(welcomes[c.id][0])+'</p>';
      assert.ok(source.block.text.startsWith(prefix),'Unknown welcome boundary '+c.id);
      text=frame('welcome')+source.block.text.slice(prefix.length);
    }else if(role==='community')text=frame('telegram')+(existingRules?'':'\n\n'+frame('rules'));
    else if(role==='map')text=frame('map');
    else if(role==='practice')text=frame('study');
    else if(role==='rules')text=frame('rules');
    else if(role==='start')text=frame('start');
    if(text)updates.push({course:c.id,lesson:source.lesson,id:source.id,position:source.position,role:source.position===1?'welcome':role,text,beforeHash:hash(JSON.stringify(source.block))});
  }
}
assert.equal(courses.filter(c=>!c.reference).length,37);
assert.ok(!courses.some(c=>[300562,305734].includes(c.id)));
await output('courses/introduction-catalog.json',JSON.stringify({version,courses,parts:parts.map(p=>p.slice(0,2)),excluded:[300562,305734],publication:true},null,2));
await output('courses/README.md','# Курсы\n\nКаждая папка названа по ID Stepik и короткому названию курса.\nВ introduction находятся готовые страницы; вручную их править не нужно.\n[Общие шаблоны и команды](../shared/course-introductions/README.md).\n\n[Go-шечка mini: все страницы по модулям](305666-go-mini/README.md).\n\n| Курс | Папка |\n| --- | --- |\n'+courses.filter(c=>!c.reference).map(c=>'| '+c.title+' | ['+c.id+'-'+slugs[c.id]+']('+c.id+'-'+slugs[c.id]+'/introduction/README.md) |').join('\n')+'\n\nGo-шечка mini служит образцом для введений. Go pro и Go Pro MAX исключены из их общей сборки.\nСтарые ссылки mini работают через [перенаправления](../compat/README.md).\n');
await writeFile(directory+'/build.json',JSON.stringify({version,generated,updates,courses:courses.filter(c=>!c.reference).map(c=>({id:c.id,title:c.title,pages:c.pages})),protectedTasks:snapshot.sources.filter(s=>s.block.name!=='text').length,structureUnchanged:true},null,2),{mode:0o600});
console.log(JSON.stringify({courses:37,generated:generated.length,updates:updates.length,protectedTasks:snapshot.sources.filter(s=>s.block.name!=='text').length,stepikWrites:0}));
