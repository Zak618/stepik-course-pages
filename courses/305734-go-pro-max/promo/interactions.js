(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visual = document.querySelector('.project-visual');
  if (visual) {
    const button = document.querySelector('#run-demo');
    const status = document.querySelector('#demo-status');
    const order = document.querySelector('#app-order-text');
    const request = document.querySelector('#server-request');
    const captions = ['Интерфейс, сервер и база работают вместе.','Vue передаёт заказ в Go.','Go проверяет данные заказа.','PostgreSQL сохраняет заказ.','Vue показывает покупателю результат.'];
    let timers = [];
    const stage = number => {
      visual.dataset.stage = String(number);
      status.textContent = captions[number];
      order.textContent = number===4 ? 'Заказ принят' : number===0 ? 'Заказ готов к отправке' : 'Оформляем заказ…';
      request.textContent = number===0 ? 'Запрос' : number===4 ? 'Готово' : 'В работе';
      if (number===4) {button.disabled=false;button.textContent='Показать ещё раз';}
    };
    button.addEventListener('click', () => {
      timers.forEach(clearTimeout);timers=[];
      button.disabled=true;button.textContent='Смотрим…';stage(0);
      if(reduced.matches){stage(4);return;}
      for(let number=1;number<=4;number++)timers.push(setTimeout(()=>stage(number),100+(number-1)*950));
    });
    addEventListener('pagehide',()=>timers.forEach(clearTimeout));
    addEventListener('pageshow',event=>{
      if(event.persisted){stage(0);button.disabled=false;button.textContent='Показать путь заказа';}
    });
  }
  for(const selector of ['.program-list','.faq-list']){
    const list=document.querySelector(selector);
    if(!list)continue;
    list.querySelectorAll('details').forEach(topic=>topic.addEventListener('toggle',()=>{
      if(topic.open)list.querySelectorAll('details').forEach(other=>{if(other!==topic)other.open=false;});
    }));
  }
  // Reserve only the tallest single answer, not a large fixed iframe tail.
  // Native Stepik cannot resize cross-origin frames after an accordion opens.
  if(document.body.classList.contains('embedded')){
    const reserve=()=>{
      for(const selector of ['.program-list','.faq-list']){
        const list=document.querySelector(selector),clone=list.cloneNode(true);
        clone.style.cssText='position:absolute;visibility:hidden;pointer-events:none;min-height:0;width:'+list.getBoundingClientRect().width+'px';
        document.body.append(clone);
        const items=[...clone.querySelectorAll('details')];let height=0;
        for(const current of items){items.forEach(item=>item.open=item===current);height=Math.max(height,clone.getBoundingClientRect().height);}
        list.style.minHeight=Math.ceil(height)+'px';clone.remove();
      }
      const status=document.querySelector('#demo-status');
      const clone=status.cloneNode(true);clone.removeAttribute('id');
      clone.style.cssText='position:absolute;visibility:hidden;min-height:0;width:'+status.getBoundingClientRect().width+'px';document.body.append(clone);
      let height=0;
      for(const text of ['Интерфейс, сервер и база работают вместе.','Vue передаёт заказ в Go.','Go проверяет данные заказа.','PostgreSQL сохраняет заказ.','Vue показывает покупателю результат.']){clone.textContent=text;height=Math.max(height,clone.getBoundingClientRect().height);}
      status.style.minHeight=Math.ceil(height)+'px';clone.remove();
    };
    reserve();let frame;
    addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(reserve);});
  }
})();
