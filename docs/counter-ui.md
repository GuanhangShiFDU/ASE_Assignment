# Counter UI（#71144917）

负责人：刘乐翔。史冠航与 Codex 协助准备，接收人需阅读、复测后提交。查询接口 #71144918 必须先合并，才能运行本卡完整验证。

## 页面行为

- 首次加载 GET `/api/counter`，未返回前显示“—”和加载提示，不冒充初值 0。
- 加一/减一调用已约定 POST，仅展示后端成功返回的整数，支持负数。
- 请求期间禁用加减和重新读取，使用同步请求锁防止连续点击重复提交。
- 失败显示可见提示；若保留旧值，明确标成“上次确认的计数”。先重新读取成功才能继续加减，不自动重放 POST。
- 刷新或新无痕窗口重新查询共享值；不要求实时推送其他页面的修改。
- 请求超时 10 秒；拒绝不含整数 value 的错误响应；Effect 清理使旧请求不能覆盖新结果。

`frontend/src/App.jsx` 管理请求与显示状态，`styles.css` 提供桌面/手机样式。根 README 同步更新运行状态、接口及完整 SQL 查询命令。

## 开发与验证

页面开发：`npm --prefix frontend ci`、`npm --prefix frontend run dev`。开发请求通过 Vite 转发，生产构建由 Nginx 提供页面并代理 `/api`。

实际浏览器验证（Node >=24、Docker 和 Compose >=2.24.4，Windows 使用 WSL2）：

```bash
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix frontend/onboarding ci
PLAYWRIGHT_BROWSERS_PATH=0 npm --prefix frontend/onboarding run install:browser
node frontend/onboarding/verify-counter.mjs
```

脚本创建独立三服务 Compose 项目，使用真实 Chromium、HTTP API 和 MySQL；临时延迟真实请求检查加载与保存状态，不伪造成功响应。覆盖首次读取、按钮防重、正常加减/负数、刷新、独立浏览器上下文、真实停库读写失败、恢复，以及手机布局。截图和摘要在 `frontend/onboarding/results/ase-counter-*/`，不提交临时目录。数据库测试结束只清理该测试项目。

历史 `verify.mjs` 保留为最初健康页的 onboarding 验证，针对当前计数页使用 `verify-counter.mjs`。本卡不添加 GitHub Actions 测试门禁。

## 接收人确认

- 本机测试与截图：已完成前端生产构建及真实 Chromium、HTTP API、MySQL 联调，五组验证全部通过。
- 已理解页面状态、请求锁、失败后重新读取：已复核。首次读取期间不显示伪造的 0；请求期间禁用操作并防止重复提交；失败后显示明确错误，重新读取成功后再继续操作。
- 联调问题及接口确认：已确认当前 master 包含查询接口依赖；本机加减、负数、刷新、独立浏览器上下文、数据库停机及恢复场景均验证通过，未发现阻塞问题。
- PR：创建后补充实际链接。

## 准备阶段实测

2026-10-08，史冠航本机由 Codex 协助执行。基线为 `a08ab44cb8dd2397e00b08a9cabc5eda0b0bb434` 加查询/UI 未提交修改；该 SHA 本身不是已完成业务版本。

前端生产构建成功；`verify-counter.mjs` 在独立项目 `ase-counter-f13d4590cde9` 通过全部五组浏览器检查，未发现页面 JavaScript 异常。实际经过加载占位、保存与防重、负数/刷新/独立上下文、实际停库读写失败、恢复和手机布局。证据在交接包 evidence 目录。本轮不是同学的本机结果，也不是最终课程验收。

## 接收端实际执行记录

- Git 姓名：LexiangLiu。时间（UTC）：2026-10-09T01:31:13Z。
- 克隆基线：`36e6cbec60cd7a0e78d4e512cdfb3930055d5e99`。交接分支：`lxliu-#71144917`。
- 已实际完成前端生产构建及真实浏览器/数据库验证，退出码 0；截图路径见本机日志。
- 完整日志保存在本机 `.git/card-71144917/`，本人代码理解、接口确认/复核信息仍需补充。
