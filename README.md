# Страницы курсов WEB HACKER

Введения и интерактивные страницы для Stepik.

## Структура

| Папка | Что внутри |
| --- | --- |
| [courses/](courses/README.md) | Готовые введения, отдельная папка для каждого курса |
| [shared/course-introductions/](shared/course-introductions/README.md) | Общие шаблоны, тексты и оформление |
| [previews/course-introductions/](previews/course-introductions/index.html) | Просмотр введений для автора |
| [scripts/course-introductions/](scripts/course-introductions/) | Чтение данных, сборка, проверка и публикация |
| [docs/](docs/project-history.md) | Архив прошлых изменений и проверок |

Страницы каждого курса лежат в `courses/<ID>-<название>/introduction/`.
Редактируйте общие шаблоны и `copy.mjs`, а не готовые HTML.
Старые страницы mini оставлены в корне, чтобы не ломать ссылки из Stepik.

## Локальный просмотр

```sh
node scripts/course-introductions/snapshot.mjs
node scripts/course-introductions/build.mjs
node scripts/course-introductions/preview.mjs
```

Открыть: <http://localhost:8795/>.

## Проверка и публикация

```sh
node scripts/course-introductions/check.mjs
node scripts/course-introductions/publish.mjs
node scripts/course-introductions/publish.mjs --apply
node scripts/course-introductions/publish.mjs --verify
```

Для проверки нужен Playwright Core; путь к нему задаётся через `PLAYWRIGHT_MODULE`.
Перед `--apply` страницы должны быть загружены в GitHub Pages.
Обычный запуск `publish.mjs` выполняет только предварительную проверку.

Обновляются 37 введений. Mini служит образцом; Go pro и Go Pro MAX исключены.
Задания, баллы, порядок шагов, особые материалы и настройки курсов сохраняются.
Ключи, исходные снимки и журналы не публикуются; они остаются в игнорируемых локальных файлах.

Подробнее: [как устроены введения](shared/course-introductions/README.md).
