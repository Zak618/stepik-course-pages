import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {releases} from '../../courses/305734-go-pro-max/introduction/versions/releases.mjs';
import {base, folder, course, lesson, unit} from './config.mjs';

const directory = new URL('../../courses/305734-go-pro-max/introduction/versions/', import.meta.url);
const step = JSON.parse(await readFile(new URL('step.json', directory), 'utf8'));
if (step.course !== course || step.lesson !== lesson || step.unit !== unit || step.position !== 6) throw Error('Проверьте адрес шага версий');
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
if (!releases.length || new Set(releases.map(item => item.version)).size !== releases.length) throw Error('Нужен непустой список версий без повторов');
for (const release of releases) {
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(release.version) || !release.summary || !release.changes?.length) throw Error('Проверьте версию и список изменений');
}
const hash = createHash('sha256').update(JSON.stringify(releases));
for (const file of ['picture.css', 'picture.js', 'version-options.mjs']) hash.update(await readFile(new URL(file, directory)));
const document = (title, head, body) => `<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${head}</head><body>${body}</body></html>\n`;
const currentVersion = escape(releases[0].version);
// Главная и плывущие карточки используют один номер из адреса фрейма.
const flyingCards = Array.from({length:5}, (_, index) => {
  return '<div class="release-flight flight-' + index + '" aria-hidden="true"><div class="release-ticket"><i></i><span></span><b>✧</b></div></div>';
}).join('');
const picture = `<section class="release-picture" data-current-version="${currentVersion}" tabindex="0" role="img" aria-label="Летящие карточки версий курса. Наведите указатель или установите фокус, чтобы остановить движение.">
  <div class="release-art">
    <div class="release-aura" aria-hidden="true"></div>
    <svg class="release-ribbons" viewBox="0 0 900 240" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="ribbon" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#72d9cf" stop-opacity="0"/><stop offset=".3" stop-color="#83cce9" stop-opacity=".5"/><stop offset=".6" stop-color="#ac99f3" stop-opacity=".65"/><stop offset="1" stop-color="#d9beff" stop-opacity="0"/></linearGradient>
        <linearGradient id="fine" x1="0" x2="1"><stop stop-color="#8ddcce" stop-opacity="0"/><stop offset=".5" stop-color="#b0a0ed"/><stop offset="1" stop-color="#b0a0ed" stop-opacity="0"/></linearGradient>
      </defs>
      <path class="release-ribbon-wide" d="M-100 220 C150 50 240 240 450 120 S720 60 1000 0"/>
      <path class="release-ribbon-fine" d="M-100 175 C180 10 280 220 470 105 S770 100 1000 -20"/>
      <path class="release-ribbon-fine second" d="M-100 255 C160 90 270 260 450 150 S750 105 1000 25"/>
    </svg>
    <div class="release-world" aria-hidden="true">
      ${flyingCards}
      <div class="release-hero">
        <div class="release-backplate"></div>
        <div class="release-main-ticket">
          <div class="release-ticket-dots"><i></i><i></i><i></i></div>
          <strong></strong>
          <svg class="release-orbit-star" viewBox="0 0 32 32"><path d="M16 0c0 11 5 16 16 16-11 0-16 5-16 16C16 21 11 16 0 16 11 16 16 11 16 0Z"/></svg>
          <div class="release-ticket-line"><i></i><i></i></div>
        </div>
      </div>
      <i class="release-spark spark-1"></i><i class="release-spark spark-2"></i><i class="release-spark spark-3"></i><i class="release-spark spark-4"></i>
      <span class="release-dust dust-1"></span><span class="release-dust dust-2"></span><span class="release-dust dust-3"></span>
    </div>
  </div>
</section>`;
const revision = hash.update(picture).digest('hex').slice(0, 12);
const pictureHtml = document('Go-шечка Pro MAX · версии', `<link rel="stylesheet" href="picture.css?v=${revision}"><script src="picture.js?v=${revision}" defer></script>`, picture);
// Only attributes/styles preserved by Stepik's native text sanitizer.
const history = releases.map(release => `<div style="margin:0 0 24px;"><h3 style="font-size:20px;color:#6550b7;margin:0 0 8px;">v${escape(release.version)}</h3><p style="margin:0 0 10px;">${escape(release.summary)}</p><ul style="margin:0;">${release.changes.map(change => `<li style="margin:6px 0;">${escape(change)}</li>`).join('')}</ul></div>`).join('\n');
const frame = src => `<iframe height="240" src="${escape(src)}" style="width:100%;height:240px;border:0;margin:0 0 24px;background:#fff;" width="100%"></iframe>`;
const parameters = new URLSearchParams({version:releases[0].version,v:revision});
const text = frame(`${base}${folder}/versions/picture.html?${parameters}`) + '\n' + history;
const previewStyle = `<style>*{box-sizing:border-box}body{margin:0;background:#fff;color:#25334c;font:18px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:950px;margin:auto;padding:28px 24px}iframe{max-width:100%}li{padding-left:3px}@media(max-width:520px){main{padding:16px 12px;font-size:16px}}</style>`;
await writeFile(new URL('picture.html', directory), pictureHtml);
await writeFile(new URL('index.html', directory), document('Версии курса · локальный черновик', previewStyle, `<main>${frame(`picture.html?${parameters}`)}${history}</main>`));
await writeFile(new URL('publication.json', directory), JSON.stringify({draft:!step.source, course, lesson, unit, source:step.source, suggestedPosition:step.position, title:'Версии курса', revision, frameHeight:240, text}, null, 2)+'\n');
console.log(`Версии курса v${releases[0].version}: ${fileURLToPath(directory)}index.html`);
