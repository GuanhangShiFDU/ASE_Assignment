# README 独立复现记录（#71144922）

**复核结论：通过。** 史冠航于 2026-10-10 从 CodeArts 新克隆指定版本，亲自完成页面操作、SQL 查询、服务重启和保留原卷的容器重建。主流程 **0 → 2 → -1 → 0 → 7 → 6** 已完成，刷新、无痕读取及两次恢复后的继续写入均符合预期。

本记录由 Codex 根据史冠航在对话中提供的截图和终端回执整理。Codex 协助排查镜像网络与端口占用，并补充只读状态采集；下面明确区分执行来源，不将协助操作记为史冠航本人操作。

## 版本与环境

| 项目 | 实际值 |
| --- | --- |
| 复核人 / 日期 | 史冠航，26113050105；2026-10-10，UTC+08:00 |
| 主验收执行人 | 杨润东；本记录为另一位组员的 README 复核 |
| CodeArts 来源 | `git@codehub.devcloud.cn-north-4.huaweicloud.com:c1aa0a224dba4c2591226b87a5af9407/lab1-counter.git` |
| 分支 / 完整 Commit SHA | `master` / `fb6c48085b1d9f2d25592343309f28de0e21c520` |
| 克隆目录 / 工作区 | `~/lab1-counter-review`；克隆后 `git status --short` 无输出 |
| 操作系统 | macOS 26.6.2（25G83） |
| Git / Docker / Compose | Git 2.50.1 (Apple Git-155)；Docker 客户端/服务端均为 29.4.3；Compose v5.1.4 |
| 浏览器 | Chrome 普通窗口及无痕窗口；版本未采集，截图保留地址栏和无痕标识 |
| Compose 项目 / 访问地址 | `lab1-gshi-review-20261010` / `http://localhost:18082`；后端端口 13000 |
| 数据卷 / 挂载 | `lab1-gshi-review-20261010_mysql_data` / `/var/lib/mysql` |
| 卷创建时间 / 数据库镜像 | `2026-10-10T08:20:16Z` / `mysql:8.4` |

主机此前部署过本项目，本次使用新的克隆目录、独立 Compose 项目和新建数据卷；不将这台 Mac 描述成从未部署过项目的主机。课程干净部署的主验收记录仍见 [validation.md](../validation.md) 中杨润东的实际执行摘要。

## 操作与结果

| 步骤 | 实际结果与执行来源 | 证据 |
| --- | --- | --- |
| CodeArts 克隆与环境检查 | 史冠航本人克隆，记录 SHA、干净工作区及工具版本 | [01：环境回执](../evidence/manual-review-gshi-20261010/01-environment.txt) |
| 配置与三服务启动 | 本人复制本地 `.env` 并通过 `config -q`；网络/端口问题经协助解决。Codex 检查 backend/db healthy、frontend Up | [02：首次构建失败](../evidence/manual-review-gshi-20261010/02-startup-failure.txt)、[04：启动排查](../evidence/manual-review-gshi-20261010/04-port-conflict-and-recovery.txt) |
| 初始值 0 | 本人页面截图为 0；Codex 只读 SQL 为 `id=1, value=0`，API 为 `{"value":0}`，健康接口为 `{"status":"ok","database":"connected"}` | [05：初始页面](../evidence/manual-review-gshi-20261010/05-initial-zero-18082.png)、[04：SQL/API](../evidence/manual-review-gshi-20261010/04-port-conflict-and-recovery.txt) |
| 加三次、减一次 | 本人按步骤回传结果 2，页面显示“已与数据库同步”；未逐次拍摄中间值 | [06：结果 2](../evidence/manual-review-gshi-20261010/06-after-increment-decrement-two.png) |
| 刷新及无痕读取 | 本人刷新后的普通窗口与新无痕窗口均为 2 | [07：刷新](../evidence/manual-review-gshi-20261010/07-refresh-two.png)、[08：无痕](../evidence/manual-review-gshi-20261010/08-incognito-two.png) |
| 允许负数并保存 | 本人按减三次的步骤回传 -1 截图，亲自执行 SQL 得到 `id=1, value=-1` | [09：页面 -1](../evidence/manual-review-gshi-20261010/09-negative-one.png)、[10：SQL -1](../evidence/manual-review-gshi-20261010/10-database-negative-one.txt) |
| 服务重启后保留数据 | 本人执行 `restart`，再以 `up -d --no-recreate --wait --wait-timeout 120` 等待恢复；三服务运行，刷新仍为 -1 | [11：重启后 -1](../evidence/manual-review-gshi-20261010/11-after-restart-negative-one.png)、[12：重启和服务状态](../evidence/manual-review-gshi-20261010/12-restart-services.txt) |
| 重启后继续写入 | 本人加一次并刷新，结果为 0 | [13：恢复写入 0](../evidence/manual-review-gshi-20261010/13-after-restart-write-zero.png) |
| 重建前状态 | 本人加七次后页面为 7；Codex 只读 SQL 为 7，并保存容器完整 ID、原卷信息和挂载 | [14：页面 7](../evidence/manual-review-gshi-20261010/14-before-rebuild-seven.png)、[15：重建前状态](../evidence/manual-review-gshi-20261010/15-before-rebuild-state.txt) |
| 删除容器、保留原卷重建 | 本人执行不带 `-v` 的 `down`，确认卷仍存在，再执行 `up -d --build --wait --wait-timeout 120`。三个容器和网络先删除后重建，新无痕页面仍为 7；Codex 对照确认三个完整容器 ID 均改变，卷名称、创建时间及挂载不变，SQL 仍为 7 | [16：重建后页面 7](../evidence/manual-review-gshi-20261010/16-after-rebuild-seven.png)、[17：本人重建回执](../evidence/manual-review-gshi-20261010/17-rebuild-user-receipt.txt)、[18：SQL、容器及原卷对照](../evidence/manual-review-gshi-20261010/18-after-rebuild-state.txt) |
| 重建后继续读写 | 本人减一次并刷新，页面为 6；亲自执行 SQL 得到 `id=1, value=6` | [19：最终页面 6](../evidence/manual-review-gshi-20261010/19-after-rebuild-write-six.png)、[20：最终 SQL 6](../evidence/manual-review-gshi-20261010/20-database-final-six.txt) |

## 排障与复测

- 首次构建读取 Docker Hub 的 `node:24-alpine` 元数据时返回 EOF。Codex 单独拉取先复现失败，再次重试成功；没有修改代理、Dockerfile 或密码。后续用户构建成功，重建日志亦显示构建完成。
- 初次建议的 18080 端口被旧预览容器 `ase-preview-ea055152-frontend-1` 占用，本次前端停留在 Created。Codex 确认 18082 空闲后，将复核目录 `.env` 中唯一的 `FRONTEND_PORT` 改为 18082，再启动该前端；数据库、项目名、原卷及计数保持不变。README 已包含端口冲突的处理说明。
- [03：旧预览的 18080 截图](../evidence/manual-review-gshi-20261010/03-old-preview-18080-not-acceptance.png) 仅用于说明端口误认，**不计入验收通过证据**。有效页面证据均使用 18082。
- 本轮未发现尚未解决的功能问题。以上两项环境问题均已解决，失败记录保留，不覆盖原始回执。

## 结论与范围

本组“另一位组员按 README 复现”的检查已完成，覆盖 CodeArts 克隆、三服务部署、共享计数、负数、刷新/无痕、服务重启、保留原卷的容器重建及恢复后继续写入。最终页面与数据库均为 **6**。

本次人工复核未重新执行故障注入、初始化幂等性和并发补充测试；这些结果保留在其真实被测版本的历史自动化报告中。从 `ba87cf52eb50c6cf429bdf1013e1c2873f81f972` 到本次 `fb6c48085b1d9f2d25592343309f28de0e21c520`，Git 对照只有 README、文档及证据变化，应用代码和部署配置没有变化。收尾材料合并后仍须核对 GitHub/CodeArts 同步并冻结交付 SHA，见 [提交核对表](../submission.md)。
