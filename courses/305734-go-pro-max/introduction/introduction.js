(() => {
  'use strict';
  const page = document.body.dataset.page;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'webhacker:go-pro-max:introduction:' + page;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Drafts are optional. */ }
  const save = value => { try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Private iframe. */ } };
  const animate = (element, name) => {
    element.classList.remove(name);
    void element.offsetWidth;
    element.classList.add(name);
  };
  function choose(selector, selected) {
    document.querySelectorAll(selector).forEach(button => button.setAttribute('aria-pressed', String(button === selected)));
  }
  if (page === 'telegram') {
    const posts = {
      news: ['✦', 'Новости', 'Рассказываем, что готовим и какие курсы уже вышли.'],
      materials: ['{ }', 'Материалы', 'Делимся полезными ссылками и находками для тех, кто пишет код.'],
      updates: ['↻', 'Обновления', 'Пишем о новых уроках и изменениях в курсах.'],
    };
    document.querySelectorAll('[data-post]').forEach(button => button.addEventListener('click', () => {
      choose('[data-post]', button);
      const [mark, label, description] = posts[button.dataset.post];
      document.querySelector('#note-mark').textContent = mark;
      document.querySelector('#note-label').textContent = label;
      document.querySelector('#post-description').textContent = description;
      animate(document.querySelector('.post-scene'), 'sending');
    }));
  }

  if (page === 'experience') {
    const experiences = {
      first: ['✦', 'С первых строк.', 'Будем разбирать новые конструкции по одной. Запускайте примеры и не спешите.', 'Я пока не программировал(а).'],
      other: ['{ }', 'Новый язык. Знакомый старт.', 'Переменные, условия и циклы пригодятся и здесь. Посмотрим, как они устроены в Go.', 'Я уже пробовал(а) программировать на другом языке.'],
      go: ['Go', 'Идём дальше.', 'Сверим основы, затем перейдём к тестам, HTTP, базе данных и проекту.', 'Я уже пишу на Go.'],
    };
    function display(button, motion = true) {
      choose('[data-experience]', button);
      const [mark, title, note] = experiences[button.dataset.experience];
      document.querySelector('#experience-mark').textContent = mark;
      document.querySelector('#experience-title').textContent = title;
      document.querySelector('#experience-note').textContent = note;
      if (motion) animate(document.querySelector('.passport-core'), 'changed');
    }
    document.querySelectorAll('[data-experience]').forEach(button => {
      if (button.dataset.experience === saved.choice) display(button, false);
      button.addEventListener('click', () => { saved.choice = button.dataset.experience; display(button); save(saved); });
    });
  }

  if (page === 'goal') {
    const goals = {
      api: ['{ }', 'Чтобы приложение отвечало.', 'Разберём HTTP и научимся принимать запросы и отправлять ответы на Go.', 'Хочу научиться писать свой API на Go.'],
      database: ['▤', 'Чтобы данные не пропадали.', 'Изучим SQL и подключим PostgreSQL к Go. Будем хранить каталог, корзину и заказы.', 'Хочу научиться работать с базой данных из Go.'],
      service: ['✦', 'Чтобы всё работало вместе.', 'Соединим Go, HTTP и PostgreSQL в сервисе доставки. Для запуска используем Docker.', 'Хочу собрать приложение целиком: от кода до запуска.'],
      language: ['Go', 'Чтобы понимать свой код.', 'Разберём язык от первых конструкций до функций, интерфейсов и конкурентного выполнения.', 'Хочу разобраться в Go и увереннее писать код.'],
    };
    function display(button, motion = true) {
      choose('[data-goal]', button);
      const [mark, title, note] = goals[button.dataset.goal];
      document.querySelector('.delivery-scene').dataset.focus = button.dataset.goal;
      document.querySelector('#goal-symbol').textContent = mark;
      document.querySelector('#goal-title').textContent = title;
      document.querySelector('#goal-note').textContent = note;
      if (motion) animate(document.querySelector('.goal-description'), 'changed');
    }
    document.querySelectorAll('[data-goal]').forEach(button => {
      if (saved.choice === button.dataset.goal) display(button, false);
      button.addEventListener('click', () => { saved.choice = button.dataset.goal; display(button); save(saved); });
    });
  }

  if (page === 'start') {
    const scene = document.querySelector('.build-scene');
    const button = document.querySelector('#build-project');
    const status = document.querySelector('#build-status');
    const phases = ['Всё начинается с кода', 'Пишем на Go', 'Добавляем тесты и HTTP', 'Подключаем инструменты и базу', 'Собираем сервис доставки'];
    let timers = [];
    const stage = number => {
      scene.dataset.stage = String(number);
      document.querySelector('#build-phase').textContent = phases[number];
      if (number === 4) {
        button.disabled = false;
        button.textContent = 'Посмотреть ещё раз';
        status.textContent = 'Каталог, корзина и заказы. Соберём это своими руками.';
      }
    };
    button.addEventListener('click', () => {
      timers.forEach(clearTimeout);
      timers = [];
      button.disabled = true;
      button.textContent = 'Собираем…';
      status.textContent = 'По одной новой возможности за раз.';
      stage(0);
      if (reduced.matches) { stage(4); return; }
      for (let number = 1; number <= 4; number++) timers.push(setTimeout(() => stage(number), 150 + (number - 1) * 1100));
    });
    addEventListener('pagehide', () => timers.forEach(clearTimeout));
  }

  // The local review shell follows content height; no nested scroll or blank tail.
  if (window.parent !== window && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    let scheduled = false;
    const report = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const height = Math.ceil(document.querySelector('.lesson').getBoundingClientRect().height);
        parent.postMessage({type: 'go-pro-max-intro:height', height}, location.origin);
      });
    };
    new ResizeObserver(report).observe(document.querySelector('.lesson'));
    report();
  }
})();
