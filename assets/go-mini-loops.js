import {steps,tasks} from './go-mini-loops-content.js';
import {mountWorld,escapeHTML as E} from './go-mini-loops-worlds.js';
const main=document.querySelector('main'),preview=document.body.dataset.preview==='true',params=new URLSearchParams(location.search),sceneOnly=params.get('panel')==='scene';
const file=n=>`go-mini-module-04-lesson-02-step-${String(n).padStart(2,'0')}.html`;
const read=(key,fallback='')=>{try{return localStorage.getItem('go-loops:'+key)??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem('go-loops:'+key,value);}catch{}};
let current=Math.min(steps.length,Math.max(1,Number(params.get('step')||document.body.dataset.step)||1)),controller,noMotion=read('motion')==='off';
const local=location.protocol.startsWith('http')&&['localhost','127.0.0.1'].includes(location.hostname);
document.body.classList.toggle('no-motion',noMotion);
document.body.classList.toggle('is-preview',preview&&!sceneOnly);
document.body.classList.toggle('scene-only',sceneOnly);
document.body.classList.toggle('is-embed',sceneOnly&&params.get('embed')==='1');
if(preview&&!sceneOnly){
 document.body.insertAdjacentHTML('afterbegin',`<header class="preview-header"><div class="brand">Go-шечка <span>Find</span></div><div class="toolbar"><button id="menu-toggle" class="secondary" aria-expanded="false">Шаги</button><button id="width-toggle" class="secondary" aria-pressed="false">Телефон</button><button id="motion-toggle" class="secondary" aria-pressed="${noMotion}">Без анимаций</button><a id="open-step" target="_blank" rel="noopener">Отдельная страница ↗</a></div></header><div class="progress-track"><i></i></div>`);
 const layout=document.createElement('div');layout.className='layout';main.before(layout);const sidebar=document.createElement('aside');sidebar.className='sidebar';sidebar.setAttribute('aria-label','Шаги урока');layout.append(sidebar,main);
 document.querySelector('#menu-toggle').addEventListener('click',e=>{const open=sidebar.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',open);});
 document.querySelector('#width-toggle').addEventListener('click',e=>{const mobile=document.body.classList.toggle('mobile-preview');e.currentTarget.setAttribute('aria-pressed',mobile);e.currentTarget.textContent=mobile?'Компьютер':'Телефон';});
 document.querySelector('#motion-toggle').addEventListener('click',e=>{noMotion=!noMotion;save('motion',noMotion?'off':'on');document.body.classList.toggle('no-motion',noMotion);e.currentTarget.setAttribute('aria-pressed',noMotion);if(noMotion)document.getAnimations().forEach(a=>a.finish());});
}
function navigation(){
 if(!preview||sceneOnly)return;
 const sidebar=document.querySelector('.sidebar');sidebar.innerHTML=`<small>Циклы · ${steps.length} шагов</small>`+steps.map((s,i)=>`<a href="?step=${i+1}" class="step-link ${i+1===current?'active':''} ${read('solved:'+i)?'solved':''}" ${i+1===current?'aria-current="step"':''}><b>${String(i+1).padStart(2,'0')}</b><span>${E(s.title)}</span><span class="kind">${s.kind==='code'?'Go':s.kind==='quiz'?'Тест':'↗'}</span></a>`).join('');
 sidebar.querySelectorAll('a').forEach((a,i)=>a.addEventListener('click',e=>{e.preventDefault();navigate(i+1);}));document.querySelector('#open-step').href=file(current);document.querySelector('.progress-track i').style.width=(current/steps.length*100)+'%';
}
function navigate(n){if(!preview){location.href=file(n);return;}current=n;history.pushState(null,'',`?step=${n}`);render();window.scrollTo({top:0,behavior:'instant'});}
window.addEventListener('popstate',()=>{current=Math.min(steps.length,Math.max(1,Number(new URLSearchParams(location.search).get('step'))||1));render();});
async function run(code,input,signal){const r=await fetch('/api/loops/run',{method:'POST',headers:{'Content-Type':'application/json','X-Go-Mini-Preview':'1'},body:JSON.stringify({code,input}),signal});let data;try{data=await r.json();}catch{throw Error('Сервер не вернул результат. Обновите страницу и попробуйте ещё раз.');}if(!r.ok)throw Error(data.diagnostic||'Запуск недоступен.');return data;}
function render(){
 controller?.abort();controller=new AbortController();const {signal}=controller,s=steps[current-1];navigation();document.title=s.title+' · Go-шечка (mini)';
 const pre=text=>`<pre><code>${E(text)}</code></pre>`;
 const footer=sceneOnly?'':`<nav class="step-navigation" aria-label="Навигация по уроку">${current>1?'<button class="secondary" id="prev">← Назад</button>':'<span></span>'}${current<steps.length?'<button id="next">Дальше →</button>':'<span class="pill">Урок пройден</span>'}</nav>`;
 main.innerHTML=`<article class="reading">${sceneOnly?'':`<div class="eyebrow">Циклы · ${String(current).padStart(2,'0')} / ${steps.length}</div><h1>${E(s.title)}</h1>`}<div id="step-content"></div>${footer}</article>`;
 const content=main.querySelector('#step-content');
 if(s.kind==='scene'){
 content.innerHTML=(sceneOnly?'':`<div class="lead">${s.lead}</div>`)+'<section class="world" aria-label="Интерактивный пример"></section>'+(sceneOnly?'':`<div class="theory">${s.after}</div>`);mountWorld(content.querySelector('.world'),s.scene,{signal,noMotion:()=>noMotion});
 }else if(s.kind==='code'){
 const t=tasks[s.task];const draft=read('draft:'+s.task,t.starter);
 content.innerHTML=`<div class="task-text"><p>${E(t.text)}</p></div><div class="editor-top"><span>main.go</span><button id="reset-code" class="secondary">Начать заново</button></div><label for="code-editor" class="eyebrow">Программа</label><textarea id="code-editor" class="editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Код программы на Go">${E(draft)}</textarea><div class="task-io"><label>Входные данные<textarea id="task-input" spellcheck="false" aria-label="Входные данные">${E(t.input)}</textarea></label><div><label>Ответ для примера</label><pre>${E(t.output)}</pre></div></div><div class="task-actions"><button id="run-code">Запустить</button><button id="check-code" class="secondary">Проверить решение</button></div><div id="task-result" class="task-output" role="status" hidden></div><div id="task-feedback" role="status" hidden></div><details><summary>Подсказка</summary><p>${E(t.hint)}</p></details><details><summary>Разбор решения</summary><p>${E(t.explain)}</p>${pre(t.solution)}</details>`;
 const examples=document.createElement('details');examples.className='task-examples';examples.setAttribute('aria-label','Все проверочные примеры');
 examples.innerHTML='<summary>Тестовые данные ('+t.tests.length+')</summary>'+t.tests.map(([stdin,stdout],i)=>`<section class="task-example"><div class="example-heading"><h3>Пример ${i+1}</h3>${local?`<button class="secondary" data-use-example="${i}">Подставить вход</button>`:''}</div><div class="example-pair"><div><h4>Входные данные</h4><pre>${E(stdin||'')}</pre></div><div><h4>Ожидаемый вывод</h4><pre>${E(stdout)}</pre></div></div></section>`).join('');
 content.querySelector('details').before(examples);
 const editor=main.querySelector('#code-editor'),feedback=main.querySelector('#task-feedback'),out=main.querySelector('#task-result'),input=main.querySelector('#task-input'),buttons=[main.querySelector('#run-code'),main.querySelector('#check-code')];let busy=false,revision=0;
 const invalidate=()=>{revision++;feedback.hidden=true;out.hidden=true;save('draft:'+s.task,editor.value);save('solved:'+(current-1),'');navigation();};
 editor.addEventListener('input',invalidate,{signal});input.addEventListener('input',()=>{revision++;feedback.hidden=true;out.hidden=true;},{signal});
 examples.querySelectorAll('[data-use-example]').forEach(button=>button.addEventListener('click',()=>{input.value=t.tests[Number(button.dataset.useExample)][0];input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();input.scrollIntoView({block:'center',behavior:noMotion?'instant':'smooth'});},{signal}));
 main.querySelector('#reset-code').addEventListener('click',()=>{editor.value=t.starter;invalidate();},{signal});
 const execute=async(check)=>{
 if(busy||!local)return;busy=true;buttons.forEach(b=>b.disabled=true);const code=editor.value,rev=revision,stepIndex=current-1;
 feedback.hidden=false;feedback.className='task-feedback';feedback.textContent=check?'Проверяем на разных входных данных…':'Выполняем программу…';out.hidden=true;
 try{
 const cases=check?t.tests:[[input.value,null]];let passed=0;
 for(const [stdin,expected]of cases){
 const result=await run(code,stdin,signal);if(signal.aborted||rev!==revision)return;
 if(!result.ok){out.hidden=false;out.textContent=result.diagnostic||'Программа не выполнилась.';feedback.className='task-feedback error';feedback.textContent='Проверьте код. Сообщение Go — выше.';return;}
 out.hidden=false;out.textContent=result.stdout===''?'(вывод пустой)':result.stdout;
 if(check&&result.stdout.replace(/\r\n/g,'\n')!==expected.replace(/\r\n/g,'\n')){feedback.className='task-feedback error';feedback.textContent=`Проверка ${passed+1}: ответ отличается.\nВход: ${JSON.stringify(stdin)}\nОжидалось: ${JSON.stringify(expected)}\nПолучено: ${JSON.stringify(result.stdout)}`;feedback.style.whiteSpace='pre-wrap';return;}passed++;
 }
 feedback.className='task-feedback success';feedback.textContent=check?`Верно. Пройдены все проверки: ${passed}.`:'Программа выполнена. Для проверки остальных случаев нажмите «Проверить решение».';if(check){save('solved:'+stepIndex,'1');navigation();}
 }catch(error){if(error.name!=='AbortError'){feedback.hidden=false;feedback.className='task-feedback error';feedback.textContent=error.message;}}
 finally{busy=false;if(!signal.aborted)buttons.forEach(b=>b.disabled=false);}
 };
 buttons[0].addEventListener('click',()=>execute(false),{signal});buttons[1].addEventListener('click',()=>execute(true),{signal});
 editor.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const a=editor.selectionStart,b=editor.selectionEnd;editor.setRangeText('    ',a,b,'end');invalidate();}if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();execute(false);}},{signal});
 if(!local){buttons.forEach(b=>b.hidden=true);editor.readOnly=true;input.readOnly=true;main.querySelector('#reset-code').hidden=true;feedback.hidden=false;feedback.className='task-feedback';feedback.innerHTML=`<a class="stepik-task-link" href="https://stepik.org/lesson/2706564/step/${current}?unit=2746579" target="_blank" rel="noopener">Решить задачу в Stepik ↗</a>`;}
 }else{
 content.innerHTML=`<p>${E(s.prompt)}</p>${pre(s.program)}<div class="quiz-options">${s.options.map((v,i)=>`<button data-option="${i}" aria-pressed="false">${E(v)}</button>`).join('')}</div><button id="quiz-check">Проверить</button><div id="quiz-feedback" role="status" hidden></div>`;
 let choice=-1;content.querySelectorAll('[data-option]').forEach(el=>el.addEventListener('click',()=>{choice=Number(el.dataset.option);content.querySelectorAll('[data-option]').forEach(b=>b.setAttribute('aria-pressed',b===el));content.querySelector('#quiz-feedback').hidden=true;save('solved:'+(current-1),'');navigation();},{signal}));
 content.querySelector('#quiz-check').addEventListener('click',()=>{const f=content.querySelector('#quiz-feedback');f.hidden=false;const ok=choice===s.answer;f.className='task-feedback '+(ok?'success':'error');f.textContent=choice<0?'Сначала выберите ответ.':ok?'Верно. '+s.explanation:'Пока неверно. Проследите, где заканчивается выбранная ветка и какой код стоит после неё.';if(ok){save('solved:'+(current-1),'1');navigation();}},{signal});
 }
 main.querySelector('#prev')?.addEventListener('click',()=>navigate(current-1),{signal});main.querySelector('#next')?.addEventListener('click',()=>navigate(current+1),{signal});
}
render();
