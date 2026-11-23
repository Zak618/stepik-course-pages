import {tables,quizzes} from './demo-data.mjs';
const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function animate(element,frames,options={}){if(motion&&element?.animate)element.animate(frames,{duration:420,easing:'cubic-bezier(.2,.8,.2,1)',...options});}
const intro=document.querySelector('[data-demo=intro]');
if(intro){
 intro.querySelector('[data-intro-run]').addEventListener('click',event=>{
  const result=intro.querySelector('.intro-result');result.hidden=false;
  result.querySelector('[data-missing-row]').hidden=false;
  intro.classList.remove('is-reading');void intro.offsetWidth;intro.classList.add('is-reading');
  result.querySelectorAll('tbody tr').forEach((row,index)=>animate(row,[{opacity:0,transform:'translateX(-20px)'},{opacity:1,transform:'translateX(0)'}],{delay:index*65}));
  intro.querySelector('.demo-status').textContent='3 клиента. Вера на месте.';
  event.currentTarget.textContent='Проверить ещё раз';
 });
}
const cells=document.querySelector('[data-demo=cells]');
if(cells){
 const selectCell=(r,c)=>{
  cells.querySelectorAll('td').forEach(td=>{td.classList.toggle('is-column',Number(td.dataset.col)===c);td.classList.remove('is-cell');});
  cells.querySelectorAll('tbody tr').forEach(tr=>tr.classList.toggle('is-source',Number(tr.dataset.row)===r));
  const button=cells.querySelector(`[data-cell="${r},${c}"]`);button.parentElement.classList.add('is-cell');
  cells.querySelectorAll('[data-cell]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  cells.querySelector('[data-selected-product]').textContent=tables.products.rows[r][1];
  cells.querySelector('[data-selected-column]').textContent=tables.products.columns[c];
  cells.querySelector('[data-selected-value]').textContent=tables.products.rows[r][c];
 };
 cells.querySelectorAll('[data-cell]').forEach(button=>button.addEventListener('click',()=>selectCell(...button.dataset.cell.split(',').map(Number))));selectCell(0,2);
}
const types=document.querySelector('[data-demo=types]');
if(types){
 const examples={price:['price','DECIMAL(10, 2)','18990.00','2 цифры после точки.'],stock:['stock','INT','7','Целое число штук.'],phone:['phone','VARCHAR(20)','0071234567','Нули сохранены.'],date:['created_on','DATE','2026-11-23','Год, месяц, день.']};
 types.querySelectorAll('[data-type]').forEach(button=>button.addEventListener('click',()=>{
  types.querySelectorAll('[data-type]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  const [column,name,value,detail]=examples[button.dataset.type];
  for(const [selector,text] of [['[data-type-column]',column],['[data-type-name]',name],['[data-type-value]',value],['[data-type-detail]',detail]])types.querySelector(selector).textContent=text;
  types.querySelector('.type-stage').setAttribute('aria-live','polite');
  animate(types.querySelector('.type-value'),[{opacity:.25,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}]);
 }));
}
const relations=document.querySelector('[data-demo=relations]');
if(relations){
 function selectOrder(id){
  const order=tables.orders.rows.find(row=>row[0]===id),customer=tables.customers.rows.find(row=>row[0]===order[1]);
  relations.querySelectorAll('[data-table]').forEach(table=>table.querySelectorAll('tbody tr').forEach(tr=>{
   const matched=Number(tr.dataset.record)===(table.dataset.table==='orders'?id:customer[0]);
   tr.classList.toggle('is-matched',matched);tr.classList.toggle('is-other',!matched);
  }));
  relations.querySelectorAll('[data-order]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.order)===id)));
  relations.querySelector('[data-link-id]').textContent=customer[0];relations.querySelector('[data-customer-id]').textContent=customer[0];
  relations.querySelector('[data-relation-detail]').textContent=`Заказ ${id} · ${customer[1]} · id ${customer[0]}`;
  animate(relations.querySelector('.relation-path'),[{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}]);
 }
 relations.querySelectorAll('[data-order]').forEach(button=>button.addEventListener('click',()=>selectOrder(Number(button.dataset.order))));selectOrder(501);
}
const select=document.querySelector('[data-demo=select]');
if(select){
 select.querySelector('[data-select-run]').addEventListener('click',event=>{
  const result=select.querySelector('.query-result');result.hidden=false;
  select.querySelector('[data-result-caption]').textContent='Результат';
  result.querySelectorAll('tbody tr').forEach((row,index)=>{row.style.animation='none';void row.offsetWidth;row.style.animation='';animate(row,[{opacity:0,transform:'translateX(-20px)'},{opacity:1,transform:'translateX(0)'}],{delay:index*80});});
  select.querySelector('.demo-status').textContent='4 строки. Исходная таблица не изменилась.';
  event.currentTarget.textContent='Показать ещё раз';
 });
}
const errors=document.querySelector('[data-demo=errors]');
if(errors){
 const examples={from:['SELECT * products;','Ошибка в записи команды','Не хватает FROM.'],table:['SELECT * FROM product;','Таблица не найдена','Нужно products, а не product.'],correct:['SELECT * FROM products;','Запрос корректен','Все строки и столбцы products.']};
 errors.querySelector('[data-error-kind]').addEventListener('change',event=>{
  const [query,label,detail]=examples[event.target.value];errors.querySelector('[data-error-code]').textContent=query;errors.querySelector('[data-error-label]').textContent=label;errors.querySelector('[data-error-detail]').textContent=detail;errors.querySelector('.error-explanation').classList.toggle('is-correct',event.target.value==='correct');
 });
}
const order=document.querySelector('[data-demo=order]');
if(order){
 let reversed=false;
 order.querySelector('[data-reorder]').addEventListener('click',()=>{
  const body=order.querySelector('tbody'),rows=[...body.rows],positions=new Map(rows.map(row=>[row,row.getBoundingClientRect().top]));
  rows.reverse().forEach(row=>body.append(row));reversed=!reversed;
  rows.forEach(row=>animate(row,[{transform:`translateY(${positions.get(row)-row.getBoundingClientRect().top}px)`},{transform:'translateY(0)'}]));
  order.querySelector('.demo-status').textContent=reversed?'Те же 4 товара. Другой порядок.':'4 товара. Порядок не задан.';
 });
}
document.querySelectorAll('.quiz').forEach(section=>{
 const quiz=quizzes.find(item=>item.id===section.dataset.task);
 section.querySelectorAll('[data-option]').forEach(button=>button.addEventListener('click',()=>{
  const correct=Number(button.dataset.option)===quiz.answer;
  section.querySelectorAll('[data-option]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  const feedback=section.querySelector('.quiz-feedback');feedback.classList.toggle('is-wrong',!correct);feedback.textContent=correct?'Верно. '+quiz.feedback:'Пока нет. '+quiz.feedback;
 }));
});
