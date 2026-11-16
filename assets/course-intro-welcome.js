(() => {
  const id=Number(new URLSearchParams(location.search).get('course'));
  const item=window.COURSE_INTRO_INDEX?.find(c=>c.id===id);
  if(item)document.querySelector('#app').innerHTML=item.html;
})();
