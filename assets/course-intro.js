/* Small illustrations of behaviour, not a compiler, database or AI service. */
(() => {
  'use strict';
  const root = document.querySelector('#app');
  const id = Number(new URLSearchParams(location.search).get('course'));
  const profile = window.COURSE_INTROS?.[id];
  if (!profile) { root.textContent = 'Выберите курс из введения на Stepik.'; return; }
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colors = {web:'#5a39d5',webjs:'#5a39d5',html:'#8a3bb6',counter:'#3156db',query:'#167551',git:'#b34b26',docker:'#126aaa',search:'#6240c4',prompt:'#7841b2'};
  const theme={journey:['#087574','#ebf8f3'],ural:['#2857ad','#edf5ff'],budget:['#a65517','#fff5e7'],database:['#1b785e','#ecf9f3'],station:['#3156b6','#eef3ff'],request:['#08778b','#edf9fb'],strategy:['#397627','#f0f9e9']}[profile.scene];
  const accent = theme?.[0] || colors[profile.scene] || '#6640cf';
  const tint=theme?.[1]||({query:'#eaf8ef',docker:'#eaf5ff',git:'#fff5e9',search:'#f1edff',german:'#fff4e7'}[profile.scene])||'#f4efff';
  root.innerHTML = `<section class="experience" style="--accent:${accent};--tint:${tint}"><p class="eyebrow">${esc(profile.title)}</p><div class="scene" id="scene"></div><div class="controls" id="controls"></div><pre class="code" id="code"></pre><p class="status" id="status" role="status" aria-live="polite"></p></section>`;
  const scene = root.querySelector('#scene'), controls = root.querySelector('#controls'), code = root.querySelector('#code'), status = root.querySelector('#status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = innerWidth < 560;
  const svg = (body,mobileBody) => `<svg viewBox="0 0 ${compact&&mobileBody?400:800} 280" role="img" aria-label="${esc(profile.visualLabel || 'Интерактивный пример')}">${compact&&mobileBody?mobileBody:body}</svg>`;
  const text = (x,y,value,extra='') => `<text x="${x}" y="${y}" font-family="system-ui,sans-serif" ${extra.includes('font-size=')?'':'font-size="19"'} font-weight="650" ${extra.includes('fill=')?'':'fill="#1c3150"'} text-anchor="middle" ${extra}>${esc(value)}</text>`;
  const action = (label,callback) => {const b=document.createElement('button'); b.type='button'; b.className='primary'; b.textContent=label; b.addEventListener('click',callback); controls.append(b); return b;};
  const show = (sample,message) => {code.textContent=sample;status.textContent=message;};
  const animations = new Set();
  function animate(element,frames,options={}) {
    if (!element || reduced || !element.animate) return;
    const a=element.animate(frames,{duration:650,easing:'cubic-bezier(.22,.8,.25,1)',...options});
    animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));return a;
  }
  function sparkle(element) {
    if(reduced)return;
    const box=element.getBoundingClientRect(), outer=scene.getBoundingClientRect();
    for(let i=0;i<10;i++){const dot=document.createElement('i');dot.className='burst';dot.setAttribute('aria-hidden','true');const a=i*Math.PI/5;dot.style.cssText=`--color:${['#8056ed','#ffa63e','#2cbcaf'][i%3]};--x:${box.left-outer.left+box.width/2}px;--y:${box.top-outer.top+box.height/2}px;--dx:${Math.cos(a)*85}px;--dy:${Math.sin(a)*70}px;`;scene.append(dot);dot.addEventListener('animationend',()=>dot.remove(),{once:true});}
  }
  function range(label,min,max,value,onchange) {
    const l=document.createElement('label'),i=document.createElement('input'),o=document.createElement('output');i.type='range';i.min=min;i.max=max;i.value=value;i.id='control-range';l.htmlFor=i.id;l.textContent=label;o.htmlFor=i.id;o.value=value;controls.append(l,i,o);i.addEventListener('input',()=>{o.value=i.value;onchange(Number(i.value));});return i;
  }
  function web() {
    let layer=0;
    scene.innerHTML=`<div class="browser"><div class="browser-bar" aria-hidden="true"><i></i><i></i><i></i></div><div class="web-card" data-layer="0"><div class="web-picture" aria-hidden="true">✦</div><h2>${profile.scene==='html'?'Мила и кот Тег':'Кофе с собой'}</h2><p>${profile.scene==='html'?'Наша первая страница':'Открыты с 9:00'}</p><span class="web-label">HTML</span></div></div>`;
    const card=scene.querySelector('.web-card'),badge=scene.querySelector('.web-label');
    const button=action('Добавить оформление',()=>{layer=(layer+1)%(profile.scene==='webjs'?3:2);card.dataset.layer=layer;badge.textContent=['HTML','HTML + CSS','HTML + CSS + JavaScript'][layer];button.textContent=layer===0?'Добавить оформление':profile.scene==='webjs'&&layer===1?'Добавить действие':'Вернуть простой HTML';if(layer===2){card.querySelector('p').textContent='В заказе: 1 кофе';sparkle(card.querySelector('.web-picture'));}else card.querySelector('p').textContent=profile.scene==='html'?'Наша первая страница':'Открыты с 9:00';show(...[
      ['<h1>Кофе с собой</h1>','HTML задаёт содержимое. Пока здесь только заголовок, текст и значок.'],
      ['.card { background: #5738cf; color: white; }','Содержимое осталось тем же. CSS изменил цвет, форму и оформление.'],
      ['count = count + 1','JavaScript изменил количество после действия. Как это записать, разберём в уроках.']
    ][layer]);});
    show('<h1>Кофе с собой</h1>','Как изменится страница, если добавить только оформление? Проверьте.');
    if(profile.scene==='html')show('<h1>Мила и кот Тег</h1>','HTML задаёт содержимое. Нажмите кнопку и сравните: текст тот же, оформление другое.');
  }
  function counter() {
    let n=0;
    scene.innerHTML='<div class="shop"><div class="ticket"><span class="ticket-icon" aria-hidden="true">🎟</span><strong>Билет на выставку</strong><div>250 ₽</div></div><div class="basket"><small>В корзине</small><b class="big-number" id="amount">0</b><span>билетов</span><p class="receipt" id="sum">0 ₽</p></div></div>';
    const amount=scene.querySelector('#amount'),sum=scene.querySelector('#sum');
    const button=action('Добавить билет',()=>{n=n>=9?0:n+1;amount.textContent=n;sum.textContent=n*250+' ₽';button.textContent=n>=9?'Очистить корзину':'Добавить билет';animate(amount,[{transform:'translateY(-12px) scale(.8)'},{transform:'translateY(0) scale(1)'}]);sparkle(amount);show(profile.scene==='counter'&&/C#/.test(profile.title)?`tickets = ${n};\ntotal = tickets * 250;`:`count = ${n}\ntotal = count * 250`,n?`Билетов: ${n}. Сумма: ${n} × 250 = ${n*250} ₽. Изменились данные и то, что мы видим на странице.`:'Корзина снова пуста. Значения вернулись к нулю.');});
    show('count = 0\ntotal = 0','Один билет стоит 250 ₽. Что должно измениться после добавления?');
  }
  function query() {
    const products=[['🍎','Яблоки',90],['🍞','Хлеб',60],['🧀','Сыр',250],['🍓','Клубника',180]];
    scene.innerHTML='<div class="query-board">'+products.map(([icon,name,price])=>`<div class="product"><span aria-hidden="true">${icon}</span><b>${name}</b><div class="price">${price} ₽</div></div>`).join('')+'</div>';
    function update(limit){let names=[];scene.querySelectorAll('.product').forEach((el,i)=>{const match=products[i][2]<=limit;el.dataset.match=match;if(match)names.push(products[i][1]);});show(id===290330?`products.Where(p => p.Price <= ${limit})`:`SELECT name FROM products\nWHERE price <= ${limit};`,names.length?'В результате: '+names.join(', ')+'. Остальные записи не удалились, они просто не подошли под условие.':'Ничего не подошло. Это пустой результат, а не ошибка.');}
    range('Цена до, ₽',0,300,150,update);update(150);
  }
  function search() {
    let step=0;const states=[[1,16,0],[9,16,8],[9,11,12],[11,11,10],[11,11,11]];
    scene.innerHTML='<div class="search-board">'+Array.from({length:16},(_,i)=>`<span class="number-cell">${i+1}</span>`).join('')+'</div>';
    const button=action('Проверить середину',()=>{step=(step+1)%states.length;const [low,high,mid]=states[step];scene.querySelectorAll('.number-cell').forEach((el,i)=>{el.dataset.out=i+1<low||i+1>high;el.dataset.check=i+1===mid;el.dataset.found=step===4&&i+1===11;});button.textContent=step===4?'Ещё раз':'Проверить середину';if(step===4)sparkle(scene.querySelectorAll('.number-cell')[10]);show(step?`Ищем 11. Проверяем ${mid}.`:'Ищем число 11 среди чисел от 1 до 16.',[
      'Можно проверить всё подряд. А можно начать с середины.',
      '11 больше 8. Числа от 1 до 8 больше не рассматриваем.',
      '11 меньше 12. Числа от 12 до 16 тоже можно отбросить.',
      '11 больше 10. Остался один вариант.',
      'Нашли 11 за четыре проверки. Отсортированный список позволял каждый раз убирать половину вариантов.'
    ][step]);});show('Ищем число 11 среди чисел от 1 до 16.','Нажмите кнопку. После каждой проверки часть вариантов отпадёт.');
  }
  function types() {
    let valid=false;
    scene.innerHTML='<div class="type-board"><div class="type-value"><small>Получили</small><b id="type-value">"42"</b><small id="type-name">string</small></div><div class="type-slot" data-valid="false"><small>Ожидаем</small><b>number</b><small id="type-result">Типы не совпали</small></div></div>';
    const button=action('Передать число 42',()=>{valid=!valid;scene.querySelector('#type-value').textContent=valid?'42':'"42"';scene.querySelector('#type-name').textContent=valid?'number':'string';scene.querySelector('.type-slot').dataset.valid=valid;scene.querySelector('#type-result').textContent=valid?'Типы совпали':'Типы не совпали';button.textContent=valid?'Передать строку "42"':'Передать число 42';show(valid?'const price: number = 42;':'const price: number = "42";',valid?'Число подходит. Но совпадение типов не гарантирует, что вся программа верна.':'Здесь ожидается число, а передана строка. TypeScript сообщает о несоответствии.');});show('const price: number = "42";','Кавычки имеют значение. Посмотрите, что изменится, если передать число.');
  }
  function database() {
    let saved=false;
    scene.innerHTML='<div class="db-board"><div class="object"><small>Объект в программе</small><b>Казань</b><span>Name</span></div><table class="db-table"><thead><tr><th>Id</th><th>Город</th></tr></thead><tbody><tr><td colspan="2">Пока нет записи</td></tr></tbody></table></div>';
    const button=action('Сохранить запись',()=>{saved=!saved;scene.querySelector('tbody').innerHTML=saved?'<tr><td>1</td><td>Казань</td></tr>':'<tr><td colspan="2">Пока нет записи</td></tr>';animate(scene.querySelector('tbody'),[{opacity:0,transform:'translateY(-15px)'},{opacity:1,transform:'translateY(0)'}]);button.textContent=saved?'Вернуть пример к началу':'Сохранить запись';show(saved?'context.Cities.Add(city);\ncontext.SaveChanges();':'var city = new City { Name = "Казань" };',saved?'Теперь в таблице есть запись. В настоящем приложении эти команды выполняет EF Core. Здесь показана связь между объектом и строкой таблицы.':'Создан объект в памяти. Само по себе это ещё не запись в базу данных.');});show('var city = new City { Name = "Казань" };','Слева объект, справа таблица. Нажмите кнопку и проследите, что куда попадёт.');
  }
  function prompt() {
    let detailed=false;
    const simple='Придумай идею бота.',good='Предложи 3 идеи бота для кофейни. Для каждой укажи задачу посетителя и способ проверить спрос без разработки.';
    scene.innerHTML='<div class="prompt-board"><div class="note"><h3>Запрос</h3><p id="prompt-text"></p></div><div class="note good"><h3>Что теперь понятно</h3><p id="prompt-context"></p></div></div>';
    function update(){scene.querySelector('#prompt-text').textContent=detailed?good:simple;scene.querySelector('#prompt-context').textContent=detailed?'Для кого: кофейня. Что нужно: 3 идеи. Как оформить: задача и проверка спроса.':'Непонятно, кому нужен бот и какую задачу он решает.';show(detailed?'Задача + контекст + формат':'Только общая задача',detailed?'Такой запрос точнее задаёт рамки. Но ответ всё равно нужно проверять. Это пример составления запроса, не ответ ИИ.':'Прежде чем отправлять запрос, подумайте: чего в нём не хватает?');}
    const button=action('Уточнить запрос',()=>{detailed=!detailed;button.textContent=detailed?'Показать общий запрос':'Уточнить запрос';update();animate(scene.querySelector('.good'),[{transform:'scale(.94)'},{transform:'scale(1)'}]);});update();
  }
  function german() {
    let step=0;const phrases=[['☀️','Guten Morgen!','Доброе утро!','Утром'],['👋','Hallo!','Привет!','Неформальное приветствие'],['🌙','Guten Abend!','Добрый вечер!','Вечером']];
    scene.innerHTML='<div class="phrase-board"><span class="sun" aria-hidden="true"></span><strong></strong><p></p><small></small><div class="step-dots" aria-hidden="true"><i></i><i></i><i></i></div></div>';
    function update(){let [icon,phrase,translation,when]=phrases[step];scene.querySelector('.sun').textContent=icon;scene.querySelector('strong').textContent=phrase;scene.querySelector('.phrase-board p').textContent=translation;scene.querySelector('small').textContent=when;scene.querySelectorAll('.step-dots i').forEach((el,i)=>el.classList.toggle('active',i===step));show(phrase,'Произнесите фразу вслух. В другой ситуации приветствие может измениться.');animate(scene.querySelector('strong'),[{transform:'translateY(12px)',opacity:0},{transform:'translateY(0)',opacity:1}]);}
    action('Другая ситуация',()=>{step=(step+1)%phrases.length;update();});update();
  }
  function journey() {
    const ural=profile.scene==='ural', stops=ural?['Пермь','Кунгур','Екатеринбург','Миасс']:['Калининград','Москва','Нижний Новгород','Казань'];let current=0;
    const track=compact?'M65 110 C150 110 115 190 215 190 S310 190 340 133':'M85 195 C230 195 220 126 338 126 S510 195 710 155';
    const width=compact?400:800;
    const artwork=`<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#b7e4ff"/><stop offset="1" stop-color="#f3fcff"/></linearGradient></defs><rect width="${width}" height="280" fill="url(#sky)"/><circle cx="${width-52}" cy="48" r="29" fill="#ffce5c"/><path d="M0 208 Q130 140 270 195 T540 190 T800 165 V280 H0Z" fill="#8cd9ac"/><path id="route" d="${track}" fill="none" stroke="#7687a1" stroke-width="10"/><path d="${track}" fill="none" stroke="#f6fbff" stroke-width="5" stroke-dasharray="3 9"/><g id="route-stops"></g><g id="train"><rect x="-33" y="-34" width="68" height="29" rx="8" fill="#f07742"/><rect x="-22" y="-29" width="15" height="12" rx="3" fill="#d9faff"/><rect x="1" y="-29" width="15" height="12" rx="3" fill="#d9faff"/><circle cx="-18" cy="-3" r="7" fill="#203957"/><circle cx="20" cy="-3" r="7" fill="#203957"/></g>`;
    scene.innerHTML=svg(artwork,artwork);
    const route=scene.querySelector('#route'),train=scene.querySelector('#train'),length=route.getTotalLength();const points=[0,.32,.66,1];let at=0;
    scene.querySelector('#route-stops').innerHTML=points.map((t,i)=>{const p=route.getPointAtLength(length*t);return `<circle cx="${p.x}" cy="${p.y}" r="8" fill="#6542cc" stroke="white" stroke-width="3"/>${!compact||i===0||i===3?text(p.x,p.y+36,stops[i],'font-size="16"'):''}`;}).join('');
    function place(t){let p=route.getPointAtLength(length*t),q=route.getPointAtLength(Math.min(length,length*t+2)),angle=Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI;if(t===1)angle=0;train.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${angle})`);}
    function move(to){const from=at;at=to;if(reduced){place(to);return;}let start;const tick=now=>{if(!start)start=now;let t=Math.min(1,(now-start)/900);place(from+(to-from)*(1-(1-t)**3));if(t<1)frame=requestAnimationFrame(tick);};cancelAnimationFrame(frame);frame=requestAnimationFrame(tick);}
    let frame=0;place(0);const button=action('К следующей остановке',()=>{current=(current+1)%4;move(points[current]);button.textContent=current===3?'Начать маршрут снова':'К следующей остановке';show(`city = "${stops[current]}"`,current===3?'Впереди не только названия городов. В уроках будем работать с записями, расходами и поиском.':'Город изменился. Программа может хранить такие данные и использовать их в расчётах.');});show(`city = "${stops[0]}"`,'Нажмите кнопку. Это несколько остановок из путешествия, а не вся программа курса.');addEventListener('pagehide',()=>cancelAnimationFrame(frame),{once:true});
  }
  function budget() {
    let tickets=2;
    const receipt=(x,w)=>`<rect x="${x}" y="50" width="${w}" height="175" rx="18" fill="white" stroke="#b7c7e4" stroke-width="3"/>${text(x+w/2,89,'Расходы')}<text id="budget-total" x="${x+w/2}" y="156" text-anchor="middle" font-family="system-ui" font-size="${compact?32:44}" font-weight="800" fill="#5d3ac9">500 ₽</text>`;
    scene.innerHTML=svg(`<rect width="800" height="280" fill="#f2f8ff"/><path d="M0 240 Q130 175 270 225 T530 210 T800 220 V280 H0Z" fill="#d0e9d7"/><rect x="105" y="77" width="245" height="130" rx="20" fill="#ffce5c" transform="rotate(-5 225 140)"/><path d="M150 89 V200 M305 77 V195" stroke="#dda232" stroke-dasharray="5 7" stroke-width="3"/>${text(228,137,'Билет')}${text(228,172,'250 ₽','font-size="30"')}${receipt(450,225)}`,`<rect width="400" height="280" fill="#eaf5ff"/><path d="M0 240 Q90 190 180 225 T400 220 V280 H0Z" fill="#b9e5ca"/><rect x="22" y="84" width="155" height="120" rx="18" fill="#ffce5c" transform="rotate(-5 95 140)"/>${text(100,130,'Билет')}${text(100,170,'250 ₽','font-size="30"')}${receipt(211,165)}`);
    range('Билетов',0,6,tickets,n=>{tickets=n;scene.querySelector('#budget-total').textContent=n*250+' ₽';show(`tickets = ${n}\ntotal = tickets * 250`,n?`${n} × 250 = ${n*250}. Изменилось количество, программа пересчитала расход.`:'Билетов нет, расход равен нулю. Ноль тоже полезно проверить.');});show('tickets = 2\ntotal = tickets * 250','Передвиньте ползунок. Как меняется сумма, если билетов становится больше?');
  }
  function git() {
    let step=0;
    const width=compact?400:800,positions=compact?[55,130,285,350]:[100,270,635,700];
    const artwork=`<rect width="${width}" height="280" fill="#fff6e9"/><path d="M${positions[0]} 100 H${positions[3]}" stroke="#7284a4" stroke-width="9" stroke-linecap="round"/><path id="branch-line" d="${compact?'M130 100 C170 100 140 200 195 200 H250 Q285 200 285 100':'M270 100 C325 100 310 200 380 200 H550 Q615 200 635 100'}" fill="none" stroke="#9a6ce3" stroke-width="8" stroke-dasharray="700" stroke-dashoffset="700"/>${positions.map((x,i)=>`<circle cx="${x}" cy="100" r="15" fill="${i===0?'#4079d5':'#d7dfed'}" id="commit-${i}"/>`).join('')}<circle id="feature" cx="${compact?220:440}" cy="200" r="16" fill="#e9d6ff"/>${text(compact?60:116,60,'main')}${text(compact?220:450,249,'Новый заголовок')}${text(compact?65:115,150,'Версия 1','font-size="16"')}${text(compact?335:685,150,'Версия 2','font-size="16"')}`;
    scene.innerHTML=svg(artwork,artwork);
    scene.querySelector('#branch-line')?.setAttribute('pathLength','700');
    const labels=['Создать ветку','Сохранить изменение','Соединить изменения','Ещё раз'];
    const samples=['git switch -c new-header','git commit -m "Update header"','git switch main\ngit merge new-header','История сохранена'];
    const messages=['Для новой работы появилась отдельная ветка. Основная пока не менялась.','В ветке сохранено изменение заголовка. Это отдельная запись в истории.','В этом примере ветки соединились без конфликта. Изменение вошло в main.','После объединения записи истории остаются. Нажмите, чтобы посмотреть ещё раз.'];
    const button=action(labels[0],()=>{if(step===3){step=0;scene.querySelector('#branch-line').style.strokeDashoffset=700;scene.querySelector('#feature').setAttribute('fill','#e9d6ff');scene.querySelector('#commit-2').setAttribute('fill','#d7dfed');show('main: исходная версия','Есть рабочая версия. Посмотрим, как внести изменение отдельно от неё.');button.textContent=labels[0];return;}scene.querySelector('#branch-line').style.strokeDashoffset=step===0?350:0;scene.querySelector('#branch-line').style.transition=reduced?'none':'stroke-dashoffset .7s ease';if(step>=1)scene.querySelector('#feature').setAttribute('fill','#8753d4');if(step>=2)scene.querySelector('#commit-2').setAttribute('fill','#27a47a');show(samples[step],messages[step]);step++;button.textContent=labels[step];});show('main: исходная версия','Сначала есть одна рабочая версия. Нажмите кнопку, чтобы начать изменение в отдельной ветке.');
  }
  function docker() {
    let started=false;
    const services=[['Приложение','#7550cc'],['База данных','#9b6615'],['Веб-сервер','#167a68']];
    const boxes=services.map(([label,color],i)=>{const x=compact?90:175+i*167,y=compact?38+i*58:105,w=compact?220:145,h=compact?52:105;return `<g class="container-box"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${color}"/>${[0,1,2,3].map(n=>`<path d="M${x+23+n*30} ${y+8} V${y+h-8}" stroke="white" opacity=".14" stroke-width="3"/>`).join('')}<circle id="container-light-${i}" cx="${x+w-18}" cy="${y+15}" r="6" fill="#553d6c"/>${text(x+w/2,compact?y+34:170,label,'font-size="17" fill="white"')}</g>`;}).join('');
    const width=compact?400:800;
    const artwork=`<defs><linearGradient id="dock-sky" x2="0" y2="1"><stop stop-color="#ceefff"/><stop offset="1" stop-color="#f4fcff"/></linearGradient></defs><rect width="${width}" height="280" fill="url(#dock-sky)"/><path d="M0 238 Q90 220 180 238 T360 238 T540 238 T800 238 V280 H0Z" fill="#3ca9ce"/><path d="M${compact?50:100} 212 H${width-(compact?50:100)} L${width-(compact?85:150)} 248 H${compact?85:150}Z" fill="#244b70"/>${boxes}`;
    scene.innerHTML=svg(artwork,artwork);
    const button=action('Запустить окружение',()=>{started=!started;scene.querySelectorAll('.container-box').forEach((el,i)=>{scene.querySelector('#container-light-'+i).setAttribute('fill',started?'#c5ff7d':'#553d6c');animate(el,[{transform:'translateY(-35px)',opacity:.5},{transform:'translateY(0)',opacity:1}],{delay:i*100});});button.textContent=started?'Остановить пример':'Запустить окружение';show(started?'docker compose up -d':'docker compose stop',started?'В этой модели запущены три сервиса. Они связаны настройками окружения. В уроках разберём, что такое образ, контейнер и Compose.':'Сервисы остановлены. Это иллюстрация запуска, а не Docker внутри браузера.');});show('Приложение + база данных + веб-сервер','У каждого сервиса своё окружение. Нажмите кнопку и посмотрите на запуск всей группы.');
  }
  function request() {
    let route='/catalog';
    const width=compact?400:800,bx=compact?17:70,bw=compact?130:210,sx=compact?252:535,sw=compact?132:180,from=compact?174:320,to=compact?230:490;
    const artwork=`<rect width="${width}" height="280" fill="#eaf7ff"/><rect x="${bx}" y="65" width="${bw}" height="145" rx="16" fill="white" stroke="#849ad0" stroke-width="4"/><rect x="${bx}" y="65" width="${bw}" height="29" rx="12" fill="#dbe5ff"/>${text(bx+bw/2,138,'Браузер')}${text(bx+bw/2,174,'/catalog','id="url-text" font-size="18"')}<path d="M${from} 140 H${to}" stroke="#949bc0" stroke-dasharray="6 9" stroke-width="4"/><rect x="${sx}" y="58" width="${sw}" height="160" rx="20" fill="#6248c8"/>${text(sx+sw/2,110,'Сервер','fill="white"')}<rect x="${sx+8}" y="133" width="${sw-16}" height="55" rx="10" fill="#d5c6ff"/>${text(sx+sw/2,168,'Ждём запрос','id="response-text" font-size="13"')}<g id="packet"><rect x="-20" y="-14" width="40" height="28" rx="6" fill="#ffbd54"/><path d="M-15 -8 L0 4 L15 -8" fill="none" stroke="#8a531c" stroke-width="3"/></g>`;
    scene.innerHTML=svg(artwork,artwork);
    const packet=scene.querySelector('#packet');packet.style.transform=`translate(${from}px,140px)`;
    const button=action('Отправить запрос',()=>{const good=route==='/catalog';scene.querySelector('#url-text').textContent=route;scene.querySelector('#response-text').textContent=good?'200 · Каталог':'404 · Нет страницы';animate(packet,[{transform:`translate(${from}px,140px)`},{transform:`translate(${to}px,140px)`,offset:.5},{transform:`translate(${from}px,140px)`}],{duration:900});show(`GET ${route}\n${good?'200 OK':'404 Not Found'}`,good?'Адрес найден. Сервер вернул каталог. Следующее нажатие покажет запрос к неизвестному адресу.':'Такого адреса в нашем примере нет. Сервер вернул 404, а не страницу каталога.');route=good?'/unknown':'/catalog';button.textContent=good?'Проверить другой адрес':'Открыть каталог';});show('GET /catalog','Запрос содержит адрес. По нему сервер определяет, что нужно сделать. Здесь показан упрощённый обмен.');
  }
  function fullstack() {
    let step=0;const labels=['Браузер','Сервер','База данных','Ответ'];
    const positions=compact?[[25,45],[225,45],[225,165],[25,165]]:labels.map((_,i)=>[40+i*192,90]);
    const artwork=`<rect width="${compact?400:800}" height="280" fill="#f4edff"/><path d="${compact?'M100 85 H300 V205 H100':'M130 140 H680'}" fill="none" stroke="#c2b1eb" stroke-width="8"/>${labels.map((label,i)=>{let [x,y]=positions[i];return `<g id="node-${i}"><rect x="${x}" y="${y}" width="145" height="${compact?75:110}" rx="20" fill="${['#7252cb','#b77a18','#168575','#3672b9'][i]}"/>${text(x+72,y+(compact?45:60),label,'fill="white" font-size="17"')}</g>`;}).join('')}<circle id="signal" cx="0" cy="0" r="9" fill="#ff8b4c" stroke="white" stroke-width="3"/>`;
    scene.innerHTML=svg(artwork,artwork);
    const coords=i=>`translate(${positions[i][0]+72}px,${positions[i][1]-14}px)`;scene.querySelector('#signal').style.transform=coords(0);
    const button=action('Передать запрос',()=>{const previous=step;step=(step+1)%4;const signal=scene.querySelector('#signal');signal.style.transform=coords(step);animate(signal,[{transform:coords(previous)},{transform:coords(step)}]);const messages=['Пользователь снова видит страницу. Можно начать новый запрос.','Сервер получил запрос и определяет, какие данные нужны.','Из базы получили записи. Теперь сервер может подготовить ответ.','Ответ вернулся в браузер. Он показывает результат пользователю.'];show(labels[step],messages[step]);button.textContent=['Передать запрос','Получить данные','Вернуть ответ','Ещё раз'][step];});show('Браузер → сервер → данные → ответ','Пройдите весь путь запроса. В курсе у каждой части будут свои объяснения и практика.');
  }
  function strategy() {
    let kind=0;const names=['Велосипед','Автомобиль','Поезд'],icons=['🚲','🚙','🚆'];
    const width=compact?400:800,house=compact?285:620,vehicle=compact?65:145,distance=compact?160:390;
    const artwork=`<rect width="${width}" height="280" fill="#ecf9ed"/><path d="M0 225 Q230 165 420 212 T800 200 V280 H0Z" fill="#bce5bc"/><path d="M35 200 H${width-35}" stroke="#8b9eb0" stroke-width="8" stroke-linecap="round"/><rect x="${house}" y="94" width="90" height="105" rx="12" fill="#e8b773"/><path d="M${house-8} 98 L${house+45} 53 L${house+98} 98Z" fill="#bd6b77"/>${text(house+45,160,'Заказ')}<text id="vehicle" x="${vehicle}" y="190" font-size="70" text-anchor="middle">🚲</text>${text(compact?130:220,65,'Доставка','id="strategy-label"')}`;
    scene.innerHTML=svg(artwork,artwork);
    const button=action('Поручить доставку',()=>{scene.querySelector('#vehicle').textContent=icons[kind];scene.querySelector('#strategy-label').textContent=names[kind];animate(scene.querySelector('#vehicle'),[{transform:'translateX(0)'},{transform:`translateX(${distance}px)`}],{duration:1100});show(`delivery.Deliver(order);\n// ${names[kind]}`,'Заказ и действие те же. Меняется исполнитель и то, как именно он доставляет заказ. Это идея, к которой вернёмся при изучении стратегий.');kind=(kind+1)%3;button.textContent='Другой исполнитель';});show('delivery.Deliver(order);','Как заменить способ доставки, не переписывая весь процесс заказа? Посмотрим на саму идею.');
  }
  function station() {
    let repaired=false;
    const width=compact?400:800,cx=width/2,panels=compact?[48,285]:[188,536],panelWidth=compact?67:67;
    const artwork=`<defs><radialGradient id="space"><stop stop-color="#24316d"/><stop offset="1" stop-color="#101a36"/></radialGradient></defs><rect width="${width}" height="280" fill="url(#space)"/>${[[40,60],[120,170],[240,39],[420,55],[690,41],[749,187],[531,219],[280,245]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2" fill="#a2e9ed"/>`).join('')}<circle cx="${width-72}" cy="205" r="67" fill="#427f9d"/><g id="station"><path d="M${panels[0]} 141 H${panels[1]+panelWidth}" stroke="#a2b8dc" stroke-width="14"/>${panels.map(x=>`<rect x="${x}" y="86" width="${panelWidth}" height="110" rx="5" fill="#447ed3" stroke="#91beff" stroke-width="3"/>${[1,2,3].map(n=>`<path d="M${x+n*16} 87 V194" stroke="#9ec8ff" opacity=".6"/>`).join('')}`).join('')}<rect x="${cx-70}" y="105" width="140" height="75" rx="30" fill="#e3edff"/><circle id="station-light" cx="${cx}" cy="141" r="14" fill="#ffa648"/><path d="M${cx-45} 112 V171 M${cx+45} 112 V171" stroke="#93a9cf" stroke-width="4"/></g>${text(cx,245,'GREEN-01','fill="#c5e6ff" font-size="20"')}`;
    scene.innerHTML=svg(artwork,artwork);
    const button=action('Проверить и починить модуль',()=>{repaired=!repaired;scene.querySelector('#station-light').setAttribute('fill',repaired?'#71f8c5':'#ffa648');sparkle(scene.querySelector('#station-light'));animate(scene.querySelector('#station'),[{transform:'translateY(0)'},{transform:'translateY(-6px)',offset:.5},{transform:'translateY(0)'}]);button.textContent=repaired?'Вернуть учебный сбой':'Проверить и починить модуль';show(repaired?'Energy: 82%\nModule: READY':'Energy: 82%\nModule: CHECK',repaired?'Учебный модуль снова готов. В курсе вы напишете команды диагностики и ремонта в своём пульте.':'Модуль требует проверки. Реальные системы станции не затронуты, это учебная модель.');});show('Energy: 82%\nModule: CHECK','На пульте один модуль требует проверки. Попробуйте изменить его состояние.');
  }
  const scenes={web,webjs:web,html:web,counter,query,search,types,database,prompt,german,journey,ural:journey,budget,git,docker,request,fullstack,strategy,station};
  scenes[profile.scene]?.();
  addEventListener('pagehide',()=>{animations.forEach(a=>a.cancel());animations.clear();},{once:true});
})();
