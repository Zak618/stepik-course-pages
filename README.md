# Страницы курса на Stepik

Страницы называются по шаблону:

`<курс>-module-<номер>-lesson-<номер>-step-<номер>.html`

Например: `go-mini-module-01-lesson-01-step-01.html` — приветствие для первого шага первого урока первого модуля курса «Go-шечка (mini)».

После публикации GitHub Pages эту страницу нужно вставить в содержимое шага Stepik как iframe, чтобы она открывалась прямо в уроке:

```html
<iframe
  src="https://zak618.github.io/stepik-course-pages/go-mini-module-01-lesson-01-step-01.html"
  title="Добро пожаловать на курс Go-шечка (mini)"
  width="100%"
  height="820"
  style="border:0;display:block;max-width:100%"
  loading="lazy">
</iframe>
```

Не заменяй `src` на обычную ссылку: iframe показывает страницу прямо внутри шага.

Для второго шага этого же урока используется страница `go-mini-module-01-lesson-01-step-02.html`:

```html
<iframe
  src="https://zak618.github.io/stepik-course-pages/go-mini-module-01-lesson-01-step-02.html"
  title="Telegram-канал @webosnovy"
  width="100%"
  height="820"
  style="border:0;display:block;max-width:100%"
  loading="lazy">
</iframe>
```
