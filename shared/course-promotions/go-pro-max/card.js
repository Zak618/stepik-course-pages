const revision=new URL(import.meta.url).searchParams.get('v')||'local';
const {offer,variants}=await import('./offer.mjs?v='+encodeURIComponent(revision));

const variant = variants[document.documentElement.dataset.audience||new URLSearchParams(location.search).get('audience')] || variants.general;
const ticket = document.querySelector('.ticket');
const area = document.querySelector('.ticket-code');
const canvas = document.querySelector('#scratch');
const code = document.querySelector('#promo');
const copy = document.querySelector('#copy');
const status = document.querySelector('#status');
document.querySelector('#discount').textContent = '−' + variant.discount + '%';
document.querySelector('.ticket-stub').setAttribute('aria-label','Скидка ' + variant.discount + ' процентов');
code.value = variant.code;
document.querySelector('.course-link').href = offer.url;

const ctx = canvas.getContext('2d',{willReadFrequently:true});
let revealed = false, pointer = null, last = null, lastCheck = 0;
const strokes=[];
function drawStroke(from,to,width,height){
  ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='#000';
  ctx.lineWidth=Math.max(28,Math.min(42,height*.6));ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(from.x*width,from.y*height);ctx.lineTo(to.x*width+.01,to.y*height);ctx.stroke();
}

function reveal() {
  if (revealed) return;
  const keyboard = document.activeElement === canvas && pointer === null;
  revealed = true;
  ticket.classList.add('is-revealed');
  area.classList.remove('is-scratching');
  code.removeAttribute('aria-hidden');
  code.tabIndex = 0;
  copy.hidden = false;
  canvas.tabIndex = -1;
  canvas.setAttribute('aria-hidden','true');
  status.textContent = 'Скидка ' + variant.discount + '% на Go Pro MAX';
  if (keyboard) copy.focus({preventScroll:true});
}

function paint() {
  if (!ctx || revealed) return;
  const width = area.clientWidth, height = area.clientHeight;
  if (!width || !height) return;
  const dpr = Math.min(devicePixelRatio || 1,2);
  if (canvas.width === Math.round(width*dpr) && canvas.height === Math.round(height*dpr)) return;
  canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.globalCompositeOperation = 'source-over';
  {
    const foil = ctx.createLinearGradient(0,0,width,height);
    for (const [stop,color] of [[0,'#d4daed'],[.25,'#f0eafb'],[.52,'#c7c6e4'],[.77,'#e5ddf7'],[1,'#d9deef']]) foil.addColorStop(stop,color);
    ctx.fillStyle = foil; ctx.fillRect(0,0,width,height);
    ctx.strokeStyle = '#ffffff50'; ctx.lineWidth = .8;
    for (let x=-height;x<width;x+=8) {ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+height,height);ctx.stroke();}
    ctx.fillStyle = '#62627e';ctx.textAlign = 'center';ctx.textBaseline = 'middle';
    ctx.font = '600 ' + (width<205?12:14) + 'px Arial';
    ctx.fillText('Сотрите покрытие',width/2,height/2);
  }
  for(const stroke of strokes)drawStroke(stroke.from,stroke.to,width,height);
  canvas.dataset.painted = 'true';
}

function erase(event) {
  const rect = canvas.getBoundingClientRect();
  const point = {x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};
  const stroke={from:last||point,to:point};strokes.push(stroke);
  drawStroke(stroke.from,stroke.to,rect.width,rect.height);
  last = point;
}

function checkProgress() {
  const {data} = ctx.getImageData(0,0,canvas.width,canvas.height);
  let clear=0,total=0;
  for(let y=4;y<canvas.height;y+=10)for(let x=4;x<canvas.width;x+=10){total++;if(data[(y*canvas.width+x)*4+3]<80)clear++;}
  if(total && clear/total>=.4)reveal();
}

if (ctx && typeof ResizeObserver !== 'undefined') {
  canvas.hidden = false;
  document.querySelector('.foil-glint').hidden = false;
  document.querySelector('.scratch-cursor').hidden = false;
  code.tabIndex = -1;
  code.setAttribute('aria-hidden','true');
  paint();new ResizeObserver(paint).observe(area);
  canvas.addEventListener('pointerdown',event=>{
    if (revealed || pointer!==null || (event.pointerType==='mouse' && event.button!==0))return;
    event.preventDefault();pointer=event.pointerId;last=null;area.classList.add('is-scratching');
    canvas.setPointerCapture(pointer);erase(event);
  });
  canvas.addEventListener('pointermove',event=>{
    if (revealed || event.pointerId!==pointer)return;
    erase(event);
    if(performance.now()-lastCheck>80){checkProgress();lastCheck=performance.now();}
  });
  const finish=event=>{
    if(event.pointerId!==pointer)return;
    checkProgress();pointer=null;last=null;area.classList.remove('is-scratching');
  };
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,finish);
  canvas.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();reveal();}});
  canvas.addEventListener('click',event=>{if(event.detail===0)reveal();});
} else reveal();

code.addEventListener('click',()=>code.select());
let copying=false;
copy.addEventListener('click',async()=>{
  if(copying)return;copying=true;
  let copied=false;
  try {if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(code.value);copied=true;}}catch{/* Fallback for embedded pages. */}
  if(!copied){code.focus({preventScroll:true});code.select();try{copied=document.execCommand('copy');}catch{/* Leave the selected code available. */}}
  copy.querySelector('span').textContent=copied?'Скопировано ✓':'Выделить код';
  status.textContent=copied?'Примените при покупке':'Код выделен. Скопируйте вручную';
  if(copied)copy.focus({preventScroll:true});
  copying=false;
});

// Local preview can size the frame without a nested scrollbar. The sender never
// receives or changes Stepik data; a future Stepik embed gets a measured height.
const sendHeight=()=>{if(parent!==window)parent.postMessage({type:'go-max-offer:height',height:Math.ceil(document.querySelector('.offer').getBoundingClientRect().height)},location.origin);};
new ResizeObserver(sendHeight).observe(document.querySelector('.offer'));
