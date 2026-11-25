import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const directory = new URL('../../courses/305734-go-pro-max/introduction/versions/', import.meta.url);
const allowed = new Map([['/', ['index.html','text/html']], ['/picture.html', ['picture.html','text/html']], ['/picture.css', ['picture.css','text/css']], ['/picture.js', ['picture.js','text/javascript']], ['/version-options.mjs', ['version-options.mjs','text/javascript']]]);
const port = Number(process.env.GO_MAX_VERSIONS_PORT || 8812);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid port');
const server = createServer(async(request, response) => {
  const entry = allowed.get(new URL(request.url, 'http://localhost').pathname);
  if (!entry || !['GET','HEAD'].includes(request.method)) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const body = await readFile(new URL(entry[0], directory));
    response.writeHead(200, {'content-type':entry[1]+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(500); response.end('Build the local draft first'); }
});
server.listen(port, '127.0.0.1', () => console.log('Только локальный просмотр: http://localhost:' + port + '/'));
