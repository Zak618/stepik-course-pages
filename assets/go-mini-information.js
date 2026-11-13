/* Local teaching experiments. These checks do not award Stepik points. */
(() => {
  'use strict';
  const step = Number(document.body.dataset.step);
  const panel = new URLSearchParams(location.search).get('panel');
  const root = document.getElementById('lesson-root');
  const $ = (selector) => root.querySelector(selector);
  const $$ = (selector) => [...root.querySelectorAll(selector)];
  const bytes = (text) => [...new TextEncoder().encode(text)];
  const binary = (value, size = 8) => value.toString(2).padStart(size, '0');
  const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const path = (number) => `go-mini-module-02-lesson-01-step-${String(number).padStart(2, '0')}.html`;
  const feedback = (text, success = false) => { const node = $('#feedback'); node.textContent = text; node.className = `feedback ${success ? 'success' : 'error'}`; };
  const fixedBits = (value, count = 5) => [...binary(value, count)].map((bit, index) => `<span class="fixed-bit ${bit === '1' ? 'on' : ''}">${bit}<small>вес ${2 ** (count - index - 1)}</small></span>`).join('');
  const range = (max, label) => `<label class="range-line"><span>0</span><input id="number-range" type="range" min="0" max="${max}" aria-label="${label}"><span>${max}</span></label>`;
  const pages = [null,
    {
      title: 'За каждой буквой — <em>данные.</em>',
      lead: 'Напишите слово. Под ним появится то, что компьютер хранит вместо привычных нам букв.',
      scene: `<div class="message-workbench"><label class="sr-only" for="message">Ваше сообщение</label><input id="message" class="message-input" value="Go" maxlength="24" autocomplete="off" spellcheck="false"><div class="signal-track" aria-hidden="true"></div><div class="chip-row"><button class="pill" data-message="Go">Go</button><button class="pill" data-message="Привет">Привет</button><button class="pill" data-message="🤖">🤖</button></div><div class="packets" id="packets"></div><p class="packet-count" id="packet-count" role="status" aria-live="polite"></p></div>`,
    },
    {
      title: 'Всего <em>два состояния.</em>',
      lead: 'Нажмите на переключатели. Один хранит один бит. Два переключателя уже позволяют различить четыре комбинации.',
      scene: `<div class="chip-row bit-selector" aria-label="Количество битов">${[1,2,3,4].map(n => `<button class="pill" data-count="${n}" aria-pressed="${n === 2}">${n} ${n === 1 ? 'бит' : 'бита'}</button>`).join('')}</div><div class="switch-lab"><div class="switch-machine"><i class="screw"></i><i class="screw"></i><i class="screw"></i><i class="screw"></i><div class="keys" id="keys"></div><span class="machine-base">два состояния · один бит</span></div><div class="combo-result"><strong class="result-number" id="combination-count">4</strong><span class="result-label">различимые<br>комбинации</span></div></div><div id="combinations" class="combination-grid" aria-label="Все возможные комбинации"></div><div class="tools"><button class="action secondary" id="next-combination">Следующая комбинация →</button></div>`,
    },
    {
      title: 'У каждого места — <em>свой вес.</em>',
      lead: 'Включённый грузик добавляет свой вес к сумме. Выключенный — ничего. Соберите число сами.',
      scene: `<div class="weights-layout"><div class="weights" id="weights"></div><div class="sum-result"><output class="result-number" id="sum" aria-live="polite">13</output><span class="result-label">получилось</span></div></div><p class="formula mono" id="formula"></p>${range(31, 'Собрать число от 0 до 31')}`,
    },
    {
      title: 'Теперь <em>прочитайте число.</em>',
      lead: 'Сложите веса только под единицами. Какое десятичное число здесь записано?',
      scene: `<div class="fixed-bits" id="exercise-bits" aria-label="Двоичное число"></div><form class="answer-form" id="answer-form"><label class="sr-only" for="answer">Десятичное число</label><input id="answer" class="text-input short" type="text" inputmode="numeric" autocomplete="off" placeholder="Число"><button class="action" type="submit">Проверить</button></form><div class="feedback" id="feedback" role="status" aria-live="polite"></div><div class="tools"><button class="pill" id="new-example">Другой пример ↻</button></div>`,
    },
    {
      title: 'Соберите <em>двоичную запись.</em>',
      lead: 'Обратная задача: число уже есть. Какие грузики нужно включить, чтобы его получить?',
      scene: `<div class="target-card"><span class="label">Нужно представить число</span><strong class="result-number" id="target">19</strong></div><form class="answer-form" id="answer-form"><label class="sr-only" for="answer">Пять битов, нули и единицы</label><input id="answer" class="text-input binary-answer mono" type="text" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="00000" aria-describedby="binary-hint"><button class="action" type="submit">Проверить</button></form><div class="fixed-bits write-bits" id="written-bits" aria-label="Ваша запись"></div><p class="hint" id="binary-hint">Ровно 5 битов. Веса слева направо: 16, 8, 4, 2, 1.</p><div class="feedback" id="feedback" role="status" aria-live="polite"></div><div class="tools"><button class="pill" id="new-example">Другое число ↻</button></div>`,
    },
    {
      title: 'Восемь битов. <em>Один байт.</em>',
      lead: 'Эта карточка хранит один байт. Меняйте её ячейки или двигайте ползунок — запись и число связаны.',
      scene: `<div class="byte-card"><div class="byte-card-head"><span>1 БАЙТ</span><span>8 двоичных ячеек</span></div><div class="byte-bits" id="byte-bits"></div><div class="byte-weights" aria-hidden="true">${[128,64,32,16,8,4,2,1].map(n=>`<span>${n}</span>`).join('')}</div></div><div class="byte-dashboard"><div><output class="result-number" id="byte-value" aria-live="polite">65</output><span class="result-label">значение без знака</span></div><div><strong class="secondary-number">256</strong><span class="result-label">возможных значений</span></div></div>${range(255, 'Значение байта от 0 до 255')}<div class="tools"><button class="pill" id="byte-zero">Все нули</button><button class="pill" id="byte-max">Все единицы</button><button class="action secondary" id="byte-add">Прибавить 1</button></div><div class="feedback" id="feedback" role="status" aria-live="polite"></div>`,
    },
    {
      title: 'Байты <em>можно собирать.</em>',
      lead: 'В каждой карточке восемь ячеек. Выберите количество байтов и посчитайте, сколько всего битов получилось.',
      scene: `<div class="chip-row" aria-label="Количество байтов">${[1,2,4,8].map(n=>`<button class="pill" data-bytes="${n}" aria-pressed="${n===2}">${n} ${n===1?'байт':n===8?'байтов':'байта'}</button>`).join('')}</div><div class="bundle-display" id="bundle"></div><form class="answer-form" id="answer-form"><label class="sr-only" for="answer">Сколько всего битов</label><input id="answer" class="text-input short" type="text" inputmode="numeric" placeholder="Битов" autocomplete="off"><button class="action" type="submit">Проверить</button></form><div class="feedback" id="feedback" role="status" aria-live="polite"></div>`,
    },
    {
      title: 'У букв есть <em>правила записи.</em>',
      lead: 'Выберите символ. UTF‑8 превратит его в один или несколько байтов — и каждый из них мы уже умеем читать.',
      scene: `<div class="chip-row encoding-picker">${['A','Я','🤖'].map((char,i)=>`<button class="pill" data-char="${char}" aria-pressed="${i===0}">${char}</button>`).join('')}</div><div class="encoding-layout"><div class="character-token" id="character">A</div><span class="encoding-arrow" aria-hidden="true">→</span><div class="encoding-bytes" id="encoded-bytes"></div></div><p class="encoding-meta" id="encoding-meta" role="status" aria-live="polite"></p><div class="compare-row"><div class="compare-item mono">Go <strong>2 байта</strong></div><div class="compare-item mono">Го <strong>4 байта</strong></div></div>`,
    },
    {
      title: 'Одни биты. <em>Разный смысл.</em>',
      lead: 'Эти восемь битов не меняются. Меняется только правило, по которому программа их читает.',
      scene: `<div class="chip-row encoding-picker"><button class="pill" data-mode="number" aria-pressed="true">Число</button><button class="pill" data-mode="text" aria-pressed="false">Текст</button><button class="pill" data-mode="color" aria-pressed="false">Серый цвет</button></div><div class="decode-layout"><div class="raw-byte mono">01000001</div><span class="encoding-arrow" aria-hidden="true">→</span><div class="interpretation" id="interpretation"><strong>65</strong></div></div><p class="scene-caption" id="mode-caption" role="status" aria-live="polite"></p><form id="answer-form"><fieldset class="quiz-options"><legend class="label">Можно ли без формата узнать, что автор хотел сохранить?</legend><label class="quiz-option"><input type="radio" name="meaning" value="number">Да: это обязательно числовое поле со значением 65.</label><label class="quiz-option"><input type="radio" name="meaning" value="format">Нет: нужно знать правила прочтения данных.</label><label class="quiz-option"><input type="radio" name="meaning" value="letter">Да: это обязательно текстовая буква A.</label></fieldset><div class="tools"><button class="action" type="submit">Проверить</button></div></form><div class="feedback" id="feedback" role="status" aria-live="polite"></div>`,
    },
    {
      title: 'Теперь это — <em>часть Go-шечка Find.</em>',
      lead: 'Попробуйте найти go. Включите поиск без учёта регистра и сравните результат: данные те же, а правило поиска другое.',
      scene: `<div class="search-demo"><label class="search-box"><span class="search-logo" aria-hidden="true">Go-шечка <small>Find</small></span><span class="sr-only">Поисковый запрос</span><input id="query" value="go" maxlength="80" autocomplete="off" spellcheck="false"></label><div class="search-switch"><span id="case-label">Не учитывать регистр</span><button class="toggle" id="ignore-case" aria-pressed="false" aria-labelledby="case-label"></button></div><div class="search-results" id="results"></div><div class="search-status mono" id="search-status" role="status" aria-live="polite"></div></div>`,
    }
  ];
  const story = window.GoMiniInformationStory?.[step];
  if (!pages[step] || !story || !root) return;
  const page = {...pages[step], ...story};
  root.innerHTML = `<header class="lesson-head"><div class="step-meta"><b>Go-шечка (mini)</b><span>${String(step).padStart(2,'0')} / 10</span></div><h1>${page.title}</h1><p class="lead">${page.lead}</p></header><div class="story-opening">${page.opening}</div><section class="scene" aria-label="Интерактивный эксперимент">${page.scene}</section><section class="explanation" aria-label="Разбор">${page.theory}<details class="read-more"><summary>${page.moreTitle}</summary><div class="inside">${page.more}</div></details></section><nav class="step-navigation" aria-label="Шаги урока">${step > 1 ? `<a href="${path(step-1)}">← Назад</a>` : '<span>Команда WEB HACKER</span>'}${step < 10 ? `<a href="${path(step+1)}">Следующий шаг →</a>` : `<a href="go-mini-module-02-lesson-01-preview.html" target="_top">К обзору урока ↗</a>`}</nav>`;

  $('#answer')?.addEventListener('input',()=>{ $('#feedback').textContent=''; });
  $$('input[name=meaning]').forEach(input=>input.addEventListener('change',()=>{
    $('#feedback').textContent='';$$('.quiz-option').forEach(label=>label.classList.remove('correct'));
  }));

  if (step === 1) {
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ru',{granularity:'grapheme'}) : null;
    const render = () => {
      const value = $('#message').value;
      const segments = segmenter ? [...segmenter.segment(value)].map(item=>item.segment) : Array.from(value);
      const shown=panel?segments.slice(0,6):segments;
      $('#packets').innerHTML = shown.length ? shown.map((char,index)=>{const encoded=bytes(char);return `<div class="packet" style="animation-delay:${Math.min(index,12)*20}ms"><span class="packet-glyph">${escape(char === ' ' ? '␣' : char)}</span>${(panel?encoded.slice(0,4):encoded).map(n=>`<span class="packet-byte mono">${binary(n)}</span>`).join('')}${panel&&encoded.length>4?`<span class="packet-size">ещё ${encoded.length-4} Б</span>`:''}<span class="packet-size">${encoded.length} Б</span></div>`;}).join('') : '<span class="empty-hint">Напишите что-нибудь в поле выше</span>';
      $('#packet-count').innerHTML = `Видимых знаков: <strong>${segments.length}</strong> &nbsp;·&nbsp; Байтов UTF‑8: <strong id="byte-count">${bytes(value).length}</strong>`;
      if(panel&&segments.length>6)$('#packet-count').insertAdjacentHTML('beforeend','<small class="panel-note">Карточки показывают первые 6 видимых знаков; счётчик учитывает весь текст.</small>');
      $$('[data-message]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.message===value)));
    };
    $('#message').addEventListener('input', render);
    $$('[data-message]').forEach(button=>button.addEventListener('click',()=>{ $('#message').value=button.dataset.message;render(); }));
    render();
  }

  if (step === 2) {
    let count=2, value=1;
    const paint=()=>{
      $$('.bit-key').forEach((button,index)=>{const bit=Boolean(value & (1 << (count-index-1)));button.setAttribute('aria-pressed',String(bit));button.querySelector('span').textContent=bit?'1':'0';});
      $('#combination-count').textContent=2**count;
      $$('.combination').forEach((node,index)=>node.classList.toggle('active',index===value));
    };
    const build=()=>{
      $('#keys').innerHTML=Array.from({length:count},(_,index)=>`<button class="bit-key" aria-label="Переключить бит ${index+1}" aria-pressed="false"><span>0</span><small>бит ${index+1}</small></button>`).join('');
      $('#combinations').innerHTML=Array.from({length:2**count},(_,index)=>`<span class="combination mono">${binary(index,count)}</span>`).join('');
      $$('.bit-key').forEach((button,index)=>button.addEventListener('click',()=>{value ^= 1 << (count-index-1);paint();}));
      $$('[data-count]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.count)===count)));
      paint();
    };
    $$('[data-count]').forEach(button=>button.addEventListener('click',()=>{count=Number(button.dataset.count);value%=2**count;build();}));
    $('#next-combination').addEventListener('click',()=>{value=(value+1)%(2**count);paint();});
    build();
    $$('[data-locker-bits]').forEach(button=>button.addEventListener('click',()=>{
      const bits=Number(button.dataset.lockerBits),capacity=2**bits;
      $$('[data-locker-bits]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      $('#locker-slots').innerHTML=Array.from({length:5},(_,index)=>`<span class="locker ${index>=capacity?'unassigned':''}"><b>${index+1}</b><span class="mono">${index<capacity?binary(index,bits):'нет номера'}</span></span>`).join('');
      $('#locker-result').textContent=bits===3?'Точно: 3 бита дают 8 комбинаций. Пяти шкафчикам хватит; три номера останутся свободными.':capacity<5?`${bits} ${bits===1?'бит даёт':'бита дают'} только ${capacity} разных номера. Для пяти шкафчиков этого мало.`:'Хватит, но не минимально: 4 бита дают 16 номеров, а три бита уже дают 8.';
    }));
  }

  if (step === 3) {
    let value=13;
    const weights=[16,8,4,2,1];
    $('#weights').innerHTML=weights.map(weight=>`<div class="weight"><span class="weight-value">${weight}</span><button class="bit-key" data-weight="${weight}" aria-pressed="false" aria-label="Вес ${weight}"><span>0</span></button></div>`).join('');
    const render=()=>{
      $$('[data-weight]').forEach(button=>{const active=Boolean(value & Number(button.dataset.weight));button.setAttribute('aria-pressed',String(active));button.querySelector('span').textContent=active?'1':'0';button.parentElement.classList.toggle('active',active);});
      $('#sum').textContent=value; $('#number-range').value=value;
      $('#formula').textContent=`${weights.filter(weight=>value & weight).join(' + ') || '0'} = ${value}`;
    };
    $$('[data-weight]').forEach(button=>button.addEventListener('click',()=>{value ^= Number(button.dataset.weight);render();}));
    $('#number-range').addEventListener('input',event=>{value=Number(event.target.value);render();});
    render();
  }

  if (step === 4) {
    const examples=[22,9,27,0,31,18]; let index=0;
    const render=()=>{ $('#exercise-bits').innerHTML=fixedBits(examples[index]);$('#answer').value='';$('#feedback').textContent=''; };
    $('#answer-form').addEventListener('submit',event=>{
      event.preventDefault(); const answer=$('#answer').value.trim();
      if (!/^\d+$/.test(answer)) {feedback('Введите целое неотрицательное число. Пустое поле — ещё не ответ.');return;}
      const target=examples[index]; const success=Number(answer)===target;
      feedback(success ? `Верно: ${[16,8,4,2,1].filter(n=>target & n).join(' + ') || '0'} = ${target}.` : 'Пока не совпало. Берите только веса под единицами; под нулями ничего добавлять не нужно.',success);
    });
    $('#new-example').addEventListener('click',()=>{index=(index+1)%examples.length;render();$('#answer').focus();});render();
  }

  if (step === 5) {
    const examples=[19,6,25,0,31,12];let index=0;
    const renderBits=()=>{ const value=$('#answer').value;$('#written-bits').innerHTML=Array.from({length:5},(_,i)=>`<button type="button" data-write-bit="${i}" class="fixed-bit ${value[i]==='1'?'on':''}" aria-label="Переключить вес ${2**(4-i)}" aria-pressed="${value[i]==='1'}"><span>${escape(value[i] || '·')}</span><small>${2**(4-i)}</small></button>`).join(''); };
    const render=()=>{$('#target').textContent=examples[index];$('#answer').value='';$('#feedback').textContent='';renderBits();};
    $('#answer').addEventListener('input',renderBits);
    $('#written-bits').addEventListener('click',event=>{
      const button=event.target.closest('[data-write-bit]');if(!button)return;
      const position=Number(button.dataset.writeBit),input=$('#answer');
      const bits=Array.from({length:5},(_,i)=>input.value[i]==='1'?'1':'0');
      bits[position]=bits[position]==='1'?'0':'1';input.value=bits.join('');
      input.dispatchEvent(new Event('input',{bubbles:true}));
      $(`[data-write-bit="${position}"]`).focus({preventScroll:true});
    });
    $('#answer-form').addEventListener('submit',event=>{event.preventDefault();const answer=$('#answer').value;
      if(!/^[01]{5}$/.test(answer)){feedback('Нужно ровно пять цифр: только 0 и 1. Начальные нули тоже записывайте.');return;}
      const value=parseInt(answer,2),success=value===examples[index];
      feedback(success?`Да! ${answer} — это ${value}. Сумма выбранных весов совпала.`:`Ваша запись даёт ${value}, а нужно ${examples[index]}. Пересмотрите веса 16, 8, 4, 2, 1.`,success);
    });
    $('#new-example').addEventListener('click',()=>{index=(index+1)%examples.length;render();$('#answer').focus();});render();
  }

  if (step === 6) {
    let value=65;const weights=[128,64,32,16,8,4,2,1];
    $('#byte-bits').innerHTML=weights.map(weight=>`<button class="byte-bit" data-weight="${weight}" aria-pressed="false" aria-label="Бит с весом ${weight}">0</button>`).join('');
    const render=()=>{$$('[data-weight]').forEach(button=>{const active=Boolean(value & Number(button.dataset.weight));button.setAttribute('aria-pressed',String(active));button.textContent=active?'1':'0';});$('#byte-value').textContent=value;$('#number-range').value=value;};
    $$('[data-weight]').forEach(button=>button.addEventListener('click',()=>{value ^=Number(button.dataset.weight);$('#feedback').textContent='';render();}));
    $('#number-range').addEventListener('input',event=>{value=Number(event.target.value);$('#feedback').textContent='';render();});
    $('#byte-zero').addEventListener('click',()=>{value=0;$('#feedback').textContent='';render();});
    $('#byte-max').addEventListener('click',()=>{value=255;$('#feedback').textContent='';render();});
    $('#byte-add').addEventListener('click',()=>{if(value===255){feedback('256 = 100000000₂. Нужен девятый бит: в этой восьмибитной карточке больше нет места.');return;}value++;$('#feedback').textContent='';render();});render();
    let carryStep=0;
    const carry=[
      ['0111','Начинаем справа. К последней единице прибавляем один.',3],
      ['0110','1 + 1 даёт 10₂: записываем 0, переносим 1 в соседнюю позицию.',2],
      ['0100','В позиции двойки снова 1 + 1: записываем 0, перенос идёт дальше.',1],
      ['0000','В позиции четвёрки тоже 1 + 1: ещё один 0 и перенос в восьмёрку.',0],
      ['1000','В позиции восьмёрки было 0. Прибавляем перенос: 1. Готово — 8.',0]
    ];
    const showCarry=()=>{const [digits,description,active]=carry[carryStep];$('#carry-digits').innerHTML=[...digits].map((bit,i)=>`<span class="${i===active?'carry-active':''} ${i===active&&carryStep<4?'carry-pending':''}"><b>${bit}</b><small>${2**(3-i)}</small></span>`).join('');$('#carry-description').textContent=description;$('#carry-next').disabled=carryStep===carry.length-1;};
    $('#carry-next').addEventListener('click',()=>{carryStep=Math.min(carryStep+1,carry.length-1);showCarry();});$('#carry-reset').addEventListener('click',()=>{carryStep=0;showCarry();});showCarry();
  }

  if (step === 7) {
    let count=2;
    const render=()=>{$('#bundle').innerHTML=Array.from({length:count},(_,i)=>`<div class="mini-byte"><div class="mini-byte-cells" aria-hidden="true">${'<i></i>'.repeat(8)}</div><span>байт ${i+1}</span></div>`).join('');$$('[data-bytes]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.bytes)===count)));$('#answer').value='';$('#feedback').textContent='';};
    $$('[data-bytes]').forEach(button=>button.addEventListener('click',()=>{count=Number(button.dataset.bytes);render();}));
    $('#answer-form').addEventListener('submit',event=>{event.preventDefault();const answer=$('#answer').value.trim();if(!/^\d+$/.test(answer)){feedback('Введите количество битов целым неотрицательным числом.');return;}const success=Number(answer)===count*8;feedback(success?`Верно: ${count} × 8 = ${count*8} битов.`:'В каждой карточке восемь ячеек. Умножьте количество карточек на 8.',success);});render();
  }

  if (step === 8) {
    let selected='A',showStructure=false;
    $('#encoded-bytes').closest('.encoding-layout').insertAdjacentHTML('afterend','<div class="tools"><button class="pill" id="show-utf8" aria-pressed="false">Показать устройство UTF‑8</button></div><p class="encoding-legend" id="encoding-legend" hidden><span>Служебные биты</span><span>Биты номера символа</span></p>');
    const render=(char)=>{
      selected=char;
      $('#character').textContent=char; const encoded=bytes(char);
      $('#encoded-bytes').innerHTML=encoded.map((n,index)=>{
        const prefix=index===0?(encoded.length===1?1:encoded.length+1):2;
        const digits=[...binary(n)].map((bit,i)=>`<span class="${showStructure?(i<prefix?'utf-prefix':'utf-payload'):''}">${bit}</span>`).join('');
        return `<div class="encoding-byte"><span class="mono">${digits}</span><small>${n}</small></div>`;
      }).join('');
      $('#encoding-meta').innerHTML=`Unicode: <strong class="mono">U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')}</strong> &nbsp;·&nbsp; Номер: <strong>${char.codePointAt(0)}</strong><br>UTF‑8: <strong>${encoded.length}</strong> ${encoded.length===1?'байт':'байта'} · ${encoded.length*8} битов`;
      $$('[data-char]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.char===char)));
    };
    $('#show-utf8').addEventListener('click',()=>{showStructure=!showStructure;$('#show-utf8').setAttribute('aria-pressed',String(showStructure));$('#show-utf8').textContent=showStructure?'Скрыть разметку UTF‑8':'Показать устройство UTF‑8';$('#encoding-legend').hidden=!showStructure;render(selected);});
    $$('[data-char]').forEach(button=>button.addEventListener('click',()=>render(button.dataset.char)));render('A');
  }

  if (step === 9) {
    const modes={number:['<strong>65</strong>','Целое число без знака: 64 + 1 = 65.'],text:['<strong>A</strong>','Текст ASCII / UTF‑8: байт 65 означает латинскую A.'],color:['<div class="gray-pixel" role="img" aria-label="Серый цвет: яркость 65 из 255"></div>','8-битная яркость серого: 0 — чёрный, 255 — белый. Здесь 65.']};
    $$('[data-mode]').forEach(button=>button.addEventListener('click',()=>{const [html,caption]=modes[button.dataset.mode];$('#interpretation').innerHTML=html;$('#mode-caption').textContent=caption;$$('[data-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));}));
    $('#mode-caption').textContent=modes.number[1];
    const renderColor=()=>{const channels=$$('[data-channel]').map(input=>Number(input.value));const [r,g,b]=channels;$$('[data-channel]').forEach(input=>$(`#channel-${input.dataset.channel}`).textContent=input.value);$('#rgb-swatch').style.backgroundColor=`rgb(${r},${g},${b})`;$('#rgb-swatch').setAttribute('aria-label',`Цвет RGB: ${r}, ${g}, ${b}`);$('#rgb-status').textContent=`RGB(${r}, ${g}, ${b}) · 3 байта · 24 бита`;};
    $$('[data-channel]').forEach(input=>input.addEventListener('input',renderColor));renderColor();
    $('#answer-form').addEventListener('submit',event=>{event.preventDefault();const selected=$('input[name=meaning]:checked');if(!selected){feedback('Выберите один вариант.');return;}const success=selected.value==='format';feedback(success?'Именно. Числовое значение байта известно, а его назначение определяется форматом.':'Число 65 и буква A — возможные прочтения, но по одним битам нельзя выбрать назначение данных.',success);$$('.quiz-option').forEach(label=>label.classList.toggle('correct',success && label.contains(selected)));});
  }

  if (step === 10) {
    let ignoreCase=false;
    const records=[{title:'Go: первые команды',text:'Выводим текст и запускаем программу.'},{title:'Go-шечка Find: поиск по записям',text:'Собираем маленький поисковик на Go.'},{title:'Го: настольная игра',text:'Камни, доска и правила хода.'},{title:'Циклы и повторения',text:'Одна инструкция работает много раз.'}];
    let traceIndex=0;
    const matches=(record,query)=>{const normalize=(text)=>ignoreCase?text.toLocaleLowerCase('ru'):text;return normalize(`${record.title} ${record.text}`).includes(normalize(query));};
    const renderTrace=()=>{
      const query=$('#query').value;
      $('#trace-records').innerHTML=records.map((record,index)=>`<div class="trace-record ${index<traceIndex?(matches(record,query)?'match':'miss'):''}"><span class="trace-marker" aria-hidden="true">${index<traceIndex?(matches(record,query)?'✓':'−'):'·'}</span><span>${escape(record.title)}</span><small>${index<traceIndex?(matches(record,query)?'подходит':'пропускаем'):'ещё не проверена'}</small></div>`).join('');
      const found=records.slice(0,traceIndex).filter(record=>matches(record,query)).length;
      $('#trace-status').textContent=traceIndex===0?'Пока не проверили ни одной записи. Нажмите кнопку, чтобы начать.':`Проверено: ${traceIndex} из ${records.length}. Совпадений: ${found}.${traceIndex===records.length?' Коллекция закончилась — поиск завершён.':''}`;
      $('#trace-next').disabled=traceIndex===records.length;
    };
    const render=()=>{
      const query=$('#query').value;
      const found=records.filter(record=>matches(record,query));
      $('#results').innerHTML=found.length?found.map(record=>`<article class="search-result"><h3>${escape(record.title)}</h3><p>${escape(record.text)}</p></article>`).join(''):'<div class="no-results">Совпадений нет. Попробуйте изменить правило поиска.</div>';
      $('#search-status').textContent=`Записей: ${found.length} / ${records.length} · UTF‑8 запроса: ${bytes(query).length} Б`;
      $('#ignore-case').setAttribute('aria-pressed',String(ignoreCase));
      traceIndex=0;renderTrace();
    };
    $('#trace-next').addEventListener('click',()=>{traceIndex=Math.min(traceIndex+1,records.length);renderTrace();});$('#trace-reset').addEventListener('click',()=>{traceIndex=0;renderTrace();});
    $('#query').addEventListener('input',render);$('#ignore-case').addEventListener('click',()=>{ignoreCase=!ignoreCase;render();});render();
  }
  // Stepik owns the long-form article; this document supplies one live experiment.
  if(panel){
    const selectors={scene:'.scene',locker:'.prediction',carry:'.carry-lab',rgb:'.rgb-lab',trace:'.search-trace'};
    const target=selectors[panel]&&$(selectors[panel]);
    if(target){
      document.documentElement.classList.add('fragment');
      if(panel==='trace'){
        const records=$('#trace-records');
        target.insertBefore($('.search-box'),records);target.insertBefore($('.search-switch'),records);
        target.querySelector('p').textContent='Задайте запрос для этого опыта и проверяйте записи по одной.';
      }
      root.append(target);[...root.children].forEach(child=>{child.hidden=child!==target;});
    }
  }
})();
