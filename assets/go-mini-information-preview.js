(() => {
  'use strict';
  const titles=['Буквы → данные','Бит: два состояния','Двоичные веса','Прочитайте число','Соберите запись','Один байт','Байты и биты','Unicode и UTF‑8','Данные и смысл','Go-шечка Find'];
  const frame=document.getElementById('lesson-frame');
  const list=document.getElementById('step-list');
  let observer, current=0;
  const path=n=>`go-mini-module-02-lesson-01-step-${String(n).padStart(2,'0')}.html`;
  list.innerHTML=titles.map((title,i)=>`<a class="step-link" href="#${String(i+1).padStart(2,'0')}"><span>${String(i+1).padStart(2,'0')}</span>${title}</a>`).join('');
  function show(){
    const parsed=Number(location.hash.slice(1));const number=Number.isInteger(parsed)&&parsed>=1&&parsed<=10?parsed:1;
    if(current===number)return;
    const isNavigation=current!==0;current=number;
    if(observer)observer.disconnect();
    frame.src=path(number);
    document.getElementById('current-step').textContent=`Шаг ${number} из 10`;
    document.getElementById('open-page').href=path(number);
    document.getElementById('previous').disabled=number===1;
    document.getElementById('next').disabled=number===10;
    document.getElementById('bottom-previous').disabled=number===1;
    document.getElementById('bottom-next').disabled=number===10;
    [...list.children].forEach((link,i)=>{if(i+1===number)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
    if(isNavigation)window.scrollTo({top:Math.max(0,document.querySelector('.preview-main').offsetTop-12),behavior:'auto'});
  }
  frame.addEventListener('load',()=>{
    if(observer)observer.disconnect();
    const main=frame.contentDocument?.querySelector('main');if(!main)return;
    const resize=()=>{frame.style.height=`${Math.max(400,Math.ceil(main.getBoundingClientRect().height+2))}px`;};
    observer=new ResizeObserver(resize);observer.observe(main);resize();
  });
  document.getElementById('previous').addEventListener('click',()=>{if(current>1)location.hash=String(current-1).padStart(2,'0');});
  document.getElementById('next').addEventListener('click',()=>{if(current<10)location.hash=String(current+1).padStart(2,'0');});
  document.getElementById('bottom-previous').addEventListener('click',()=>{if(current>1)location.hash=String(current-1).padStart(2,'0');});
  document.getElementById('bottom-next').addEventListener('click',()=>{if(current<10)location.hash=String(current+1).padStart(2,'0');});
  document.getElementById('phone').addEventListener('click',event=>{const enabled=event.currentTarget.getAttribute('aria-pressed')!=='true';event.currentTarget.setAttribute('aria-pressed',String(enabled));document.getElementById('frame-wrap').classList.toggle('phone',enabled);});
  addEventListener('hashchange',show);show();
})();
