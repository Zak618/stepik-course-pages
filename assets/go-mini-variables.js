import {articles, research} from './go-mini-variables-content.js?v=clarity-2';
import {tasks, quiz} from './go-mini-variables-tasks.js';
import {sceneMarkup, bindWorlds} from './go-mini-variables-worlds.js?v=clarity-2';

const root = document.querySelector('#variables-lesson');
const preview = document.body.dataset.preview === 'true';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const $ = selector => root.querySelector(selector);
const $$ = selector => [...root.querySelectorAll(selector)];
const filename = n => `courses/305666-go-mini/modules/03-go-basics/lesson-02-step-${String(n).padStart(2, '0')}.html`;
const all = Object.fromEntries(Array.from({length:16}, (_, i) => [i+1, articles[i+1] || tasks[i+1] || quiz[i+1]]));
const drafts = new Map();
const solved = new Set();
const storeKey = 'go-mini-variables-v1';
try { const saved = JSON.parse(localStorage.getItem(storeKey) || '{}'); for (const [k,v] of Object.entries(saved.drafts || {})) if (tasks[k] && typeof v === 'string' && v.length <= 12000) drafts.set(Number(k),v); for (const n of saved.solved || []) if (tasks[n] || quiz[n]) solved.add(n); } catch {}
const persist = () => { try { localStorage.setItem(storeKey, JSON.stringify({drafts:Object.fromEntries(drafts),solved:[...solved]})); } catch {} };
let step = 1, epoch = 0, scope = new AbortController(), clock = 0;
let animations = [];
const motion = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
function animate(node, frames, options={}) {
  if (!node || !motion()) return null;
  const animation = node.animate(frames, {duration:700,easing:'cubic-bezier(.2,.8,.2,1)',...options});
  animations.push(animation); animation.finished.catch(()=>{}).finally(()=>{ animations=animations.filter(a=>a!==animation); });
  return animation;
}
const flash = node => animate(node, [{transform:'scale(1)'},{transform:'scale(1.07)',offset:.4},{transform:'scale(1)'}], {duration:550});
const on = (selector,event,handler) => $$(selector).forEach(node=>node.addEventListener(event,handler,{signal:scope.signal}));
function status(text, result='') { const n=$('[role=status]'); if(n){n.textContent=text;n.dataset.result=result;} }
function fly(text, from, to, color='#2459f5', duration=800) {
  if(!motion() || !from || !to) return;
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
  const piece=document.createElement('span');piece.className='flight';piece.textContent=text;piece.style.background=color;
  document.body.append(piece);piece.style.left=`${a.left+a.width/2}px`;piece.style.top=`${a.top+a.height/2}px`;
  const dx=b.left+b.width/2-a.left-a.width/2,dy=b.top+b.height/2-a.top-a.height/2;
  const animation=animate(piece,[{transform:'translate(-50%,-50%) scale(.8)',opacity:0},{transform:`translate(calc(-50% + ${dx*.45}px),calc(-50% + ${dy*.45-35}px)) rotate(-8deg)`,opacity:1,offset:.45},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.7)`,opacity:0}],{duration});
  animation?.finished.catch(()=>{}).finally(()=>piece.remove());
}
function dialog(title,text) {
  const d=document.createElement('dialog');d.className='dialog';
  const header=document.createElement('header'),heading=document.createElement('h3'),close=document.createElement('button'),p=document.createElement('p');
  heading.textContent=title;close.textContent='×';close.setAttribute('aria-label','Закрыть');close.addEventListener('click',()=>d.close());
  p.textContent=text;header.append(heading,close);d.append(header,p);d.addEventListener('close',()=>d.remove(),{once:true});root.append(d);d.showModal();
}
const dots = '<span class="dotbar" aria-hidden="true"><i></i><i></i><i></i></span>';
function taskView(t) {
  return `<div class="task-brief">${t.brief}</div><section class="task-workspace" aria-label="Редактор Go"><div class="editor-top">${dots}<span>main.go</span><span class="editor-shortcut">Ctrl / ⌘ + Enter — запуск</span></div><div class="code-editor"><pre class="code-gutter" aria-hidden="true"></pre><textarea class="code-source" id="code-source" aria-label="Код программы Go" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off">${escape(drafts.get(step) ?? t.starter)}</textarea></div><div class="code-actions"><button class="button" id="code-run">▶ Запустить</button><button class="button secondary" id="code-check">Проверить решение</button><button class="text-button" id="code-hint">Подсказка</button><button class="text-button" id="code-reset">Заготовка</button></div><div class="run-output"><div class="output-pane"><span>Вывод вашей программы</span><pre id="code-output">Ещё не запускали</pre></div><div class="output-pane expected"><span>Нужный вывод</span><pre>${escape(t.expected)}</pre></div></div><div class="code-artifact" id="code-artifact" hidden></div><div class="verdict" id="code-verdict" role="status"></div><div class="hints" id="code-hints"></div></section><details class="optional-explanation"><summary>Разобраться после решения</summary><div class="prose">${t.explanation}</div></details>`;
}
function updateArtifact(stdout) {
  const output=$('#code-artifact');if(!output)return;output.hidden=true;
  const lines=stdout.replace(/\n$/,'').split('\n');let markup='';
  if(step===6&&lines.length===3)markup=`<div class="settings-artifact"><strong>${escape(lines[0])}</strong><div><span>Лимит результатов</span><b>${escape(lines[1])}</b></div><div><span>Точный поиск</span><code>${escape(lines[2])}</code><i class="${lines[2]==='true'?'on':''}" aria-hidden="true"></i></div></div>`;
  if(step===8&&lines.length===2)markup=`<div class="counter-artifact"><div><span>Совпадений</span><strong>${escape(lines[0])}</strong></div><div><span>Осталось проверить</span><strong>${escape(lines[1])}</strong></div></div>`;
  if(step===16&&lines.length===5)markup=`<div class="find-artifact"><header><span class="find-mark" aria-hidden="true">⌕</span><strong>${escape(lines[0])}</strong></header><div class="find-query">${escape(lines[2])}</div><div class="find-history">${escape(lines[1])}</div><div class="find-numbers">${escape(lines[3])}</div><footer>${escape(lines[4])}</footer></div>`;
  if(markup){output.innerHTML=markup;output.hidden=false;animate(output,[{opacity:.4,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}]);}
}

function quizView(q) {
  return `${q.prompt}<div class="source-window"><pre>${escape(q.code)}</pre></div><form id="quiz-form"><div class="quiz">${q.options.map((text,i)=>`<label><input type="radio" name="answer" value="${i}" required><span><code>${escape(text).replace(/\n/g,'<br>')}</code></span></label>`).join('')}</div><div class="actions"><button class="button" type="submit">Проверить ответ</button><button class="text-button" type="button" id="quiz-hint">Подсказка</button></div></form><div class="quiz-feedback" id="quiz-feedback" role="status"></div>`;
}
function updateNav() {
  document.querySelectorAll('[data-step]').forEach(n=>{const k=Number(n.dataset.step);n.setAttribute('aria-current',k===step?'step':'false');const mark=n.querySelector('i');if(mark)mark.textContent=solved.has(k)?'✓':'';});
  const select=document.querySelector('#step-picker');if(select) select.value=String(step);
  const external=document.querySelector('#open-separate');if(external)external.href=filename(step);
}
function articleView(article) {
  const scene=sceneMarkup(article.scene);
  // Predictions must precede the experiment. Variety comes from the scene
  // and the explanation itself, not from moving instructions below controls.
  return `<div class="prose story-preface">${article.before}</div>${scene}<div class="prose">${article.after}</div>`;
}
function render(number) {
  if(!Number.isInteger(number)||number<1||number>16)number=1;
  scope.abort();scope=new AbortController();epoch++;clearTimeout(clock);animations.forEach(a=>a.cancel());animations=[];document.querySelectorAll('.flight').forEach(n=>n.remove());
  step=number;const data=all[step],article=articles[step];root.dataset.accent=article?.accent || (step===10?'violet':'blue');root.dataset.world=article?.scene || 'practice';
  root.innerHTML=`<header><p class="eyebrow">Переменные и типы · ${String(step).padStart(2,'0')} / 16</p><h1 tabindex="-1">${data.title}</h1>${article?`<p class="lead">${article.lead}</p>`:''}</header>${article?articleView(article):tasks[step]?taskView(data):quizView(data)}${step===16?`<section class="completion"><h2>Следом — ввод с клавиатуры.</h2><p>Вы сохраняете запрос, меняете значения, считаете и собираете строки. Дальше получим запрос от человека: чтобы менять его без правки исходного кода.</p></section><details class="sources"><summary>Источники и идеи для этого просмотра</summary><ul>${research.map(([name,url,desc])=>`<li><a href="${url}" target="_blank" rel="noopener">${name}</a> — ${desc}</li>`).join('')}</ul><p>Все сцены нарисованы для урока в HTML/CSS/SVG. Этот просмотр локальный: ответы, прогресс и баллы в Stepik не отправляются. В задачах работает ограниченный локальный Go; это не универсальная песочница.</p></details>`:''}<footer class="next-row">${step>1?`<a class="lesson-next" href="${preview?'#'+String(step-1).padStart(2,'0'):filename(step-1)}">← Назад</a>`:'<span>Модуль 03 · Урок 02</span>'}${step<16?`<a class="lesson-next" href="${preview?'#'+String(step+1).padStart(2,'0'):filename(step+1)}">Следующий шаг →</a>`:'<span>Конец урока</span>'}</footer>`;
  document.title=`${step}. ${data.title} · Go-шечка (mini)`;updateNav();bindScenes();if(tasks[step])bindTask(tasks[step]);if(quiz[step])bindQuiz(quiz[step]);
  if(new URLSearchParams(location.search).get('panel')==='scene')document.body.classList.add('scene-only');
  window.dispatchEvent(new CustomEvent('variables:step',{detail:{step}}));
}

function bindScenes() {
  bindWorlds({step,root,signal:scope.signal,animate,fly,status});
}

// Preserve literals while removing comments, so hints and variant mutations do
// not match a learner's explanatory comment instead of the actual code.
function withoutComments(source) {
  return source.replace(/"(?:\\.|[^"\\])*"|`[^`]*`|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, token=>token.startsWith('//')||token.startsWith('/*')?token.replace(/[^\n]/g,' '):token);
}
const normal = text => text.replace(/\r\n/g,'\n').replace(/\n$/,'');
async function runGo(code, signal) {
  if(location.protocol==='file:')return {ok:false,phase:'server',diagnostic:'Для запуска Go откройте локальный просмотр: node scripts/preview-variables.mjs. Сам урок можно читать и без сервера.',stdout:''};
  try {const response=await fetch('/api/variables/run',{method:'POST',headers:{'Content-Type':'application/json','X-Go-Mini-Preview':'1'},body:JSON.stringify({code}),signal});const result=await response.json();return result;}
  catch(error){if(error.name==='AbortError')return null;return {ok:false,phase:'server',stdout:'',diagnostic:'Сервер Go недоступен. Запустите node scripts/preview-variables.mjs и откройте http://localhost:8771/variables.'};}
}
function variantSource(source,from,to) {
  const pattern=from.split(/(\s+|:=)/).filter(Boolean).map(s=>/^\s+$/.test(s)?'\\s*':s===':='?'\\s*:=\\s*':s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('');
  const re=new RegExp(pattern);if(!re.test(source))return null;return source.replace(re,()=>to);
}
function bindTask(task) {
  const editor=$('#code-source'),localRunner=['localhost','127.0.0.1'].includes(location.hostname);let version=0,running=false,hints=0,request;
  const gutter=()=>{$('.code-gutter').textContent=Array.from({length:editor.value.split('\n').length},(_,i)=>i+1).join('\n');$('.code-gutter').scrollTop=editor.scrollTop;};
  const verdict=(text,result='')=>{const node=$('#code-verdict');node.textContent=text;node.dataset.result=result;};
  const edit=()=>{version++;request?.abort();running=false;$('#code-run').disabled=false;$('#code-check').disabled=false;drafts.set(step,editor.value);solved.delete(step);persist();updateNav();verdict('');$('#code-artifact').hidden=true;gutter();};
  on('#code-source','input',edit);on('#code-source','scroll',gutter);
  on('#code-source','keydown',e=>{if(!localRunner)return;if(e.key==='Tab'){e.preventDefault();editor.setRangeText('    ',editor.selectionStart,editor.selectionEnd,'end');edit();}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();execute(false);}});
  on('#code-hint','click',()=>{const p=document.createElement('p');p.textContent=task.hints[Math.min(hints++,task.hints.length-1)];$('#code-hints').replaceChildren(p);});
  on('#code-reset','click',()=>{if(editor.value!==task.starter&&!confirm('Вернуть заготовку? Набранное решение этого шага будет заменено.'))return;editor.value=task.starter;edit();hints=0;$('#code-hints').replaceChildren();$('#code-output').textContent='Ещё не запускали';});
  // GitHub Pages is static. Hosted previews link to the native Go task;
  // never offer a broken API call or silently pretend a model executed Go.
  if(!localRunner){
    editor.readOnly=true;$('#code-run').remove();$('#code-check').remove();$('#code-reset').remove();
    const shortcut=$('.editor-shortcut');if(shortcut)shortcut.textContent='';
    const link=document.createElement('a');link.className='button';link.textContent='Решить на Stepik ↗';link.href=`https://stepik.org/lesson/2706560/step/${step}?unit=2746575`;link.target='_blank';link.rel='noopener';$('.code-actions').prepend(link);gutter();return;
  }
  async function execute(check) {
    if(running)return;running=true;request?.abort();request=new AbortController();const localEpoch=epoch,localVersion=version,currentStep=step;scope.signal.addEventListener('abort',()=>request.abort(),{once:true});
    $('#code-run').disabled=true;$('#code-check').disabled=true;verdict(check?'Проверяем решение…':'Выполняем программу…');
    const stillCurrent=()=>epoch===localEpoch&&version===localVersion;
    try{
      const code=editor.value,result=await runGo(code,request.signal);if(!result||!stillCurrent())return;$('#code-output').textContent=result.stdout||'Вывод пуст';
      if(!result.ok){$('#code-artifact').hidden=true;verdict(result.phase==='compile'?'Go не смог собрать программу.':'Запуск не завершился.','error');const pre=document.createElement('pre');pre.textContent=result.diagnostic;$('#code-verdict').append(pre);return;}
      updateArtifact(result.stdout);
      if(!check){verdict('Программа выполнена. Сравните вывод с образцом.');return;}
      if(normal(result.stdout)!==normal(task.expected)){verdict('Вывод отличается от образца. Проверьте строки, пробелы и порядок команд.','error');return;}
      const clean=withoutComments(code);const missing=(task.requirements||[]).find(r=>!new RegExp(r.pattern).test(clean));
      if(missing){verdict(missing.message,'error');return;}
      for(const [i,variant]of(task.variants||[]).entries()){
        const changed=variantSource(clean,variant.from,variant.to);
        if(changed===null){verdict('Сохраните начальные данные из условия: проверим, как программа работает при их изменении.','error');return;}
        verdict(`Проверяем изменение исходных данных: ${i+1} / ${task.variants.length}…`);
        const next=await runGo(changed,request.signal);if(!next||!stillCurrent())return;
        if(!next.ok||normal(next.stdout)!==normal(variant.expected)){verdict('Образец совпал, но при изменении данных ответ перестал подходить. Используйте значения переменных и выражения, а не готовый текст результата.','error');return;}
      }
      solved.add(currentStep);persist();updateNav();verdict('Верно! Программа собрана, вывод совпал'+(task.variants?.length?', проверка с другими данными тоже прошла.':'.'),'success');animate($('#code-verdict'),[{backgroundColor:'#c6efd9'},{backgroundColor:'#e7f8ef'}]);
    }finally{if(stillCurrent()){running=false;$('#code-run').disabled=false;$('#code-check').disabled=false;}}
  }
  on('#code-run','click',()=>execute(false));on('#code-check','click',()=>execute(true));gutter();
}
function bindQuiz(q) {
  on('#quiz-form','submit',e=>{e.preventDefault();const value=new FormData(e.currentTarget).get('answer');if(value===null)return;const correct=Number(value)===q.correct;$('#quiz-feedback').innerHTML=correct?`<strong>Верно.</strong>${q.explanation}`:'В какой момент saved получил своё значение? Вернитесь к строке saved := query и проследите её отдельно.';if(correct){solved.add(step);persist();updateNav();}});
  on('#quiz-hint','click',()=>dialog('Подсказка',q.hints[0]));
}

if(preview){
  const select=document.querySelector('#step-picker');select.innerHTML=Object.entries(all).map(([n,item])=>`<option value="${n}">${String(n).padStart(2,'0')}. ${item.nav||item.title}</option>`).join('');
  document.querySelector('#lesson-nav').innerHTML=Object.entries(all).map(([n,item])=>`<a href="#${String(n).padStart(2,'0')}" data-step="${n}"><span>${String(n).padStart(2,'0')}</span><span>${item.nav||item.title}</span><i aria-label="Решено"></i></a>`).join('');
  select.addEventListener('change',()=>location.hash=String(select.value).padStart(2,'0'));
  document.querySelector('#phone-width').addEventListener('click',e=>{const pressed=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(pressed));document.querySelector('.lesson-wrap').classList.toggle('phone',pressed);});
  window.addEventListener('hashchange',()=>{render(Number(location.hash.slice(1)));window.scrollTo({top:0,behavior:'instant'});root.querySelector('h1').focus({preventScroll:true});});render(Number(location.hash.slice(1))||1);
}else render(Number(document.body.dataset.step)||1);
