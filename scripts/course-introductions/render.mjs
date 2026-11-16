import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {welcomes} from '../../shared/course-introductions/copy.mjs';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = html => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export const parts = [
  ['welcome','Приветствие','01'], ['telegram','Telegram','02'], ['survey','Знакомство','03'],
  ['study','Как учиться',null], ['rules','Правила','04'], ['map','Карта курсов','05'], ['start','Начинаем','06']
];
const packages = new Set([187189,187191,187192]);
const marks = {go:'Go',web:'</>',backend:'{ }',tools:'⌘',ai:'ИИ',fullstack:'WH',other:'Aa'};
const roleNames = {welcome:'Общее приветствие',community:'Telegram и правила',map:'Общая карта',practice:'Советы по практике',project:'Проект курса',resources:'Материалы курса',tools:'Подготовка',version:'История версий',start:'Переход к урокам',rules:'Общие правила',help:'Как задать вопрос',survey:'Вопрос ученику',package:'Состав пакета'};
const templates = new Map();
async function template(id) {
  const name = parts.find(p => p[2] === id)?.[0];
  if (!templates.has(id)) templates.set(id, await readFile('shared/course-introductions/templates/' + name + '.html', 'utf8'));
  return templates.get(id);
}
export async function loadPreview() {
  const snapshot = JSON.parse(await readFile('.local-publication/unified-intros-preview-20261116/snapshot.json', 'utf8'));
  const plan = JSON.parse(await readFile('.local-publication/intros-20261116/plan.json', 'utf8'));
  const sandbox = {window: {}};
  vm.runInNewContext(await readFile('assets/go-mini-course-catalog.js', 'utf8'), sandbox);
  const catalog = sandbox.window.INTRO_CATALOG;
  const profiles = snapshot.courses.filter(c => ![300562,305734].includes(c.id)).map(c => {
    const intro = snapshot.intros.find(i => i.course === c.id);
    const sources = snapshot.sources.filter(s => s.lesson === intro.lesson).sort((a,b) => a.position-b.position);
    const entry = catalog.courses.find(x => x.id === c.id);
    const track = catalog.tracks.find(t => t.id === entry.track);
    const coursePlan = plan.plans.find(p => p.course === c.id);
    const topics = welcomes[c.id]?.[0] || (packages.has(c.id) ? 'В пакет входят курсы: ' + c.child_courses.map(id => catalog.courses.find(x => x.id === id)?.title).join(', ') + '.' : 'Мы начнём с первых команд на Go, разберём условия, циклы и функции. В конце соберём небольшой поиск Find.');
    const needs = welcomes[c.id]?.[1] || (packages.has(c.id) ? 'Открывайте курсы из пакета по порядку. Если уже изучали тему, можно вернуться к ней позже.' : 'Можно начинать без опыта. Понадобится компьютер.');
    const versionSources = sources.filter(s => /Версии курса|История изменений/.test(plain(s.block.text)));
    const versions = versionSources.flatMap(s => [...plain(s.block.text).matchAll(/\bv\s*\.?\s*\d+(?:\.\d+)*/gi)].map(m => m[0].replace(/\s/g,'')));
    return {
      id: c.id, title: c.title.trim(), track: entry.track, trackTitle: track.title, color: track.color,
      mark: marks[entry.track], reference: c.id === 305666, package: packages.has(c.id), topics, needs,
      firstUrl: `https://stepik.org/lesson/${intro.lesson}/step/1?unit=${intro.unit}`,
      nextTitle: snapshot.lessons.find(l => l.id === intro.nextLesson)?.title || 'Программа курса',
      nextUrl: intro.nextUnit ? `https://stepik.org/lesson/${intro.nextLesson}/step/1?unit=${intro.nextUnit}` : `https://stepik.org/course/${c.id}/syllabus`,
      sections: c.sections.map(id => snapshot.sections.find(s => s.id === id).title),
      children: c.child_courses.map(id => ({id, title: catalog.courses.find(x => x.id === id)?.title || 'Курс'})),
      versions: [...new Set(versions)],
      inventory: sources.map(s => {
        const role = coursePlan?.updates.find(u => u.id === s.id)?.role || coursePlan?.additions.find(u => u.position === s.position)?.role || 'original';
        const task = s.block.name !== 'text';
        return {id: s.id, position: s.position, type: s.block.name, cost: s.cost, title: plain(s.block.text).slice(0,140), preserve: task || !roleNames[role], treatment: task ? 'Задание сохраняется целиком' : roleNames[role] || 'Материал сохраняется целиком'};
      })
    };
  });
  return {profiles, snapshot};
}

const extraStyle = `<style>
body{min-width:0!important} .course-name{overflow-wrap:anywhere} .intro{min-width:0}
.embedded .course-name{font-size:clamp(30px,5.8vw,70px);line-height:1.12}
.embedded .course-copy{font-size:18px;line-height:1.65;max-width:730px}
.page-head .lede,.embedded .page-head .lede{font-size:18px;line-height:1.65}
.embedded .source-label{font-size:16px}.embedded .rule-body{font-size:17px}
.go-letter{max-width:100%;overflow-wrap:anywhere}.preview-context{color:#718097;font-size:14px;margin:0 0 22px;line-height:1.5}
@media(max-width:600px){.embedded .intro h1{font-size:clamp(30px,8vw,44px)}.embedded .course-copy{font-size:17px}.embedded .course-name{font-size:clamp(29px,8vw,44px)}.page-head h1{overflow-wrap:anywhere}.embedded .source-label{font-size:15px}}
</style>`;
export async function renderPart(course, part) {
  const definition = parts.find(p => p[0] === part);
  if (!definition) throw Error('Unknown part');
  if (part === 'study') return studyPage(course);
  let html = await template(definition[2]);
  if (course.reference) return readFile('courses/305666-go-mini/modules/01-introduction/lesson-01-step-' + definition[2] + '.html', 'utf8');
  if (part === 'welcome') {
    const name = esc(course.title).replace(/(\([^)]*\))/g, '<small>$1</small>');
    html = html.replace(/<p class="course-name">[\s\S]*?<\/p>/, '<p class="course-name">' + name + '</p>');
    html = html.replace(/<p class="course-copy">[\s\S]*?<\/p>/, '<p class="course-copy">Друзья, рады видеть вас на этом курсе! ' + esc(course.topics) + '</p>');
  }
  if (part === 'survey') html = html.replace(/(<text x="195"[^>]*>)[\s\S]*?(<\/text>)/, '$1' + esc(course.mark) + '$2');
  if (part === 'rules' && course.id === 290059) {
    html = html.replace('Обсуждаем код и идеи', 'Обсуждаем ответы и идеи').replace('ваш код и текст ошибки', 'текст задания и ваш ответ').replace('«Ожидал 10, получил 5. Мой код: …»', '«В задании выбрал этот вариант, но не понял, почему он неверный»');
  }
  if (part === 'start') {
    html = html.replace(/<span class="go-letter">[\s\S]*?<\/span>/, '<span class="go-letter">' + esc(course.mark) + '</span>');
    const text = course.package ? 'Выберите первый курс из пакета. Остальные можно открыть, когда будете готовы продолжить.' : 'Знакомство позади. Начнём с темы «' + course.nextTitle + '». ' + course.needs;
    html = html.replace(/<p class="lede">[\s\S]*?<\/p>/, '<p class="lede">' + esc(text) + '</p>');
    html = html.replaceAll('https://stepik.org/lesson/2706555/step/1?unit=2746570', esc(course.package ? `https://stepik.org/course/${course.children[0]?.id || course.id}/syllabus` : course.nextUrl));
    html = html.replace(/<p class="next-lesson">[\s\S]*?<\/p>/, '<p class="next-lesson">Дальше: ' + esc(course.package ? course.children[0]?.title : course.nextTitle) + '</p>');
  }
  html = html.replaceAll('Go-шечка (mini)', esc(course.title));
  html = html.replace(/assets\/go-mini-intro\.js(?:\?[^"']*)?/g, '/preview-interactions.js?course=' + course.id);
  return html.replace('</head>', extraStyle + '</head>');
}
export async function renderInteractions(course) {
  return `window.COURSE_INTRO_CONFIG=${JSON.stringify({id:course.id,title:course.title})};\n` + await readFile('shared/course-introductions/interactions.js', 'utf8');
}
function studyRows(c) {
  return [
    ['01','Сначала разберите пример','Прочитайте объяснение и попробуйте пример сами. Если что-то непонятно, вернитесь к нему после задания.'],
    ['02',c.id === 290059 ? 'Произносите и пробуйте' : 'Пишите свой код',c.id === 290059 ? 'Произносите новые слова вслух. Составляйте с ними свои фразы.' : 'Не ограничивайтесь чтением. Запускайте примеры, меняйте значения и проверяйте результат.'],
    ['03','Задавайте вопросы','Пишите под нужным шагом. Покажите, что пробовали и что не получилось.']
  ];
}
function studyConnection(c) {
  const connection = c.id === 300361 ? `<aside class="study-note"><h2>Это вторая часть путешествия</h2><p>Если условия, циклы, коллекции и функции пока незнакомы, начните с первой части.</p><a href="https://stepik.org/course/300153/promo" target="_blank" rel="noopener">Python: от Калининграда до Казани ↗</a></aside>` : c.id === 277096 ? `<aside class="study-note"><h2>Перед второй частью</h2><p>Нужны темы первого курса. Сам запуск продукта не гарантирует доход.</p><a href="https://stepik.org/course/276638/promo" target="_blank" rel="noopener">ИИ для всех: с нуля до своего продукта ↗</a></aside>` : c.id === 300560 ? `<aside class="study-note"><h2>Станция GREEN-01</h2><p>Будем изучать Go и собирать Station Control. История станции и задачи с кодом остаются частью курса.</p></aside>` : c.id === 289356 ? `<aside class="study-note"><h2>Мила и кот Тег</h2><p>Персонажи и их история остаются в курсе. Вместе будем разбираться в HTML.</p></aside>` : '';
  return connection;
}
// Static advice is native Stepik HTML: it grows with the text, with no iframe
// scrollbar or phone-sized blank area on desktop. The real syllabus is in Stepik.
export function renderStudyArticle(c) {
  const title=c.package?'Курсы в пакете.':'Как будем учиться.';
  // Stepik removes unitless line-height; inherit its readable native spacing.
  const heading='font-size:24px;margin:24px 0 10px;color:#24334a;';
  const paragraph='font-size:18px;margin:0 0 20px;color:#5e6f88;';
  let html=`<h1 style="font-size:34px;margin:0 0 20px;color:#6742bf;">${title}</h1><p style="${paragraph}">${esc(c.needs)}</p>`;
  if(c.package)html+='<ul>'+c.children.map(child=>`<li><a href="https://stepik.org/course/${child.id}/syllabus" rel="noopener noreferrer nofollow">${esc(child.title)}</a></li>`).join('')+'</ul>';
  else html+=studyRows(c).map(([n,title,text])=>`<h2 style="${heading}"><span style="color:#8e6bda;">${n}.</span> ${esc(title)}</h2><p style="${paragraph}">${esc(text)}</p>`).join('');
  const connection=studyConnection(c).replace(/<aside[^>]*>/g,'<div>').replaceAll('</aside>','</div>').replaceAll('<h2>',`<h2 style="${heading}">`).replaceAll('<p>',`<p style="${paragraph}">`).replaceAll(' target="_blank" rel="noopener"','');
  return html+connection.replace(/<a href="([^"]+)">/g,'<a href="$1" rel="noopener noreferrer nofollow">');
}
function studyPage(c) {
  const rows=c.package?c.children.map(child=>`<a class="study-item" href="https://stepik.org/course/${child.id}/syllabus" target="_blank" rel="noopener"><span>↗</span><strong>${esc(child.title)}</strong></a>`).join(''):studyRows(c).map(([n,title,text])=>`<div class="study-item"><span>${n}</span><div><h2>${esc(title)}</h2><p>${esc(text)}</p></div></div>`).join('');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.title)} · Как учиться</title><link rel="stylesheet" href="/assets/go-mini-intro.css"><link rel="stylesheet" href="/shared/course-introductions/study.css"><link rel="stylesheet" href="/assets/go-mini-embed.css"><script src="/assets/go-mini-embed.js"></script>${extraStyle}</head><body data-page="study"><main class="page study-page"><header class="page-head"><p class="preview-context">${esc(c.title)}</p><h1>${c.package?'Курсы <span class="gradient">в пакете.</span>':'Как будем <span class="gradient">учиться.</span>'}</h1><p class="lede">${esc(c.needs)}</p></header><section class="study-list">${rows}</section>${studyConnection(c)}</main></body></html>`;
}
