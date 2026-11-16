import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {copy,roles} from './course-intro-copy.mjs';
import {renderWelcome} from './course-intro-welcome-copy.mjs';

const dir='.local-publication/intros-20261116';
const snapshot=JSON.parse(await readFile(dir+'/snapshot.json','utf8'));
try{await readFile(dir+'/journal.json');throw Error('Initial rollout is archived. Use revise-course-intro-welcomes.mjs; do not overwrite its publication plan.');}catch(e){if(e.code!=='ENOENT')throw e;}
const version='20261116-1';
let layout={heights:{}};
try{layout=JSON.parse(await readFile(dir+'/layout.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const origin='https://zak618.github.io/stepik-course-pages/';
const excluded=[305666,305734], packages=[187192,187189,187191];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=html=>html.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const heading=(icon,title)=>`<h2 style="color:#6742bf;">${icon} ${esc(title)}</h2>`;
const paragraph=text=>`<p>${esc(text)}</p>`;
const link=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const map=`<p><iframe src="${origin}go-mini-module-01-lesson-01-step-05.html?embed=1&amp;v=20261116-universal" width="100%" height="860" title="Карта курсов WEB HACKER" style="border:0;"></iframe></p>`;
const mapArticle=heading('🧭','Карта курсов')+map;
const responsive=html=>html.replace(/<img\b([^>]*)>/gi,(_,attrs)=>'<img'+attrs.replace(/\s(?:width|height|style)="[^"]*"/gi,'')+' style="max-width:100%;height:auto;">').replace(/autoplay=1/g,'autoplay=0');
const rules=heading('🤝','Как учимся вместе')+'<ul><li>Обсуждаем работу, не человека. Не оскорбляем друг друга.</li><li>Помогаем разобраться, но не публикуем готовые ответы к заданиям.</li><li>В вопросе указываем шаг, свои действия и результат. Для кода сохраняем отступы.</li><li>Нашли неточность? Напишите в комментариях к этому шагу, что именно не сходится.</li></ul>';
const community=heading('💬','На связи')+paragraph('На связи команда WEB HACKER. В Telegram делимся новостями курсов и новыми материалами. Вопрос по уроку лучше оставить в комментариях к самому шагу, чтобы рядом было условие.')+`<p>${link('https://t.me/webosnovy','Открыть Telegram @webosnovy ↗')}</p>`+rules;
const practice=heading('🛠','Как проходить курс')+'<ol><li>Прочитайте объяснение и разберите пример. Перед действием попробуйте предсказать результат.</li><li>Повторите пример сами. Поменяйте одну деталь и сравните.</li><li>Решите задание. Сначала проверьте условие и формат ответа, потом своё решение.</li></ol>'+paragraph('Сохраняйте свою практику. Если пришлось сделать перерыв, вернитесь к последнему примеру и попробуйте объяснить, как он работает.');
const help=heading('🔎','Если что-то не получилось')+paragraph('Сравните ожидаемый результат с тем, что вышло у вас. В задаче с кодом прочитайте сообщение об ошибке и проверьте указанную строку. Если программа запустилась, проверьте данные и формат вывода.')+paragraph('Для вопроса достаточно небольшого примера: что сделали, чего ждали и что получили. Не нужно выкладывать полное решение в общий комментарий.');
const profiles={};
const plans=[];
const extraUnits=new Map(snapshot.units.map(u=>[u.id,u]));
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
async function api(path){const r=await fetch('https://stepik.org/api/'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(40000)});assert.ok(r.ok,'Read navigation HTTP '+r.status);return r.json();}
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
const nextIds=snapshot.courses.filter(c=>!excluded.includes(c.id)).map(c=>c.sections.flatMap(id=>snapshot.sections.find(s=>s.id===id).units)[1]).filter(id=>id&&!extraUnits.has(id));
for(let i=0;i<nextIds.length;i+=12)for(const unit of (await api('units?'+nextIds.slice(i,i+12).map(id=>'ids[]='+id).join('&'))).units)extraUnits.set(unit.id,unit);
function nextCourse(c){const all=c.sections.flatMap(id=>snapshot.sections.find(s=>s.id===id).units),unit=extraUnits.get(all[1]);return unit?`https://stepik.org/lesson/${unit.lesson}/step/1?unit=${unit.id}`:`https://stepik.org/course/${c.id}/syllabus`;}
function route(c){const titles=c.sections.map(id=>snapshot.sections.find(s=>s.id===id).title);return heading('🗺','Что будем разбирать')+'<ol>'+titles.map(t=>`<li>${esc(t)}</li>`).join('')+'</ol>';}
function shortVersion(old){const p=plain(old),match=p.match(/v\s*\.?\s*\d+(?:\.\d+)*/i);return heading('📦','Версии курса')+(match?`<h3 style="color:#187d8c;">${esc(match[0].replace(/\s/g,''))}</h3>`:'')+`<details><summary>История изменений</summary>${responsive(old)}</details>`;}
function welcome(c){profiles[c.id]={title:c.title.trim(),scene:copy[c.id][0]};return renderWelcome(c.id);}
function start(c){return heading('🚀','Переходим к практике')+paragraph('Дальше разберём первую тему. Откройте следующий урок и попробуйте его примеры сами.')+`<p><a href="${esc(nextCourse(c))}">Открыть следующий урок →</a></p>`;}
function survey(c){return heading('✍️','С чем начинаем?')+paragraph('Что хотите научиться делать после курса? Напишите одну задачу, которая вам интересна. И расскажите, как нашли курс: поиск, Telegram, знакомые или другой наш курс.')+paragraph('Личные данные не нужны. Нескольких предложений достаточно.');}
function resources(old){const urls=[...old.matchAll(/(?:href|src)="(https?:[^"\s]+)"/g)].map(m=>m[1].replace(/&amp;/g,'&')).filter(u=>!u.includes('ucarecdn.')&&!u.includes('video_ext.php')&&!u.includes('/embed/'));return heading('📚','Дополнительные материалы')+paragraph('Эти материалы можно открыть отдельно. Для прохождения уроков не нужно смотреть всё сразу.')+(urls.length?'<ul>'+[...new Set(urls)].map((u,i)=>`<li>${link(u,'Материал '+(i+1))}</li>`).join('')+'</ul>':`<details><summary>Открыть материалы</summary>${responsive(old)}</details>`);}
const tools=heading('⌨️','Где писать код')+paragraph('Подойдёт редактор, в котором удобно сохранять файлы и запускать примеры. Если редактор уже есть, менять его ради курса не нужно.')+`<p>${link('https://code.visualstudio.com/','Visual Studio Code ↗')}</p>`+paragraph('Установку языка и нужные команды смотрите в соответствующих уроках. Не устанавливайте всё из программы заранее.');
function article(role,c,old){switch(role){
  case 'welcome':return welcome(c);
  case 'community':return community;
  case 'map':return mapArticle;
  case 'practice':return practice+`<details><summary>Программа курса</summary>${route(c)}</details>`;
  case 'project':return route(c);
  case 'rules':return rules;
  case 'help':return help;
  case 'tools':return tools;
  case 'version':return shortVersion(old);
  case 'resources':return resources(old);
  case 'start':return start(c);
  case 'sponsor':return responsive(old).replace('при поддержки','при поддержке');
  case 'continuation':return heading('🔭','После этого курса')+paragraph('Когда закончите первую часть, можно перейти к выбору идеи, сборке бота и запуску продукта. Это отдельный курс. Сейчас не нужно переключаться на него.')+`<p>${link('https://stepik.org/course/277096/promo','ИИ для всех: от идеи до заработка ↗')}</p>`;
  case 'prerequisite':return heading('🧩','Что нужно до старта')+paragraph(copy[c.id][3])+`<p>${link('https://stepik.org/course/276638/promo','Открыть первую часть ↗')}</p>`;
  default:throw Error('Unknown role '+role);
}}
function freeAnswer(old){
  const p=plain(old.block.text),posterOnly=!p;
  if([10353418].includes(old.id))return heading('✍️','Как вы узнали о курсе?')+paragraph('Нашли через поиск, Telegram, знакомых или другой наш курс? Напишите, что привело вас сюда.')+`<details><summary>Тег тоже спрашивает</summary>${responsive(old.block.text)}</details>`;
  if([3719988,4708492].includes(old.id))return heading('✍️','Почему решили пройти этот курс?')+paragraph('Расскажите, зачем вам эти знания. Если курс входит в вашу учебную программу, название учебного заведения можно указать по желанию. Личные данные не нужны.');
  if([4276165,4708493].includes(old.id))return heading('🌍','Откуда вы?')+paragraph('Из какого вы города или региона? Точный адрес и другие личные данные не нужны. Если не хотите указывать место, так и напишите.');
  if(posterOnly)return responsive(old.block.text);
  if(/Ваши ожидания от курса/.test(p))return heading('✍️','Чего ждёте от курса?')+paragraph('Какие темы хочется понять лучше? Можно назвать одну или две.');
  if(/Ваша цель прохождения/.test(p))return heading('🎯','Что хотите уметь?')+paragraph('Назовите задачу или небольшой проект, ради которого пришли учиться.');
  if(/Как вы узнали о курсе/.test(p))return heading('✍️','Как нашли курс?')+paragraph('Поиск, Telegram, рекомендация или другой наш курс? Напишите свой вариант.');
  if(/^О себе/.test(p))return heading('✍️','О вашем опыте')+paragraph('Пробовали ли вы эту тему раньше? Что хотите научиться делать и как нашли курс? Можно ответить коротко. Личные данные не нужны.');
  return responsive(old.block.text);
}
for(const intro of snapshot.intros){
  const c=snapshot.courses.find(c=>c.id===intro.course);
  if(excluded.includes(c.id))continue;
  assert.equal(c.is_public,true);assert.ok(c.actions.edit_course);
  const sources=snapshot.sources.filter(s=>s.lesson===intro.lesson).sort((a,b)=>a.position-b.position);
  const plan={course:c.id,title:c.title,lesson:intro.lesson,unit:intro.unit,updates:[],additions:[]};
  const update=(s,role,text)=>{assert.ok(['text','free-answer'].includes(s.block.name));assert.equal(s.block.name==='text'?s.cost:0,0,'Only unscored theory may be replaced');if(s.block.text!==text)plan.updates.push({id:s.id,position:s.position,type:s.block.name,role,text});};
  const add=(role,text,type='text')=>plan.additions.push({role,position:sources.length+plan.additions.length+1,type,cost:0,text});
  if(c.id===300562){add('map',mapArticle);plans.push(plan);continue;}
  if(packages.includes(c.id)){
    assert.ok(c.child_courses.length);
    const body=heading('🧭','Ваши курсы в пакете')+paragraph('Курсы открываются отдельно. Начните с первого в списке и возвращайтесь сюда, когда будете готовы продолжать.')+'<ol>'+c.child_courses.map(id=>{const child=snapshot.courses.find(c=>c.id===id);assert.ok(child);return `<li><p>${link('https://stepik.org/course/'+id+'/syllabus',child.title)}</p></li>`;}).join('')+'</ol>'+paragraph('Если страница предлагает покупку, проверьте, что вошли в тот же аккаунт Stepik, на котором открыт пакет.')+`<p>${link('https://t.me/webosnovy','Telegram @webosnovy ↗')}</p>`;
    update(sources[0],'package',body);add('map',mapArticle);plans.push(plan);continue;
  }
  if(c.id===300361){
    // This is already a teaching lesson. Keep every explanation and exercise.
    profiles[c.id]={title:c.title.trim(),scene:copy[c.id][0]};
    update(sources[0],'teaching-welcome',welcome(c)+responsive(sources[0].block.text)+`<details><summary>Карта курсов</summary>${map}</details><details><summary>Как задать вопрос</summary>${community}</details>`);
    plans.push(plan);continue;
  }
  if(c.id===300560){
    update(sources[0],'story-welcome',welcome(c)+`<details><summary>О формате курса</summary>${responsive(sources[0].block.text)}</details>`);
    update(sources[4],'story-practice',responsive(sources[4].block.text)+community);
    add('map',mapArticle);add('survey',survey(c),'free-answer');plans.push(plan);continue;
  }
  if(c.id===300153){
    update(sources[0],'journey-welcome',welcome(c));
    update(sources[3],'journey-route',responsive(sources[3].block.text)+`<details><summary>Другие курсы WEB HACKER</summary>${map}</details>`);
    update(sources[4],'journey-practice',responsive(sources[4].block.text)+community);
    update(sources[7],'start',start(c));plans.push(plan);continue;
  }
  if(c.id===289356){
    update(sources[0],'illustrated-welcome',welcome(c)+`<details><summary>Знакомство с Милой и Тегом</summary>${responsive(sources[0].block.text)}</details>`);
    update(sources[1],'survey',freeAnswer(sources[1]));update(sources[2],'map',mapArticle);update(sources[3],'community',community);update(sources[4],'start',start(c));plans.push(plan);continue;
  }
  const selected=roles[c.id]||['welcome','community','map','version','start'];
  assert.equal(selected.length,sources.length,'Review native roles for '+c.id);
  for(let i=0;i<sources.length;i++){
    const s=sources[i],role=selected[i];
    if(s.block.name==='free-answer'){update(s,'survey',freeAnswer(s));continue;}
    if(s.block.name!=='text'){assert.equal(role,null);continue;}
    assert.equal(s.cost,0);assert.ok(role);update(s,role,article(role,c,s.block.text));
  }
  if(!selected.includes('map'))add('map',mapArticle);
  if(!selected.includes('community'))add('community',community);
  if(!sources.some(s=>s.block.name==='free-answer'))add('survey',survey(c),'free-answer');
  plans.push(plan);
}
assert.equal(plans.length,38);
assert.equal(Object.keys(profiles).length,34);
assert.equal(new Set(plans.map(p=>p.lesson)).size,plans.length,'No shared first lessons');
for(const p of plans){assert.ok(p.updates.length||p.additions.length);for(const a of [...p.updates,...p.additions]){assert.ok(!a.text.includes('Вы сейчас здесь'));assert.ok(!a.text.includes('current='));}}
await writeFile('assets/course-intro-profiles.js','/* Public course profiles. Generated by scripts/build-course-intros.mjs. */\nwindow.COURSE_INTROS = '+JSON.stringify(profiles,null,2)+';\n');
await writeFile('assets/course-intro-index.js','/* Public introduction previews only. No student answers. */\nwindow.COURSE_INTRO_INDEX = '+JSON.stringify(plans.map(p=>({id:p.course,title:p.title.trim(),url:`https://stepik.org/lesson/${p.lesson}/step/1?unit=${p.unit}`,html:p.updates.find(a=>a.position===1)?.text||mapArticle})),null,2)+';\n');
await writeFile(dir+'/plan.json',JSON.stringify({version,excluded,plans},null,2),{mode:0o600});
console.log(JSON.stringify({courses:plans.length,profiles:Object.keys(profiles).length,updates:plans.reduce((n,p)=>n+p.updates.length,0),newSteps:plans.reduce((n,p)=>n+p.additions.length,0)}));
