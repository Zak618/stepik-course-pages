import {tables} from '../../01-first-query/select/models.mjs';
import {tasks} from './copy.mjs';
export {tables};
// All fixture prices have exactly two fractional digits. Keep their calculations exact.
export function cents(value){if(!/^\d+\.\d{2}$/.test(String(value)))throw Error('Expected fixture price');return BigInt(String(value).replace('.',''));}
export function decimal(value,scale=2){const negative=value<0n,raw=(negative?-value:value).toString().padStart(scale+1,'0');return (negative?'-':'')+(scale?raw.slice(0,-scale)+'.'+raw.slice(-scale):raw);}
export const expressions={stock:'price * stock',delivery:'price + 250',discount:'price * 90 / 100','sale-stock':'(price - 100) * stock'};
export function amount(formula,row){const price=cents(row[2]),stock=BigInt(row[3]);switch(formula){case 'stock':return decimal(price*stock);case 'delivery':return decimal(price+25000n);case 'discount':return decimal(price*90n,4);case 'sale-stock':return decimal((price-10000n)*stock);default:throw Error('Unknown calculation');}}
export function expected(task,index=0){return {columns:task.columns,rows:tables.products.cases[index].map(row=>task.formula==='stock'?[row[1],amount(task.formula,row)]:task.formula==='sale-stock'?[row[0],row[1],amount(task.formula,row)]:[row[0],amount(task.formula,row)])};}
export function taskFor(id){const task=tasks.find(task=>task.id===id);if(!task)throw Error('Неизвестное задание.');return task;}
export function solutionFor(task){return 'SELECT '+(task.formula==='stock'?'name, ':task.formula==='sale-stock'?'id, name, ':'id, ')+expressions[task.formula]+' AS '+task.columns.at(-1)+'\nFROM products;';}
export function numericKey(value){if(value===null||value===undefined)return '!null';const match=String(value).match(/^(-?)(\d+)(?:\.(\d+))?$/);if(!match)return '!'+String(value);const whole=BigInt(match[2]).toString(),fraction=(match[3]??'').replace(/0+$/,'');return (match[1]&&(whole!=='0'||fraction)?'-':'')+whole+(fraction?'.'+fraction:'');}
export function matches(task,index,result){const normalize=rows=>rows.map(row=>JSON.stringify(row.map((value,i)=>task.types[i].startsWith('VARCHAR')?['text',String(value)]:['number',numericKey(value)]))).sort();return JSON.stringify(result.columns)===JSON.stringify(task.columns)&&JSON.stringify(normalize(result.rows))===JSON.stringify(normalize(expected(task,index).rows));}
