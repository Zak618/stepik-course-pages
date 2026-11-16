(() => {
  const data=window.COURSE_INTRO_INDEX,select=document.querySelector('#course');
  for(const item of data){const o=document.createElement('option');o.value=item.id;o.textContent=item.title;select.append(o);}
  function render(){
    const item=data.find(c=>c.id===Number(select.value));
    if(!item)return;
    document.querySelector('#preview').innerHTML=item.html;
    document.querySelector('#open-course').href=item.url;
    for(const frame of document.querySelectorAll('#preview iframe')){
      const source=new URL(frame.src);
      if(source.origin==='https://zak618.github.io'&&source.pathname.startsWith('/stepik-course-pages/')){
        frame.src=new URL(source.pathname.slice('/stepik-course-pages/'.length)+source.search,location.href).href;
      }
    }
    history.replaceState(null,'','#'+item.id);
  }
  const initial=Number(location.hash.slice(1));
  if(data.some(c=>c.id===initial))select.value=initial;
  select.addEventListener('change',render);render();
})();
