// Decorative motion only. All text and navigation work without JavaScript.
const preference=matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('[data-art]').forEach(stage=>{
 let frame=0;
 const reset=()=>{stage.style.setProperty('--mx','0deg');stage.style.setProperty('--my','0deg');};
 stage.addEventListener('pointermove',event=>{
  if(preference.matches||event.pointerType==='touch')return;
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{const r=stage.getBoundingClientRect();stage.style.setProperty('--mx',((event.clientX-r.left)/r.width*4-2).toFixed(2)+'deg');stage.style.setProperty('--my',((event.clientY-r.top)/r.height*-3+1.5).toFixed(2)+'deg');});
 });
 stage.addEventListener('pointerleave',reset);preference.addEventListener('change',reset);
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>entries.forEach(entry=>stage.dataset.visible=String(entry.isIntersecting)),{threshold:.05}).observe(stage);
});
