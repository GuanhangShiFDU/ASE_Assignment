# Backend Onboarding 准备阶段验证记录

对应工作卡：#71144366。本文记录 Codex 在史冠航本机协助执行的验证，**不代表处理人李全昊已在自己的环境执行或团队已确认接口**。

## 环境与基线

- 日期：2026-09-28，约 10:01（Asia/Shanghai）。
- GitHub `master` 基线：`452caef7efafe609ccae83744c5ea34170ed2775`。
- 执行时本地 HEAD：`06457cb17e8d2e83dacc3f3549476626705d17aa`；其文件树与上述 master 一致。本次新增验证脚本、接入文档及 README 链接均未提交。
- 宿主机：macOS，Node.js v26.0.0、npm 11.12.1。推荐开发版本仍为 `.nvmrc` 中的 Node.js 24；运行行为使用容器内 Node.js v24.21.0 验证。
- Docker Engine 29.4.3，Docker Compose v5.1.4。
- MySQL：`mysql:8.4`，本次镜像内实际版本 8.4.11（Linux aarch64）。
- 隔离项目：`ase-onboarding-29c5ef104e3e`；独立数据卷，无宿主机端口映射，仅启动 backend 与 db。

## 实际执行结果

| 检查 | 操作与实际结果 | 结论 |
| --- | --- | --- |
| 依赖安装 | `npm --prefix backend ci` 安装 78 个包，退出码 0；未修改 lockfile | 通过 |
| 本机语法检查 | `npm --prefix backend run check`，三个源文件检查通过，退出码 0 | 通过 |
| 容器环境 | 后端构建成功（依赖安装层使用缓存），backend/db 均 healthy；容器内再次运行 `npm run check` 成功 | 通过 |
| 正常健康接口 | 实际 HTTP 请求返回 200，`{"status":"ok","database":"connected"}` | 通过 |
| 首次数据库初始化 | SQL 查询全表，恰有一行 `id=1,value=0` | 通过 |
| 重复执行初始化 | 先在临时库将值设为 7，再执行 `database/init.sql` 两次；SQL 查询仍恰有一行 `id=1,value=7` | 通过 |
| 数据库不可用 | 停止临时 db 容器；实际 HTTP 请求返回 503，`{"status":"error","database":"unavailable"}` | 通过 |
| 数据库恢复 | 重启 db 并等待 healthy；未重启 backend，健康接口恢复 HTTP 200 | 通过 |
| 资源清理 | 验证脚本退出码 0；测试容器、网络、数据卷和临时后端镜像已删除 | 通过 |

运行命令：

```bash
bash backend/scripts/verify-onboarding.sh
```

原始运行日志随交接 ZIP 的 `evidence/runtime.log` 提供；以下为关键输出摘录：

```text
PASS health: HTTP 200 {"status":"ok","database":"connected"}
PASS initial row: id=1 value=0 (exactly one row)
PASS repeated initialization: id=1 value=7 after two reruns (exactly one row)
PASS health: HTTP 503 {"status":"error","database":"unavailable"}
PASS health: HTTP 200 {"status":"ok","database":"connected"}
PASS backend onboarding runtime checks; disposable resources will now be removed.
```

## 发现的问题与范围

本轮未发现需要修改现有后端业务源码的运行故障。原 README 未展开后端文件职责、宿主机直接启动的环境限制和可重复验证步骤，已通过接入文档补充。

三个计数业务接口仍未实现，本文未测试计数 API、前端交互、并发计数或完整课程持久化序列。这里的 SQL 非零值仅用于证明初始化幂等性；它不是业务接口实现。

## 处理人接手后填写

- 执行人、日期、操作系统、Node/Docker/Compose 版本：待填写。
- 本人使用的分支、基线 SHA、最终提交 SHA：待填写。
- `npm ci`、语法检查及验证脚本结果与日志：待本人执行后填写。
- 对 `app.js`、`server.js`、`db.js` 和配置传递的理解及遇到的问题：待填写。
- 与刘乐翔、刘子扬确认接口的日期、结论、调整内容：待确认。
- 卡片验收人和最终结论：待验收。

## 接收端脚本实测记录

- 执行账号的 Git 姓名：Quanhao Li。
- 执行时间（UTC）：2026-09-28T05:28:59Z。
- 克隆的 master 基线：`452caef7efafe609ccae83744c5ea34170ed2775`。
- 工作分支：`qhli-#71144366`。
- 环境：Darwin / arm64，Node.js v24.21.0，npm 11.19.0，5.5.1。
- `npm ci`、后端语法检查、隔离运行验证均退出成功；以下是此次运行实际输出。
- 原始日志保存在本机 `.git/onboarding-71144366/`，不随 Git 提交；可另行附到工作卡作为证据。
- 这份自动记录仅证明脚本运行结果；代码理解、接口讨论及验收结论仍需本人补充，未自动标记为完成。

```text
PASS health: HTTP 200 {"status":"ok","database":"connected"}
PASS initial row: id=1 value=0 (exactly one row)
PASS repeated initialization: id=1 value=7 after two reruns (exactly one row)
PASS health: HTTP 503 {"status":"error","database":"unavailable"}
PASS health: HTTP 200 {"status":"ok","database":"connected"}
PASS backend onboarding runtime checks; disposable resources will now be removed.
```
