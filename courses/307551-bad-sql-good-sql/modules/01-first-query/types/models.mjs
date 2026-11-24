// Small explicit teaching models, not a MySQL engine. Exact decimal math uses integers.
export function identity(value){
 const length=Array.from(value).length,plain=/^[+-]?\d+$/.test(value);
 let integer=null,error='Нужна запись целого числа';
 if(plain){const number=BigInt(value);if(number>=-2147483648n&&number<=2147483647n){integer=number.toString();error='';}else error='Вне диапазона INT';}
 return {integer,error,length,textFits:length<=20,text:value};
}
export function decimal(value,precision=10,scale=2){
 if(!Number.isInteger(precision)||!Number.isInteger(scale)||precision<1||precision>10||scale<0||scale>precision)throw Error('Unsupported teaching precision');
 const match=String(value).match(/^([+-]?)(\d+)(?:\.(\d*))?$/);
 if(!match)return {valid:false,fits:false,error:'Введите число с точкой, без пробелов и валюты'};
 const negative=match[1]==='-',whole=match[2].replace(/^0+(?=\d)/,''),fraction=match[3]||'',factor=10n**BigInt(scale);
 const kept=(fraction+'0'.repeat(scale)).slice(0,scale);
 let units=BigInt(whole)*factor+BigInt(kept||'0');
 const extra=fraction.slice(scale),rounded=/[1-9]/.test(extra);
 if(extra&&Number(extra[0])>=5)units+=1n;
 const digits=units.toString().padStart(scale+1,'0'),integerPart=scale?digits.slice(0,-scale):digits,fractionPart=scale?digits.slice(-scale):'';
 const fits=units<10n**BigInt(precision),sign=negative&&units!==0n?'-':'';
 return {valid:true,fits,rounded,whole,fraction,integerPart,fractionPart,output:sign+integerPart+(scale?'.'+fractionPart:''),capacity:precision-scale,error:fits?'':'Выход за диапазон после округления'};
}
export function calendar(value){
 const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(!match)return {valid:false,error:'Используйте запись ГГГГ-ММ-ДД'};
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 if(year<1000||year>9999)return {valid:false,year,month,day,error:'В этом примере год от 1000 до 9999'};
 if(month<1||month>12)return {valid:false,year,month,day,error:'Месяц от 01 до 12'};
 const leap=year%4===0&&(year%100!==0||year%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
 if(day<1||day>days)return {valid:false,year,month,day,days,leap,error:'В этом месяце '+days+' '+(days===31?'день':'дней')};
 return {valid:true,year,month,day,days,leap,error:''};
}
