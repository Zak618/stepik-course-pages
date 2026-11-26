import {variantForCourse} from '/shared/course-promotions/go-pro-max/offer.mjs';

const response=await fetch('/api/preview-courses');
const {courses}=await response.json();
const select=document.querySelector('#course');
for(const course of courses){const option=document.createElement('option');option.value=course.id;option.textContent=course.title;select.append(option);}
select.value='135466';
const frame=document.querySelector('#offer-frame');
let current='general';
function update(){
  current=variantForCourse(select.value);
  frame.src='/shared/course-promotions/go-pro-max/card.html?audience='+current;
  document.querySelectorAll('[data-variant]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.variant===current)));
  document.querySelector('#context').textContent=select.selectedOptions[0].textContent+' · Введение';
}
select.addEventListener('change',update);
document.querySelectorAll('[data-variant]').forEach(button=>button.addEventListener('click',()=>{select.value=button.dataset.variant==='go'?'305666':'135466';update();}));
document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelector('#frame-shell').classList.toggle('mobile',button.dataset.size==='mobile');
  document.querySelectorAll('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
}));
document.querySelector('#restart').addEventListener('click',()=>{frame.src='/shared/course-promotions/go-pro-max/card.html?audience='+current;});
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='go-max-offer:height')return;
  if(Number.isFinite(event.data.height)&&event.data.height>=240&&event.data.height<=650)frame.height=String(event.data.height);
});
update();
