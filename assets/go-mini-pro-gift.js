(() => {
  const button = document.querySelector('#copy');
  const code = document.querySelector('#promo');
  const status = document.querySelector('#copy-status');
  button.hidden = false;
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motion) document.querySelector('.gift').classList.add('animate');
  code.addEventListener('click', () => code.select());
  let copying = false;
  button.addEventListener('click', async () => {
    if (copying) return;
    copying = true;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code.value);
        copied = true;
      }
    } catch { /* Cross-origin frames may deny the modern clipboard API. */ }
    if (!copied) {
      code.focus();
      code.select();
      try { copied = document.execCommand('copy'); } catch { /* Keep manual selection. */ }
    }
    if (copied) {
      status.textContent = 'Скопировано!';
      button.innerHTML = 'Скопировать код <span aria-hidden="true">✓</span>';
      button.focus({preventScroll: true});
    } else {
      status.textContent = 'Выделите код и скопируйте его.';
      code.focus({preventScroll: true});
      code.select();
    }
    copying = false;
  });
})();
