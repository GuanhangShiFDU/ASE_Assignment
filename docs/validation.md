# Lab 1 测试与验收记录

> 杨润东已完成一次 CodeArts 指定版本验收；2026-10-10 又在史冠航本机由 Codex 复测最新合并版本，16 项自动化覆盖项通过。ENV-01 权限证据及组员本人复核待补。历史运行保留于文末及证据目录。

依据：[课程 Lab 1 要求](https://openmsg.yuque.com/openmsg/gp3cfs/srlobx960pg94ozp)。QA 用例最初编写于 `7f8d1f9d1e5cddfce3c9d37c4b372a5f959ec7b2`。本张验收卡须在查询 API、Counter UI 和加减 API 全部合并并同步到 CodeArts 后执行。接口成功格式参考根 README，具体错误码以团队确认后的约定为准。

## 1. 验收版本与环境（每轮单独记录）

| 字段 | 本轮实际值 |
| --- | --- |
| 运行编号（建议 YYYYMMDD-执行人-轮次） | acceptance-ase-counter-eab851738aa1 |
| 执行人、日期与时区 | Codex 在史冠航本机执行自动化复测；开始于 2026-10-10 11:09:28（UTC+08:00）；不代替史冠航本人的 README 复核签名 |
| 操作系统、版本、CPU 架构 | darwin 25.6.0 arm64 |
| Git、Docker 客户端与服务端、Compose 版本 | Git 2.50.1 (Apple Git-155); Docker 29.4.3 / 29.4.3; Compose 5.1.4 |
| 浏览器 A / B、版本（或 B 为独立无痕会话） | Chromium 153.0.8010.12，独立无痕上下文 |
| CodeArts 项目名称与链接 | 待核验：按课程要求核对命名，不以截图简称代替 |
| CodeArts 仓库链接 | SSH：`git@codehub.devcloud.cn-north-4.huaweicloud.com:c1aa0a224dba4c2591226b87a5af9407/lab1-counter.git`；网页链接待从仓库首页复制 |
| 验收来源分支 / 完整 Commit SHA | CodeArts master 来源，检出 ba87cf52eb50c6cf429bdf1013e1c2873f81f972 |
| GitHub 与 CodeArts 版本一致性 | 2026-10-10 检查时两个 master 均为 `ba87cf52eb50c6cf429bdf1013e1c2873f81f972` |
| 本地工作区是否干净 | 被测 CodeArts checkout 在执行前后均干净；证据保存在另一目录 |
| Compose 项目名、访问 URL、端口 | ase-counter-eab851738aa1; http://127.0.0.1:55721（本轮临时端口） |
| 数据卷实际名称、挂载路径、镜像版本 | ase-counter-eab851738aa1_mysql_data; /var/lib/mysql; mysql:8.4，详见容器记录 |
| 是否首次部署 / 数据卷是否全新 | 随机独立项目使用新卷；主流程未删除卷或手工恢复计数 |
| 网络、资源或权限限制 | SSH 克隆、镜像构建与本轮测试成功；CodeArts 网页需登录，未核验成员/助教权限 |

可运行 `bash scripts/qa/capture-environment.sh` 采集本机信息，输出到忽略 Git 的 `docs/qa/local-evidence/`。采集脚本只读，不启动应用、不运行计数用例、不把测试标为通过。浏览器版本、CodeArts 权限和数据卷挂载等需实际操作时另行记录。

课程要求由一名组员从 **CodeArts** 在未部署过本项目的环境中克隆提交版本。交接脚本从 GitHub 获取验证工具，再单独从 CodeArts 克隆干净的被测版本；本轮同样使用独立 CodeArts checkout、新 Compose 项目和新数据卷，证据输出在被测目录外。不能用 GitHub 工具目录或旧开发数据库冒充被测环境。

## 2. 状态、证据与缺陷规则

- **未执行**：只完成设计，尚未开始操作；这是本文所有用例的初始状态。
- **阻塞**：尝试执行但前置条件不满足；写清原因和关联工作卡，不填“通过”。若业务卡尚未合并或同步到 CodeArts，应记录依赖阻塞。
- **通过**：实际结果符合全部预期，并提供版本及证据。
- **待人工核验**：自动克隆/版本检查已执行，但成员/助教权限证据或组员复核未完成，不能计入通过。
- **失败**：实际结果与预期不一致，关联缺陷；保留失败证据。修复后另记复测版本与结果，不覆盖原记录。

证据命名：`<用例ID>-<步骤>-<before或after>.<扩展名>`。图片保存到 `docs/images/<运行编号>/`；拟提交的脱敏日志/SQL 输出保存为 `docs/evidence/<运行编号>/*.txt`。原始日志可留在 `docs/qa/local-evidence/<运行编号>/`，审核后只提交必要证据。不要提交 `.env`、密码、私钥或含认证信息的完整 Compose 展开结果。

每份证据应能对应具体用例、操作前后数值、版本和操作时间。浏览器截图尽量包含地址栏及结果；API 截图/日志保留方法、路径、HTTP 状态和响应体；数据库截图/日志保留查询语句与实际记录。自动截图没有地址栏时，配合摘要注明访问环境和用例，不只交一张脱离上下文的图片。

缺陷按 [缺陷模板](qa/defect-template.md) 记录。未执行不等于零缺陷，也不能据此宣布验收通过。

## 3. 后续实际执行时的公共操作

以下命令保留为手工复现说明。自动执行和证据导入见 [Integration & Acceptance](integration-acceptance.md)。先配置自己的 Git/CodeArts 访问权限，按本轮指定 SHA 克隆/检出，保持代码干净。最终验收不要使用带未提交改动的工作目录。

```bash
git clone git@codehub.devcloud.cn-north-4.huaweicloud.com:c1aa0a224dba4c2591226b87a5af9407/lab1-counter.git lab1-qa
cd lab1-qa
QA_COMMIT='替换为本轮完整验收SHA'
git switch --detach "$QA_COMMIT"
git status --short
cp .env.example .env
# 编辑 .env，填写本轮本地密码和空闲端口，不提交此文件。
QA_PROJECT='lab1-qa-替换为本轮唯一编号'
dc() { docker compose -p "$QA_PROJECT" "$@"; }
```

项目名替换成小写字母、数字或连字符组成的真实值。整条主流程使用同一目录、同一 `.env`、同一 Docker 环境和同一个 `QA_PROJECT`。只在首次初始化前使用全新数据卷，不通过删除/改写数据来凑预期结果。新开终端时须恢复原来的项目名并重新定义 `dc`，不能换一个项目来冒充原数据恢复。

启动与记录：

```bash
dc config -q
dc up -d --build
dc ps -a
docker volume ls --filter "label=com.docker.compose.project=$QA_PROJECT"
```

待服务 ready/healthy 后再测试；检查数据库挂载可用：

```bash
docker inspect --format '{{json .Mounts}}' "$(dc ps -q db)"
```

完整数据库查询命令（通过容器已有环境变量传入密码，不把密码写到命令里）：

```bash
dc exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --protocol=TCP -h 127.0.0.1 -u"$MYSQL_USER" "$MYSQL_DATABASE" --batch -e "SELECT id, value FROM counter ORDER BY id;"'
```

API 复核命令（先将地址改成本轮前端访问地址）：

```bash
QA_URL='http://127.0.0.1:8080'
curl -i "$QA_URL/api/health"
curl -i "$QA_URL/api/counter"
# POST 会真实改变计数，只在对应步骤中执行，不要在主流程中额外发送。
# curl -i -X POST "$QA_URL/api/counter/increment"
# curl -i -X POST "$QA_URL/api/counter/decrement"
```

不要使用两个接入验证脚本来替代本节主流程：它们会创建并清理独立测试数据卷，不保留课程持久化序列的业务数据。独立故障注入或并发测试放在主流程结束后或另一个隔离环境。

## 4. 用例与需求覆盖

主流程顺序：ENV-01 → ENV-02 → F-01 → F-02 → F-03 → F-04 → F-05 → F-06 → P-01 → P-02 → P-03 → P-04 → P-05。

其中计数序列为 **0 → 2 → -1 → 0 → 7 → 6**。不得跳过失败步骤继续宣称后续通过。E-01/E-02/R-01/C-01 为主流程后的独立补充检查；C-01 是团队加减卡的并发检查，不将其扩展为课程额外硬性评分要求。

| 覆盖点 | 用例 |
| --- | --- |
| CodeArts、成员与助教权限、干净版本 | ENV-01 |
| 三服务、源码构建、网络、配置、数据卷 | ENV-02 |
| 首次初始化、读取不修改数据 | F-01、F-02 |
| 加减、刷新、跨浏览器、负数及真实数据库 | F-03 至 F-06 |
| 服务重启后保留数据并继续写入 | P-01 |
| 删除容器、保留卷、重建后继续读写 | P-02 至 P-05 |
| 读取/写入失败有提示、不得显示假成功 | E-01、E-02 |
| 初始化幂等性、并发更新 | R-01、C-01 |

### ENV-01：CodeArts 来源、权限和验收版本

- **前置条件**：小组已提供 CodeArts 项目/仓库地址、助教账号及本轮分支和完整 SHA；准备未部署过本项目的环境。
- **操作步骤**：核对项目名称、五位成员和联系助教的加入及仓库权限证据；实际从 CodeArts clone 指定版本，记录完整 SHA 和工作区状态；核对与 GitHub 交付版本一致。
- **预期结果**：成员及助教能访问指定仓库；克隆成功，SHA 与交付记录一致，工作区干净。项目名称符合课程要求。
- **状态**：待人工核验
- **实际结果**：Source=git@codehub.devcloud.cn-north-4.huaweicloud.com:c1aa0a224dba4c2591226b87a5af9407/lab1-counter.git; SHA=ba87cf52eb50c6cf429bdf1013e1c2873f81f972; clean=true. 项目命名、五位成员、助教权限与另一位组员复核仍需真实截图/确认。
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；摘要和命令记录证明来源及版本；项目/成员/助教权限截图仍待补充。
- **缺陷/阻塞与复测**：成员/助教权限证据和另一位组员复核待补。

### ENV-02：源码构建及三容器部署

- **前置条件**：ENV-01 完成；按 README 配好未提交的 .env；选定唯一项目名及空闲端口；无该项目旧卷。
- **操作步骤**：执行本节 config、up、ps 命令；记录三个服务状态、版本化数据库镜像、数据库服务名连接和命名卷挂载；确认没有依赖手工建表、私有预构建镜像或未提交文件。
- **预期结果**：配置校验成功，前后端从源码构建，frontend/backend/db 正常运行；数据库就绪后后端可用；命名卷挂载到 /var/lib/mysql，浏览器可访问页面。
- **状态**：通过
- **实际结果**：三个服务由本轮源码构建启动，使用新项目和新命名卷；环境、构建、服务和挂载信息已记录
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；三服务状态见 [initial-services.txt](evidence/acceptance-ase-counter-eab851738aa1/initial-services.txt)，挂载见 [initial-containers.json](evidence/acceptance-ase-counter-eab851738aa1/initial-containers.json)。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### F-01：首次初始化为零

- **前置条件**：ENV-02 完成，全新数据卷且计数 UI/API 已实现；未发送修改请求。
- **操作步骤**：打开页面；GET /api/counter；查询 counter 全表。
- **预期结果**：页面和 API 均为 0；API HTTP 200 且 value 为整数；数据库恰有一行 id=1,value=0。
- **状态**：通过
- **实际结果**：首次页面和数据库均为 0，数据库仅有 id=1 一条记录
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 F-01 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### F-02：查询不改变计数

- **前置条件**：F-01 通过，计数为 0。
- **操作步骤**：记录 SQL 值；连续 GET /api/counter 三次，每次记录状态与 JSON；再次查询数据库。
- **预期结果**：每次 HTTP 200、value=0；读取前后仍恰有一行 id=1,value=0。
- **状态**：通过
- **实际结果**：连续 3 次 GET=0，读取前后数据库不变
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 F-02 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### F-03：加三减一并保存

- **前置条件**：F-02 通过，计数为 0。
- **操作步骤**：在页面逐次点击 + 三次，每次等待请求成功；再点击 − 一次。观察每次请求响应和页面结果，最后查询数据库。
- **预期结果**：成功响应与页面依次为 1、2、3、2，数据库最终为 2；每次操作在后端保存后确认，不以本地变量假装成功。
- **状态**：通过
- **实际结果**：页面按 1、2、3、2 更新，SQL=2
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 F-03 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### F-04：刷新及重新打开读取

- **前置条件**：F-03 通过，数据库为 2。
- **操作步骤**：刷新页面；关闭并重新打开页面；每次观察查询请求和显示结果，最后查询数据库。
- **预期结果**：两次都从后端读取并显示 2，读取不改变数据库。
- **状态**：通过
- **实际结果**：刷新和重新打开页面均读取 2
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 F-04 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### F-05：跨浏览器共享计数

- **前置条件**：F-04 通过，数据库为 2；准备浏览器 B 或独立无痕会话。
- **操作步骤**：在 B 中打开相同访问地址；刷新 A 和 B，记录数值与查询响应。
- **预期结果**：A、B 均为 2，不能仅依赖同一会话或 localStorage；不要求实时推送到未刷新的其他页面。
- **状态**：通过
- **实际结果**：独立无痕上下文读取共享值 2
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 F-05 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### F-06：减到负数并核对数据库

- **前置条件**：F-05 通过，计数为 2。
- **操作步骤**：在 A 逐次点击 − 三次，等待每次成功；刷新页面；查询 counter 全表。
- **预期结果**：页面与返回值依次 1、0、-1；刷新仍为 -1，SQL 恰有一行 id=1,value=-1。
- **状态**：通过
- **实际结果**：减至 -1，刷新和 SQL 均为 -1
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 F-06 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### P-01：服务重启后继续写入

- **前置条件**：F-06 通过，数据库已保存 -1；保留同一目录、项目名和数据卷。
- **操作步骤**：保存重启前页面和 SQL；执行 dc restart、dc ps -a；等待服务恢复后刷新，查询 SQL；再点击 + 一次并核对 SQL。
- **预期结果**：重启后页面和数据库仍为 -1；加一成功后页面、响应和数据库均为 0。
- **状态**：通过
- **实际结果**：restart 后保留 -1，并成功继续写入 0
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 P-01 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### P-02：为删除重建准备已持久化数据

- **前置条件**：P-01 通过，当前为 0。
- **操作步骤**：逐次点击 + 七次并等待成功；确认页面和 SQL 为 7；保存 dc ps -a、容器 ID 和数据库 Mounts。
- **预期结果**：七次写入成功，最终数据库为 7；已记录重建前容器身份与实际命名卷。
- **状态**：通过
- **实际结果**：页面与 SQL=7，原容器 ID 和数据库卷已记录
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 P-02 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### P-03：删除容器但保留数据卷

- **前置条件**：P-02 通过，已保存 7 和重建前证据。
- **操作步骤**：执行 dc down（不加 -v）；再执行 dc ps -a；查询该项目的 volume 列表。
- **预期结果**：该项目容器已移除，原命名数据卷仍存在。不得手工重建或重新导入计数。
- **状态**：通过
- **实际结果**：down 未加 -v：项目容器已删除，原命名卷仍存在
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 P-03 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### P-04：重建新容器后读到原值

- **前置条件**：P-03 通过，原卷保留；项目名、目录、.env 和卷配置不变。
- **操作步骤**：执行 dc up -d --build、dc ps -a；就绪后用新无痕窗口访问；查询数据库并记录新容器 ID 和 Mounts。
- **预期结果**：容器已重新创建（与之前 ID 不同），仍挂载原卷；新页面和数据库均为 7。
- **状态**：通过
- **实际结果**：新容器 ID 与旧容器不同，复用原卷；新无痕页面和 SQL 均=7
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 P-04 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### P-05：重建后继续读写

- **前置条件**：P-04 通过，页面与数据库为 7。
- **操作步骤**：点击 − 一次；记录响应；刷新页面并查询数据库。
- **预期结果**：响应和页面变为 6，刷新后与数据库仍为 6；证明新容器可继续使用原数据读写。
- **状态**：通过
- **实际结果**：重建后减一到 6，刷新与 SQL 仍为 6；主验收序列完成
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 P-05 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### E-01：首次读取失败时可见提示

- **前置条件**：主流程已结束或另用隔离环境；页面和 API 已实现。记录故障前实际值 B。
- **操作步骤**：仅停止本轮 db：dc stop db；在新页面/刷新时触发读取；记录 HTTP 状态、页面提示；dc start db 并等待就绪，刷新后再查询 SQL。
- **预期结果**：数据库不可用时查询失败（按约定为 503），页面有可见提示，不将默认 0 冒充成功读取值；恢复后能读取原值 B。后端不可达时代理可能为 502，须区分并记录实际故障原因。
- **状态**：通过
- **实际结果**：实际停库后读取 503、可见提示且无假 0；恢复后读取 6
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 E-01 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### E-02：写入失败不能显示成功

- **前置条件**：主流程已结束或使用独立环境；服务正常，页面已读取实际值 B。
- **操作步骤**：保持页面已加载，停止本轮 db；点击 + 一次，记录响应与 UI；恢复 db、等待就绪并刷新，再查询 SQL。
- **预期结果**：请求失败且提示可见；不能确认加一成功或把 B+1 当成已保存值；恢复后数据库与页面仍为 B，失败操作没有被悄悄重放。
- **状态**：通过
- **实际结果**：实际停库后写入失败，保留上次确认值；恢复后仍=6，无自动重放
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 E-02 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### R-01：初始化脚本不重置已有非零值

- **前置条件**：主流程结束后值为 6，或另一个已有非零 B 的隔离环境；数据库正常。
- **操作步骤**：记录 SQL；执行 dc exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"' < database/init.sql 两次；再次查询全表。
- **预期结果**：仍恰有一条 id=1，value 保持 6（或原 B），不重置为 0，也不新增重复记录。
- **状态**：通过
- **实际结果**：重复执行初始化两次，原计数 6 保持不变
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 R-01 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

### C-01：并发加减（团队补充检查）

- **前置条件**：主流程结束；使用独立测试轮次/环境且加减接口完成。无其他访问者修改，记录初值 B。
- **操作步骤**：并发发送 20 个加一与 10 个减一请求并等待全部结束；逐个保留 HTTP 状态和响应；GET 并查询数据库。不要把返回顺序当作执行顺序。
- **预期结果**：全部 30 次请求成功并返回整数；最终 GET、页面刷新和 SQL 均为 B+10，没有丢失更新。失败请求必须记录，不能只看最终值推断全部通过。
- **状态**：通过
- **实际结果**：主验收结束后另起补充轮次，从 6 并发 +20/-10；30 次成功，GET/页面/SQL=16
- **证据位置**：[本轮摘要](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[命令与 HTTP 记录](evidence/acceptance-ase-counter-eab851738aa1/events.json)；同目录下 C-01 开头的 SQL/截图/容器记录。
- **缺陷/阻塞与复测**：本次执行未发现该用例失败；版本变更后须重新验证。

## 5. 本轮统计与结论

| 项目 | 当前值 |
| --- | --- |
| 用例总数 | 17（其中 C-01 为团队补充检查） |
| 未执行 | 0（另有待人工核验 1 项） |
| 通过 / 失败 / 阻塞 | 16 / 0 / 0；待人工核验 1 |
| 当前验收结论 | 自动化覆盖项通过，人工证据与复核待完成 |
| 未解决缺陷与阻塞 | ENV-01 权限证据、另一位组员复核待补 |
| 执行人 / 复核人 / 日期 | 自动化复测：Codex（史冠航本机），2026-10-10；组员本人独立复核待完成 |
| 最终 CodeArts 分支和完整 SHA | 本轮实际被测为 master 的 `ba87cf52eb50c6cf429bdf1013e1c2873f81f972`；最终交付 SHA 待收尾合并后冻结，见 [提交核对表](submission.md) |

每轮执行后据实际状态更新统计。ENV、F、P、E、R 必须按约定完成；持久化结论必须包含删除容器后重建的 P-03/P-04/P-05，不能仅靠 restart。修复后记录新版本复测结果；代码版本改变时明确哪些用例已重跑、哪些尚未覆盖。

## 6. 本张 QA Onboarding 卡的交付检查

本卡完成条件是环境记录方法、用例、证据和缺陷规范经过本人阅读与评审，可支持后续执行；并不要求把未实现功能的用例提前标成通过。杨润东完成个人接入后，可在卡里留言 PR 链接、材料位置和已完成的规范确认。

准备及个人接入记录见 [QA Onboarding 记录](qa/onboarding-record.md)；完整功能和持久化执行放在后续 Integration & Acceptance 卡。

## 7. Integration & Acceptance 执行入口

- 运行方式、CodeArts 来源限制、证据和人工核验见 [执行说明](integration-acceptance.md)。
- 另一位组员按 README 复现后填写 [独立复现记录](qa/reproduction-review.md)。
- 只有成功的正式 CodeArts 运行可由 `scripts/acceptance/record.mjs` 导入；本地预演不覆盖本文件正式状态。
- 关闭卡片前仍需补齐项目/成员/助教权限证据、执行人与独立复核人，以及真实被测 SHA。

## 8. 准备阶段本地联调预演（非正式 CodeArts 验收）

2026-10-08，史冠航本机由 Codex 协助执行 `node scripts/acceptance/verify.mjs`。业务来源为本地 master 基线 `a08ab44cb8dd2397e00b08a9cabc5eda0b0bb434` 加查询/UI 未提交修改，不能把基线 SHA 单独当作本次已验证业务版本。

新建隔离项目与数据卷，完成实际浏览器点击、SQL 对照、restart、down（无 -v）与重建。主流程为 0 → 2 → -1 → 0 → 7 → 6；之后执行异常、初始化及独立补充并发轮次到 16。容器已清理，原测试卷保留。

[本地预演摘要](evidence/preparation-71144922/summary.json) · [命令/HTTP 证据](evidence/preparation-71144922/events.json) · [重建后计数 7](evidence/preparation-71144922/P-04.png) · [最终主流程计数 6](evidence/preparation-71144922/P-05.png)

| 用例 | 本地预演实际结果（不计入上方正式用例状态） |
| --- | --- |
| ENV-01 | 待人工核验：Source=git@github.com:GuanhangShiFDU/ASE_Assignment.git; SHA=a08ab44cb8dd2397e00b08a9cabc5eda0b0bb434; clean=false. 项目命名、五位成员、助教权限与另一位组员复核仍需真实截图/确认。 |
| ENV-02 | 通过：三个服务由本轮源码构建启动，使用新项目和新命名卷；环境、构建、服务和挂载信息已记录 |
| F-01 | 通过：首次页面和数据库均为 0，数据库仅有 id=1 一条记录 |
| F-02 | 通过：连续 3 次 GET=0，读取前后数据库不变 |
| F-03 | 通过：页面按 1、2、3、2 更新，SQL=2 |
| F-04 | 通过：刷新和重新打开页面均读取 2 |
| F-05 | 通过：独立无痕上下文读取共享值 2 |
| F-06 | 通过：减至 -1，刷新和 SQL 均为 -1 |
| P-01 | 通过：restart 后保留 -1，并成功继续写入 0 |
| P-02 | 通过：页面与 SQL=7，原容器 ID 和数据库卷已记录 |
| P-03 | 通过：down 未加 -v：项目容器已删除，原命名卷仍存在 |
| P-04 | 通过：新容器 ID 与旧容器不同，复用原卷；新无痕页面和 SQL 均=7 |
| P-05 | 通过：重建后减一到 6，刷新与 SQL 仍为 6；主验收序列完成 |
| E-01 | 通过：实际停库后读取 503、可见提示且无假 0；恢复后读取 6 |
| E-02 | 通过：实际停库后写入失败，保留上次确认值；恢复后仍=6，无自动重放 |
| R-01 | 通过：重复执行初始化两次，原计数 6 保持不变 |
| C-01 | 通过：主验收结束后另起补充轮次，从 6 并发 +20/-10；30 次成功，GET/页面/SQL=16 |

该记录不是杨润东的本机结果。交接脚本会从 CodeArts 指定提交重新执行，再填写上方正式用例；成员/助教权限证据与另一位组员复核需本人完成。

## CodeArts 实际执行摘要：acceptance-ase-counter-d78e392bf6c9

- 执行人：杨润东（Git author：Rundong Yang），依据已合并的 [接收端执行记录](integration-acceptance.md#接收端实际执行记录)。本节保留原始被测版本和 Windows 证据。
- 时间：2026-10-10T01:50:15.347Z。被测完整 SHA：`d3ebee121acf153ab77cd684d246a74ebadfb916`。
- 工具在 GitHub 交接分支运行，业务从独立、干净的 CodeArts checkout 构建；两者不是同一个工作区。
- 证据：[summary.json](evidence/acceptance-ase-counter-d78e392bf6c9/summary.json)、[events.json](evidence/acceptance-ase-counter-d78e392bf6c9/events.json)。
- 主流程 0 → 2 → -1 → 0 → 7 → 6 已完成。之后另起补充并发轮次从 6 到 16，不影响已记录的主流程结果。
- 原卷保留：`ase-counter-d78e392bf6c9_mysql_data`；容器已停止并移除。
- 人工待补：执行人、项目/仓库网页链接、成员及助教权限截图、另一位组员姓名/日期/README 复现确认。

## CodeArts 实际执行摘要：acceptance-ase-counter-eab851738aa1

- 时间：2026-10-10T03:09:28.268Z。被测完整 SHA：`ba87cf52eb50c6cf429bdf1013e1c2873f81f972`。
- 执行方式：Codex 在史冠航本机运行已有验收工具，业务从独立、干净的 CodeArts checkout 构建；没有把本地 README/报告修改带入被测代码。
- 证据：[summary.json](evidence/acceptance-ase-counter-eab851738aa1/summary.json)、[events.json](evidence/acceptance-ase-counter-eab851738aa1/events.json)。
- 主流程 0 → 2 → -1 → 0 → 7 → 6 已完成。之后另起补充并发轮次从 6 到 16，不影响已记录的主流程结果。
- 原卷保留：`ase-counter-eab851738aa1_mysql_data`；容器已停止并移除。
- 人工待补：项目/仓库网页链接、成员及助教权限截图、另一位组员姓名/日期/README 复现确认。该自动化复测不代替组员本人的独立复核。
