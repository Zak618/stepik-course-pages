// Dedicated, loopback-only preview. Never reads project credentials or .env.
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, realpath, open } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { constants } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.STEPIK_SLICES_PORT || 8781);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid preview port');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'go-mini-slices-preview-'));
const env = {
  PATH: '/usr/bin:/bin', GOCACHE: path.join(temporary, 'cache'),
  GOPATH: path.join(temporary, 'gopath'), GOPROXY: 'off', GOSUMDB: 'off',
  GOTOOLCHAIN: 'local', GOENV: 'off', GO111MODULE: 'off', CGO_ENABLED: '0',
  GOMAXPROCS: '2', GOMEMLIMIT: '256MiB', TMPDIR: temporary,
};
const runner = path.join(temporary, 'runner');
const children = new Map();

function signalGroup(child, signal) {
  if (!child.pid) return;
  try { process.kill(-child.pid, signal); } catch { child.kill(signal); }
}

function execute(command, args, input = '', timeout = 25000) {
  return new Promise((resolve, reject) => {
    // The helper catches TERM and kills its separate compiler/program groups.
    // During helper compilation, all Go tools belong to this detached group.
    const child = spawn(command, args, { cwd: temporary, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = [], stderr = [], bytes = 0, failure, hardKill;
    let finished;
    const closed = new Promise(done => { finished = done; });
    const stop = () => {
      signalGroup(child, 'SIGTERM');
      hardKill ??= setTimeout(() => signalGroup(child, 'SIGKILL'), 1500);
    };
    children.set(child, { stop, closed });
    const timer = setTimeout(() => { failure = Error('Локальный запуск превысил время ожидания.'); stop(); }, timeout);
    const collect = (chunk, isError) => {
      bytes += chunk.length;
      if (bytes > 180000) { failure = Error('Превышен лимит ответа Go.'); stop(); return; }
      (isError ? stderr : stdout).push(chunk);
    };
    child.stdout.on('data', chunk => collect(chunk, false));
    child.stderr.on('data', chunk => collect(chunk, true));
    child.once('error', error => { failure = error; });
    child.once('close', code => {
      clearTimeout(timer); clearTimeout(hardKill); children.delete(child); finished();
      if (failure || code !== 0) reject(failure || Error(Buffer.concat(stderr).toString('utf8') || 'Локальный Go недоступен.'));
      else resolve(Buffer.concat(stdout).toString('utf8'));
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

let stopping = false;
let server;
let cleanupPromise;
function cleanup() {
  cleanupPromise ??= (async () => {
    stopping = true;
    const running = [...children.values()];
    for (const child of running) child.stop();
    await Promise.all(running.map(child => child.closed));
    // Only this process's mkdtemp directory, never a path from the request.
    await rm(temporary, { recursive: true, force: true });
  })();
  return cleanupPromise;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  server?.close(); server?.closeAllConnections(); await cleanup(); process.exit(0);
});

try {
  console.log('Подготавливаю локальный Go для срезов.');
  await execute('/usr/bin/go', ['build', '-o', runner, path.join(root, 'scripts/lib/slices-runner.go')], '', 90000);
  const warmup = JSON.parse(await execute(runner, [], JSON.stringify({ code: 'package main\nimport "fmt"\nfunc main(){ query := "Готово"; fmt.Println(query) }' }), 60000));
  if (!warmup.ok) throw Error(warmup.diagnostic);
} catch (error) { await cleanup(); throw error; }

const hosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
const allowedFile = /^(?:courses\/305666-go-mini\/modules\/05-functions-and-data\/lesson-02-(?:preview|step-(?:0[1-9]|1[0-9]|2[0-2]))\.html|assets\/go-mini-slices(?:-[a-z0-9]+)*\.(?:js|css)|assets\/go-mini-conditions\.css)$/;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const commonHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const answer = (res, status, diagnostic, phase = 'request') => json(res, status, { ok: false, stdout: '', diagnostic, phase });
function json(res, status, value) {
  res.writeHead(status, { ...commonHeaders, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}
let active = false;
server = http.createServer({ maxHeaderSize: 8192 }, async (req, res) => {
  try {
    if (stopping || !hosts.has(req.headers.host)) { answer(res, 403, 'Недопустимый адрес просмотра.'); return; }
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) { answer(res, 403, 'Недопустимый источник запроса.'); return; }
    if (!req.url.startsWith('/') || req.url.startsWith('//')) { answer(res, 400, 'Некорректный адрес.'); return; }
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/slices/run') {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); answer(res, 405, 'Используйте POST.'); return; }
      if (req.headers.origin !== url.origin || req.headers['content-type'] !== 'application/json' || req.headers['x-go-mini-preview'] !== '1' || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) {
        answer(res, 403, 'Запуск доступен только из локальной страницы урока.'); return;
      }
      if (active) { res.setHeader('Connection', 'close'); answer(res, 429, 'Дождитесь завершения предыдущего запуска.', 'busy'); return; }
      if (Number(req.headers['content-length'] || 0) > 20000) { res.setHeader('Connection', 'close'); answer(res, 413, 'Слишком большой запрос.'); return; }
      // Reserve before reading the body: simultaneous chunked uploads cannot
      // all pass the concurrency check and start multiple compilers.
      active = true;
      const bodyTimeout = setTimeout(() => req.destroy(Error('Request body timeout')), 5000);
      try {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 20000) { answer(res, 413, 'Слишком большой запрос.'); return; }
          chunks.push(chunk);
        }
        clearTimeout(bodyTimeout);
        let data;
        try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch { answer(res, 400, 'Некорректный JSON.'); return; }
        if (!data || typeof data.code !== 'string' || (data.input !== undefined && typeof data.input !== 'string')) { answer(res, 400, 'Нужен текст программы.'); return; }
        if (!data.code.length || Buffer.byteLength(data.code) > 12000) { answer(res, 413, 'Код должен содержать от 1 до 12000 байт.', 'limit'); return; }
        if (Buffer.byteLength(data.input || '') > 4096) { answer(res, 413, 'Вход ограничен 4096 байтами.', 'limit'); return; }
        if (stopping) { answer(res, 503, 'Просмотр останавливается.', 'server'); return; }
        const result = JSON.parse(await execute(runner, [], JSON.stringify({ code: data.code, input: data.input || "" })));
        json(res, 200, result);
      } finally { clearTimeout(bodyTimeout); active = false; }
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); answer(res, 405, 'Метод не поддерживается.'); return; }
    let relative;
    try {
      relative = ['/', '/slices', '/slices/'].includes(url.pathname)
        ? 'courses/305666-go-mini/modules/05-functions-and-data/lesson-02-preview.html' : decodeURIComponent(url.pathname).replace(/^\//, '');
    } catch { answer(res, 400, 'Некорректный адрес.'); return; }
    if (!allowedFile.test(relative)) { answer(res, 404, 'Файл не найден.'); return; }
    let resolved;
    try { resolved = await realpath(path.join(root, relative)); }
    catch (error) { if (error.code === 'ENOENT') { answer(res, 404, 'Страница ещё не подготовлена.'); return; } throw error; }
    // Refuse even in-project symlinks to non-allowlisted files, not only escapes.
    if (resolved !== path.join(root, relative)) { answer(res, 404, 'Файл не найден.'); return; }
    // Do not follow a final symlink substituted after the realpath check.
    const handle = await open(resolved, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    let content;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 2 * 1024 * 1024) { answer(res, 404, 'Файл не найден.'); return; }
      if (req.method !== 'HEAD') {
        // Read at most the checked size plus one byte, even if a local editor
        // grows/replaces the file while this request is in progress.
        const buffer = Buffer.alloc(stat.size + 1);
        let bytes = 0;
        while (bytes < buffer.length) {
          const part = await handle.read(buffer, bytes, buffer.length - bytes, bytes);
          if (!part.bytesRead) break;
          bytes += part.bytesRead;
        }
        if (bytes > stat.size) { answer(res, 413, 'Файл слишком большой.'); return; }
        content = buffer.subarray(0, bytes);
      }
    } finally { await handle.close(); }
    res.writeHead(200, {
      ...commonHeaders, 'Content-Type': types[path.extname(relative)],
      'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self' http://localhost:${port} http://127.0.0.1:${port}`,
    });
    res.end(content);
  } catch {
    if (!res.headersSent) answer(res, 500, 'Локальный запуск не завершился. Попробуйте ещё раз.', 'server');
    else res.end();
  }
});
server.maxConnections = 32;
server.maxHeadersCount = 32;
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 3000;
server.on('error', async error => {
  await cleanup();
  console.error(error.code === 'EADDRINUSE' ? 'Порт занят. Задайте STEPIK_SLICES_PORT.' : 'Не удалось запустить просмотр.');
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}/slices`));
