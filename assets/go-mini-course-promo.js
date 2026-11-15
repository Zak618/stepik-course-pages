const form=document.querySelector('#search-form'),input=document.querySelector('#query');
const folders=[...document.querySelectorAll('.folder')],titles=folders.map(el=>el.querySelector('h2').textContent),status=document.querySelector('#search-status');
let animations=[];
function reset(){animations.forEach(a=>a.cancel());animations=[];folders.forEach((el,i)=>{el.classList.remove('is-match','is-miss');el.querySelector('h2').textContent=titles[i];});}
input.addEventListener('input',()=>{reset();status.textContent='Нажмите «Найти», чтобы проверить записи.';});
form.addEventListener('submit',event=>{
 event.preventDefault();reset();const query=input.value.trim();
 if(!query){status.textContent='Введите слово для поиска.';input.focus();return;}
 let count=0;
 folders.forEach((el,i)=>{
  const start=titles[i].indexOf(query),hit=start>=0;el.classList.add(hit?'is-match':'is-miss');
  if(hit){count++;const title=el.querySelector('h2'),mark=document.createElement('mark');mark.textContent=titles[i].slice(start,start+query.length);title.replaceChildren(document.createTextNode(titles[i].slice(0,start)),mark,document.createTextNode(titles[i].slice(start+query.length)));}
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const a=el.animate(hit?[{transform:'translateY(0)'},{transform:'translateY(-9px)',offset:.55},{transform:'translateY(0)'}]:[{transform:'translateX(0)'},{transform:'translateX(3px)',offset:.4},{transform:'translateX(0)'}],{duration:hit?550:300,delay:i*65,easing:'cubic-bezier(.2,.8,.3,1)'});animations.push(a);}
 });
 status.textContent=count?`Найдено записей: ${count}.`:'Совпадений нет. Попробуйте Go или Циклы.';
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches)animations.forEach(a=>a.finish());});
window.addEventListener('pagehide',reset);
