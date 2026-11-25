const project=document.querySelector('.project-demo');
if(project){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const ui=project.querySelector('[data-ui-state]'),api=project.querySelector('[data-api-state]'),db=project.querySelector('[data-db-state]'),result=project.querySelector('[data-result]'),http=project.querySelector('[data-http]');
 const states=[
  ['Отправляет','Запрос','Ожидает','Vue отправляет заказ','POST /orders'],
  ['Ожидает','Проверяет','Ожидает','Go проверяет данные','POST /orders'],
  ['Ожидает','Сохраняет','1 заказ','PostgreSQL сохраняет заказ','INSERT INTO orders'],
  ['В истории','Готов','1 заказ','Заказ появился в истории','201 Created'],
 ];
 let stage=0,timer,started=false,visible=false,stopped=false;
 function render(next){stage=next;project.dataset.stage=String(stage);project.dataset.outcome=stage===4?'success':'pending';[ui.textContent,api.textContent,db.textContent,result.textContent,http.textContent]=states[stage-1];}
 function schedule(){clearTimeout(timer);if(stopped||!started||!visible||document.hidden||stage===4)return;timer=setTimeout(()=>{render(stage+1);schedule();},1400);}
 function begin(){if(!started){started=true;render(1);}schedule();}
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)begin();else clearTimeout(timer);},{threshold:.25});
 function motion(){if(reduced.matches){clearTimeout(timer);started=true;render(4);}else if(visible)begin();}
 observer.observe(project);motion();
 reduced.addEventListener('change',motion);
 document.addEventListener('visibilitychange',schedule);
 addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);observer.disconnect();reduced.removeEventListener('change',motion);document.removeEventListener('visibilitychange',schedule);},{once:true});
}
