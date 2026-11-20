const demo=document.querySelector('.demo');
const button=document.querySelector('#play');
const status=document.querySelector('#status');
const captions=['Как заказ проходит от сайта до базы данных?','Vue отправляет заказ на сервер.','Go проверяет товары и сумму заказа.','PostgreSQL сохраняет заказ.','Сайт показывает покупателю, что заказ принят.'];
let timers=[];
function stage(number){demo.dataset.stage=String(number);status.textContent=captions[number];if(number===4){button.disabled=false;button.textContent='Показать ещё раз';}}
button.addEventListener('click',()=>{timers.forEach(clearTimeout);timers=[];stage(0);button.disabled=true;button.textContent='Смотрим…';if(matchMedia('(prefers-reduced-motion: reduce)').matches){stage(4);return;}for(let number=1;number<=4;number++)timers.push(setTimeout(()=>stage(number),100+(number-1)*850));});
addEventListener('pagehide',()=>timers.forEach(clearTimeout));
addEventListener('pageshow',event=>{if(event.persisted){stage(0);button.disabled=false;button.textContent='Показать путь заказа';}});
