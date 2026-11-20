// Local-only build. Shared greetings and the existing universal course map.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {renderPart} from '../course-introductions/render.mjs';
import {pages, renderPage} from '../../courses/305734-go-pro-max/introduction/content.mjs';
import {version} from './config.mjs';

const folder = 'courses/305734-go-pro-max/introduction';
const profile = {
  id: 305734, title: 'Go-шечка Pro MAX',
  topics: 'На курсе изучим Go, Git, Docker и SQL. Будем писать код, решать задачи и собирать сервис доставки: с каталогом, корзиной и заказами.',
};
await mkdir(folder, {recursive: true});
// Course-specific wording; the universal catalogue and other courses stay intact.
await writeFile(folder + '/course-map-catalog.js', (await readFile('assets/go-mini-course-catalog.js', 'utf8')).replaceAll(' — ', ' '));
for (const page of pages) {
  let html;
  if (['welcome', 'map'].includes(page.part)) {
    html = await renderPart(profile, page.part);
    for (const [from, to] of Object.entries({
      'assets/go-mini-intro.css': 'shared/course-introductions/base.css',
      'assets/go-mini-embed.css': 'shared/course-introductions/embedded.css',
      'assets/go-mini-embed.js': 'shared/course-introductions/embedded.js',
    })) html = html.replaceAll(from, to);
    html = html.replace(/\/preview-interactions\.js\?course=305734/g, 'shared/course-introductions/interactions.js?v=unified-intros-20261116-3');
    html = html.replace('<head>', '<head><base href="../../../"><script>window.COURSE_INTRO_CONFIG={id:305734,title:"Go-шечка Pro MAX"};</script>');
    html = html.replaceAll('assets/go-mini-course-catalog.js', folder + '/course-map-catalog.js').replaceAll(' — ', ' · ');
  } else html = renderPage(page.part).replace('href="introduction.css"', `href="introduction.css?v=${version}"`).replace('src="introduction.js"', `src="introduction.js?v=${version}"`);
  await writeFile(folder + '/' + page.file, html);
}
console.log('Go Pro MAX: 6 local pages built. No Stepik changes.');
