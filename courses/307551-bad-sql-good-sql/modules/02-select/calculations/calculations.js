import {tables,amount,cents,decimal} from './models.mjs';
const e=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const table=data=>'<table class="data-table"><thead><tr>'+data.columns.map(x=>'<th>'+e(x)+'</th>').join('')+'</tr></thead><tbody>'+data.rows.map(row=>'<tr>'+row.map(x=>'<td>'+e(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
function motion(nodes){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;nodes.forEach((node,i)=>node.animate([{opacity:.25,transform:'translateY(7px)',backgroundColor:'#e5d4fa'},{opacity:1,transform:'translateY(0)',backgroundColor:getComputedStyle(node).backgroundColor}],{duration:650,delay:i*120,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));}
const multiply=document.querySelector('[data-multiply]');
if(multiply){
 const select=multiply.querySelector('select'),rows=[...tables.products.cases[0],tables.products.cases[1][0],tables.products.cases[2][0]];
 select.innerHTML=rows.map((row,i)=>'<option value="'+i+'">'+e(row[1])+' · id '+row[0]+'</option>').join('');
 const render=()=>{const row=rows[Number(select.value)];multiply.querySelector('[data-price]').textContent=row[2];multiply.querySelector('[data-stock]').textContent=row[3];multiply.querySelector('[data-value]').textContent=amount('stock',row);multiply.querySelector('[data-row]').innerHTML=table({columns:['name','price','stock'],rows:[[row[1],row[2],row[3]]]});multiply.querySelector('[data-query]').textContent='SELECT name, price * stock AS stock_value\nFROM products;';multiply.querySelector('[data-note]').textContent='Цена в products не меняется.';motion([...multiply.querySelectorAll('.calc-number')]);};
 select.addEventListener('change',render);render();
}
const precedence=document.querySelector('[data-precedence]');
if(precedence){
 let grouped=false;const row=tables.products.cases[0][0];
 const render=()=>{precedence.querySelector('[data-query]').textContent='SELECT name, '+(grouped?'(price - 100) * stock':'price - 100 * stock')+' AS sale_stock_value\nFROM products;';precedence.querySelector('button').textContent=grouped?'Убрать скобки':'Добавить скобки';precedence.querySelector('[data-first]').textContent=grouped?'18990 - 100 = 18890':'100 * 7 = 700';precedence.querySelector('[data-second]').textContent=grouped?'18890 * 7 = 132230':'18990 - 700 = 18290';precedence.querySelector('[data-result]').innerHTML=table({columns:['name','sale_stock_value'],rows:[[row[1],grouped?amount('sale-stock',row):decimal(cents(row[2])-10000n*BigInt(row[3]))]]});precedence.querySelector('[data-note]').textContent=grouped?'132230 рублей за семь мониторов со скидкой.':'18290 не равно стоимости семи мониторов со скидкой.';motion([...precedence.querySelectorAll('.calc-stage'),precedence.querySelector('[data-result]')]);};
 precedence.querySelector('button').addEventListener('click',()=>{grouped=!grouped;render();});render();
}
for(const form of document.querySelectorAll('[data-calc-task]'))form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector('button'),feedback=form.querySelector('[data-feedback]');if(button.disabled)return;button.disabled=true;feedback.textContent='Проверяю запрос…';delete feedback.dataset.correct;form.querySelector('[data-sql-result]').innerHTML='';
 try{const response=await fetch('/api/sql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:form.dataset.calcTask,sql:form.querySelector('textarea').value})}),result=await response.json();feedback.textContent=result.message;feedback.dataset.correct=String(result.correct===true);if(result.columns?.length)form.querySelector('[data-sql-result]').innerHTML='<div class="table-box result-box">'+table(result)+'</div>';}
 catch{feedback.textContent='Не удалось проверить запрос. Попробуйте ещё раз.';feedback.dataset.correct='false';}finally{button.disabled=false;}
});
