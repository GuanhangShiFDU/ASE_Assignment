# Counter Mutation API（#71144919）

本卡由刘子扬接手，材料由史冠航与 Codex 协助准备。实现两个加减接口及开发自测；查询接口与计数 UI 属于其他卡。本文件单独记录结果，不修改 QA 的 `docs/validation.md`，也不替代最终课程验收。

## 接口

| 方法与路径 | 行为 | 成功响应 |
| --- | --- | --- |
| `POST /api/counter/increment` | 将 `counter` 中 `id=1` 的值加 1 | HTTP 200，`{"value": 1}`（示例） |
| `POST /api/counter/decrement` | 将该值减 1，允许负数 | HTTP 200，`{"value": -1}`（示例） |

无需请求体；接口固定加减 1，不接受自定义步长。响应为本次操作提交的整数值，带 `Cache-Control: no-store`。并发时响应到达顺序不保证与事务提交顺序相同。

| 状况 | HTTP | 响应 |
| --- | --- | --- |
| 数据库连接、更新或提交失败 | 503 | `{"error":"COUNTER_WRITE_FAILED"}` |
| `id=1` 记录缺失 | 503 | `{"error":"COUNTER_NOT_INITIALIZED"}` |
| 超过有符号 INT 范围 | 409 | `{"error":"COUNTER_OUT_OF_RANGE"}` |

不向客户端暴露 SQL、密码或底层错误。记录缺失时不自动创建或重置数据库，应排查初始化。整数范围为 -2147483648 到 2147483647。

**POST 非幂等，不自动重试。** 若网络在提交确认期间断开，客户端可能收到失败但数据库已经提交；不能承诺所有失败均未写入。前端应提示错误并重新查询，以数据库为准，不自动重放加减请求。

## 实现职责与并发

- `backend/src/app.js`：注册路由，保留原健康检查和 404 行为。
- `backend/src/counter-mutation.js`：同一连接上开启事务，`SELECT ... FOR UPDATE` 锁定记录，检查范围，执行 `value = value + ?`，读取保存值，再提交并返回。
- 更新和读取均在锁释放前完成，所以不会把其他请求的更新值当成本次结果。异常回滚，回滚失败则销毁连接，避免带未完成事务的连接返回池中。

锁行为参考 [MySQL 8.4 事务隔离说明](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)。现有官方 MySQL 镜像默认使用 InnoDB；本卡未变更表结构、数据库配置或连接池。

本次没有添加 `GET /api/counter`；开发自测直接查询 MySQL 对照，因此不依赖查询卡先合并。后续查询卡可在 `app.js` 的 TODO 位置注册读取路由，保留加减路由注册即可。根 README 的框架进度概述仍待后续集成统一更新，本卡状态以此文档和源代码为准。

## 可重复运行的验证

推荐从仓库根目录运行：

```bash
bash backend/scripts/verify-mutation.sh
```

需要 Git、Bash、OpenSSL、可运行的 Docker Engine 和支持 `!reset` 的 Compose（2.24.4 或更新版本）。Windows 推荐 WSL2。无需宿主机 Node.js/MySQL，也不需要实际 `.env`；脚本生成临时随机数据库凭据。

脚本创建随机命名的 `ase-mutation-*` 独立项目，只启动 backend 和 db，不映射宿主机端口。测试在 Node 24 容器中运行，数据库为 MySQL 8.4；结束时删除**本轮测试项目**的容器、网络、测试卷和本地构建镜像。正常开发项目及其数据卷不受影响。

这是可丢弃数据的开发测试，包含边界值写入、删除测试行及数据库故障注入；不要拿它充当课程要求的“保留原数据卷、删除容器后重建”验收。测试文件仅在验证期间只读挂载，不进入生产镜像。

验证内容：

1. 8 个单元测试：提交完成前不得报告成功；写入/回读/提交失败回滚；回滚失败销毁连接；缺失记录、整数边界与非法步长。
2. 真实 HTTP + MySQL：初始 0、加到 1、减到 0、再减到 -1；每一步核对数据库。
3. 从 -1 并发 20 次加一、10 次减一，30 个请求全部成功，数据库变为 9。
4. 从 9 并发 20 次加一，响应值排序恰好为 10–29；再并发 10 次减一，响应值为 19–28，最终数据库 19。以此验证每个响应属于自己的操作。
5. 上下界返回 409 且数值不变；删除测试记录后两个接口均返回 503，不自动初始化。随后仅在该测试数据库恢复 `id=1,value=5`。
6. 停止实际数据库，两个 POST 均返回 503；恢复后仍为 5，下一次加一成功保存 6，没有自动重放失败请求。

仅运行单元测试（不访问真实数据库）也可以：

```bash
npm --prefix backend ci
npm --prefix backend run check
npm --prefix backend run test:mutation
```

宿主机需要 Node.js >=24；无需新增测试依赖，使用 Node 自带测试运行器。单元测试的替身不能证明真实并发正确，需要结合上述 Docker 集成验证。本卡没有配置 GitHub Actions 必需检查。

## 本人接手记录（待刘子扬补充）

- 已理解事务边界、行锁及错误处理：待填写。
- 本机验证时间、结果及问题：交接脚本运行成功后追加，必要时本人补充。
- 已与前端/查询开发同学确认接口约定：待填写实际结论和日期。
- PR 链接：待填写。

## 准备阶段实际自测记录

- 执行环境：史冠航本机，Codex 协助执行；macOS 26.6.2 / arm64，Docker Compose 5.1.4。
- 开始时间：2026-09-28 11:36:45 UTC。
- 基线：`7f8d1f9d1e5cddfce3c9d37c4b372a5f959ec7b2` 加本卡未提交修改；该 SHA 单独不包含本次实现。
- 独立项目：`ase-mutation-2ba3cd189d22`；Node 24.21.0，MySQL 8.4.11。
- 执行命令：`bash backend/scripts/verify-mutation.sh`，退出码 0。
- 结果：语法检查、8 个单元测试、6 个真实数据库子用例（运行器计入父用例共 7 个）均通过；数据库停机时两个接口返回 503，恢复后保持 5 并可继续写到 6。
- 测试项目的容器、网络、数据卷和本地镜像已清理。
- 此为开发自测，未执行浏览器交互、完整课程持久化验收、CodeArts 版本验收或 GitHub CI。交接包 `evidence/preparation-verification.txt` 保存本轮日志；刘子扬的本机结果需要重新运行后单独追加。

## 接收端实际运行记录

- Git 姓名：liuziyang。
- UTC 时间：2026-09-29T02:27:47Z。
- 克隆基线：`7f8d1f9d1e5cddfce3c9d37c4b372a5f959ec7b2` 加本卡修改；不是最终被验收提交。
- 工作分支：`zyliu-#71144919`。
- 操作系统：MINGW64_NT-10.0-26200 x86_64。
- Docker 客户端/服务端：29.8.1 / 29.8.1。
- Compose：5.5.1。
- 已实际执行 `bash backend/scripts/verify-mutation.sh`，退出码 0；完整日志：`.git/mutation-71144919/verification.txt`（仅保留本机，不提交）。
- 这是开发自测，正式 QA/浏览器及课程完整验收仍待完成；本人代码理解和接口确认需另行填写。

```text
v24.21.0
mysql  Ver 8.4.11 for Linux on x86_64 (MySQL Community Server - GPL)
ℹ tests 8
ℹ pass 8
ℹ fail 0
ℹ tests 7
ℹ pass 7
ℹ fail 0
PASS real database outage: increment returns 503
PASS real database outage: decrement returns 503
PASS database recovery: failed requests were not replayed; next write saves 6
PASS mutation verification; only this disposable project will be removed.
```
