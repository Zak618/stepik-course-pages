import {traces} from './fixtures.mjs';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const lab=document.querySelector('[data-error-lab]');
if(lab){
 const kind=lab.dataset.errorLab,states=kind==='syntax'?[traces.syntax,traces.ready]:[traces.double,traces.table,traces.ready];let index=0;
 const button=lab.querySelector('button'),from=lab.querySelector('[data-from]'),table=lab.querySelector('[data-table]'),message=lab.querySelector('.mysql-message');
 function render(){
  const state=states[index],hasFrom=state.sql.includes('FROM'),ready=state.executed,tableName=state.sql.includes('products')?'products':'product';
  lab.dataset.state=ready?'ready':String(state.errno);from.textContent=hasFrom?'FROM':'';from.className='from-slot '+(hasFrom?'filled':'missing');from.setAttribute('aria-label',hasFrom?'FROM':'Пропущено слово');table.textContent=tableName;
  lab.querySelector('[data-code]').textContent=ready?'Выполнено':state.errno+' · '+state.sqlState;
  lab.querySelector('[data-message]').textContent=ready?state.rows.length+' строки из products':state.errno===1064?"near '"+tableName+"' at line 2":state.message;
  lab.querySelector('[data-hint]').textContent=ready?'Запрос выполнен.':!hasFrom?'Проверьте место перед именем.':'Сравните имя со схемой.';
  lab.querySelector('[data-schema=products]').classList.toggle('is-found',ready);
  button.textContent=ready?'Ещё раз':hasFrom?'Исправить имя':'Вернуть FROM';
  lab.querySelectorAll('[data-stage]').forEach((node,position)=>{const active=ready?2:hasFrom?1:0;node.classList.toggle('is-active',!ready&&position===active);node.classList.toggle('is-passed',position<active||ready);});
 }
 button.addEventListener('click',async()=>{
  button.disabled=true;if(!reduced.matches){const token=states[index].executed?table:states[index].sql.includes('FROM')?table:from;await token.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-5px)',opacity:.3}],{duration:160,easing:'ease-in'}).finished.catch(()=>{});}
  index=(index+1)%states.length;render();
  if(!reduced.matches){from.animate([{transform:'translateY(6px)'},{transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.2,.8,.2,1)'});message.animate([{opacity:.15,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,easing:'ease-out'});}
  button.disabled=false;
 });render();
}
const form=document.querySelector('[data-error-form]');
function renderResult(target,result){
 const table=document.createElement('table');table.className='preview-table';const head=table.createTHead().insertRow();result.columns.forEach(value=>{const cell=document.createElement('th');cell.textContent=value;head.append(cell);});const body=table.createTBody();
 if(!result.rows.length){const cell=body.insertRow().insertCell();cell.colSpan=result.columns.length;cell.textContent='0 строк';}
 else result.rows.forEach(values=>{const row=body.insertRow();values.forEach(value=>row.insertCell().textContent=value===null?'NULL':String(value));});target.replaceChildren(table);
}
if(form){
 const button=form.querySelector('button'),feedback=form.querySelector('[data-feedback]'),diagnostic=form.querySelector('[data-diagnostic]'),output=form.querySelector('[data-sql-result]');
 fetch('/api/health').then(response=>response.json()).then(info=>{form.querySelector('[data-engine]').textContent=info.ready?'MySQL '+info.version:'База пока не запущена';if(!info.ready)button.disabled=true;}).catch(()=>{button.disabled=true;form.querySelector('[data-engine]').textContent='База пока не запущена';});
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;feedback.textContent='Проверяю запрос';output.replaceChildren();diagnostic.replaceChildren();
  try{const response=await fetch('/api/sql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:form.dataset.errorForm,sql:form.querySelector('textarea').value})});const result=await response.json();
   feedback.dataset.correct=String(result.correct===true);
   if(result.errno){const block=document.createElement('pre');block.className='mysql-error-note';block.textContent=result.errno+' ('+result.sqlState+')\n'+result.message;diagnostic.append(block);feedback.textContent=result.hint;}
   else feedback.textContent=result.message;if(result.columns)renderResult(output,result);
  }catch{feedback.textContent='Не удалось выполнить локальную проверку.';feedback.dataset.correct='false';}finally{button.disabled=false;}
 });
}
reduced.addEventListener('change',()=>{if(reduced.matches)document.getAnimations().forEach(animation=>animation.cancel());});
