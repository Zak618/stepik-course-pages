export const tables={
 products:{label:'Товары',columns:['id','name','price','stock'],types:['INT','VARCHAR(100)','DECIMAL(10, 2)','INT'],cases:[[[101,'Монитор','18990.00',7],[102,'Клавиатура','6490.00',12],[103,'Кабель USB-C','890.00',30],[104,'Подставка','2490.00',8]],[[180,'Кабель USB-C','1490.50',0],[45,'Монитор','25000.00',2],[46,'Монитор','25000.00',2]],[[909,'Переходник','149.99',1]],[]]},
 customers:{label:'Клиенты',columns:['id','name','phone'],types:['INT','VARCHAR(100)','VARCHAR(20)'],cases:[[[7,'Анна','0071234567'],[11,'Анна','0077654321'],[14,'Вера','0082345678']],[[41,'Алексей','0000123456'],[42,'Алексей','0000654321']],[[91,'Zoë','+7 900 100-20-30']],[]]},
 orders:{label:'Заказы',columns:['id','customer_id','total'],types:['INT','INT','DECIMAL(10, 2)'],cases:[[[501,11,'6490.00'],[502,7,'18990.00'],[503,11,'890.00']],[[701,42,'0.00'],[702,41,'1490.50']],[[991,91,'149.99']],[]]},
};
export const names=Object.keys(tables);
export function queryFor(name){if(!names.includes(name))throw Error('Unknown table');return 'SELECT *\nFROM '+name+';';}
export function resultFor(name,caseIndex=0){const table=tables[name];if(!table||!Number.isInteger(caseIndex)||!table.cases[caseIndex])throw Error('Unknown dataset');return {columns:[...table.columns],rows:table.cases[caseIndex].map(row=>[...row])};}
export function literal(value){return typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";}
export function schemaSql(caseIndex,database){
 if(!/^sql_select_case_[0-3]$/.test(database))throw Error('Unexpected database');
 return 'CREATE DATABASE IF NOT EXISTS '+database+' CHARACTER SET utf8mb4;\nUSE '+database+';\n'+names.map(name=>{const table=tables[name],rows=table.cases[caseIndex];return 'CREATE TABLE IF NOT EXISTS '+name+' ('+table.columns.map((column,index)=>column+' '+table.types[index]+(index===0?' PRIMARY KEY':' NOT NULL')).join(', ')+');\n'+(rows.length?'INSERT IGNORE INTO '+name+' ('+table.columns.join(', ')+') VALUES '+rows.map(row=>'('+row.map(literal).join(', ')+')').join(',')+';\n':'');}).join('');
}
export function rowKey(row,types){return JSON.stringify(row.map((value,index)=>types[index].startsWith('INT')?Number(value):types[index].startsWith('DECIMAL')?Number(value).toFixed(2):value));}
export function matchesResult(name,caseIndex,columns,rows){const table=tables[name];return JSON.stringify(columns)===JSON.stringify(table.columns)&&JSON.stringify(rows.map(row=>rowKey(row,table.types)).sort())===JSON.stringify(table.cases[caseIndex].map(row=>rowKey(row,table.types)).sort());}
