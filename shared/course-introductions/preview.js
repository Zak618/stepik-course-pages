// Review controls are local-only and never call Stepik.
const root = new URL('../../',import.meta.url);
const local = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const data = await fetch(new URL(local?'api/intro-preview':'courses/introduction-catalog.json',root)).then(r => {if (!r.ok) throw Error('Не удалось открыть список курсов'); return r.json();});
if(!local) document.querySelector('.local-badge').textContent='Просмотр введений';
const courses = data.courses;
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query = new URLSearchParams(location.search);
let course = courses.find(c => c.id === Number(query.get('course'))) || courses.find(c => c.id === 135466);
let part = data.parts.some(p => p[0] === query.get('part')) ? query.get('part') : 'welcome';
const frame = document.querySelector('#intro-frame');
const select = document.querySelector('#course-select');
const list = document.querySelector('#course-list');
const tabs = document.querySelector('#part-tabs');
let observer;
select.innerHTML = courses.map(c => `<option value="${c.id}">${esc(c.title)}${c.reference ? ' · образец' : ''}</option>`).join('');
function renderList() {
  const term = document.querySelector('#course-search').value.trim().toLocaleLowerCase('ru');
  const filtered = courses.filter(c => (c.title + ' ' + c.trackTitle).toLocaleLowerCase('ru').includes(term));
  document.querySelector('#course-count').textContent = `${courses.filter(c=>!c.reference).length} курсов + образец mini`;
  list.innerHTML = filtered.map(c => `<button class="course-choice" type="button" data-course="${c.id}" aria-current="${c.id === course.id}"><img src="${new URL('assets/course-covers/'+c.id+'.png',root)}" alt="" loading="lazy"><span>${esc(c.title)}${c.reference ? '<small>Исходный образец</small>' : ''}</span></button>`).join('');
}
function open() {
  observer?.disconnect();
  if (course.reference && part === 'study') part = 'welcome';
  select.value = String(course.id);
  tabs.innerHTML = data.parts.filter(p => !course.reference || p[0] !== 'study').map(p => `<button type="button" data-part="${p[0]}" aria-pressed="${p[0] === part}">${course.package && p[0] === 'study' ? 'Ваши курсы' : p[1]}</button>`).join('');
  const url = local?'/intro-page?course='+course.id+'&part='+part:new URL(course.pages[part],root).href+'?embed=1';
  frame.style.height = ({welcome:680,telegram:620,survey:600,study:500,rules:590,map:860,start:560})[part] + 'px';
  frame.src = url;
  frame.title = course.title + ' · ' + data.parts.find(p => p[0] === part)[1];
  document.querySelector('#standalone').href = url;
  document.querySelector('#inventory').innerHTML = course.inventory.map(s => `<div class="inventory-row"><span>${s.position}</span><span>${esc(s.title || 'Задание')}<small> ${s.cost ? esc(s.cost)+' баллов' : ''}</small></span><span>${esc(s.treatment)}</span></div>`).join('');
  document.querySelector('#preview-status').textContent = course.reference ? 'Исходное введение mini. Изменения в него не вносятся.' : local?'Только локальный просмотр. В Stepik ничего не изменено.':'Общее оформление. Задания и особые материалы курсов сохранены.';
  history.replaceState(null, '', '?course=' + course.id + '&part=' + part);
  renderList();
}
frame.addEventListener('load', () => {
  try {
    const doc = frame.contentDocument;
    const watched = doc.querySelector(part === 'welcome' ? '.intro' : part === 'telegram' ? '.content' : part === 'start' ? '.launch-content' : 'main');
    if (!watched || part === 'map') return;
    const fit = () => {
      const rect = watched.getBoundingClientRect();
      const padding = ['welcome','telegram','start'].includes(part) ? 70 : 34;
      const minimum = ({welcome:620,telegram:560,start:520})[part] || 0;
      const height = Math.max(minimum, Math.ceil(rect.height + padding));
      if (Math.abs(frame.clientHeight-height)>3) frame.style.height = height+'px';
    };
    observer = new ResizeObserver(fit);
    observer.observe(watched);
    fit();
  } catch { /* A learner may intentionally open the next real lesson. */ }
});
select.addEventListener('change', () => {course = courses.find(c => c.id === Number(select.value)); open();});
list.addEventListener('click', event => {const button = event.target.closest('[data-course]');if(button){course=courses.find(c=>c.id===Number(button.dataset.course));open();}});
tabs.addEventListener('click', event => {const button = event.target.closest('[data-part]');if(button){part=button.dataset.part;open();}});
document.querySelector('#course-search').addEventListener('input', renderList);
document.querySelector('#reference').addEventListener('click', () => {course=courses.find(c=>c.reference);part='welcome';open();});
document.querySelector('#phone').addEventListener('click', event => {const on=document.body.classList.toggle('phone-view');event.currentTarget.setAttribute('aria-pressed',String(on));event.currentTarget.textContent=on?'Полная ширина':'Телефон';});
open();
