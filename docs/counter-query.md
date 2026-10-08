# Counter Query API（#71144918）

负责人：李全昊。史冠航与 Codex 协助准备，实现由接收人阅读核对、复测后提交。

## 行为

`GET /api/counter` 无需请求体，读取 MySQL 的 `counter.id=1`。成功 HTTP 200：`{"value": 整数}`，包含 `Cache-Control: no-store`。支持 0、正数和负数，不使用内存缓存、文件或伪造默认值；不会创建、修改或重置记录。

- 无记录：HTTP 503，`{"error":"COUNTER_NOT_INITIALIZED"}`。
- 数据库连接/读取异常或数据不是整数：HTTP 503，`{"error":"COUNTER_READ_FAILED"}`。

实现位于 `backend/src/counter-query.js`，从 `app.js` 注册；保留已实现的加减接口与健康检查。单条 SELECT 设置 2 秒查询超时，错误不返回 SQL/账号等内部信息。

```bash
curl -i http://localhost:8080/api/counter
```

## 验证

```bash
bash backend/scripts/verify-query.sh
```

需要 Bash、Git、OpenSSL、Docker 和 Compose >=2.24.4；无需宿主机 Node/MySQL。脚本生成随机测试凭据，使用独立 `ase-query-*` 项目和新数据卷，不映射宿主机端口。用例会修改该测试数据库，结束后仅清理本轮项目及其卷。

覆盖 0/17/-8 的重复查询且数据库前后不变、缺失记录不自动重建、实际停库返回 503、恢复后仍读取 -8。同时运行原有 8 个加减单元测试以检查路由集成未破坏已有代码。

准备阶段基线：`a08ab44cb8dd2397e00b08a9cabc5eda0b0bb434` 加本卡未提交修改。2026-10-08 在史冠航本机实际运行上述命令，退出码 0；4 个数据库子用例（含父项运行器计数 5）、停库及恢复检查、原有 8 个单元测试通过。原始日志放在交接包 evidence 中。此为开发自测，不代替正式 CodeArts 验收。

## 接收人确认

- 本机自测：由交接脚本实际运行成功后追加。
- 已理解只读查询、缺失记录和故障响应：待本人填写。
- 与前端同学确认接口约定、日期：待实际确认后填写。
- PR：待填写。

## 接收端实际执行记录

- Git 姓名：quanhaol。时间（UTC）：2026-10-08T11:03:31Z。
- 克隆基线：`a08ab44cb8dd2397e00b08a9cabc5eda0b0bb434`。交接分支：`qhli-#71144918`。
- 已实际执行查询接口隔离数据库验证，退出码 0；这是开发自测。
- 完整日志保存在本机 `.git/card-71144918/`，本人代码理解、接口确认/复核信息仍需补充。
