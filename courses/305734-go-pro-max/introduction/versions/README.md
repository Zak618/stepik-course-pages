# Версии курса

[Шестой шаг введения в Stepik](https://stepik.org/lesson/2700348/step/6?unit=2740161),
перед «Что впереди». ID шага `12600204` сохранён в `step.json`.

## Как поменять версию без GitHub

1. Откройте редактирование шага и режим HTML.
2. В адресе `picture.html` поменяйте `version=1.1` на нужный номер.
3. Под анимацией добавьте обычным текстом запись о новой версии. Сохраните шаг.

Например, `version=1.2`: на главной и на всех плывущих карточках будет v1.2.
Параметр `v` служебный, его менять не нужно. Старые записи останутся текстом ниже.
Пересборка и публикация на GitHub для смены номера не нужны.
Одна правка заголовка под картинкой её номер не меняет.

## Разработка анимации

`picture.css`, `picture.js` и `version-options.mjs` отвечают за иллюстрацию.
`releases.mjs` содержит только начальный пример для локального просмотра.
История курса хранится и редактируется в Stepik. Публикатор меняет только адрес
фрейма и сохраняет весь авторский текст, другие шаги, ответы и баллы.

```sh
node scripts/go-pro-max-introduction/build-versions.mjs
node scripts/go-pro-max-introduction/preview-versions.mjs
node --test scripts/go-pro-max-introduction/version-links.test.mjs
```

Просмотр: <http://localhost:8812/>. Сборка создаёт `picture.html`, `index.html`
и `publication.json`. Фрейм высотой 240 px, история обычным текстом под ним.

После изменения самой анимации загрузите файлы в GitHub Pages, затем выполните:

```sh
node scripts/go-pro-max-introduction/publish-versions.mjs --apply
node scripts/go-pro-max-introduction/publish-versions.mjs --verify
node scripts/go-pro-max-introduction/check-versions.mjs
```

Без флага публикатор ничего не меняет. Браузерной проверке нужен Playwright Core;
его путь задаётся через `PLAYWRIGHT_MODULE`. После push дождитесь успешного
workflow `Publish course pages` в GitHub Actions. Его можно запустить вручную.
Ссылки на старые файлы не публикуются.
