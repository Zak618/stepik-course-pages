/* A bounded teaching model for the literal-string programs in this lesson.
   Not a compiler. Real, unrestricted Go solutions are graded by Stepik code steps.
   No eval, Function, network, accounts or access to the host environment. */
(() => {
  'use strict';
  function run(source){
    let offset=0,line=1,column=1,tokens=[],output='';
    const fail=(message,at={line,column},phase='compile')=>{throw {ok:false,phase,engine:'model',stdout:'',line:at.line,diagnostic:`main.go:${at.line}:${at.column||1}: ${message}`};};
    const advance=()=>{const c=source[offset++];if(c==='\n'){line++;column=1;}else column++;return c;};
    const peek=()=>source[offset];
    const hex=n=>{const at={line,column},s=source.slice(offset,offset+n);if(s.length!==n||!/^[\da-f]+$/i.test(s))fail('неверная escape-последовательность',at);for(let i=0;i<n;i++)advance();const value=parseInt(s,16);if(value>0x10ffff||(value>=0xd800&&value<=0xdfff))fail('неверный код Unicode',at);return String.fromCodePoint(value);};
    try{
      if(typeof source!=='string'||source.length>12000)fail('Слишком большой пример.',{line:1,column:1},'limit');
      while(offset<source.length){
        const c=peek(),at={line,column};
        if(/\s/.test(c)){advance();continue;}
        if(source.startsWith('//',offset)){while(offset<source.length&&peek()!=='\n')advance();continue;}
        if(source.startsWith('/*',offset)){advance();advance();while(offset<source.length&&!source.startsWith('*/',offset))advance();if(offset===source.length)fail('comment not terminated',at);advance();advance();continue;}
        if(c==='"'||c==='`'){
          const quote=advance();let value='',closed=false;
          while(offset<source.length){const ch=advance();if(ch===quote){closed=true;break;}if(quote==='`'){if(ch!=='\r')value+=ch;continue;}if(ch==='\n')fail('newline in string',at);if(ch!=='\\'){value+=ch;continue;}const escaped=advance();const simple={a:'\x07',b:'\b',f:'\f',n:'\n',r:'\r',t:'\t',v:'\v','\\':'\\','"':'"'};if(Object.hasOwn(simple,escaped))value+=simple[escaped];else if(escaped==='u')value+=hex(4);else if(escaped==='U')value+=hex(8);else if(escaped==='x'){const decoded=hex(2);if(decoded.codePointAt(0)>127)fail('В примере используйте текст Unicode вместо отдельных не-ASCII байтов.',at,'limit');value+=decoded;}else if(/[0-7]/.test(escaped||'')){const octal=escaped+source.slice(offset,offset+2);if(!/^[0-7]{3}$/.test(octal))fail('invalid character in octal escape',at);advance();advance();const n=parseInt(octal,8);if(n>127)fail('В примере используйте текст Unicode вместо отдельных не-ASCII байтов.',at,'limit');value+=String.fromCharCode(n);}else fail('unknown escape',at);}
          if(!closed)fail('string literal not terminated',at);tokens.push({kind:'string',value,...at,endLine:line});continue;
        }
        if(/[A-Za-z_]/.test(c)){let value='';while(offset<source.length&&/[A-Za-z_0-9]/.test(peek()))value+=advance();tokens.push({kind:'word',value,...at,endLine:line});continue;}
        if('.(){},;'.includes(c)){tokens.push({kind:c,value:advance(),...at,endLine:line});continue;}
        fail('В этом примере доступны только команды вывода строк.',at,'limit');
      }
      tokens.push({kind:'eof',value:'',line,column,endLine:line});let index=0,imported=false,importLine=1,callCount=0,firstCall=null;
      const current=()=>tokens[index];
      const take=(value)=>{const t=current();if(t.value!==value)fail(`ожидалось ${value||'окончание файла'}`,t);index++;return t;};
      const semis=()=>{while(current().value===';')index++;};
      const boundary=previous=>{if(current().value===';'||current().value==='}'||current().kind==='eof'){semis();return;}if(current().line<=previous.endLine)fail('между командами нужна новая строка или точка с запятой',current());};
      const readString=()=>{const t=current();if(t.kind!=='string')fail('Текст нужно заключить в двойные кавычки.',t);index++;return t;};
      take('package');const packageName=take('main');boundary(packageName);
      if(current().value==='import'){
        const token=take('import');importLine=token.line;let last;
        if(current().value==='('){take('(');last=readString();if(last.value!=='fmt')fail('В примере подключается только fmt.',last,'limit');semis();last=take(')');}else{last=readString();if(last.value!=='fmt')fail('В примере подключается только fmt.',last,'limit');}
        imported=true;boundary(last);
      }
      take('func');take('main');take('(');const signature=take(')');if(current().line>signature.endLine)fail('открывающая скобка { должна стоять на строке с func main()',current());take('{');semis();
      while(current().value!=='}'){
        if(current().kind==='eof')fail('expected }, found EOF',current());
        const call=take('fmt');firstCall??=call;take('.');const name=current();index++;if(!['Print','Println'].includes(name.value))fail(`undefined: fmt.${name.value}`,name);
        take('(');const args=[];
        if(current().value!==')')while(true){const value=readString();args.push(value.value);if(args.length>16)fail('Слишком много аргументов в примере.',value,'limit');if(current().value!==','){if(current().line>value.endLine)fail('missing comma before newline in argument list',value);break;}take(',');if(current().value===')')break;}
        const end=take(')');boundary(end);output+=args.join(name.value==='Println'?' ':'')+(name.value==='Println'?'\n':'');callCount++;if(callCount>96||output.length>24000)fail('Слишком большой вывод.',call,'limit');
      }
      const end=take('}');boundary(end);if(current().kind!=='eof')fail('В примере используется одна функция main.',current(),'limit');
      if(firstCall&&!imported)fail('undefined: fmt',firstCall);
      if(imported&&!callCount)fail('"fmt" imported and not used',{line:importLine,column:1});
      return {ok:true,phase:'done',engine:'model',stdout:output};
    }catch(error){if(error&&error.engine==='model')return error;return {ok:false,phase:'limit',engine:'model',stdout:'',diagnostic:'В примере доступны main и вызовы fmt.Print / fmt.Println со строками.'};}
  }
  window.FirstProgramModel={run};
})();
