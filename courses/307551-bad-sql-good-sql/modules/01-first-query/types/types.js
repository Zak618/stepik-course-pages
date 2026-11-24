import {identity,decimal,calendar} from './models.mjs';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function motion(element,flip=false){if(!reduced.matches){element.getAnimations().forEach(animation=>animation.cancel());element.animate(flip?[{transform:'rotateX(-24deg)',opacity:.45},{transform:'rotateX(0)',opacity:1}]:[{transform:'translateY(4px)',opacity:.45},{transform:'translateY(0)',opacity:1}],{duration:360,easing:'cubic-bezier(.2,.75,.2,1)'});}}
function status(root,text,state){const node=root.querySelector('[data-status]');node.textContent=text;node.dataset.state=state;}
const phone=document.querySelector('[data-identity]');
if(phone){
 const input=phone.querySelector('input');
 function update(){
  const result=identity(input.value),numeric=phone.querySelector('[data-numeric]'),text=phone.querySelector('[data-text]');
  numeric.textContent=result.integer??'Не INT';text.textContent=result.textFits?(result.text||'Пустая строка'):'Длиннее 20';
  numeric.title=result.error;phone.querySelector('[data-length]').textContent=result.length+' из 20 знаков';
  const zeroCount=(input.value.match(/^0+(?=\d)/)||[''])[0].length;
  phone.querySelector('[data-lost]').textContent=result.integer!==null?'0'.repeat(Math.min(zeroCount,4)):'';
  status(phone,result.integer!==null&&zeroCount?'В INT нули исчезли. В тексте номер остался целым.':result.integer===null?'INT не подходит. Телефон сохраняйте как текст.':'Одинаковый вид не означает одинаковый смысл.',zeroCount?'bad':'good');motion(text);
 }
 input.addEventListener('input',update);phone.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.sample;update();}));update();
}
const money=document.querySelector('[data-decimal]');
if(money){
 const input=money.querySelector('input'),select=money.querySelector('select'),slots=money.querySelector('[data-slots]');
 function update(){const [p,s]=select.value.split(',').map(Number),result=decimal(input.value,p,s);money.querySelector('[data-whole-count]').textContent=(p-s)+' '+(p-s===1?'цифра':'цифр')+' до точки';money.querySelector('[data-scale-count]').textContent=s+' после точки';slots.replaceChildren();const rawWhole=result.valid?result.whole:'',rawFraction=result.valid?result.fraction:'';const visibleWhole=rawWhole.slice(-(p-s)).padStart(p-s,' ');for(let i=0;i<p;i++){if(i===p-s){const dot=document.createElement('span');dot.className='decimal-point';dot.textContent='.';slots.append(dot);}const digit=document.createElement('span');const fraction=i>=p-s;const char=fraction?(rawFraction[i-(p-s)]??'0'):visibleWhole[i];digit.className='digit-slot'+(fraction?' fraction':'')+(char===' '?' empty':'')+(result.valid&&!result.fits&&!fraction?' over':'');digit.textContent=char===' '?'·':char;slots.append(digit);}money.querySelector('[data-result]').textContent=!result.valid?'Нет числового значения':!result.fits?'Не сохраняется':result.output;status(money,!result.valid?result.error:!result.fits?'Сумма не помещается в DECIMAL('+p+', '+s+'). Нужен другой диапазон.':result.rounded?'Сохранится '+result.output+'. Лишняя дробная часть округлена.':'Помещается без округления. Сохранится '+result.output+'.',!result.valid||!result.fits?'bad':result.rounded?'warn':'good');motion(money.querySelector('[data-result]'));}
 input.addEventListener('input',update);select.addEventListener('change',update);money.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.sample;update();}));update();
}
const date=document.querySelector('[data-date]');
if(date){
 const input=date.querySelector('input');
 function update(){const value=input.value,result=calendar(value),parts=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);date.querySelectorAll('[data-part]').forEach((node,i)=>{node.textContent=parts?parts[i+1]:'··';motion(node,true);});date.querySelector('[data-month-limit]').textContent=result.days?'В месяце '+result.days+' '+(result.days===31?'день':'дней'):'Проверьте запись';date.querySelector('[data-year-kind]').textContent=result.leap===undefined?'':result.leap?'Високосный год':'Обычный год';status(date,result.valid?'Дата существует.':result.error,result.valid?'good':'bad');}
 input.addEventListener('input',update);date.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.sample;update();}));update();
}
const genes=document.querySelector('[data-genes]');
if(genes){
 const rows=[['SEPT2','2-Sep'],['MARCH1','1-Mar'],['TP53','TP53']];
 function show(mode){genes.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));genes.querySelectorAll('[data-gene-output]').forEach((node,i)=>{node.textContent=rows[i][mode==='auto'?1:0];node.className=mode==='auto'&&i<2?'changed':'preserved';motion(node);});status(genes,mode==='auto'?'Два имени заменены на даты.':'Все три обозначения сохранены как текст.',mode==='auto'?'bad':'good');}
 genes.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.mode)));show('auto');
}
const form=document.querySelector('.question-form');
if(form){const quiz=JSON.parse(document.querySelector('#question-data').textContent),feedback=form.querySelector('.question-feedback');form.addEventListener('submit',event=>{event.preventDefault();const selected=new FormData(form).getAll('answer').map(Number).sort((a,b)=>a-b),correct=JSON.stringify(selected)===JSON.stringify(quiz.answers);feedback.textContent=selected.length?correct?quiz.feedback:quiz.hint:'Сначала выберите варианты.';feedback.dataset.correct=String(correct);form.dataset.correct=String(correct);});form.addEventListener('change',()=>{feedback.textContent='';form.removeAttribute('data-correct');});}
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
reduced.addEventListener('change',()=>{if(reduced.matches)document.getAnimations().forEach(animation=>animation.cancel());});
