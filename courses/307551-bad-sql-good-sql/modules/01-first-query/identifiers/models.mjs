export const customers=Object.freeze([
 Object.freeze({id:7,name:'Анна',phone:'0071234567'}),
 Object.freeze({id:11,name:'Анна',phone:'0077654321'}),
 Object.freeze({id:14,name:'Вера',phone:'0082345678'}),
]);
export const orders=Object.freeze([
 Object.freeze({id:501,customer_id:11,total:'6490.00'}),
 Object.freeze({id:502,customer_id:7,total:'18990.00'}),
 Object.freeze({id:503,customer_id:11,total:'890.00'}),
]);
export function reorder(rows,alternate){const sorted=[...rows].sort((a,b)=>a.id-b.id);return alternate&&sorted.length?[sorted.at(-1),...sorted.slice(0,-1)]:sorted;}
export function rename(rows,id,name){return rows.map(row=>row.id===id?{...row,name}:row);}
export function selection(kind,id,people=customers,purchases=orders){
 const person=kind==='customer'?people.find(row=>row.id===id):people.find(row=>row.id===purchases.find(order=>order.id===id)?.customer_id);
 if(!person)return {person:null,orders:[]};
 return {person,orders:purchases.filter(order=>order.customer_id===person.id&&(kind==='customer'||order.id===id))};
}
export function integer(value){
 if(value===null||value===undefined||String(value).trim()==='')return {valid:false,empty:true};
 if(!/^[+-]?\d+$/.test(String(value).trim()))return {valid:false,empty:false};
 const number=BigInt(String(value).trim());
 return number>=-2147483648n&&number<=2147483647n?{valid:true,value:Number(number)}:{valid:false,empty:false};
}
export function checkOrder(candidate,{foreignKey=true,people=customers,purchases=orders}={}){
 const key=integer(candidate.id),reference=integer(candidate.customer_id);
 if(!key.valid)return {accepted:false,reason:key.empty?'primary-null':'integer',message:key.empty?'Нужно значение первичного ключа.':'id должен помещаться в INT.'};
 if(purchases.some(order=>order.id===key.value))return {accepted:false,reason:'primary-duplicate',message:'Заказ с id '+key.value+' уже существует.'};
 if(!reference.valid)return {accepted:false,reason:'integer',message:'Укажите customer_id в диапазоне INT.'};
 const person=people.find(row=>row.id===reference.value)??null;
 if(foreignKey&&!person)return {accepted:false,reason:'foreign-missing',message:'Клиента '+reference.value+' нет. Внешний ключ отклоняет запись.'};
 return {accepted:true,reason:person?'accepted':'orphan',person,row:{id:key.value,customer_id:reference.value},message:person?'Допустимая запись. Клиент '+person.name+', id '+person.id+'.':'Запись принята без внешнего ключа. Клиент '+reference.value+' не найден.'};
}
