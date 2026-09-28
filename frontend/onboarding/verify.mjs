import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

if (process.platform === 'win32') throw new Error('Run this verification in WSL2 on Windows.');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';
const { chromium } = await import('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const project = `ase-front-onboarding-${randomBytes(6).toString('hex')}`;
const artifacts = join(here, 'results', project);
await mkdir(artifacts, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'ase-front-onboarding-'));
const abort = new AbortController();
const interrupt = () => { abort.abort(); void browser?.close(); };
let browser;
let vite;
let viteLog;
let composeStarted = false;
const passes = [];
const env = {
  ...process.env,
  MYSQL_DATABASE: 'frontend_onboarding', MYSQL_USER: 'onboarding_user',
  MYSQL_PASSWORD: randomBytes(24).toString('hex'),
  MYSQL_ROOT_PASSWORD: randomBytes(24).toString('hex'),
  BACKEND_PORT: '3000', FRONTEND_PORT: '8080',
};
await writeFile(join(temporary, 'override.yaml'), `services:
  backend:
    ports: !override ["127.0.0.1::3000"]
  frontend:
    ports: !override ["127.0.0.1::80"]
`);
const composeArgs = ['compose', '-p', project, '--env-file', '/dev/null',
  '-f', join(repo, 'compose.yaml'), '-f', join(temporary, 'override.yaml')];

function run(command, args, { capture = false, signal = abort.signal, cwd = repo } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, env, signal,
      stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
    let output = '';
    child.stdout?.on('data', data => { output += data; });
    child.once('error', reject);
    child.once('exit', (code, killedBy) => code === 0 ? resolveRun(output.trim())
      : reject(new Error(`${command} ${args.slice(0, 2).join(' ')} failed (${code ?? killedBy})`)));
  });
}
const dc = (args, options) => run('docker', [...composeArgs, ...args], options);
const pass = text => { passes.push(text); console.log(`PASS ${text}`); };
const text = {
  checking: '正在检查服务连接…',
  ready: '后端与数据库连接正常',
  error: '服务暂不可用，请检查服务状态后刷新页面。',
};
async function state(page, expected, name) {
  const locator = page.getByRole('status');
  await locator.filter({ hasText: text[expected] }).waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await locator.innerText(), text[expected]);
  await page.screenshot({ path: join(artifacts, `${name}-${expected}.png`), fullPage: true });
  pass(`${name}: browser ${expected}`);
}
async function health(page, url, expected, name) {
  const response = await page.request.get(`${url}/api/health`, { timeout: 10000 });
  assert.equal(response.status(), expected);
  assert.deepEqual(await response.json(), expected === 200
    ? { status: 'ok', database: 'connected' } : { status: 'error', database: 'unavailable' });
  pass(`${name}: real /api/health HTTP ${expected}`);
}
async function freePort() {
  const server = createServer();
  await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
  const { port } = server.address();
  await new Promise(yes => server.close(yes));
  return port;
}
async function waitForVite(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    abort.signal.throwIfAborted();
    if (vite.exitCode !== null) throw new Error('Vite exited. Inspect vite.log.');
    try {
      const response = await fetch(url, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(1000)]) });
      if (response.ok) return;
    } catch { /* bounded startup polling */ }
    await delay(300, undefined, { signal: abort.signal });
  }
  throw new Error('Vite did not become ready. Inspect vite.log.');
}

process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);
let report;
try {
  console.log(`Test project: ${project}\nArtifacts: ${artifacts}`);
  const dockerVersion = await run('docker', ['version', '--format', '{{.Server.Version}}'], { capture: true });
  const composeVersion = await run('docker', ['compose', 'version', '--short'], { capture: true });
  await dc(['config', '--quiet']);
  composeStarted = true;
  await dc(['up', '-d', '--build', '--wait', '--wait-timeout', '180']);
  const backendURL = `http://${await dc(['port', 'backend', '3000'], { capture: true })}`;
  const nginxURL = `http://${await dc(['port', 'frontend', '80'], { capture: true })}`;
  const port = await freePort();
  const viteURL = `http://127.0.0.1:${port}`;
  viteLog = createWriteStream(join(artifacts, 'vite.log'));
  vite = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort'], {
    cwd: join(repo, 'frontend'), env: { ...process.env, BACKEND_URL: backendURL },
    detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  vite.once('error', error => { console.error(error.message); abort.abort(); });
  vite.stdout.pipe(viteLog, { end: false });
  vite.stderr.pipe(viteLog, { end: false });
  await waitForVite(viteURL);
  browser = await chromium.launch();
  const pages = [];
  const pageErrors = [];
  for (const [name, url] of [['vite', viteURL], ['nginx', nginxURL]]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 760 }, serviceWorkers: 'block' });
    page.on('pageerror', error => pageErrors.push(`${name}: ${error.message}`));
    let release;
    const gate = new Promise(resolveGate => { release = resolveGate; });
    const hold = async route => {
      await gate;
      // StrictMode may abort its first effect's request; the live request still continues.
      try { await route.continue(); } catch (error) {
        if (!route.request().failure()) throw error;
      }
    };
    await page.route('**/api/health', hold);
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      if (name === 'nginx') assert.match(response.headers().server ?? '', /^nginx\//);
      await state(page, 'checking', name);
    } finally { release(); }
    await state(page, 'ready', name);
    await page.unroute('**/api/health', hold);
    await health(page, url, 200, name);
    pages.push({ page, name, url });
  }
  await dc(['stop', 'db']);
  for (const { page, name, url } of pages) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await state(page, 'error', name);
    await health(page, url, 503, name);
  }
  await dc(['up', '-d', '--wait', '--wait-timeout', '120', 'db']);
  for (const { page, name, url } of pages) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await state(page, 'ready', `${name}-recovered`);
    await health(page, url, 200, `${name}-recovered`);
  }
  assert.deepEqual(pageErrors, [], 'Unexpected browser JavaScript exception');
  report = { timestamp: new Date().toISOString(), project, node: process.version,
    docker: dockerVersion, compose: composeVersion, chromium: browser.version(),
    baseline: await run('git', ['rev-parse', 'HEAD'], { capture: true }), passes,
    checkingMethod: 'Temporarily held the real health request, then continued it; no mock response.',
    errorMethod: 'Stopped only the isolated MySQL container, then reloaded each page.' };
} finally {
  if (browser) await browser.close().catch(() => {});
  if (vite?.pid) {
    try { process.kill(-vite.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    await delay(500);
    try { process.kill(-vite.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  viteLog?.end();
  try {
    if (composeStarted) await dc(['down', '--volumes', '--remove-orphans', '--rmi', 'local'], { signal: new AbortController().signal });
  } finally {
    await rm(temporary, { recursive: true, force: true });
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}
await writeFile(join(artifacts, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS frontend onboarding; resources cleaned. Summary: ${join(artifacts, 'summary.json')}`);
