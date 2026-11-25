const picture = document.querySelector('.release-picture');
const scene = document.querySelector('.release-art');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let frame = null;

// Dynamic import also works with previously published classic-script HTML.
import('./version-options.mjs').then(({versionOptions}) => {
  const versions = versionOptions(location.search, {
    current:picture.dataset.currentVersion || document.querySelector('.release-main-ticket strong').textContent,
    history:(picture.dataset.versionHistory || '').split(','),
  });
  const label = 'v' + versions.current;
  document.querySelector('.release-main-ticket strong').textContent = label;
  picture.style.setProperty('--release-version-font', Math.min(62,300 / label.length) + 'px');
  picture.setAttribute('aria-label', 'Летящие карточки версий курса. Текущая версия ' + label + '. Наведите указатель или установите фокус, чтобы остановить движение.');
  const flyingVersions = versions.history.length ? versions.history : [versions.current];
  document.querySelectorAll('.release-ticket span').forEach((node,index) => {
    node.textContent = 'v' + flyingVersions[index % flyingVersions.length];
    node.style.fontSize = Math.min(27,135 / node.textContent.length) + 'px';
  });
});

function resetTilt() {
  cancelAnimationFrame(frame);
  frame = null;
  scene.style.setProperty('--rx', '0deg');
  scene.style.setProperty('--ry', '0deg');
}
picture.addEventListener('pointermove', event => {
  if (motion.matches || event.pointerType !== 'mouse') return;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const bounds = picture.getBoundingClientRect();
    scene.style.setProperty('--ry', ((event.clientX - bounds.left) / bounds.width - .5) * 9 + 'deg');
    scene.style.setProperty('--rx', -((event.clientY - bounds.top) / bounds.height - .5) * 7 + 'deg');
  });
});
picture.addEventListener('pointerleave', resetTilt);
picture.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch') picture.classList.add('is-paused');
});
for (const type of ['pointerup','pointercancel']) {
  document.addEventListener(type, () => picture.classList.remove('is-paused'));
}
picture.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    event.preventDefault();
    picture.classList.toggle('is-paused');
  }
});
motion.addEventListener('change', resetTilt);
new IntersectionObserver(entries => {
  picture.classList.toggle('is-hidden', !entries[0].isIntersecting);
}).observe(picture);
document.addEventListener('visibilitychange', () => {
  picture.classList.toggle('is-hidden', document.hidden);
  if (document.hidden) resetTilt();
});
