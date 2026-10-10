// Shared helpers for real-browser checks against isolated Compose deployments.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir, platform, release, arch } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';
const { chromium } = await import('playwright');
export const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export async function createHarness({ target = sourceRoot, output, retainVolume = false } = {}) {
  const project = `ase-counter-${randomBytes(6).toString('hex')}`;
  const artifacts = output ?? join(sourceRoot, 'frontend/onboarding/results', project);
  await mkdir(artifacts, { recursive: true });
  const temporary = await mkdtemp(join(tmpdir(), 'ase-counter-'));
  const env = { ...process.env, MYSQL_DATABASE: 'counter_verification', MYSQL_USER: 'counter_verify',
    MYSQL_PASSWORD: randomBytes(24).toString('hex'), MYSQL_ROOT_PASSWORD: randomBytes(24).toString('hex'),
    BACKEND_PORT: '3000', FRONTEND_PORT: '8080' };
  const override = join(temporary, 'override.yaml');
  await writeFile(override, 'services:\n  backend:\n    ports: !override ["127.0.0.1::3000"]\n  frontend:\n    ports: !override ["127.0.0.1::80"]\n');
  const emptyEnv = join(temporary, 'empty.env');
  await writeFile(emptyEnv, '', { mode: 0o600 });
  const compose = ['compose', '-p', project, '--env-file', emptyEnv, '-f', join(target, 'compose.yaml'), '-f', override];
  const events = [];
  let browser, url, started = false;
  function run(command, args, { cwd = target, input } = {}) {
    return new Promise((yes, no) => {
      const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '', stderr = '';
      child.stdout.on('data', data => { stdout += data; });
      child.stderr.on('data', data => { stderr += data; });
      child.on('error', no);
      child.on('close', code => {
        events.push({ time: new Date().toISOString(), command, args, code, stdout, stderr });
        code === 0 ? yes(stdout.trim()) : no(new Error(`${command} failed (${code}): ${stderr.slice(-1500)}`));
      });
      child.stdin.on('error', () => {});
      child.stdin.end(input);
    });
  }
  const dc = args => run('docker', [...compose, ...args]);
  const meta = { timestamp: new Date().toISOString(), project, target,
    os: `${platform()} ${release()} ${arch()}`, node: process.version, passes: [], scope: 'development' };
  async function write(name, data) {
    await writeFile(join(artifacts, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
  }
  function pass(message) { meta.passes.push(message); console.log(`PASS ${message}`); }
  async function sql(statement = 'SELECT id, value FROM counter ORDER BY id;') {
    return run('docker', [...compose, 'exec', '-T', 'db', 'sh', '-c',
      'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --protocol=TCP -h 127.0.0.1 -u"$MYSQL_USER" "$MYSQL_DATABASE" --batch --skip-column-names'], { input: statement });
  }
  async function stored(expected, name) {
    const result = await sql();
    assert.equal(result, `1\t${expected}`);
    await write(`${name}-sql.txt`, `SELECT id, value FROM counter ORDER BY id;\n${result}\n`);
  }
  async function visible(page, expected) {
    await page.waitForFunction(value => document.querySelector('[data-testid="counter-value"]')?.textContent === String(value)
      && !document.querySelector('button[aria-label="加一"]')?.disabled, expected, { timeout: 15000 });
  }
  async function screenshot(page, name) {
    await page.screenshot({ path: join(artifacts, `${name}.png`), fullPage: true });
    await write(`${name}-context.json`, { url: page.url(), time: new Date().toISOString(), browser: meta.chromium });
  }
  async function click(page, action, expected) {
    const pending = page.waitForResponse(r => r.url().endsWith(`/api/counter/${action}`) && r.request().method() === 'POST');
    await page.getByRole('button', { name: action === 'increment' ? '加一' : '减一', exact: true }).click();
    const response = await pending;
    assert.equal(response.status(), 200);
    assert.deepEqual(await response.json(), { value: expected });
    await visible(page, expected);
  }
  async function page() {
    const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, serviceWorkers: 'block' });
    const tab = await context.newPage();
    tab.on('pageerror', error => { (meta.pageErrors ??= []).push(error.message); });
    tab.on('response', async response => {
      if (!response.url().includes('/api/')) return;
      try { events.push({ time: new Date().toISOString(), http: response.url(), method: response.request().method(), status: response.status(), body: await response.json() }); }
      catch { /* Aborted loading requests have no body. */ }
    });
    return tab;
  }
  async function refreshURL() {
    url = `http://${await dc(['port', 'frontend', '80'])}`;
    meta.url = url;
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
        if (response.ok) return url;
      } catch { /* The published port/Nginx may still be becoming ready. */ }
      await delay(300);
    }
    throw new Error('Frontend proxy did not become ready');
  }
  async function up() {
    await dc(['up', '-d', '--build', '--wait', '--wait-timeout', '180']);
    return refreshURL();
  }
  async function snapshot(name) {
    await write(`${name}-services.txt`, await dc(['ps', '-a']));
    const ids = (await dc(['ps', '-q'])).split(/\s+/).filter(Boolean);
    assert.equal(ids.length, 3);
    const format = '{"id":{{json .Id}},"image":{{json .Config.Image}},"name":{{json .Name}},"state":{{json .State.Status}},"health":{{with index .State "Health"}}{{json .Status}}{{else}}null{{end}},"mounts":{{json .Mounts}}}';
    const raw = await run('docker', ['inspect', '--format', format, ...ids]);
    const states = raw.split('\n').map(line => JSON.parse(line));
    await write(`${name}-containers.json`, states);
    return states;
  }
  async function start() {
    console.log(`Test project: ${project}\nArtifacts: ${artifacts}`);
    meta.baseline = await run('git', ['rev-parse', 'HEAD']);
    meta.branch = await run('git', ['branch', '--show-current']);
    meta.workingChanges = await run('git', ['status', '--porcelain']);
    meta.origin = await run('git', ['remote', 'get-url', 'origin']);
    meta.docker = await run('docker', ['version', '--format', '{{.Client.Version}} / {{.Server.Version}}']);
    meta.compose = await run('docker', ['compose', 'version', '--short']);
    await dc(['config', '--quiet']);
    started = true;
    await up();
    browser = await chromium.launch();
    meta.chromium = browser.version();
    await snapshot('initial');
  }
  async function close(success) {
    if (browser) await browser.close();
    try {
      if (started) await dc(['down', '--remove-orphans', '--rmi', 'local', ...(retainVolume ? [] : ['--volumes'])]);
      meta.cleanup = retainVolume ? 'Containers removed; original volume retained. No -v used.' : 'Disposable containers, volume and local images removed.';
      if (retainVolume) meta.retainedVolume = `${project}_mysql_data`;
    } finally {
      await rm(temporary, { recursive: true, force: true });
      meta.success = success;
      await write('events.json', events);
      await write('summary.json', meta);
    }
  }
  return { meta, artifacts, project, target, run, dc, sql, stored, visible, screenshot, click, page,
    write, pass, start, up, snapshot, close, refreshURL, get url() { return url; } };
}
