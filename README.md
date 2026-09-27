# ASE_Assignment

2026 秋季高级软件工程 Lab 1：使用 Monorepo 和 Docker Compose 构建共享计数器。

[作业说明](https://openmsg.yuque.com/openmsg/gp3cfs/srlobx960pg94ozp)

## 当前状态

目前为初始框架，包含 React 首页、后端健康检查、MySQL 初始化和容器部署配置。
**计数显示、加减交互及三个计数业务接口尚未实现，完整验收待后续完成。**

框架开发自检已通过：前端构建、后端语法检查、Compose 配置及镜像构建、三容器启动、数据库初始化、健康接口正常与异常响应。这些自检不替代后续测试人员的独立验证和完整作业验收。

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

## 启动框架

需要 Git、已启动的 Docker Engine 和 Docker Compose。依赖安装与构建在镜像内完成。

```bash
cp .env.example .env
# 编辑 .env，设置本地数据库密码及端口。
docker compose config -q
docker compose up -d --build
docker compose ps -a
```

默认访问 <http://localhost:8080>，页面显示项目说明及服务连接状态。
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

## 接口约定

| 方法 | 路径 | 状态 |
| --- | --- | --- |
| GET | `/api/health` | 已实现；数据库正常返回 200，不可用返回 503 |
| GET | `/api/counter` | 待实现：读取当前计数 |
| POST | `/api/counter/increment` | 待实现：加一并返回结果 |
| POST | `/api/counter/decrement` | 待实现：减一并返回结果 |

计数接口成功响应约定为 `{"value": 整数}`，读取数据库中 `counter(id, value)` 的 `id=1` 记录。
未实现的接口目前返回 404。具体错误响应和接口测试由开发成员在实现时补充。

## 人员分工

| 姓名 | 学号 | 角色 | 职责 |
| --- | --- | --- | --- |
| 史冠航 | 26113050105 | 项目负责人 | 项目初始化、任务协调、接口约定、集成评审及最终交付 |
| 刘乐翔 | 26113050085 | 前端工程师 | 前端环境接入、计数页面与交互、接口联调及前端开发说明 |
| 刘子扬 | 26113050091 | 后端工程师 | 后端环境接入、计数业务接口、数据库访问及相关测试与文档 |
| 李全昊 | 26113050071 | 后端工程师 | 后端环境接入、计数业务接口、数据库访问及相关测试与文档 |
| 杨润东 | 26213050435 | 测试工程师 | 测试用例设计、功能与持久化验收、缺陷跟踪及验收文档更新 |
