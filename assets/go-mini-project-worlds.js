import { initialTitles } from './go-mini-project-content.js';
export const escapeHTML = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const E = escapeHTML;
const palette = ['#c9b5ff','#ffd087','#8ce4cd','#ffacc5','#a9d7ff','#ffe77c'];
const icon = `<svg viewBox="0 0 90 75" fill="none" aria-hidden="true"><path d="M10 22Q10 15 18 15H38L45 23H77Q83 23 82 30L75 65H10Z" fill="#8761ef"/><path d="M15 31H84L76 66H6Z" fill="#b7a0ff"/><path d="M24 40H61M21 48H48" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="66" cy="24" r="16" fill="#a5ffe2" stroke="#254b68" stroke-width="4"/><path d="M78 36L87 46" stroke="#254b68" stroke-width="7" stroke-linecap="round"/></svg>`;
const folders = titles => titles.map((t,i)=>`<div class="project-folder" style="--paper:${palette[i%palette.length]}" data-folder="${i}"><small>titles[${i}]</small><strong>${E(t)}</strong><span class="match-badge" hidden></span></div>`).join('');
const result = (titles,q) => {const found=titles.filter(t=>t.includes(q));return (found.length?found.map((t,i)=>`${i+1} ${t}`).join('\n'):'Ничего не найдено')+`\nНайдено: ${found.length}`;};
const status = '<p class="project-status" role="status" aria-live="polite"></p>';
const readout = '<pre class="project-receipt" aria-label="Ответ Find" aria-live="polite"></pre>';
const controls = (id,label,value,action) => `<div class="project-controls"><label for="${id}">${label}<input id="${id}" value="${E(value)}" maxlength="60" autocomplete="off"></label><button class="project-primary">${action}</button></div>`;

export function mountWorld(root, name, {signal, noMotion}) {
  root.classList.add('project-world', 'project-'+name);
  const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
  const on=(el,event,fn)=>el.addEventListener(event,fn,{signal});
  const embed=document.body.classList.contains('is-embed');
  const reply=text=>{
    const receipt=$('.project-receipt');if(!embed){receipt.textContent=text;return;}
    const lines=String(text).split('\n').flatMap(line=>{let chars=Array.from(line);const rows=[];while(chars.length>25){let cut=chars.slice(0,26).lastIndexOf(' ');if(cut<10)cut=25;rows.push(chars.splice(0,cut).join(''));if(chars[0]===' ')chars.shift();}rows.push(chars.join(''));return rows;});
    const ink=document.createElement('span');ink.className='project-receipt-ink';ink.textContent=lines.slice(0,3).join('\n');receipt.replaceChildren(ink);
    if(lines.length>3){
      ink.textContent=lines.slice(0,2).join('\n')+'\n…';const open=document.createElement('button');open.type='button';open.className='reply-open secondary';open.textContent='Ответ целиком';receipt.append(open);
      on(open,'click',()=>{root.querySelector('.project-reply-dialog')?.remove();const dialog=document.createElement('dialog');dialog.className='project-reply-dialog';const pre=document.createElement('pre'),close=document.createElement('button');pre.textContent=text;close.textContent='Закрыть';dialog.append(pre,close);root.append(dialog);on(close,'click',()=>{dialog.close();dialog.remove();});on(dialog,'cancel',()=>dialog.remove());dialog.showModal();});
    }
  };
  if(embed){const observer=new MutationObserver(()=>root.querySelectorAll('input').forEach(el=>el.maxLength=24));observer.observe(root,{childList:true,subtree:true});signal.addEventListener('abort',()=>observer.disconnect(),{once:true});}
  const reduced=()=>noMotion()||matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function motion(el,frames,options={}) {
    if(signal.aborted)return false;
    if(reduced())return true;
    const a=el.animate(frames,{duration:500,easing:'cubic-bezier(.2,.8,.2,1)',...options});
    try{await a.finished;return !signal.aborted;}catch{return false;}
  }
  signal.addEventListener('abort',()=>root.getAnimations({subtree:true}).forEach(a=>a.cancel()),{once:true});
  async function pulse(el){return motion(el,[{transform:'scale(1)'},{transform:'scale(1.035)',offset:.45},{transform:'scale(1)'}],{duration:340});}
  async function fly(from,to,text,color='#bbffe6') {
    const base=root.getBoundingClientRect(), a=from.getBoundingClientRect(), b=to.getBoundingClientRect();
    const ticket=document.createElement('div');ticket.className='project-flying';ticket.textContent=text;ticket.style.background=color;root.append(ticket);
    const x=a.left-base.left,y=a.top-base.top,tx=b.left-base.left,ty=b.top-base.top;
    const ok=await motion(ticket,[{transform:`translate(${x}px,${y}px) rotate(-5deg)`,opacity:1},{transform:`translate(${(x+tx)/2}px,${Math.min(y,ty)-25}px) rotate(7deg)`,opacity:1,offset:.5},{transform:`translate(${tx}px,${ty}px) rotate(0deg) scale(.9)`,opacity:0}],{duration:650});ticket.remove();return ok;
  }
  function action(fn){const b=$('.project-primary');let busy=false;on(b,'click',async()=>{if(busy)return;busy=true;const controls=$$('input,select,button');controls.forEach(e=>e.disabled=true);try{await fn();}finally{busy=false;if(!signal.aborted)controls.forEach(e=>e.disabled=false);}});on(root,'keydown',e=>{if(e.key==='Enter'&&e.target.matches('input')){e.preventDefault();if(!busy)b.click();}});}
  function mark(titles,q){$$('[data-folder]').forEach((el,i)=>{const found=!!q&&titles[i].includes(q);el.classList.toggle('matching',found);const badge=el.querySelector('.match-badge');badge.hidden=!found;if(found)badge.textContent=titles.slice(0,i+1).filter(t=>t.includes(q)).length;});}
  async function scan(titles,q){mark(titles,'');for(let i=0;i<titles.length;i++){const el=$(`[data-folder="${i}"]`);el.classList.add('inspecting');if(!await motion(el,[{transform:'translateY(0)'},{transform:'translateY(-9px)',offset:.45},{transform:'translateY(0)'}],{duration:220}))return false;el.classList.remove('inspecting');if(titles[i].includes(q)){el.classList.add('matching');const badge=el.querySelector('.match-badge');badge.hidden=false;badge.textContent=titles.slice(0,i+1).filter(t=>t.includes(q)).length;}}return !signal.aborted;}

  if(name==='desk'){
    let titles=[...initialTitles], closed=false;
    root.innerHTML=`<div class="project-window-bar"><span class="project-logo">${icon}<b>Go-шечка <em>Find</em></b></span><span class="live-dot">Работает</span></div><div class="project-shelf">${folders(titles)}</div><div class="project-controls"><label for="desk-command">Команда<select id="desk-command"><option value="1">1 · Каталог</option><option value="2" selected>2 · Поиск</option><option value="3">3 · Добавить</option><option value="9">9 · Неизвестная</option><option value="0">0 · Выход</option></select></label><label for="desk-value" class="desk-value-label">Запрос<input id="desk-value" value="Go" maxlength="60"></label><button class="project-primary">Выполнить →</button></div>${readout}${status}`;
    reply('Что будем делать? Выберите команду и нажмите «Выполнить».');
    $('.project-status').textContent='Добавьте «Go: срезы», затем найдите «Go» ещё раз.';
    on($('#desk-command'),'change',()=>{const c=$('#desk-command').value;$('.desk-value-label').hidden=!['2','3'].includes(c);$('.desk-value-label').firstChild.textContent=c==='3'?'Новое название':'Запрос';if(c==='3')$('#desk-value').value='Go: срезы';});
    action(async()=>{
      if(closed){titles=[...initialTitles];closed=false;$('.project-shelf').innerHTML=folders(titles);$('.live-dot').textContent='Работает';$('.live-dot').classList.remove('closed');$('.project-primary').textContent='Выполнить →';reply('Запустили заново. В каталоге снова три записи.');$('.project-status').textContent='Прошлые добавления пропали: в файл мы их пока не сохраняем.';return;}
      const c=$('#desk-command').value,v=$('#desk-value').value.trim();mark(titles,'');
      if(c==='0'){closed=true;reply('До встречи!');$('.live-dot').textContent='Find закрыт';$('.live-dot').classList.add('closed');$('.project-primary').textContent='Запустить заново';$('.project-status').textContent='Вышли из main. Find больше не ждёт команд.';return;}
      if(c==='1'){reply(titles.map((t,i)=>`${i+1} ${t}`).join('\n'));await pulse($('.project-shelf'));}
      else if(c==='2'){if(!v){reply('Введите запрос');}else{if(!await scan(titles,v))return;reply(result(titles,v));}}
      else if(c==='3'){if(!v){reply('Введите название');}else if(titles.length>=(embed?4:8)){reply(`В этой сцене поместятся ${embed?4:8} записи. Можно поискать среди них или выйти и запустить Find заново.`);}else{titles.push(v);$('.project-shelf').innerHTML=folders(titles);await fly($('#desk-value'),$('[data-folder="'+(titles.length-1)+'"]'),v);if(signal.aborted)return;reply('Добавлено: '+v);}}
      else reply('Нет такой команды');
      if(signal.aborted)return;$('.project-status').textContent=`Записей в каталоге: ${titles.length}. Что сделаем дальше?`;
    });
  }
  if(name==='search'){
    const titles=[...initialTitles,'Go-шечка Find'];
    root.innerHTML=`<div class="search-heading"><span class="big-glass" aria-hidden="true"></span><h3>Какие записи найдутся?</h3></div>${controls('search-value','Запрос','Go','Найти →')}<div class="project-shelf">${folders(titles)}</div><div class="search-tray"><small>found []string</small><div class="found-papers">Здесь появятся найденные записи</div></div>${status}`;
    $('.project-status').textContent='Найдём нужные папки. Остальные останутся на столе.';
    action(async()=>{const q=$('#search-value').value.trim();if(!q){$('.project-status').textContent='Запрос пустой. Введите слово или часть названия.';return;}if(!await scan(titles,q))return;const found=titles.filter(t=>t.includes(q));$('.found-papers').innerHTML=found.length?found.map((t,i)=>`<div class="found-paper"><b>${i+1}</b><span>${E(t)}</span></div>`).join(''):'Ничего не найдено';if(embed)$('.search-tray small').textContent=`found []string · найдено: ${found.length}`;await pulse($('.search-tray'));if(signal.aborted)return;$('.project-status').textContent=`На столе по-прежнему ${titles.length} папки. Нашли: ${found.length}. Теперь попробуйте другое слово.`;});
  }
  if(name==='route'){
    let closed=false;
    root.innerHTML=`${controls('route-command','Команда','2','Отправить →')}<div class="route-map"><svg class="route-lines" aria-hidden="true"></svg><div class="route-source route-node">Следующая строка<code>Scan()</code></div><div class="route-hub route-node"><small>switch command</small><strong>Выбираем действие</strong></div><div class="route-destinations">${[['1','Каталог','#d8c5ff'],['2','Поиск','#a2ecdc'],['3','Добавление','#ffd38e'],['0','Выход из main','#ffbdcc']].map(([c,t,color])=>`<div class="route-destination route-node" data-command="${c}" style="--paper:${color}"><b>${c}</b><span>${t}</span></div>`).join('')}</div><div class="route-return">↶ Следующая команда</div></div><div class="project-code">for → switch → действие → снова for</div>${status}`;
    $('.project-status').textContent='Отправьте 2, затем 1, а после — 0.';
    const edges=()=>{const stage=$('.route-map'),r=stage.getBoundingClientRect(),svg=$('.route-lines');svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);const center=el=>{const b=el.getBoundingClientRect();return{x:b.left-r.left+b.width/2,y:b.top-r.top+b.height/2};};const a=center($('.route-source')),b=center($('.route-hub'));svg.innerHTML=`<path d="M${a.x},${a.y} L${b.x},${b.y}"/>`+$$('.route-destination').map(el=>{const c=center(el);return `<path d="M${b.x},${b.y} C${b.x},${c.y-35} ${c.x},${b.y+35} ${c.x},${c.y}"/>`;}).join('');};
    const observer=new ResizeObserver(edges);observer.observe($('.route-map'));signal.addEventListener('abort',()=>observer.disconnect(),{once:true});
    action(async()=>{if(closed){closed=false;$('.project-primary').textContent='Отправить →';$('.route-return').textContent='↶ Следующая команда';$('.project-status').textContent='Запустили заново. Какую команду попробуем?';return;}const c=$('#route-command').value.trim();$$('.route-node').forEach(e=>e.classList.remove('chosen'));await fly($('#route-command'),$('.route-hub'),c||'""');if(signal.aborted)return;const target=$$('[data-command]').find(el=>el.dataset.command===c);if(!target){$('.project-status').textContent='Нет такой команды. Ничего страшного — можно ввести другую.';await pulse($('.route-source'));return;}target.classList.add('chosen');await fly($('.route-hub'),target,c,palette[Number(c)%palette.length]);if(signal.aborted)return;if(c==='0'){closed=true;$('.route-return').textContent='■ main завершена';$('.project-status').textContent='До встречи! Программа закончилась. Следующую строку уже не читаем.';$('.project-primary').textContent='Запустить заново';}else{await pulse($('.route-source'));if(signal.aborted)return;$('.project-status').textContent=`Выполнили команду ${c}. Теперь for снова ждёт команду.`;}});
  }
  if(name==='memory'){
    let titles=[...initialTitles];
    root.innerHTML=`<div class="memory-header"><span class="memory-tab">titles []string</span><span class="memory-count">3 записи</span></div><div class="project-shelf">${folders(titles)}</div>${controls('memory-title','Новое название','Go: срезы','Добавить и найти →')}<div class="memory-steps"><div class="memory-stage" data-phase="add"><b>3</b><span>Добавление</span></div><span aria-hidden="true">→</span><div class="memory-stage" data-phase="search"><b>2</b><span>Следующий поиск</span></div></div>${readout}${status}`;
    reply('Пока этой записи в каталоге нет.');$('.project-status').textContent='Сначала добавим запись, затем сразу поищем её.';
    action(async()=>{if(titles.length>=(embed?4:7)){titles=[...initialTitles];$('.project-shelf').innerHTML=folders(titles);$('.memory-count').textContent='3 записи';$('.project-primary').textContent='Добавить и найти →';reply('Начали заново. В каталоге снова три записи.');$('.project-status').textContent='Можно добавить другое название и снова поискать.';return;}const title=$('#memory-title').value.trim();if(!title){reply('Введите название');$('.project-status').textContent='Название пустое. Ничего не добавили, каталог остался прежним.';return;}titles.push(title);$('.project-shelf').innerHTML=folders(titles);$('[data-phase="search"]').classList.remove('chosen');$('[data-phase="add"]').classList.add('chosen');await fly($('#memory-title'),$(`[data-folder="${titles.length-1}"]`),title,'#ffd38e');if(signal.aborted)return;$('.memory-count').textContent=`Записей: ${titles.length}`;reply('Добавлено: '+title);await pulse($('[data-phase="add"]'));if(signal.aborted)return;$('[data-phase="add"]').classList.remove('chosen');$('[data-phase="search"]').classList.add('chosen');if(!await scan(titles,title))return;reply(result(titles,title));$('.project-status').textContent='Запись нашлась. Между командами каталог никуда не исчез.';if(titles.length>=(embed?4:7)){$('.project-primary').textContent='Запустить заново';$('.project-status').textContent+=` В этой сцене уже ${embed?4:7} записи. Если хотите повторить опыт, запустите его заново.`;}});
  }
  if(name==='rehearsal'){
    const script=[['3','Go: срезы'],['2','   '],['2','срезы'],['кот'],['1'],['0'],['1']];let turn=0,titles=[...initialTitles],closed=false;
    root.innerHTML=`<div class="rehearsal-head"><span class="project-logo">${icon}<b>Проверка Find</b></span><span class="rehearsal-progress">0 / 7</span></div><div class="dialogue"><div class="dialogue-input"><small>Следующий ввод</small><pre class="dialogue-ticket"></pre></div><div class="dialogue-output"><small>Ответ программы</small>${readout}</div></div><div class="session-evidence"><span>Каталог: <b class="evidence-count">3</b> записи</span><span class="evidence-state">Работает</span></div><button class="project-primary">Отправить →</button>${status}`;
    const nextTicket=()=>{$('.dialogue-ticket').textContent=script[turn]?.map((x,i)=>i===1&&x.trim()===''?'··· ← три пробела':x).join('\n')||'Разговор закончен';};nextTicket();reply('Как думаете, что ответит Find?');$('.project-status').textContent='Добавим запись. Потом ошибёмся в запросе и попробуем найти её снова.';
    action(async()=>{if(turn===script.length){turn=0;titles=[...initialTitles];closed=false;$('.project-primary').textContent='Отправить →';reply('Начали заново. Снова три записи.');$('.evidence-state').textContent='Работает';$('.evidence-count').textContent='3';$('.rehearsal-progress').textContent='0 / 7';nextTicket();return;}const row=script[turn];await fly($('.dialogue-ticket'),$('.dialogue-output'),row[0],closed?'#ffc3d0':'#b7f5e0');if(signal.aborted)return;let why='';if(closed){reply('Ничего не выводим');why='Эту строку не читаем: после return в main программа уже закончилась.';}else if(row[0]==='3'){titles.push(row[1]);reply('Добавлено: '+row[1]);why='Добавили. Проверим, найдём ли эту запись после ошибки в запросе.';}else if(row[0]==='2'){const q=row[1].trim();reply(q?result(titles,q):'Введите запрос');why=q?'Нашлась! Пустой запрос не стёр нашу запись.':'Запрос пустой, но Find не закрылся. Можно попробовать ещё раз.';}else if(row[0]==='1'){reply(titles.map((t,i)=>`${i+1} ${t}`).join('\n'));why='Все записи на месте. Непонятная команда ничего не стёрла.';}else if(row[0]==='0'){closed=true;reply('До встречи!');$('.evidence-state').textContent='Завершена';why='Вышли. Дальше есть ещё одна команда, но читать её уже не нужно.';}else{reply('Нет такой команды');why='Такой команды нет. Можно отправить другую — Find продолжает работать.';}turn++;$('.evidence-count').textContent=titles.length;$('.rehearsal-progress').textContent=`${turn} / 7`;$('.project-status').textContent=why;if(turn===script.length)$('.project-primary').textContent='Повторить разговор';else{await pulse($('.dialogue-output'));if(signal.aborted)return;nextTicket();}});
  }
}
