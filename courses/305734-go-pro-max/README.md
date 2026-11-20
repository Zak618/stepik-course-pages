# Go-шечка Pro MAX

Шесть интерактивных шагов [введения в Stepik](https://stepik.org/lesson/2700348/step/1?unit=2740161).

```sh
node scripts/go-pro-max-introduction/build.mjs
node scripts/go-pro-max-introduction/preview.mjs
```

Просмотр: <http://localhost:8796/>.

В `introduction/` лежат шесть шагов по порядку. Тексты и разметка отдельных
интерактивов в `content.mjs`, оформление в `introduction.css`, поведение
в `introduction.js`. Приветствие и карта берутся из общих шаблонов.
После правок выполните сборку. `preview.*` нужны только для просмотра.

Знакомство и цель соответствуют двум существующим заданиям Stepik.
Ответы ученики пишут в обычных полях Stepik, без копирования.
В локальном просмотре под двумя вопросами показан пример такого поля.
ID шагов, задания и баллы сохраняются. Общая публикация 37 введений этот курс не затрагивает.

## Отдельная публикация

```sh
node scripts/go-pro-max-introduction/layout.mjs
node scripts/go-pro-max-introduction/native-layout.mjs
node scripts/go-pro-max-introduction/publish.mjs
node scripts/go-pro-max-introduction/publish.mjs --apply
node scripts/go-pro-max-introduction/publish.mjs --verify
```

Для браузерной проверки нужен Playwright Core. Его путь задаётся в `PLAYWRIGHT_MODULE`.
`layout.mjs` измеряет страницы. `native-layout.mjs` учитывает боковую панель Stepik
и подбирает совместимые высоты вставок в `publication.json`.
Перед `--apply` загрузите страницы в GitHub Pages. Снимки и проверки остаются
в игнорируемой `.local-publication/go-pro-max-intro-release-20261120/`.
