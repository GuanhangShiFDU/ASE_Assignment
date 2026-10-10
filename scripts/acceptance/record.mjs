// Import only a successful, clean CodeArts run; never label a local rehearsal final.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { resolve, basename, join } from 'node:path';
const input = resolve(process.argv[2] ?? '');
assert.ok(process.argv[2], 'Usage: node scripts/acceptance/record.mjs <evidence-directory>');
const report = JSON.parse(await readFile(join(input, 'summary.json'), 'utf8'));
assert.equal(report.success, true);
assert.equal(report.scope, 'CodeArts specified-commit acceptance');
assert.equal(report.workingChanges, '');
assert.equal(report.specifiedSHA, report.baseline);
const required = ['ENV-02', 'F-01', 'F-02', 'F-03', 'F-04', 'F-05', 'F-06', 'P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'E-01', 'E-02', 'R-01', 'C-01'];
for (const id of required) assert.equal(report.results[id]?.status, '通过', id);
const run = `acceptance-${report.project}`;
const destination = resolve('docs/evidence', run);
await mkdir(resolve('docs/evidence'), { recursive: true });
await mkdir(destination, { recursive: false });
for (const entry of await readdir(input, { withFileTypes: true })) {
  assert.ok(entry.isFile() && /\.(json|png|txt)$/.test(entry.name), `Unexpected evidence file: ${entry.name}`);
  await copyFile(join(input, entry.name), join(destination, entry.name));
}
const evidence = `evidence/${run}`;
const file = 'docs/validation.md';
let text = await readFile(file, 'utf8');
for (const [id, result] of Object.entries(report.results)) {
  const heading = `### ${id}：`;
  const start = text.indexOf(heading);
  assert.ok(start >= 0, `Missing case ${id}`);
  let end = text.indexOf('\n### ', start + heading.length);
  const section = text.indexOf('\n## ', start + heading.length);
  if (end < 0 || (section >= 0 && section < end)) end = section >= 0 ? section : text.length;
  let block = text.slice(start, end);
  block = block.replace(/- \*\*状态\*\*：[^\n]*/, `- **状态**：${result.status}`)
    .replace(/- \*\*实际结果\*\*：[^\n]*/, `- **实际结果**：${result.actual}`)
    .replace(/- \*\*证据位置\*\*：[^\n]*/, `- **证据位置**：[本轮摘要](${evidence}/summary.json)、[命令与 HTTP 记录](${evidence}/events.json)；同目录下 ${id} 开头的 SQL/截图/容器记录。`)
    .replace(/- \*\*缺陷\/阻塞与复测\*\*：[^\n]*/, `- **缺陷/阻塞与复测**：${id === 'ENV-01' ? '成员/助教权限证据和另一位组员复核待补。' : '本次执行未发现该用例失败；版本变更后须重新验证。'}`);
  text = text.slice(0, start) + block + text.slice(end);
}
text = text.replace(/^> .*$/m, '> 已记录一次 CodeArts 指定版本的实际自动化验收；16 项通过，ENV-01 人工证据及另一位组员复核待补，尚不能关闭验收卡。');
text = text.replace(/\| 未执行 \|[^\n]*/, '| 未执行 | 0（另有待人工核验 1 项） |')
  .replace(/\| 通过 \/ 失败 \/ 阻塞 \|[^\n]*/, '| 通过 / 失败 / 阻塞 | 16 / 0 / 0；待人工核验 1 |')
  .replace(/\| 当前验收结论 \|[^\n]*/, '| 当前验收结论 | 自动化覆盖项通过，人工证据与复核待完成 |')
  .replace(/\| 未解决缺陷与阻塞 \|[^\n]*/, '| 未解决缺陷与阻塞 | ENV-01 权限证据、另一位组员复核待补 |')
  .replace(/\| 最终 CodeArts 分支和完整 SHA \|[^\n]*/, `| 最终 CodeArts 分支和完整 SHA | 来自 master 的提交 ${report.baseline}；若最终交付代码变化需复测 |`);
const fields = {
  '运行编号（建议 YYYYMMDD-执行人-轮次）': run,
  '操作系统、版本、CPU 架构': report.os,
  'Git、Docker 客户端与服务端、Compose 版本': `Docker ${report.docker}; Compose ${report.compose}; Git 版本另补`,
  '浏览器 A / B、版本（或 B 为独立无痕会话）': `Chromium ${report.chromium}，独立无痕上下文`,
  '验收来源分支 / 完整 Commit SHA': `CodeArts master 来源，检出 ${report.baseline}`,
  '本地工作区是否干净': '被测 CodeArts checkout 在执行前后均干净；证据保存在另一目录',
  'Compose 项目名、访问 URL、端口': `${report.project}; ${report.url}（本轮临时端口）`,
  '数据卷实际名称、挂载路径、镜像版本': `${report.retainedVolume}; /var/lib/mysql; mysql:8.4，详见容器记录`,
  '是否首次部署 / 数据卷是否全新': '随机独立项目使用新卷；主流程未删除卷或手工恢复计数',
};
for (const [label, value] of Object.entries(fields)) {
  text = text.split('\n').map(line => line.startsWith(`| ${label} |`) ? `| ${label} | ${value} |` : line).join('\n');
}
text += `\n## CodeArts 实际执行摘要：${run}\n\n- 时间：${report.timestamp}。被测完整 SHA：\`${report.baseline}\`。\n- 工具在 GitHub 交接分支运行，业务从独立、干净的 CodeArts checkout 构建；两者不是同一个工作区。\n- 证据：[summary.json](${evidence}/summary.json)、[events.json](${evidence}/events.json)。\n- 主流程 0 → 2 → -1 → 0 → 7 → 6 已完成。之后另起补充并发轮次从 6 到 16，不影响已记录的主流程结果。\n- 原卷保留：\`${report.retainedVolume}\`；容器已停止并移除。\n- 人工待补：执行人、项目/仓库网页链接、成员及助教权限截图、另一位组员姓名/日期/README 复现确认。\n`;
await writeFile(file, text);
console.log(`Imported successful CodeArts run into ${file}; manual evidence remains pending.`);
