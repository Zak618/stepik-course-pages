import {customers,orders,reorder,rename,selection,checkOrder} from './models.mjs';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function animate(node,keyframes,duration=380){if(reduced.matches)return;node.getAnimations().forEach(item=>item.cancel());node.animate(keyframes,{duration,easing:'cubic-bezier(.2,.7,.2,1)'});}
function setStatus(root,text,state=''){const target=root.querySelector('[data-status]');target.textContent=text;target.dataset.state=state;}
const identity=document.querySelector('[data-identity-lab]');
if(identity){
 let rows=customers.map(row=>({...row})),selected=11,alternate=false;
 const list=identity.querySelector('[data-people]'),input=identity.querySelector('input');
 function render(move=false){
  const before=new Map([...list.children].map(node=>[Number(node.dataset.id),node.getBoundingClientRect().top]));
  const sorted=reorder(rows,alternate);
  for(const [index,person]of sorted.entries()){
   let button=list.querySelector('[data-id="'+person.id+'"]');
   if(!button){button=document.createElement('button');button.type='button';button.className='identity-row';button.dataset.id=person.id;button.innerHTML='<span class="position"></span><span><span class="key-pill"></span></span><span class="person-name"></span>';button.addEventListener('click',()=>{selected=person.id;input.value=rows.find(row=>row.id===selected).name;render();});}
   button.setAttribute('aria-pressed',String(person.id===selected));button.setAttribute('aria-label','Выбрать клиента '+person.id+', '+person.name);button.title=person.name;
   button.querySelector('.position').textContent=index+1;button.querySelector('.key-pill').textContent=person.id;button.querySelector('.person-name').textContent=person.name||'Пустая строка';list.append(button);
  }
  identity.querySelector('[data-stable-key]').textContent=selected;
  if(move)for(const node of list.children){const offset=before.get(Number(node.dataset.id))-node.getBoundingClientRect().top;if(offset)animate(node,[{transform:'translateY('+offset+'px)'},{transform:'translateY(0)'}],550);}
  setStatus(identity,'Позиция '+(sorted.findIndex(person=>person.id===selected)+1)+'. id клиента '+selected+' не изменился.');
 }
 input.value=rows.find(row=>row.id===selected).name;
 input.addEventListener('input',()=>{rows=rename(rows,selected,input.value);render();});
 identity.querySelector('[data-reorder]').addEventListener('click',()=>{alternate=!alternate;render(true);});render();
}
const links=document.querySelector('[data-links-lab]');
if(links){
 let kind='customer',id=11;
 const board=links.querySelector('.link-board'),svg=links.querySelector('svg');
 function draw(){
  const current=selection(kind,id),rect=board.getBoundingClientRect();svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+rect.width+' '+rect.height);
  for(const order of current.orders){
   const left=board.querySelector('[data-order="'+order.id+'"]').getBoundingClientRect(),right=board.querySelector('[data-customer="'+current.person.id+'"]').getBoundingClientRect();
   const x1=left.right-rect.left-1,y1=left.top-rect.top+left.height/2,x2=right.left-rect.left+1,y2=right.top-rect.top+right.height/2,middle=(x1+x2)/2;
   for(const cls of ['relation-path','relation-flow']){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M '+x1+' '+y1+' C '+middle+' '+y1+', '+middle+' '+y2+', '+x2+' '+y2);path.setAttribute('class',cls);svg.append(path);}
  }
 }
 function update(){
  const current=selection(kind,id);
  links.querySelectorAll('[data-order]').forEach(button=>{const active=current.orders.some(order=>order.id===Number(button.dataset.order));button.classList.toggle('is-connected',active);button.setAttribute('aria-pressed',String(kind==='order'&&Number(button.dataset.order)===id));});
  links.querySelectorAll('[data-customer]').forEach(button=>{const active=Number(button.dataset.customer)===current.person?.id;button.setAttribute('aria-pressed',String(active));});
  links.querySelector('[data-link-count]').textContent=current.orders.length+' '+(current.orders.length===1?'заказ':current.orders.length?'заказа':'заказов');
  links.querySelector('[data-selected-person]').textContent=current.person.name+', id '+current.person.id;
  setStatus(links,current.orders.length?current.orders.map(order=>'Заказ '+order.id).join(', ')+'. customer_id '+current.person.id+'.':current.person.name+' есть в customers.');
  draw();animate(links.querySelector('.link-explanation'),[{opacity:.35,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}]);
 }
 links.querySelectorAll('[data-order]').forEach(button=>button.addEventListener('click',()=>{kind='order';id=Number(button.dataset.order);update();}));
 links.querySelectorAll('[data-customer]').forEach(button=>button.addEventListener('click',()=>{kind='customer';id=Number(button.dataset.customer);update();}));
 new ResizeObserver(draw).observe(board);update();
}
const rules=document.querySelector('[data-constraints-lab]');
if(rules){
 const form=rules.querySelector('form'),key=form.querySelector('[name=id]'),reference=form.querySelector('[name=customer_id]'),toggle=form.querySelector('[name=foreign_key]'),record=rules.querySelector('[data-candidate]');
 function preview(){record.querySelector('[data-candidate-id]').textContent=key.value||'NULL';record.querySelector('[data-candidate-customer]').textContent=reference.value||'NULL';delete record.dataset.state;delete record.dataset.result;setStatus(rules,'');}
 form.addEventListener('input',preview);form.addEventListener('change',preview);
 form.addEventListener('submit',event=>{event.preventDefault();const result=checkOrder({id:key.value,customer_id:reference.value},{foreignKey:toggle.checked});const state=!result.accepted?'bad':result.reason==='orphan'?'warn':'good';record.dataset.state=state;record.dataset.result=result.reason;setStatus(rules,result.message,state);animate(record,[{transform:'translateY(5px)',opacity:.5},{transform:'translateY(0)',opacity:1}]);});preview();
}
const form=document.querySelector('.question-form');
if(form){const quiz=JSON.parse(document.querySelector('#question-data').textContent),feedback=form.querySelector('.question-feedback');form.addEventListener('submit',event=>{event.preventDefault();const selected=new FormData(form).getAll('answer').map(Number).sort((a,b)=>a-b),correct=JSON.stringify(selected)===JSON.stringify(quiz.answers);feedback.textContent=selected.length?correct?quiz.feedback:quiz.hint:'Сначала выберите варианты.';feedback.dataset.correct=String(correct);form.dataset.correct=String(correct);});form.addEventListener('change',()=>{feedback.textContent='';form.removeAttribute('data-correct');});}
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
reduced.addEventListener('change',()=>{if(reduced.matches)document.getAnimations().forEach(animation=>animation.cancel());});
