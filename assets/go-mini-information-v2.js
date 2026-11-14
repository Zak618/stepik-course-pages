(() => {
  'use strict';
  const content=window.InformationV2Content;
  const root=document.getElementById('v2-lesson');
  const preview=document.body.dataset.preview==='true';
  const panel=new URLSearchParams(location.search).get('panel');
  const embedded=['scene','carry','rgb'].includes(panel);
  if(embedded)document.documentElement.classList.add('fragment');
  const esc=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const bin=(n,size=8)=>n.toString(2).padStart(size,'0');
  const bytes=text=>[...new TextEncoder().encode(text)];
  const plural=(n,one,few,many)=>n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
  const weights=[16,8,4,2,1];
  const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const file=n=>`go-mini-module-02-lesson-01-v2-step-${String(n).padStart(2,'0')}.html`;
  const glyphs=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ru',{granularity:'grapheme'}).segment(text)].map(s=>s.segment):Array.from(text);
  let generation=0,frame=0,abort=new AbortController();
  const monitor=(side,inside)=>`<div class="computer ${side}"><div class="monitor"><div class="monitor-camera" aria-hidden="true"></div><div class="monitor-screen">${inside}</div><div class="monitor-chin" aria-hidden="true">●</div></div><div class="monitor-neck" aria-hidden="true"></div><div class="monitor-foot" aria-hidden="true"></div><div class="keyboard" aria-hidden="true"></div></div>`;
  const numberForm=(placeholder='Число')=>`<form class="answer-form" id="answer-form"><label class="sr-only" for="answer">${placeholder}</label><input id="answer" class="answer-input" inputmode="numeric" autocomplete="off" placeholder="${placeholder}"><button class="button" type="submit">Проверить</button></form><p class="feedback" id="feedback" role="status" aria-live="polite"></p>`;
  const bitButtons=(values,kind='bit')=>values.map((weight,i)=>`<button type="button" class="${kind}" data-weight="${weight}" aria-label="Вес ${weight}" aria-pressed="false"><span class="bit-digit">0</span><small>${weight}</small></button>`).join('');
  const scenes={
    1:()=>`<div class="prediction-line"><span>Ваша версия:</span><div class="choices">${['Рисунок букв','Само слово','Код из битов'].map((text,i)=>`<button class="chip" data-guess="${i}" aria-pressed="false">${text}</button>`).join('')}</div></div><div class="message-world" id="message-world" data-phase="idle"><div class="computer-labels"><span>Ваш компьютер</span><span>У друга</span></div><div class="message-stage">${monitor('sender','<label class="sr-only" for="message">Сообщение другу</label><input id="message" value="Привет" maxlength="24" spellcheck="false" autocomplete="off"><div class="screen-bits" aria-hidden="true">01010000<br>11010000</div>')}<div class="wire-wrap" aria-hidden="true"><svg class="data-wire" viewBox="0 0 300 170"><defs><linearGradient id="wire-color"><stop stop-color="#e1af73"/><stop offset=".5" stop-color="#9c82dc"/><stop offset="1" stop-color="#65b9b4"/></linearGradient></defs><path id="wire-path" d="M 0 95 C 70 95 60 45 110 45 S 210 140 250 100 S 280 95 300 95"/><g id="wire-packets"></g></svg><span class="wire-caption" id="wire-caption">Что в проводе?</span></div>${monitor('receiver','<span class="receiver-placeholder" id="receiver-placeholder">Жду сообщение</span><output id="received"></output>')}</div><div class="message-controls"><div class="choices"><button class="chip" data-word="Привет">Привет</button><button class="chip" data-word="Go">Go</button><button class="chip" data-word="👋">👋</button></div><button id="send" class="button">Отправить <span aria-hidden="true">↗</span></button></div><p class="scene-status" id="message-status" role="status" aria-live="polite">Что окажется между двумя экранами? Проверьте свою версию.</p><div class="message-payload" id="message-payload" hidden></div></div>`,
    2:()=>`<div class="locker-world"><div class="locker-controls"><div><span class="object-label">Сколько битов?</span><div class="choices">${[1,2,3,4].map(n=>`<button class="chip" data-count="${n}" aria-pressed="${n===2}">${n}</button>`).join('')}</div></div><div class="switchboard" id="switchboard"></div><div class="capacity"><output id="capacity">4</output><span>разных кода</span></div></div><div id="lockers" class="lockers"></div><p class="scene-status" id="locker-status" role="status" aria-live="polite"></p><div class="small-question"><strong>Для пяти шкафчиков хватит двух битов?</strong><div class="choices"><button class="chip" data-capacity-answer="yes">Хватит</button><button class="chip" data-capacity-answer="no">Нужен ещё один</button></div><p id="capacity-answer" role="status"></p></div></div>`,
    3:()=>`<div class="scale-world"><div class="target-picker"><span>На правой чаше:</span><div class="choices">${[13,7,21].map(n=>`<button class="chip" data-target="${n}" aria-pressed="${n===13}">${n}</button>`).join('')}</div></div><svg class="balance" viewBox="0 0 680 260" role="img" aria-label="Весы: сравнение выбранных гирь с нужным числом"><defs><linearGradient id="metal"><stop stop-color="#dfd7c7"/><stop offset="1" stop-color="#a8b8c4"/></linearGradient></defs><path d="M340 50 L302 229 H378 Z" fill="url(#metal)"/><rect x="259" y="224" width="162" height="16" rx="8" fill="#b2bdbd"/><g id="scale-beam"><rect x="130" y="51" width="420" height="12" rx="6" fill="#798d9b"/><path d="M150 63V156 M530 63V156" stroke="#9cabb4" stroke-width="3"/><path d="M80 156 Q150 209 220 156Z" fill="#d4e8e0" stroke="#8bbab0"/><path d="M460 156 Q530 209 600 156Z" fill="#f6ddc5" stroke="#d6a473"/><g id="scale-load"></g><rect x="505" y="109" width="50" height="47" rx="9" fill="#d8955d"/><path d="M520 108V99H540V108" fill="none" stroke="#b87f51" stroke-width="4"/><text id="scale-target" x="530" y="140" text-anchor="middle">13</text></g><circle cx="340" cy="57" r="14" fill="#f8fbfa" stroke="#97a9ae" stroke-width="5"/></svg><div class="weight-rack" id="weight-rack">${bitButtons(weights,'weight')}</div><p class="sum-line" id="sum-line" role="status" aria-live="polite">Пока на левой чаше пусто.</p><div class="binary-strip" id="scale-binary"></div></div>`,
    4:()=>`<div class="ticket-world"><div class="hanging-tag"><span class="tag-hole" aria-hidden="true"></span><span class="object-label">Число спрятано в пяти битах</span><div class="ticket-bits" id="ticket-bits"></div><div class="ticket-perforation" aria-hidden="true"></div><div class="ticket-walk" id="ticket-walk">16 &nbsp;·&nbsp; 8 &nbsp;·&nbsp; 4 &nbsp;·&nbsp; 2 &nbsp;·&nbsp; 1</div></div>${numberForm('Десятичное число')}<div class="tools"><button class="text-button" id="read-step">Разобрать по одному месту</button><button class="text-button" id="new-example">Другая бирка ↻</button></div></div>`,
    5:()=>`<div class="packing-world" id="packing-world"><div class="parcel-lid"><span>Сохранить число</span><strong id="pack-target">19</strong><span class="parcel-stamp" id="parcel-stamp" hidden>Совпало</span></div><div class="parcel-tray" id="write-bits">${bitButtons(weights,'memory-slot')}</div><form class="answer-form" id="answer-form"><label class="sr-only" for="answer">Пять нулей и единиц</label><input id="answer" class="answer-input binary-input" maxlength="5" inputmode="numeric" autocomplete="off" placeholder="00000"><button class="button" type="submit">Упаковать</button></form><p class="feedback" id="feedback" role="status" aria-live="polite"></p><div class="tools"><button class="text-button" id="new-example">Другое число ↻</button></div></div>`,
    6:()=>`<div class="byte-world"><div class="byte-label"><span class="object-label">Один байт</span><span>Восемь ячеек</span></div><div class="byte-case" id="byte-case">${bitButtons([128,64,32,16,8,4,2,1],'byte-cell')}</div><div class="byte-readout"><output id="byte-value">65</output><span>из диапазона 0–255</span><button id="byte-add" class="round-button" aria-label="Прибавить один">+1</button></div><label class="value-range"><span>0</span><input id="byte-range" type="range" min="0" max="255" value="65" aria-label="Значение байта"><span>255</span></label><div class="choices centered"><button class="chip" id="all-zero">Все нули</button><button class="chip" id="all-one">Все единицы</button><button class="chip" id="start-carry">Как 7 превращается в 8?</button></div><div class="byte-warning" id="byte-warning" hidden><span class="ninth-bit">1<small>девятый</small></span><p><strong>256 — это 100000000₂.</strong><br>Нужна ещё одна ячейка. В этот байт она не помещается.</p></div><div class="carry-story" id="carry-story" hidden><div class="carry-row" id="carry-row"></div><p id="carry-text" role="status"></p><button class="text-button" id="carry-next">Дальше →</button></div></div>`,
    7:()=>`<div class="shipping-world"><div class="shipping-toolbar"><div><span class="object-label">Байтов в посылке</span><div class="quantity"><button id="remove-box" aria-label="Убрать байт">−</button><output id="box-count">3</output><button id="add-box" aria-label="Добавить байт">+</button></div></div><button class="chip" id="unpack">Раскрыть коробки</button></div><div class="shipping-shelf" id="shipping-shelf"></div>${numberForm('Сколько битов?')}<p class="scene-status" id="shipping-status" role="status">Каждая коробка вмещает восемь битов.</p></div>`,
    8:()=>`<div class="printer-world"><div class="choices centered">${['A','Я','👋'].map(char=>`<button class="chip char-chip" data-char="${char}" aria-pressed="${char==='A'}">${char}</button>`).join('')}</div><div class="printer-desk"><div class="printer"><div class="printer-top"><span class="printer-led" aria-hidden="true"></span><span>UTF‑8</span></div><div class="printer-display" id="printer-char">A</div><div class="printer-mouth" aria-hidden="true"></div><button id="print" class="printer-button">Напечатать байты ↓</button></div><div class="receipt-space"><div class="receipt-placeholder" id="receipt-placeholder"><strong>Один символ.</strong><span>Сколько байтов будет на чеке?</span></div><div class="receipt" id="receipt" hidden><span class="receipt-heading">UTF‑8 / ДАННЫЕ</span><div id="receipt-bytes"></div><div class="receipt-total" id="receipt-total"></div><span class="receipt-tear" aria-hidden="true"></span></div></div></div><p class="scene-status" id="unicode-status">Unicode: U+0041 · номер 65</p><div class="tools"><button class="chip" id="xray" aria-pressed="false">Выделить служебные биты</button></div><div class="utf-legend" id="utf-legend" hidden><span>служебные</span><span>номер символа</span></div><div class="word-comparison"><span>Go <b>2 байта</b></span><span>Го <b>4 байта</b></span></div></div>`,
    9:()=>`<div class="meaning-world"><div class="choices centered">${[['number','Число'],['text','Текст'],['color','Цвет']].map(([id,text],i)=>`<button class="chip" data-mode="${id}" aria-pressed="${i===0}">${text}</button>`).join('')}</div><div class="meaning-desk"><div class="sealed-parcel"><span>СОДЕРЖИМОЕ</span><b class="mono">01000001</b><div class="parcel-string" aria-hidden="true"></div></div><span class="meaning-arrow" aria-hidden="true">→</span><div class="meaning-reveal" id="meaning-reveal"></div></div><p class="scene-status" id="meaning-caption" role="status"></p><div class="pixel-lab"><div class="pixel-screen"><div id="pixel-color" class="pixel-color"></div><div class="subpixels" aria-hidden="true"><i></i><i></i><i></i></div></div><div class="pixel-controls">${[['r','Красный'],['g','Зелёный'],['b','Синий']].map(([id,text])=>`<label class="rgb-${id}"><span>${text}</span><input data-channel="${id}" type="range" min="0" max="255" value="65" aria-label="${text} свет"><output id="rgb-${id}">65</output></label>`).join('')}<p class="mono" id="pixel-status" role="status">RGB(65, 65, 65) · 24 бита</p></div></div><div class="small-question"><strong>По одним битам можно узнать, что хотел сохранить автор?</strong><div class="choices"><button class="chip" data-meaning-answer="yes">Можно</button><button class="chip" data-meaning-answer="no">Нужна договорённость</button></div><p id="meaning-answer" role="status"></p></div></div>`,
    10:()=>`<div class="find-world notes-world"><div class="find-brand">Go-шечка <em>Find</em></div><form class="notes-search" id="find-form"><label class="find-input"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><span class="sr-only">Тема заметки</span><input id="query" value="цикл" maxlength="64" autocomplete="off" spellcheck="false" placeholder="Тема заметки"></label><button class="button" id="find-submit" type="submit">Найти</button></form><div class="notes-examples"><span>Попробуйте:</span>${['цикл','функц','пицца'].map(query=>`<button class="chip" type="button" data-search="${query}">${query}</button>`).join('')}</div><div class="notes-board" id="notes-board" aria-label="Наши заметки"></div><p class="notes-progress" id="find-status" role="status" aria-live="polite">Нажмите «Найти» — посмотрим, какие заметки подойдут.</p><section class="notes-folder" aria-labelledby="folder-title"><div class="folder-tab" aria-hidden="true"></div><header><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5h7l2 2h9v13H3Z"/></svg><h3 id="folder-title">Результаты</h3><output id="find-count">—</output></header><div class="folder-content" id="find-results"><p class="folder-empty">Здесь соберём найденные заметки.</p></div></section></div>`
  };
  function show(){
    generation++;cancelAnimationFrame(frame);abort.abort();abort=new AbortController();
    const parsed=Number(preview?location.hash.slice(1):document.body.dataset.step);
    const step=Number.isInteger(parsed)&&parsed>=1&&parsed<=10?parsed:1;
    const data=content[step];document.body.dataset.chapter=step;
    const badge=document.querySelector('.site-badge');if(badge)badge.textContent='Модуль 02 · Урок 01';
    const note=document.querySelector('.local-note');if(note)note.textContent='Опыты — для тренировки. Зачёт — в заданиях Stepik.';
    const $=selector=>root.querySelector(selector),$$=selector=>[...root.querySelectorAll(selector)];
    const on=(selector,type,handler)=>$$(selector).forEach(node=>node.addEventListener(type,handler,{signal:abort.signal}));
    const flash=(node,keyframes,options={})=>{if(motion())node.animate(keyframes,{duration:420,easing:'cubic-bezier(.2,.75,.3,1)',...options});};
    const say=(text,success=false)=>{const node=$('#feedback');node.textContent=text;node.className='feedback '+(success?'success':'retry');};
    const go=n=>preview?`#${String(n).padStart(2,'0')}`:file(n);
    const sections=data.body.split(/(?=<h2>)/).filter(Boolean);
    const extra=`<details class="extra"><summary>${data.extraTitle}</summary><p>${data.extra}</p></details>`;
    const story=(html,classes='')=>`<article class="story ${classes}" aria-label="Объяснение">${html}</article>`;
    const experiment=`<section class="experiment experiment-${step}" aria-label="Опыт">${scenes[step]()}</section>`;
    let flow;
    if([2,6,7,8,10].includes(step))flow=story(sections[0],'story-before')+experiment+story(sections.slice(1).join('')+extra);
    else if([3,9].includes(step))flow=`<div class="duo-layout">${story(sections.slice(0,2).join(''),'duo-story')}${experiment}</div>`+story(sections.slice(2).join('')+extra);
    else if(step===5)flow=`<div class="duo-layout workshop-layout">${experiment}${story(sections[0],'duo-story')}</div>`+story(sections.slice(1).join('')+extra);
    else flow=experiment+story(data.body+extra);
    root.innerHTML=`<header class="lesson-header"><p class="lesson-kicker">Основы вычислений <span>${String(step).padStart(2,'0')} / 10</span></p>${data.welcome?`<p class="welcome-line">${data.welcome}</p>`:''}<h1>${data.title}</h1><p class="lesson-question">${data.question}</p><p class="lesson-intro">${data.intro}</p></header><div class="lesson-flow">${flow}</div><nav class="lesson-bottom" aria-label="Переход между шагами">${step>1?`<a href="${go(step-1)}">← Назад</a>`:'<span>Команда WEB HACKER</span>'}${step<10?`<a class="button" href="${go(step+1)}">Дальше →</a>`:'<a href="go-mini-module-02-lesson-01-v2-preview.html">К началу урока ↗</a>'}</nav>`;
    if(step===10){
      const task=document.createElement('aside');task.className='find-task';task.setAttribute('aria-labelledby','find-task-title');
      task.innerHTML='<h2 id="find-task-title">Найдём заметки про циклы.</h2><p>В поле уже есть слово <strong>цикл</strong>. Нажмите «Найти» и посмотрите, какие записи попадут в папку. А что произойдёт, если поискать пиццу?</p>';
      $('.find-brand').after(task);
    }
    document.title=data.title+' · Go-шечка (mini)';
    document.querySelectorAll('#v2-nav a').forEach((link,i)=>{if(i+1===step)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
    const open=document.getElementById('open-v2');if(open)open.href=file(step);
    const picker=document.getElementById('step-picker');if(picker)picker.value=String(step).padStart(2,'0');
    on('#answer','input',()=>{ $('#feedback').textContent=''; });
    if(step===1){
      let guess=null,busy=false,run=0;
      on('[data-guess]','click',event=>{guess=Number(event.currentTarget.dataset.guess);$$('[data-guess]').forEach(button=>button.setAttribute('aria-pressed',String(button===event.currentTarget)));});
      on('[data-word]','click',event=>{if(!busy)$('#message').value=event.currentTarget.dataset.word;});
      const finish=(text,encoded)=>{
        busy=false;$('#send').disabled=false;$('#message').disabled=false;$$('[data-word]').forEach(b=>b.disabled=false);
        $('#message-world').dataset.phase='received';$('#received').textContent=text;$('#receiver-placeholder').hidden=true;
        $('#wire-packets').replaceChildren();$('.screen-letters')?.remove();$('#message-world').setAttribute('aria-busy','false');$('#wire-caption').textContent=encoded.length+' Б';
        $('#message-status').textContent=embedded?`Получено: ${encoded.length} ${plural(encoded.length,'байт','байта','байтов')}. Сообщение восстановлено.`:(guess===2?'Да, передали код. ':guess!==null?'Посмотрите: между экранами были байты. ':'')+`Получатель прочитал ${encoded.length} ${plural(encoded.length,'байт','байта','байтов')} и восстановил сообщение.`;
        $('#message-payload').hidden=false;
        const signs=glyphs(text).length;
        $('#message-payload').innerHTML=`<div class="payload-caption"><strong>${signs}</strong> ${plural(signs,'видимый знак','видимых знака','видимых знаков')} <span>→</span> <strong id="byte-count">${encoded.length}</strong> ${plural(encoded.length,'байт','байта','байтов')} UTF‑8</div><div class="byte-ribbon">${encoded.map((n,i)=>`<span class="ribbon-byte" style="--i:${i%6}"><small>${i+1}</small><b class="mono">${bin(n)}</b></span>`).join('')}</div>`;
        if(embedded){
          let first=0;
          const pager=document.createElement('div');pager.className='byte-page-nav';
          $('#message-payload').append(pager);
          const close=document.createElement('button');close.className='chip';close.textContent='К компьютерам';
          close.addEventListener('click',()=>$('#message-payload').close(),{signal:abort.signal});$('#message-payload').append(close);
          $('#show-bytes').hidden=false;
          $('#show-bytes').disabled=false;
          const paintBytes=()=>{
            $('.byte-ribbon').innerHTML=encoded.slice(first,first+6).map((n,i)=>`<span class="ribbon-byte"><small>${first+i+1}</small><b class="mono">${bin(n)}</b></span>`).join('');
            pager.replaceChildren();
            const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');
            previous.textContent='←';previous.setAttribute('aria-label','Предыдущие байты');previous.disabled=first===0;
            next.textContent='→';next.setAttribute('aria-label','Следующие байты');next.disabled=first+6>=encoded.length;
            label.textContent=`${first+1}–${Math.min(first+6,encoded.length)} из ${encoded.length}`;
            previous.addEventListener('click',()=>{first=Math.max(0,first-6);paintBytes();},{signal:abort.signal});
            next.addEventListener('click',()=>{first+=6;paintBytes();},{signal:abort.signal});pager.append(previous,label,next);
          };paintBytes();
        }
        flash($('#received'),[{opacity:0,transform:'translateY(10px) scale(.92)'},{opacity:1,transform:'none'}],{duration:650});
      };
      on('#send','click',()=>{
        if(busy)return;const text=$('#message').value;if(!text){$('#message-status').textContent=embedded?'Сообщение пустое. Введите слово.':'В сообщении пока нет знаков. Можно отправить слово или хотя бы пробел.';return;}
        const encoded=bytes(text);if(!motion()){finish(text,encoded);return;}
        busy=true;run++;const currentRun=run,ownGeneration=generation;$('#send').disabled=true;$('#message').disabled=true;$$('[data-word]').forEach(b=>b.disabled=true);
        $('#message-payload').hidden=true;$('#received').textContent='';$('#receiver-placeholder').hidden=false;$('#receiver-placeholder').textContent='Получаю…';$('#message-world').dataset.phase='encoding';$('#message-world').setAttribute('aria-busy','true');
        if(embedded)$('#show-bytes').disabled=true;
        $('.screen-bits').textContent=encoded.slice(0,2).map(n=>bin(n)).join('\n');
        const letters=document.createElement('div');letters.className='screen-letters';letters.setAttribute('aria-hidden','true');glyphs(text).slice(0,12).forEach((char,i)=>{const letter=document.createElement('span');letter.textContent=char;letter.style.setProperty('--letter-i',i);letters.append(letter);});$('.sender .monitor-screen').append(letters);
        $('#message-status').textContent='Записываем сообщение байтами…';
        const svgNS='http://www.w3.org/2000/svg',stream=$('#wire-packets'),path=$('#wire-path');stream.replaceChildren();
        const cards=encoded.slice(0,5).map((n,index)=>{const group=document.createElementNS(svgNS,'g');const rect=document.createElementNS(svgNS,'rect');rect.setAttribute('x','-43');rect.setAttribute('y','-13');rect.setAttribute('width','86');rect.setAttribute('height','26');rect.setAttribute('rx','9');const label=document.createElementNS(svgNS,'text');label.setAttribute('text-anchor','middle');label.setAttribute('y','4');label.textContent=bin(n);group.append(rect,label);group.style.opacity='0';group.dataset.index=index;stream.append(group);return group;});
        const start=performance.now(),length=path.getTotalLength();
        const tick=now=>{if(generation!==ownGeneration||run!==currentRun)return;const elapsed=now-start;
          if(elapsed>500){$('#message-world').dataset.phase='travelling';$('#message-status').textContent=embedded?'Передаём байты на второй компьютер…':'Передаём данные. Буквы на другом экране ещё не появились.';}
          cards.forEach((card,index)=>{const progress=(elapsed-500-index*200)/1450;const visible=progress>=0&&progress<=1;card.style.opacity=visible?String(Math.min(1,progress*8,(1-progress)*8)):'0';if(visible){const point=path.getPointAtLength(progress*length);card.setAttribute('transform',`translate(${point.x} ${point.y})`);}});
          if(elapsed>3000){finish(text,encoded);return;}frame=requestAnimationFrame(tick);
        };frame=requestAnimationFrame(tick);
      });
    }
    if(step===2){
      let count=2,value=1;
      const paint=()=>{
        $('#capacity').textContent=2**count;
        $('.capacity span').textContent=plural(2**count,'разный код','разных кода','разных кодов');
        $('#switchboard').innerHTML=Array.from({length:count},(_,i)=>{const bit=Boolean(value&(1<<(count-i-1)));return `<button class="rocker" data-bit="${i}" aria-label="Переключатель ${i+1}" aria-pressed="${bit}"><span>${bit?1:0}</span></button>`;}).join('');
        $('#lockers').innerHTML=Array.from({length:2**count},(_,i)=>`<div class="locker ${i===value?'open':''}" style="--door-hue:${(i*43+145)%360}"><div class="locker-inside"><span>${i+1}</span></div><div class="locker-door"><span class="mono">${bin(i,count)}</span><i aria-hidden="true"></i></div></div>`).join('');
        if(embedded){
          const first=Math.floor(value/4)*4;
          $$('.locker').forEach((door,i)=>door.hidden=i<first||i>=first+4);
          let pager=$('#locker-pager');if(!pager){pager=document.createElement('div');pager.id='locker-pager';pager.className='byte-page-nav';$('#lockers').after(pager);}
          pager.innerHTML=`<button aria-label="Предыдущие шкафчики" ${first===0?'disabled':''}>←</button><span>${first+1}–${Math.min(first+4,2**count)} из ${2**count}</span><button aria-label="Следующие шкафчики" ${first+4>=2**count?'disabled':''}>→</button>`;
          pager.firstElementChild.addEventListener('click',()=>{value=Math.max(0,value-4);paint();},{signal:abort.signal});
          pager.lastElementChild.addEventListener('click',()=>{value=Math.min(2**count-1,value+4);paint();},{signal:abort.signal});
        }
        $('#locker-status').textContent=`Код ${bin(value,count)} открывает шкафчик ${value+1}. Всего кодов: ${2**count}.`;
        $$('[data-count]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.count)===count)));
      };
      $('#switchboard').addEventListener('click',event=>{const button=event.target.closest('[data-bit]');if(!button)return;const index=Number(button.dataset.bit);value^=1<<(count-index-1);paint();$(`[data-bit="${index}"]`).focus({preventScroll:true});},{signal:abort.signal});
      on('[data-count]','click',event=>{count=Number(event.currentTarget.dataset.count);value%=2**count;paint();});
      on('[data-capacity-answer]','click',event=>{$('#capacity-answer').textContent=event.currentTarget.dataset.capacityAnswer==='no'?'Верно. У двух битов только четыре кода. У трёх уже восемь — хватит на пять шкафчиков.':'Переберите коды двух битов: 00, 01, 10, 11. Для пятого шкафчика нужен ещё один бит.';});paint();
    }
    if(step===3){
      let value=0,target=13;
      const paint=()=>{const selected=weights.filter(w=>value&w);$('#sum-line').textContent=selected.length?`${selected.join(' + ')} = ${value}${value===target?' — весы сошлись!':''}`:'Пока на левой чаше пусто.';$('#scale-binary').innerHTML=[...bin(value,5)].map((bit,i)=>`<span class="${bit==='1'?'on':''}">${bit}<small>${weights[i]}</small></span>`).join('');
        $('#scale-target').textContent=target;$('#scale-beam').style.transform=`rotate(${Math.max(-9,Math.min(9,(target-value)*.45))}deg)`;
        $('#scale-load').innerHTML=selected.map((w,i)=>`<g transform="translate(${107+i*17} ${132-(i%2)*5})"><rect width="28" height="24" rx="5" fill="${['#cc4f90','#d88b1e','#17a789','#467fda','#9756c9'][weights.indexOf(w)]}"/><text x="14" y="17" text-anchor="middle">${w}</text></g>`).join('');
        $$('[data-weight]').forEach(b=>{const active=Boolean(value&Number(b.dataset.weight));b.setAttribute('aria-pressed',String(active));b.querySelector('.bit-digit').textContent=active?1:0;});$$('[data-target]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.target)===target)));
      };
      on('[data-weight]','click',event=>{value^=Number(event.currentTarget.dataset.weight);paint();flash(event.currentTarget,[{transform:'translateY(0)'},{transform:'translateY(-12px)'},{transform:'translateY(0)'}]);});on('[data-target]','click',event=>{target=Number(event.currentTarget.dataset.target);paint();});paint();
    }
    if(step===4){
      const examples=[22,9,27,0,31];let index=0,walk=0;
      const paint=()=>{$('#ticket-bits').innerHTML=[...bin(examples[index],5)].map((bit,i)=>`<span class="${bit==='1'?'on':''}">${bit}<small>${weights[i]}</small></span>`).join('');$('#answer').value='';$('#feedback').textContent='';$('#ticket-walk').textContent='16 · 8 · 4 · 2 · 1';walk=0;$('#read-step').disabled=false;};
      on('#answer-form','submit',event=>{event.preventDefault();const input=$('#answer').value.trim();if(!/^\d+$/.test(input)){say('Нужно целое неотрицательное число. Пустое поле пока не ответ.');return;}const correct=Number(input)===examples[index];say(correct?'Верно. Все выбранные веса учтены.':'Проверьте места под единицами. Под нулями ничего не прибавляем.',correct);});
      on('#read-step','click',()=>{walk++;const considered=weights.slice(0,walk),selected=considered.filter(w=>examples[index]&w),sum=selected.reduce((a,b)=>a+b,0);$('#ticket-walk').textContent=`${considered.at(-1)}: ${examples[index]&considered.at(-1)?'берём':'пропускаем'}. Сумма пока ${sum}.${walk===5?' Все места проверены.':''}`;$('#read-step').disabled=walk===5;});
      on('#new-example','click',()=>{index=(index+1)%examples.length;paint();});paint();
    }
    if(step===5){
      const targets=[19,6,25,0,31];let index=0;
      const paint=()=>{const input=$('#answer').value;$$('[data-weight]').forEach((b,i)=>{const active=input[i]==='1';b.setAttribute('aria-pressed',String(active));b.querySelector('.bit-digit').textContent=input[i]||'0';});$('#pack-target').textContent=targets[index];$('#parcel-stamp').hidden=true;$('#packing-world').classList.remove('packed');};
      on('[data-weight]','click',event=>{const i=weights.indexOf(Number(event.currentTarget.dataset.weight));const bits=Array.from({length:5},(_,j)=>$('#answer').value[j]==='1'?'1':'0');bits[i]=bits[i]==='1'?'0':'1';$('#answer').value=bits.join('');$('#feedback').textContent='';paint();});on('#answer','input',paint);
      on('#answer-form','submit',event=>{event.preventDefault();const input=$('#answer').value;if(!/^[01]{5}$/.test(input)){say('Нужно пять цифр: только 0 и 1. Начальные нули тоже оставляем.');return;}const value=parseInt(input,2),correct=value===targets[index];say(correct?`${input} сохраняет ${value}. Упаковка готова.`:`В коробке получилось ${value}, а нужно ${targets[index]}. Проверьте выбранные веса.`,correct);if(correct){$('#parcel-stamp').hidden=false;$('#packing-world').classList.add('packed');flash($('#parcel-stamp'),[{transform:'scale(1.5) rotate(-18deg)',opacity:0},{transform:'scale(1) rotate(-9deg)',opacity:1}],{duration:550});}});
      on('#new-example','click',()=>{index=(index+1)%targets.length;$('#answer').value='';$('#feedback').textContent='';paint();});paint();
    }
    if(step===6){
      let value=65,carry=0;const byteWeights=[128,64,32,16,8,4,2,1];
      const paint=()=>{$$('[data-weight]').forEach(b=>{const active=Boolean(value&Number(b.dataset.weight));b.setAttribute('aria-pressed',String(active));b.querySelector('.bit-digit').textContent=active?1:0;});$('#byte-value').textContent=value;$('#byte-range').value=value;};
      const hide=()=>{$('#byte-warning').hidden=true;};on('[data-weight]','click',event=>{value^=Number(event.currentTarget.dataset.weight);hide();paint();});on('#byte-range','input',event=>{value=Number(event.target.value);hide();paint();});on('#all-zero','click',()=>{value=0;hide();paint();});on('#all-one','click',()=>{value=255;hide();paint();});on('#byte-add','click',()=>{if(value===255){$('#byte-warning').hidden=false;flash($('.ninth-bit'),[{transform:'translateX(-20px)',opacity:0},{transform:'none',opacity:1}]);return;}value++;hide();paint();});
      const states=[['0111','К семи прибавим один. Начинаем с правой позиции.',3],['0110','В правом месте 1 + 1 = 10₂. Оставляем 0, переносим 1.',2],['0100','В следующем месте снова 1 + 1. Ещё один перенос.',1],['0000','Последняя из трёх единиц тоже стала нулём. Перенос дошёл до восьмёрки.',0],['1000','Здесь был 0. Добавили перенос — стала 1. Получилось восемь.',-1]];
      const showCarry=()=>{const [digits,text,active]=states[carry];$('#carry-row').innerHTML=[...digits].map((bit,i)=>`<span class="${i===active?'incoming':''}"><b>${bit}</b><small>${[8,4,2,1][i]}</small></span>`).join('');$('#carry-text').textContent=text;$('#carry-next').textContent=carry===4?'Повторить ↻':'Дальше →';};
      on('#start-carry','click',()=>{carry=0;$('#carry-story').hidden=false;showCarry();});on('#carry-next','click',()=>{carry=(carry+1)%5;showCarry();});paint();
    }
    if(step===7){
      let count=3,open=false,parcelPage=0;
      const paint=()=>{
        $('#box-count').textContent=count;$('#remove-box').disabled=count===1;$('#add-box').disabled=count===8;
        $('#shipping-shelf').classList.toggle('unpacked',open);
        $('#shipping-shelf').innerHTML=Array.from({length:count},(_,i)=>`<div class="byte-package" style="--pack-i:${i}"><div class="package-tape"><span>БАЙТ ${i+1}</span></div><div class="package-cells">${'<i></i>'.repeat(8)}</div></div>`).join('');
        if(embedded){
          parcelPage=Math.min(parcelPage,Math.floor((count-1)/4));const first=parcelPage*4;
          $$('.byte-package').forEach((box,i)=>box.hidden=i<first||i>=first+4);
          let pager=$('#shipping-pager');if(!pager){pager=document.createElement('div');pager.id='shipping-pager';pager.className='byte-page-nav';$('#shipping-shelf').after(pager);}
          pager.innerHTML=`<button aria-label="Предыдущие коробки" ${first===0?'disabled':''}>←</button><span>${first+1}–${Math.min(first+4,count)} из ${count}</span><button aria-label="Следующие коробки" ${first+4>=count?'disabled':''}>→</button>`;
          pager.firstElementChild.addEventListener('click',()=>{parcelPage--;paint();},{signal:abort.signal});pager.lastElementChild.addEventListener('click',()=>{parcelPage++;paint();},{signal:abort.signal});
        }
        $('#unpack').textContent=open?'Закрыть коробки':'Раскрыть коробки';$('#shipping-status').textContent=open?`Коробок: ${count}. В каждой — восемь мест.`:'В каждой коробке восемь мест.';$('#feedback').textContent='';
      };
      on('#add-box','click',()=>{if(count<8)count++;parcelPage=Math.floor((count-1)/4);paint();});on('#remove-box','click',()=>{if(count>1)count--;paint();});on('#unpack','click',()=>{open=!open;paint();});on('#answer-form','submit',event=>{event.preventDefault();const input=$('#answer').value.trim();if(!/^\d+$/.test(input)){say('Введите число битов.');return;}const correct=Number(input)===count*8;say(correct?`${count} × 8 = ${count*8} битов. Верно.`:'В каждой коробке восемь мест. Умножьте число коробок на восемь.',correct);});paint();
    }
    if(step===8){
      let selected='A',printed=false,xray=false;
      const render=()=>{$('#printer-char').textContent=selected;$$('[data-char]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.char===selected)));const encoded=bytes(selected);$('#unicode-status').textContent=`Unicode: U+${selected.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')} · номер ${selected.codePointAt(0)}`;$('#receipt').hidden=!printed;$('#receipt-placeholder').hidden=printed;
        $('#receipt-bytes').innerHTML=encoded.map((n,index)=>{const prefix=index===0?(encoded.length===1?1:encoded.length+1):2;return `<div class="receipt-byte"><b class="mono">${[...bin(n)].map((bit,i)=>`<span class="${xray?(i<prefix?'prefix':'payload'):''}">${bit}</span>`).join('')}</b><span>${n}</span></div>`;}).join('');$('#receipt-total').textContent=`ИТОГО: ${encoded.length} ${encoded.length===1?'байт':'байта'} / ${encoded.length*8} битов`;$('#xray').setAttribute('aria-pressed',String(xray));$('#utf-legend').hidden=!xray;};
      on('[data-char]','click',event=>{selected=event.currentTarget.dataset.char;printed=false;render();});on('#print','click',()=>{printed=true;render();flash($('#receipt'),[{clipPath:'inset(0 0 100% 0)',transform:'translateY(-18px)'},{clipPath:'inset(0)',transform:'none'}],{duration:1000});});on('#xray','click',()=>{xray=!xray;printed=true;render();});render();
    }
    if(step===9){
      const modes={number:['<div class="seat-ticket"><small>МЕСТО</small><strong>65</strong><span>Целое число</span></div>','Читаем байт как число: 64 + 1 = 65.'],text:['<div class="letter-block"><strong>A</strong><span>ASCII / UTF‑8</span></div>','В этой части текстовой таблицы номер 65 означает латинскую A.'],color:['<div class="gray-sample" role="img" aria-label="Яркость 65 из 255"><span>65 / 255</span></div>','Один байт яркости: 0 — чёрный, 255 — белый. Здесь тёмно-серый.']};
      on('[data-mode]','click',event=>{const mode=event.currentTarget.dataset.mode;$('#meaning-reveal').innerHTML=modes[mode][0];$('#meaning-caption').textContent=modes[mode][1];$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===event.currentTarget)));flash($('#meaning-reveal'),[{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'none'}]);});$('#meaning-reveal').innerHTML=modes.number[0];$('#meaning-caption').textContent=modes.number[1];
      const color=()=>{const values=$$('[data-channel]').map(input=>Number(input.value));$$('[data-channel]').forEach(input=>$(`#rgb-${input.dataset.channel}`).textContent=input.value);$('#pixel-color').style.backgroundColor=`rgb(${values.join(',')})`;$('#pixel-color').setAttribute('aria-label',`Цвет RGB: ${values.join(', ')}`);$('#pixel-status').textContent=`RGB(${values.join(', ')}) · 24 бита`;};on('[data-channel]','input',color);color();on('[data-meaning-answer]','click',event=>{$('#meaning-answer').textContent=event.currentTarget.dataset.meaningAnswer==='no'?'Именно. Значение байта вычислить можно, а его назначение задаёт договорённость.':'65 — числовое значение байта. Но автор мог записать букву или яркость. Без формата этого не узнать.';});
    }
    if(step===10){
      const records=[{title:'Циклы в Go',text:'Повторяем команды.'},{title:'Список покупок',text:'Хлеб, молоко, яблоки.'},{title:'Функции в Go',text:'Группируем команды.'},{title:'Цикл без конца',text:'Проверяем условие.'}];
      const normalize=text=>text.toLocaleLowerCase('ru');let run=0;
      $('#notes-board').innerHTML=records.map((record,i)=>`<article class="search-note" data-note="${i}"><span class="note-corner" aria-hidden="true"></span><h3>${esc(record.title)}</h3><p>${esc(record.text)}</p><span class="note-seal" aria-hidden="true">✓</span><span class="note-lens" aria-hidden="true"></span></article>`).join('');
      const stop=()=>{run++;cancelAnimationFrame(frame);$$('.note-flight').forEach(node=>{node.getAnimations().forEach(animation=>animation.cancel());node.remove();});$('.notes-world').setAttribute('aria-busy','false');$('#find-submit').disabled=false;$('#find-submit').textContent='Найти';};
      const reset=()=>{stop();$$('.search-note').forEach(node=>node.className='search-note');$('#find-count').textContent='—';$('#find-results').innerHTML='<p class="folder-empty">Здесь соберём найденные заметки.</p>';$('#find-status').textContent='Нажмите «Найти» — посмотрим, какие заметки подойдут.';};
      const fly=note=>{
        if(!motion())return;
        const world=$('.notes-world'),a=note.getBoundingClientRect(),b=$('.notes-folder').getBoundingClientRect(),base=world.getBoundingClientRect();
        const sheet=document.createElement('span');sheet.className='note-flight';sheet.textContent='✓';sheet.setAttribute('aria-hidden','true');sheet.style.left=`${a.left-base.left+a.width/2-14}px`;sheet.style.top=`${a.top-base.top+a.height/2-18}px`;world.append(sheet);
        const animation=sheet.animate([{transform:'translate(0,0) rotate(-8deg)',opacity:1},{transform:`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+60-a.top-a.height/2}px) rotate(8deg) scale(.6)`,opacity:0}],{duration:550,easing:'cubic-bezier(.3,.1,.3,1)',fill:'forwards'});animation.onfinish=()=>sheet.remove();
      };
      const search=()=>{
        reset();const query=normalize($('#query').value.trim()),token=run,current=generation;let scanned=0,found=0;
        if(!query){$('#find-status').textContent='Введите тему заметки. Например, цикл.';$('#query').focus();return;}
        $('.notes-world').setAttribute('aria-busy','true');$('#find-submit').disabled=true;$('#find-submit').textContent='Ищем…';$('#find-count').textContent='0';$('#find-results').innerHTML='<p class="folder-empty">Просматриваем заметки…</p>';
        const visit=()=>{const note=$$('.search-note')[scanned];note.classList.add('searching');$('#find-status').textContent=`Проверяем заметку ${scanned+1} из 4…`;};
        const review=()=>{
          const record=records[scanned],note=$$('.search-note')[scanned],matched=normalize(record.title+' '+record.text).includes(query);note.classList.remove('searching');note.classList.add(matched?'matched':'skipped');
          if(matched){if(!found)$('#find-results').replaceChildren();found++;const row=document.createElement('p');row.className='folder-result';row.innerHTML='<span aria-hidden="true">✓</span><span></span>';row.lastElementChild.textContent=record.title;$('#find-results').append(row);fly(note);flash(row,[{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'none'}]);}
          scanned++;$('#find-count').textContent=String(found);
        };
        const finish=()=>{$('.notes-world').setAttribute('aria-busy','false');$('#find-submit').disabled=false;$('#find-submit').textContent='Найти';$('#find-status').textContent=`Готово: ${found} ${plural(found,'заметка','заметки','заметок')}. Проверены все четыре.`;if(!found)$('#find-results').innerHTML='<p class="folder-empty">Ничего не нашли.<br>Попробуйте другую тему.</p>';};
        if(!motion()){while(scanned<records.length)review();finish();return;}
        visit();let start=performance.now();
        const tick=now=>{if(token!==run||current!==generation)return;if(now-start>=550){review();if(scanned===records.length){finish();return;}visit();start=now;}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
      };
      on('#query','input',reset);on('#find-form','submit',event=>{event.preventDefault();search();});on('[data-search]','click',event=>{$('#query').value=event.currentTarget.dataset.search;search();});
    }
    if(embedded){
      document.body.dataset.panel=panel;
      const experiment=$('.experiment');
      if(step===6&&panel==='carry'){
        $('#start-carry').click();root.replaceChildren($('.carry-story'));
      }else if(step===9&&panel==='rgb')root.replaceChildren($('.pixel-lab'));
      else{
        root.replaceChildren(experiment);
        if(step===1){
          const dialog=document.createElement('dialog');dialog.id='message-payload';dialog.className='message-payload';dialog.hidden=true;dialog.setAttribute('aria-label','Байты отправленного сообщения');$('#message-payload').replaceWith(dialog);
          const open=document.createElement('button');open.id='show-bytes';open.className='chip';open.textContent='Байты сообщения';open.disabled=true;
          open.addEventListener('click',()=>dialog.showModal(),{signal:abort.signal});$('#message-status').after(open);
        }
        if(step===6){
          $('#start-carry').hidden=true;$('.carry-story').hidden=true;
          const close=document.createElement('button');close.className='chip';close.textContent='Понятно';
          close.addEventListener('click',()=>{$('#byte-warning').hidden=true;},{signal:abort.signal});$('#byte-warning').append(close);
        }
        if(step===9)$('.pixel-lab').remove();
        if(step===10)$('.find-task').remove();
      }
      const wrapDialog=(node,label)=>{
        const dialog=document.createElement('dialog');dialog.className='experiment-dialog';dialog.setAttribute('aria-label',label);
        node.before(dialog);dialog.append(node);const close=document.createElement('button');close.className='chip';close.textContent='Продолжить';close.addEventListener('click',()=>dialog.close(),{signal:abort.signal});dialog.append(close);return dialog;
      };
      if([4,5,7].includes(step)){
        const dialog=wrapDialog($('#feedback'),'Результат проверки');
        root.addEventListener('submit',()=>{if($('#feedback').textContent&&!dialog.open)dialog.showModal();},{signal:abort.signal});
      }
      for(const [answer,trigger] of [['#capacity-answer','[data-capacity-answer]'],['#meaning-answer','[data-meaning-answer]']]){
        if(!$(answer))continue;const dialog=wrapDialog($(answer),'Разберём ответ');
        root.addEventListener('click',event=>{if(event.target.closest(trigger)&&!dialog.open)dialog.showModal();},{signal:abort.signal});
      }
    }
  }
  if(preview){
    const nav=document.getElementById('v2-nav');nav.innerHTML=content.slice(1).map((step,i)=>`<a href="#${String(i+1).padStart(2,'0')}"><span>${String(i+1).padStart(2,'0')}</span>${step.nav}</a>`).join('');
    addEventListener('hashchange',()=>{show();window.scrollTo({top:0,behavior:'auto'});});
    document.getElementById('phone-v2')?.addEventListener('click',event=>{const enabled=document.body.classList.toggle('phone-preview');event.currentTarget.setAttribute('aria-pressed',String(enabled));});
    document.getElementById('step-picker')?.addEventListener('change',event=>{location.hash=event.currentTarget.value;});
  }
  show();
})();
