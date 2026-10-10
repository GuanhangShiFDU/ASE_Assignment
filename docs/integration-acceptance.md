# Integration & Acceptance（#71144922）

负责人：杨润东。本卡在 Query API 和 Counter UI 合并并同步到 CodeArts 后执行。

## 两种运行必须区分

- **本地联调预演**：工作区可能包含未提交业务代码，证明当前实现可运行，但不能冒充 CodeArts 指定提交的最终验收。
- **正式版本运行**：从 CodeArts 克隆指定完整 SHA 的干净工作区，全部业务镜像从该工作区构建。验证工具及结果放在另一目录，避免修改被测源代码。

`docs/validation.md` 的正式用例状态在真正执行前仍是“未执行”。工具只在所有自动化步骤成功后导入结果，项目成员/助教权限和另一位组员复核必须人工补齐。

## 正式操作

建议使用全新 VM/电脑上的 Docker 环境按 README 执行；工具会额外使用随机项目名和新卷，不复用已有开发数据库。需要 Git、Node >=24、Docker、Compose >=2.24.4、Chromium 运行依赖，GitHub 和 CodeArts SSH 权限。Windows 使用 WSL2；Linux 若缺浏览器库，先按 Playwright 安装提示补齐系统依赖。

交接包的 `start-task.sh` 会自动：

1. Clone GitHub 最新 master，创建 `rdyang-#71144922`；确认查询/UI 已合并。
2. 应用仅含验收文档和工具的补丁。
3. 单独 clone CodeArts，检出与 GitHub 基线相同的完整 SHA；未同步到位则停止。
4. 安装已锁定的浏览器工具与 Chromium，运行下述正式验证，不把业务源码改动带入 CodeArts checkout。
5. 成功后复制截图、SQL、容器与 HTTP 证据到 `docs/evidence/`，更新 validation 文档，再创建本地提交。失败不创建通过记录或 commit，不自动 push。

手动运行形式（路径与 SHA 替换为实际值）：

```bash
node scripts/acceptance/verify.mjs --formal --target /absolute/path/to/clean-codearts-clone --sha 完整40位SHA --output /absolute/path/outside-tested-clone
node scripts/acceptance/record.mjs /absolute/path/outside-tested-clone
```

不加 `--formal` 是本地预演，不允许通过 `record.mjs` 导入为正式通过结果。

## 实际覆盖与证据

浏览器实际点击完成 0 → 2 → -1 → 0 → 7 → 6。包含刷新、重新打开及独立无痕上下文；数据库直接查询；服务 restart；down 不带 -v，确认容器全部删除、原卷存在；重建后核对新容器 ID、同一个卷和计数 7，再减到 6。

主流程后执行实际停库读写失败及恢复、两次初始化不重置 6，再另起并发补充轮次（20 加/10 减，6 → 16）。整个持久化主流程不手改计数、不重新导入数据、不删除原卷。

`events.json` 保留实际命令、退出码、HTTP 状态和响应；截图附 URL/时间/浏览器信息；SQL、容器状态/ID和挂载独立存档。容器采集只包含指定字段，不保存完整环境变量或数据库密码。失败摘要注明失败，未执行步骤不能记通过。

结束后删除本轮容器、网络和构建镜像，**保留命名卷**。确认不再需要复核后，才可手动删除摘要中那个 `ase-counter-..._mysql_data` 测试卷；不要操作其他项目。

## 关卡前人工核验

1. 在 ENV-01 补齐 CodeArts 项目名称、五名成员和联系助教已加入、仓库权限证据及网页链接。可先在卡附件提供证据，再在文档引用。
2. 填写本人姓名、实际执行日期、分支和完整被测 SHA。
3. 请另一位组员按 README 在干净环境复现，填写 `docs/qa/reproduction-review.md`，记录真实结论和问题。
4. 如发现缺陷，使用已有缺陷模板登记，修复后针对新业务 SHA 重跑，不沿用旧通过结论。
5. 本卡 PR 是文档/验证工具提交，会产生新的仓库 SHA；文档必须保留实际被测业务 SHA。若作业最终提交指定合并后的新 SHA，应从 CodeArts 再跑该 SHA 并保留对应证据。不要只改 SHA 文本而不重跑。

只有以上人工信息及实际版本验证完成后，才能把卡标为完成。交接脚本成功仅证明其实际覆盖的自动化项。

## 准备阶段验证结果

2026-10-08 在史冠航本机用未提交的完整业务代码完成预演；16 项自动化覆盖项通过，ENV-01 人工证据未完成。结果、截图、SQL、容器 ID 与挂载见 docs/validation.md 第 8 节。本次未从 CodeArts 克隆尚未合并的查询/UI 代码，因此不将它记为正式 CodeArts 验收。

## 接收端实际执行记录

- Git 姓名：Rundong Yang。时间（UTC）：2026-10-10T01:51:49Z。
- 克隆基线：`d3ebee121acf153ab77cd684d246a74ebadfb916`。交接分支：`rdyang-#71144922`。
- 已从 CodeArts 检出上述完整 SHA 并完成自动化覆盖项；ENV-01 权限证据与另一位组员复核尚待人工补齐。
- 完整日志保存在本机 `.git/card-71144922/`，本人代码理解、接口确认/复核信息仍需补充。
