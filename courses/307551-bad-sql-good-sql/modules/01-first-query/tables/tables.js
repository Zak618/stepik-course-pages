// Educational visualization only, not a SQL execution engine.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const cellWidget=document.querySelector('[data-cells]');
if(cellWidget){
 const cells=[...cellWidget.querySelectorAll('.cell')],rows=[...cellWidget.querySelectorAll('tbody tr')],headers=[...cellWidget.querySelectorAll('thead th')];
 let particle;
 function select(cell,animate=true){
  const row=Number(cell.dataset.row),column=Number(cell.dataset.column),record=rows[row];
  for(const item of cells){const active=item===cell;item.setAttribute('aria-pressed',String(active));item.tabIndex=active?0:-1;item.parentElement.classList.toggle('column-selected',Number(item.dataset.column)===column);}
  rows.forEach((item,index)=>item.classList.toggle('row-selected',index===row));headers.forEach((item,index)=>item.classList.toggle('column-selected',index===column));
  const outputs=[cellWidget.querySelector('[data-row-name]'),cellWidget.querySelector('[data-column-name]'),cellWidget.querySelector('[data-value]')];
  outputs[0].textContent=record.dataset.name;outputs[1].textContent=headers[column].dataset.name;outputs[2].textContent=cell.textContent;
  particle?.remove();particle=null;
  if(animate&&!reduced.matches){
   const from=cell.getBoundingClientRect(),to=outputs[2].getBoundingClientRect();
   particle=document.createElement('span');particle.className='selection-particle';particle.textContent=cell.textContent;particle.setAttribute('aria-hidden','true');document.body.append(particle);
   particle.style.left=from.left+'px';particle.style.top=from.top+'px';
   const flying=particle;const animation=flying.animate([{transform:'translate(0,0) scale(.95)',opacity:0},{offset:.12,opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(.9)`,opacity:0}],{duration:620,easing:'cubic-bezier(.2,.75,.2,1)'});animation.finished.then(()=>flying.remove()).catch(()=>flying.remove());
   outputs[2].animate([{transform:'translateY(3px)',opacity:.4},{transform:'translateY(0)',opacity:1}],{duration:320});
  }
 }
 for(const cell of cells){cell.addEventListener('click',()=>select(cell));cell.addEventListener('keydown',event=>{const delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:4,ArrowUp:-4}[event.key];if(delta===undefined)return;event.preventDefault();const index=Math.max(0,Math.min(cells.length-1,cells.indexOf(cell)+delta));select(cells[index]);cells[index].focus();});}
 select(cells[3],false);
 reduced.addEventListener('change',()=>{if(reduced.matches){particle?.remove();for(const animation of document.getAnimations())animation.cancel();}});
}
const database=document.querySelector('[data-database]');
if(database){
 const data=JSON.parse(document.querySelector('#database-data').textContent),buttons=[...database.querySelectorAll('[role=tab]')],panel=database.querySelector('[role=tabpanel]');
 function show(button){
  const item=data[button.dataset.table];buttons.forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});panel.setAttribute('aria-labelledby',button.id);
  database.querySelector('[data-record-count]').textContent=item.label+' · '+item.rows.length+' '+(item.rows.length===3?'записи':'записи');
  const head=panel.querySelector('thead tr'),body=panel.querySelector('tbody');head.replaceChildren(...item.columns.map(column=>{const th=document.createElement('th');th.scope='col';th.textContent=column;return th;}));
  body.replaceChildren(...item.rows.map(values=>{const row=document.createElement('tr');row.append(...values.map(value=>{const td=document.createElement('td');td.textContent=value;return td;}));return row;}));
  if(!reduced.matches)panel.animate([{transform:'translateY(5px)',opacity:.45},{transform:'translateY(0)',opacity:1}],{duration:280,easing:'ease-out'});
 }
 buttons.forEach((button,index)=>{button.addEventListener('click',()=>show(button));button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;show(buttons[next]);buttons[next].focus();});});show(buttons[0]);
}
