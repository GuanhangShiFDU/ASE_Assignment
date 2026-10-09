# ASE_Assignment

2026 秋季高级软件工程 Lab 1：使用 Monorepo 和 Docker Compose 构建共享计数器。

[作业说明](https://openmsg.yuque.com/openmsg/gp3cfs/srlobx960pg94ozp)

## 当前状态

计数页面、查询与加减接口已实现，使用 MySQL 保存共享计数，支持负数、刷新和跨浏览器读取。开发自测覆盖接口、页面交互及错误状态；最终课程验收仍以测试同学从 CodeArts 指定版本执行并记录的结果为准。

接口和开发自测见 [查询 API](docs/counter-query.md)、[加减 API](docs/counter-mutation.md)、[Counter UI](docs/counter-ui.md)。验收步骤及结果入口见 [验收记录](docs/validation.md)。

## 技术栈与目录

- 前端：React + Vite，容器内使用 Nginx 提供页面及 `/api` 反向代理。
- 后端：Node.js 24 + Express + mysql2。
- 数据库：MySQL 8.4，命名卷 `mysql_data` 挂载至 `/var/lib/mysql`。

```text
frontend/           # React 源码、Nginx 配置、Dockerfile
backend/            # 服务入口、路由、数据库连接池、Dockerfile
database/init.sql   # 建表及首次初始化
docs/validation.md  # 待测试人员完善的测试与验收记录
docs/images/        # 验收截图
compose.yaml        # 三服务部署配置
.env.example        # 环境变量示例
```

请求流向：浏览器 → frontend → backend:3000 → db:3306。

GitHub `master` 自动同步到 CodeArts 的配置与操作见 [同步说明](docs/codearts-sync.md)。首次使用需配置 GitHub Actions Secret。

## 启动应用

需要 Git、已启动的 Docker Engine 和 Docker Compose。依赖安装与构建在镜像内完成。

```bash
cp .env.example .env
# 编辑 .env，设置本地数据库密码及端口。
docker compose config -q
docker compose up -d --build
docker compose ps -a
```

默认访问 <http://localhost:8080>，页面读取数据库计数，点击加一或减一后显示后端保存的结果。
`.env.example` 包含前后端端口、数据库名称、应用账号及密码、root 密码；实际 `.env` 不提交 Git。

```bash
curl --fail http://localhost:8080/api/health
docker compose logs --tail=100
docker compose down
```

`down` 保留命名数据卷，持久化验收时不要使用 `down -v`，并保持 Compose 项目名不变。
MySQL 初始化脚本仅在数据目录为空时自动执行；修改 `.env` 不会更新已有数据库的用户密码。

本地前端开发建议使用 Node.js 24。启动 Compose 后，可在 `frontend/` 执行 `npm ci` 和 `npm run dev`。
开发代理默认连接 `http://127.0.0.1:3000`，修改后端宿主机端口时同步设置 `BACKEND_URL`。

后端依赖安装、代码职责、环境变量和隔离验证步骤见 [Backend Onboarding](docs/backend-onboarding.md)。

## 接口约定

| 方法 | 路径 | 状态 |
| --- | --- | --- |
| GET | `/api/health` | 已实现；数据库正常返回 200，不可用返回 503 |
| GET | `/api/counter` | 已实现：读取当前计数 |
| POST | `/api/counter/increment` | 已实现：加一并返回结果 |
| POST | `/api/counter/decrement` | 已实现：减一并返回结果 |

计数接口成功响应约定为 `{"value": 整数}`，读取数据库中 `counter(id, value)` 的 `id=1` 记录。
数据库读取/写入失败返回 503；记录缺失返回 503；加减超出 INT 范围返回 409。响应包含 error 字段，具体错误码见接口文档。请求失败后重新读取，不自动重发 POST。

## 人员分工

| 姓名 | 学号 | 角色 | 职责 |
| --- | --- | --- | --- |
| 史冠航 | 26113050105 | 项目负责人 | 项目初始化、任务协调、接口约定、集成评审及最终交付 |
| 刘乐翔 | 26113050085 | 前端工程师 | 前端环境接入、计数页面与交互、接口联调及前端开发说明 |
| 刘子扬 | 26113050091 | 后端工程师 | 后端环境接入、计数业务接口、数据库访问及相关测试与文档 |
| 李全昊 | 26113050071 | 后端工程师 | 后端环境接入、计数业务接口、数据库访问及相关测试与文档 |
| 杨润东 | 26213050435 | 测试工程师 | 测试用例设计、功能与持久化验收、缺陷跟踪及验收文档更新 |

## 数据库与数据卷

`counter(id TINYINT UNSIGNED PRIMARY KEY, value INT NOT NULL)` 仅保存 `id=1` 一条记录，初值 0。初始化脚本可重复执行，不覆盖已有值。

查询真实数据：

```bash
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --protocol=TCP -h 127.0.0.1 -u"$MYSQL_USER" "$MYSQL_DATABASE" --batch -e "SELECT id, value FROM counter ORDER BY id;"'
```

逻辑命名卷为 `mysql_data`，实际名称通常为 `<Compose项目名>_mysql_data`，挂载到 MySQL 的 `/var/lib/mysql`。`docker compose restart` 重启服务；`docker compose down` 删除容器但保留卷，随后 `docker compose up -d --build` 可重建并继续使用原数据。验收保持目录、项目名和卷配置一致，不能使用 `down -v`。

## 常见问题

- 端口占用：修改 `.env` 的 FRONTEND_PORT/BACKEND_PORT 后重新启动，访问对应前端端口。
- 数据库未就绪：查看 `docker compose ps -a` 和 `docker compose logs db backend`，等待健康检查通过；修改 `.env` 密码不会改变已有卷内账号。
- 镜像拉取失败：检查 Docker 网络和镜像仓库访问，重试构建；不要换成未标版本镜像来掩盖问题。
- 页面报错：查看 `/api/counter` 返回值与 backend/db 状态。失败时页面不会把默认 0 或本地计算结果当成数据库结果；恢复服务后点“重新读取”。

历史 onboarding 的首页三种健康状态截图针对最初框架。现在验证计数页面请使用 `node frontend/onboarding/verify-counter.mjs`；先按 Counter UI 文档安装验证工具及 Chromium。
