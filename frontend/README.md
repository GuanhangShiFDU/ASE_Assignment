# Frontend Onboarding（#71144367）

本卡接入已有 React 骨架，验证开发服务器、生产构建、两条 API 代理路径与首页三种连接状态。计数显示、加减按钮和业务接口联调属于后续 Counter UI 卡。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `index.html` | 提供 `#root` 挂载节点，加载 `src/main.jsx` |
| `src/main.jsx` | 创建 React root，导入全局样式，在 StrictMode 中渲染 App |
| `src/App.jsx` | 首页组件，首次挂载时请求 `/api/health`，显示检查中、正常或不可用状态 |
| `src/styles.css` | 页面布局、文字及三种状态的视觉样式 |
| `vite.config.js` | 启用 React 插件，将开发环境 `/api` 请求代理到后端 |
| `nginx.conf` | 生产容器提供静态文件，将 `/api/` 代理到 `backend:3000` |
| `Dockerfile` | Node.js 24 构建 `dist`，然后复制到 Nginx 镜像 |
| `onboarding/` | 本卡独立验证工具；不进入生产镜像，也不依赖后端 Onboarding 的新增文件 |

StrictMode 在开发环境可能多执行一次 effect。App 使用 AbortController 取消已清理的请求，取消本身不会显示服务不可用。

## 本地开发与构建

建议 Node.js 24；仓库根目录 `.nvmrc` 已指定版本。以下命令在仓库根目录执行：

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
```

开发地址以终端输出为准，默认通常为 `http://127.0.0.1:5173`。可指定端口并避免自动跳到其他端口：

```bash
npm --prefix frontend run dev -- --port 5173 --strictPort
```

先按根 README 配置本地 `.env`，再启动后端与数据库：

```bash
docker compose up -d --build --wait backend db
```

默认 Vite 转发路径：浏览器 `/api/health` → Vite → `http://127.0.0.1:3000/api/health` → MySQL。前端始终请求相对路径 `/api`，无需把数据库凭据或容器服务名交给浏览器。

如果后端宿主机端口不是 3000，启动 Vite 时显式传入：

```bash
BACKEND_URL=http://127.0.0.1:你的后端端口 npm --prefix frontend run dev
```

当前 Vite 配置从 `process.env.BACKEND_URL` 读取该值；修改后重启开发服务器。不要以为复制根目录 `.env` 会自动改变 Vite 代理目标。

构建命令：

```bash
npm --prefix frontend run build
```

输出在 `frontend/dist/`，不提交 Git。构建成功只证明可以生成静态文件，不证明后端连通。

## Nginx 容器路径

按根 README 配好环境后，执行 `docker compose up -d --build --wait`，访问配置的前端端口（默认 `http://127.0.0.1:8080`）。

- `/` 和构建资源由 Nginx 提供；页面路由使用 `index.html` 回退。
- `/api/health` 由 Nginx 转发到 Compose 网络中的 `backend:3000`；`/api` 前缀保持不变。
- `BACKEND_URL` 只影响开发代理，不控制生产 Nginx 上游。
- 日常环境的数据库数据要保留；不要为了重试启动执行 `down -v`。

## 自动浏览器验证

需要已启动的 Docker，以及支持 `!override` 和 `--wait` 的 Compose（2.24.4 或更新版本）。macOS/Linux 可直接运行；Windows 建议 WSL2 + Docker Desktop。验证工具使用独立 lockfile，不修改应用依赖。

```bash
npm --prefix frontend/onboarding ci
PLAYWRIGHT_BROWSERS_PATH=0 npm --prefix frontend/onboarding run install:browser
npm --prefix frontend/onboarding run verify
```

第一次需要下载 Chromium。Linux 若提示浏览器缺系统库，可按 Playwright 提示安装系统依赖；脚本不会自动执行 sudo。工具将浏览器保存在其 `node_modules` 内，不读取个人 Chrome 登录信息。

验证启动独立 Compose 项目、临时密码和全新数据库；前后端端口仅绑定回环地址并随机分配，不读取根 `.env`，不停止其他项目。自动启动的 Vite 使用严格端口模式，端口争用时会报错而不是误连其他页面。

验证同时检查 Vite 与 Nginx 两个页面：

1. 暂缓页面真实的健康请求，在 Chromium 中断言「正在检查服务连接…」并截图；随后放行原请求，不伪造响应。
2. 断言「后端与数据库连接正常」；经各自代理请求真实 `/api/health`，断言 200 与 JSON 内容。生产页面同时检查 Nginx 响应头。
3. 停止临时 MySQL，刷新两个页面，断言「服务暂不可用…」；经代理断言 HTTP 503。
4. 恢复数据库后刷新，确认正常状态及 HTTP 200 恢复。

首页只在挂载时检查一次，当前不自动轮询或重试。数据库停止/恢复后，需要刷新页面才触发新检查。

结果、截图和 Vite 日志位于 `frontend/onboarding/results/<随机项目名>/`（Git 忽略）。`summary.json` 仅在所有检查与清理成功后写入。脚本会关闭验证浏览器、Vite 及该临时项目的容器、数据卷和构建镜像；强制杀进程或 Docker 故障后，应按输出项目名检查残留，不批量清理其他项目。

## 常见问题

- 首页可见但状态不可用：先检查真实后端健康接口，再检查 Vite 的 `BACKEND_URL`；页面能打开不代表代理成功。
- `ECONNREFUSED`：后端未启动或目标端口错误。Nginx 返回 502 时，检查 backend 容器与服务名；这与后端实际返回数据库不可用的 503 不同。
- 端口占用：使用空闲端口；不要关闭同学或其他项目的服务来让测试通过。
- 修改代码后容器没变化：重建 frontend 镜像；日常修改的即时反馈使用 Vite 开发服务器。
- Chromium 安装失败：检查下载网络；不要把未运行的浏览器验证标成通过。

## 接手与完成记录

准备阶段结果见 [验证记录](../docs/frontend-onboarding-verification.md)。处理人刘乐翔需在自己环境运行、查看截图并理解代码职责，再补充自己的发现或问题。本卡不会提前实现计数 UI，也不替代 QA 的完整功能及持久化验收。

本卡只新增前端文件和独立记录，不修改根 README、后端源码、Compose 或后端接入文档，可以与 Backend Onboarding 分别提 PR。

参考：[Compose 合并与端口覆盖](https://docs.docker.com/reference/compose-file/merge/)、[Playwright 浏览器安装](https://playwright.dev/docs/browsers)。
