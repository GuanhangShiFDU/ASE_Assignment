import assert from 'node:assert/strict';
import { resolve, relative, isAbsolute } from 'node:path';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { createHarness, sourceRoot } from '../../frontend/onboarding/counter-harness.mjs';

const { values } = parseArgs({ options: {
  target: { type: 'string' }, output: { type: 'string' }, formal: { type: 'boolean' }, sha: { type: 'string' },
} });
const target = resolve(values.target ?? sourceRoot);
const git = args => execFileSync('git', args, { cwd: target, encoding: 'utf8' }).trim();
const source = git(['rev-parse', 'HEAD']);
const origin = git(['remote', 'get-url', 'origin']);
const clean = git(['status', '--porcelain', '--untracked-files=all']) === '';
if (values.formal) {
  assert.match(values.sha ?? '', /^[a-f0-9]{40}$/i, 'Formal acceptance requires the specified full --sha');
  assert.equal(source, values.sha, 'Wrong CodeArts commit');
  assert.equal(origin, 'git@codehub.devcloud.cn-north-4.huaweicloud.com:c1aa0a224dba4c2591226b87a5af9407/lab1-counter.git');
  assert.equal(clean, true, 'Formal target must be a clean CodeArts checkout');
  assert.ok(values.output, 'Formal results must be written outside the clean target checkout');
  const output = resolve(values.output);
  const relativeOutput = relative(target, output);
  assert.ok(isAbsolute(relativeOutput) || relativeOutput === '..' || relativeOutput.startsWith('../') || relativeOutput.startsWith('..\\'), 'Do not modify the tested checkout');
}
const h = await createHarness({ target, output: values.output && resolve(values.output), retainVolume: true });
h.meta.scope = values.formal ? 'CodeArts specified-commit acceptance' : 'local integration rehearsal; not final CodeArts acceptance';
h.meta.specifiedSHA = source;
h.meta.results = {};
const result = (id, actual) => { h.meta.results[id] = { status: '通过', actual }; h.pass(`${id}: ${actual}`); };
let success = false;
try {
  await h.start();
  h.meta.results['ENV-01'] = { status: '待人工核验', actual: `Source=${origin}; SHA=${source}; clean=${clean}. 项目命名、五位成员、助教权限与另一位组员复核仍需真实截图/确认。` };
  result('ENV-02', '三个服务由本轮源码构建启动，使用新项目和新命名卷；环境、构建、服务和挂载信息已记录');
  const page = await h.page();
  await page.goto(h.url); await h.visible(page, 0); await h.stored(0, 'F-01'); await h.screenshot(page, 'F-01');
  result('F-01', '首次页面和数据库均为 0，数据库仅有 id=1 一条记录');
  const reads = [];
  for (let i = 0; i < 3; i++) {
    const response = await fetch(`${h.url}/api/counter`);
    const body = await response.json();
    reads.push({ status: response.status, body });
    assert.equal(response.status, 200); assert.deepEqual(body, { value: 0 });
  }
  await h.write('F-02-http.json', reads); await h.stored(0, 'F-02'); result('F-02', '连续 3 次 GET=0，读取前后数据库不变');
  for (const expected of [1, 2, 3]) await h.click(page, 'increment', expected);
  await h.click(page, 'decrement', 2); await h.stored(2, 'F-03'); await h.screenshot(page, 'F-03'); result('F-03', '页面按 1、2、3、2 更新，SQL=2');
  await page.reload(); await h.visible(page, 2);
  await page.goto('about:blank'); await page.goto(h.url); await h.visible(page, 2);
  await h.stored(2, 'F-04'); await h.screenshot(page, 'F-04'); result('F-04', '刷新和重新打开页面均读取 2');
  const other = await h.page(); await other.goto(h.url); await h.visible(other, 2);
  await page.reload(); await other.reload(); await h.visible(page, 2); await h.visible(other, 2);
  await h.stored(2, 'F-05'); await h.screenshot(other, 'F-05'); result('F-05', '独立无痕上下文读取共享值 2');
  for (const expected of [1, 0, -1]) await h.click(page, 'decrement', expected);
  await page.reload(); await h.visible(page, -1); await h.stored(-1, 'F-06'); await h.screenshot(page, 'F-06'); result('F-06', '减至 -1，刷新和 SQL 均为 -1');
  await h.snapshot('P-01-before'); await h.dc(['restart']);
  await h.dc(['up', '-d', '--wait', '--wait-timeout', '180']); await h.snapshot('P-01-after');
  await h.refreshURL(); await page.goto(h.url); await h.visible(page, -1); await h.stored(-1, 'P-01-retained'); await h.screenshot(page, 'P-01-retained');
  await h.click(page, 'increment', 0); await h.stored(0, 'P-01-continued'); result('P-01', 'restart 后保留 -1，并成功继续写入 0');
  for (let expected = 1; expected <= 7; expected++) await h.click(page, 'increment', expected);
  await h.stored(7, 'P-02'); await h.screenshot(page, 'P-02');
  const before = await h.snapshot('P-02');
  const volume = before.flatMap(c => c.mounts).find(m => m.Type === 'volume' && m.Destination === '/var/lib/mysql');
  assert.ok(volume?.Name); result('P-02', '页面与 SQL=7，原容器 ID 和数据库卷已记录');
  await h.dc(['down']);
  assert.equal(await h.dc(['ps', '-a', '-q']), '');
  await h.write('P-03-empty-services.txt', await h.dc(['ps', '-a']));
  await h.write('P-03-retained-volume.json', await h.run('docker', ['volume', 'inspect', volume.Name]));
  result('P-03', 'down 未加 -v：项目容器已删除，原命名卷仍存在');
  await h.up(); const after = await h.snapshot('P-04');
  for (const container of after) assert.ok(!before.some(old => old.id === container.id));
  const newVolume = after.flatMap(c => c.mounts).find(m => m.Destination === '/var/lib/mysql');
  assert.equal(newVolume.Name, volume.Name);
  const fresh = await h.page(); await fresh.goto(h.url); await h.visible(fresh, 7); await h.stored(7, 'P-04'); await h.screenshot(fresh, 'P-04');
  result('P-04', '新容器 ID 与旧容器不同，复用原卷；新无痕页面和 SQL 均=7');
  await h.click(fresh, 'decrement', 6); await fresh.reload(); await h.visible(fresh, 6); await h.stored(6, 'P-05'); await h.screenshot(fresh, 'P-05');
  result('P-05', '重建后减一到 6，刷新与 SQL 仍为 6；主验收序列完成');

  await h.dc(['stop', 'db']); await fresh.reload();
  await fresh.getByRole('alert').filter({ hasText: '读取失败' }).waitFor();
  assert.equal(await fresh.getByTestId('counter-value').innerText(), '—'); await h.screenshot(fresh, 'E-01');
  const failedRead = await fetch(`${h.url}/api/counter`); assert.equal(failedRead.status, 503);
  await h.write('E-01-http.json', { status: failedRead.status, body: await failedRead.json() });
  await h.dc(['up', '-d', '--wait', '--wait-timeout', '120', 'db']);
  await fresh.getByRole('button', { name: '重新读取', exact: true }).click(); await h.visible(fresh, 6); await h.stored(6, 'E-01-recovered');
  result('E-01', '实际停库后读取 503、可见提示且无假 0；恢复后读取 6');
  await h.dc(['stop', 'db']); await fresh.getByRole('button', { name: '加一', exact: true }).click();
  await fresh.getByRole('alert').filter({ hasText: '操作未确认' }).waitFor();
  assert.equal(await fresh.getByTestId('counter-value').innerText(), '6'); await h.screenshot(fresh, 'E-02');
  await h.dc(['up', '-d', '--wait', '--wait-timeout', '120', 'db']);
  await fresh.getByRole('button', { name: '重新读取', exact: true }).click(); await h.visible(fresh, 6); await h.stored(6, 'E-02-recovered');
  result('E-02', '实际停库后写入失败，保留上次确认值；恢复后仍=6，无自动重放');
  const init = await readFile(resolve(target, 'database/init.sql'), 'utf8');
  await h.sql(init); await h.sql(init); await h.stored(6, 'R-01'); result('R-01', '重复执行初始化两次，原计数 6 保持不变');
  // A separate supplementary round after the complete mandatory sequence. No resets.
  const responses = await Promise.all(Array.from({ length: 30 }, async (_, i) => {
    const action = i % 3 === 0 ? 'decrement' : 'increment';
    const response = await fetch(`${h.url}/api/counter/${action}`, { method: 'POST', signal: AbortSignal.timeout(15000) });
    const body = await response.json(); assert.equal(response.status, 200); assert.ok(Number.isInteger(body.value));
    return { action, status: response.status, body };
  }));
  await h.write('C-01-http.json', responses); await fresh.reload(); await h.visible(fresh, 16); await h.stored(16, 'C-01'); await h.screenshot(fresh, 'C-01');
  result('C-01', '主验收结束后另起补充轮次，从 6 并发 +20/-10；30 次成功，GET/页面/SQL=16');
  assert.deepEqual(h.meta.pageErrors ?? [], []);
  if (values.formal) { assert.equal(git(['rev-parse', 'HEAD']), source); assert.equal(git(['status', '--porcelain', '--untracked-files=all']), ''); }
  h.meta.finalConclusion = '自动化覆盖项通过；ENV-01 人工权限证据、组员复核和最终提交版本确认仍待补充，不能据此直接关闭卡片。';
  success = true;
} catch (error) {
  h.meta.failure = error.message;
  throw error;
} finally { await h.close(success); }
console.log(`PASS integration sequence. Evidence: ${h.artifacts}; retained volume: ${h.meta.retainedVolume}`);
