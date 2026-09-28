# Backend Onboarding（#71144366）

本卡用于接入现有后端、验证数据库连接并明确接口约定。业务接口尚未实现；本文不代表完整 Lab 验收或同学已完成本机验证、团队确认。

## 代码职责

| 文件 | 职责 | 后续开发注意事项 |
| --- | --- | --- |
| `backend/src/app.js` | 创建 Express 应用、JSON 解析、禁用 API 缓存、健康接口与 404；通过参数接收数据库对象 | 添加计数路由时放在兜底 404 之前；单测可注入数据库替身 |
| `backend/src/server.js` | 创建实际 HTTP 监听，处理 SIGINT/SIGTERM，关闭连接池 | 不把业务 SQL 写到启动与关停逻辑中 |
| `backend/src/db.js` | 校验必需环境变量、创建 mysql2 Promise 连接池 | 业务实现复用连接池；查询使用参数绑定 |
| `database/init.sql` | 创建单行计数表并在缺少记录时插入 `id=1,value=0` | 已有记录不会被重置；并发加减逻辑属于后续业务卡 |

`GET /api/health` 实际执行 `SELECT 1`。它检查数据库连接，不检查计数业务完整性；Compose 的数据库健康检查另外确认 `counter` 中存在 `id=1`。

## 环境与配置

推荐 Node.js 24（见 `.nvmrc`）、npm、Docker Engine / Docker Desktop 和支持 `!reset`、`--wait` 的新版 Docker Compose；本次验证版本见验证记录。macOS/Linux 可直接使用下面的 Bash 脚本，Windows 建议在 WSL2 中运行。

根目录 `.env.example` 是模板。正常开发时复制为 `.env` 并设置自己的密码，不提交 `.env`。Compose 读取变量后注入容器，后端用 `process.env` 获取配置，没有安装 `dotenv`。

| 后端环境变量 | Compose 中的来源或默认值 |
| --- | --- |
| `DB_HOST` | `db`，Compose 服务名；不是宿主机地址 |
| `DB_PORT` | `3306` |
| `DB_NAME` | `MYSQL_DATABASE` |
| `DB_USER` | `MYSQL_USER` |
| `DB_PASSWORD` | `MYSQL_PASSWORD` |
| `PORT` | `3000`，容器内监听端口 |

`BACKEND_PORT` 仅控制宿主机端口映射。`MYSQL_ROOT_PASSWORD` 用于 MySQL 初始化，后端使用普通数据库账号。

在仓库根目录安装依赖和检查语法：

```bash
npm --prefix backend ci
npm --prefix backend run check
```

`check` 只检查 JavaScript 语法，不是接口测试。日常启动后端与数据库：

```bash
cp .env.example .env  # 仅首次执行；已有 .env 时不要覆盖
# 编辑 .env，填写自己的数据库密码。
docker compose up -d --build --wait backend db
curl -i http://127.0.0.1:3000/api/health
```

如果修改了 `BACKEND_PORT`，相应调整 URL。数据库成功连接时返回 HTTP 200 和 `{"status":"ok","database":"connected"}`。

不要直接在宿主机执行 `npm start` 并期待它读取根目录 `.env`：目前不会自动读取，且 `DB_HOST=db` 只在 Compose 网络中有效，数据库也没有发布宿主机端口。优先按上述 Compose 流程接入；宿主机调试方案需要另行提供正确的 `DB_*` 变量及数据库连接路径。

## 一键复测本卡的运行行为

在仓库根目录执行：

```bash
bash backend/scripts/verify-onboarding.sh
```

脚本创建随机名称的独立 Compose 项目和全新数据卷，生成临时密码，不读取本地 `.env`，不发布宿主机端口，也不启动前端。它会构建后端（Dockerfile 通过 `npm ci` 安装依赖）并执行：

1. 后端语法检查，确认后端和数据库启动。
2. 请求真实 HTTP 健康接口，断言 HTTP 200 和完整 JSON 响应。
3. 用 SQL 确认表内恰有一行 `id=1,value=0`。
4. 仅在临时数据库中将计数设为 `7`，重跑初始化 SQL 两次，再查询仍恰有一行 `id=1,value=7`。
5. 停止临时数据库，断言健康接口返回 HTTP 503 和 `{"status":"error","database":"unavailable"}`。
6. 恢复数据库，确认原后端进程重新返回 HTTP 200。

脚本正常结束或一般失败时，会清理**该随机测试项目**的容器、网络、数据卷和临时后端镜像；拉取的公共基础镜像可能保留。不对日常开发项目执行 `down -v`。若进程被强制终止、Docker 崩溃或清理失败，按输出中的随机项目名检查残留资源，不要批量删除其他项目。

首次运行需要拉取镜像及 npm 依赖，耗时取决于网络。运行日志可由本人保存为验证证据；不要把尚未运行的预期结果填成实测结果。

## 接口约定草案：待前端及两位后端共同确认

以下业务部分是建议约定，尚未实现或获得团队确认。

| 方法与路径 | 成功响应 | 当前状态 |
| --- | --- | --- |
| `GET /api/health` | HTTP 200，`{"status":"ok","database":"connected"}` | 已实现；数据库不可用时为 HTTP 503 |
| `GET /api/counter` | HTTP 200，`{"value":整数}` | 待实现；查询不改变计数 |
| `POST /api/counter/increment` | HTTP 200，`{"value":整数}` | 待实现；原子加一，提交成功后返回结果 |
| `POST /api/counter/decrement` | HTTP 200，`{"value":整数}` | 待实现；原子减一，允许负数 |

建议两个 POST 不要求请求体；前端使用同源 `/api` 路径。业务查询、更新以数据库为准，不能以进程内变量或浏览器缓存作为计数来源。并发修改与返回值的一致性由后续实现卡处理。

建议业务错误统一为 `{"error":"可读信息"}`：数据库不可用返回 503，其他未预期内部错误返回 500，不向客户端暴露 SQL、堆栈或凭据。前端检查 HTTP 状态并展示错误，写入失败不显示成功结果。以上错误约定不改变已实现的健康接口格式。

当前未实现的业务路径实际返回 HTTP 404、`{"error":"Not found"}`，不能按上表成功响应验收。

| 待确认项 | 参与人 | 状态 |
| --- | --- | --- |
| 三个业务接口路径、POST 请求体及 `value` 字段 | 刘乐翔、刘子扬、李全昊 | 待确认 |
| 503 / 500 与 `error` 格式、前端失败处理 | 刘乐翔、刘子扬、李全昊 | 待确认 |
| 查询与加减接口的具体负责人 | 刘子扬、李全昊 | 按各自工作卡确认 |

确认后由实际参与者记录日期、结论和必要的调整，再提交 PR。

## 常见接入问题

- `Missing environment variable`：检查是否绕开 Compose 启动，或缺少 `DB_*`；不要把根目录 `MYSQL_*` 变量直接当成后端同名变量。
- 数据库密码修改后仍认证失败：已有数据卷不会因修改 `.env` 自动更新账号密码；恢复原配置或按数据库管理流程修改账号，不删除需要保留的业务数据。
- 首次启动失败：检查 Docker 是否启动，以及镜像仓库、npm 网络是否可达；日常环境可通过 `docker compose logs backend db` 定位。
- 健康接口 200 但业务接口 404：当前阶段的预期行为，业务开发卡完成后再验证计数功能。

## 本卡交接与完成条件

准备阶段的实际结果见 [本轮验证记录](backend-onboarding-verification.md)。处理人收到交接包后，仍需在自己的环境复测、理解上述职责，与另外两位开发者确认接口，再补充自己的执行记录并提交。

卡片可在材料提交后转「待测试／待验收」；本机验证及团队确认未完成时，不应将全部验收项标为完成。本卡不替代 QA 的完整功能、并发或持久化验收。
