const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

const field=(id,label,value)=>`<label class="field" for="${id}"><span>${label}</span><input id="${id}" maxlength="32" value="${esc(value)}" autocomplete="off"></label>`;
export function lineWorld(){
 return `<section class="world line-world" aria-label="Опыт: чтение строки целиком"><div class="line-controls">${field('train-input','Строка для чтения','первые команды Go')}<button class="primary orange" id="train-send">Прочитать строку →</button></div><div class="presets line-presets"><button data-train="Go  👋">Два пробела</button><button data-train="">Пустая строка</button><button data-train="42">42</button></div><div class="line-workbench"><div class="line-paper"><div class="line-label"><code>scanner.Scan()</code><span>Читаем до Enter</span></div><div class="line-tokens" id="line-tokens"></div><div class="line-end"><span>Конец строки</span><kbd>↵ Enter</kbd></div><div class="reading-beam" id="reading-beam" aria-hidden="true"></div></div><div class="line-transfer" aria-hidden="true">↓</div><div class="line-result"><div class="line-label"><code>query</code><span>string</span></div><output id="train-result">Ещё не прочитали</output><small id="train-note">Точки показывают пробелы. В самой строке точек нет.</small></div></div><p class="scene-status" id="train-status" role="status">Нажмите «Прочитать строку»: проверим, что попадёт в query.</p></section>`;
}
export function copyWorld(){
 return `<section class="world copy-world" aria-label="Опыт: копия и текущее значение"><div class="copy-board"><div class="copy-card current-card"><div class="copy-label"><code>query</code><span>Текущий запрос</span></div><output id="history-query">«циклы»</output><div class="copy-card-code"><code id="history-code">query := "циклы"</code></div></div><div class="copy-bridge" aria-hidden="true"><span id="copy-arrow">→</span><code>saved := query</code></div><div class="copy-card saved-card"><div class="copy-label"><code>saved</code><span>Сохранённая копия</span></div><output id="history-saved">Ещё нет копии</output><div class="copy-card-code"><span id="copy-lock">Первый запрос ещё не сохранили</span></div></div></div><div class="copy-controls">${field('history-input','Следующий запрос','функции')}<div class="copy-buttons"><button class="primary violet" id="history-save">1. Сохранить копию</button><button class="primary" id="history-read" disabled>2. Прочитать новый</button><button class="quiet" id="history-reset">Сначала</button></div></div><p class="scene-status" id="history-status" role="status">Сначала сохраните «циклы». Затем заменим query новым запросом.</p></section>`;
}
export function mountReplacement(name,root,signal){
 const $=s=>root.querySelector(s),on=(s,event,fn)=>root.querySelectorAll(s).forEach(n=>n.addEventListener(event,fn,{signal}));
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-off');
 const animate=async(n,frames,duration=1100)=>{const a=n.animate(frames,{duration:reduced()?1:duration,easing:'ease-in-out'});const abort=()=>a.cancel();signal.addEventListener('abort',abort,{once:true});try{await a.finished;}catch{}finally{signal.removeEventListener('abort',abort);}};
 if(name==='train'){
  let busy=false;
  const chars=value=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ru',{granularity:'grapheme'}).segment(value)].map(x=>x.segment):Array.from(value);
  const paint=()=>{const values=chars($('#train-input').value);$('#line-tokens').innerHTML=values.length?values.map((c,i)=>`<span class="line-token ${c===' '?'space-token':''}" style="--token-color:hsl(${i*43%360} 85% 82%)" aria-label="${c===' '?'пробел':esc(c)}">${c===' '?'·':esc(c)}</span>`).join(''):'<span class="empty-line">Пустая строка <code>""</code></span>';$('#line-tokens').classList.remove('read');};
  on('#train-input','input',()=>{paint();$('#train-result').textContent='Ещё не прочитали';$('#train-status').textContent='Ввод изменился. Прочитайте новую строку.';});
  on('[data-train]','click',e=>{$('#train-input').value=e.currentTarget.dataset.train;$('#train-input').dispatchEvent(new Event('input'));});
  on('#train-send','click',async()=>{if(busy)return;busy=true;const value=$('#train-input').value;$('#train-send').disabled=true;$('#train-input').readOnly=true;root.querySelectorAll('[data-train]').forEach(b=>b.disabled=true);paint();$('#train-status').textContent='Scan получает строку целиком, вместе с пробелами.';
   const paper=$('.line-paper');await animate($('#reading-beam'),[{opacity:0,transform:'translateY(0)'},{opacity:1,offset:.12},{opacity:1,offset:.9},{opacity:0,transform:`translateY(${paper.clientHeight-12}px)`}],1600);
   if(signal.aborted)return;$('#line-tokens').classList.add('read');$('#train-result').textContent='['+value+']';
   $('#train-note').textContent=value===''?'Пришла пустая строка "". Это не отсутствие ввода.':value==='42'?'Это string "42", а не int 42.':'Пробелы сохранились. Завершающий перенос строки не попал в query.';
   await animate($('.line-result'),[{transform:'translateY(10px)',background:'#bcefe2'},{transform:'translateY(0)',background:'#e7fbf3'}],500);
   if(signal.aborted)return;$('#train-status').textContent='Text вернул прочитанную строку. Её значение теперь в query.';busy=false;$('#train-send').disabled=false;$('#train-input').readOnly=false;root.querySelectorAll('[data-train]').forEach(b=>b.disabled=false);
  });
  on('#train-input','keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#train-send').click();}});paint();
 }
 if(name==='lighthouse'){
  let saved=false,busy=false;
  on('#history-save','click',async()=>{if(saved||busy)return;busy=true;$('#history-save').disabled=true;$('#history-reset').disabled=true;
   await animate($('#copy-arrow'),[{opacity:.2,transform:'translateX(-14px)'},{opacity:1,offset:.5},{opacity:.4,transform:'translateX(14px)'}],800);
   if(signal.aborted)return;saved=true;$('#history-saved').textContent='«циклы»';$('#copy-lock').textContent='Копия первого значения сохранена';$('.saved-card').classList.add('has-copy');$('#history-status').textContent='saved получила «циклы». Теперь прочитайте другой запрос.';busy=false;$('#history-read').disabled=false;$('#history-reset').disabled=false;
  });
  on('#history-read','click',async()=>{if(!saved||busy)return;busy=true;const value=$('#history-input').value;$('#history-read').disabled=true;$('#history-reset').disabled=true;$('#history-input').readOnly=true;
   await animate($('.current-card'),[{transform:'scale(1)',background:'#e9f2ff'},{transform:'scale(.97)',background:'#b9d7ff',offset:.5},{transform:'scale(1)',background:'#e9f2ff'}],1000);
   if(signal.aborted)return;$('#history-query').textContent=JSON.stringify(value);$('#history-code').textContent='query = scanner.Text()';$('#history-status').textContent='query изменилась. Сохранённая копия в saved осталась «циклы».';busy=false;$('#history-read').disabled=false;$('#history-reset').disabled=false;$('#history-input').readOnly=false;
  });
  on('#history-reset','click',()=>{if(busy)return;saved=false;$('#history-saved').textContent='Ещё нет копии';$('#history-query').textContent='«циклы»';$('#history-code').textContent='query := "циклы"';$('#copy-lock').textContent='Первый запрос ещё не сохранили';$('.saved-card').classList.remove('has-copy');$('#history-save').disabled=false;$('#history-read').disabled=true;$('#history-status').textContent='Сначала сохраните «циклы». Затем заменим query новым запросом.';});
  on('#history-input','keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#history-read').click();}});
 }
}
