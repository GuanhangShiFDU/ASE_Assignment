# Lab 1 提交核对表

依据：[课程作业第六节](https://openmsg.yuque.com/openmsg/gp3cfs/srlobx960pg94ozp)。本表区分已完成验收与尚待发布、同步和提交的事项；实际权限截图、本人操作回执和复核记录均已链接。

## 课程入口需要提交的信息

| 项目 | 内容 |
| --- | --- |
| 小组 | 第 22 小组 |
| 组长 | 史冠航，26113050105 |
| 其他组员 | 刘乐翔 26113050085；刘子扬 26113050091；李全昊 26113050071；杨润东 26213050435 |
| 联系助教 | 李展发；CodeArts 昵称“助教李展发”，用户名 `hid_uq167z7i5yyrocf`，见 [项目成员截图](images/codearts/project-members-ta-20261010.png) |
| CodeArts 项目名称 | `2026高级软件工程_第22小组`；已由用户提供的项目页面截图核实 |
| CodeArts 项目网页链接 | [项目工作项页面](https://devcloud.cn-north-4.huaweicloud.com/projectman/scrum/c1aa0a224dba4c2591226b87a5af9407/workitem/backlog) |
| CodeArts 仓库网页链接 | [lab1-counter（master）](https://devcloud.cn-north-4.huaweicloud.com/codehub/project/c1aa0a224dba4c2591226b87a5af9407/codehub/3095685/home?ref=master)；Repository ID：3095685 |
| CodeArts 仓库 SSH | `git@codehub.devcloud.cn-north-4.huaweicloud.com:c1aa0a224dba4c2591226b87a5af9407/lab1-counter.git` |
| 提交分支 | `master` |
| 最终交付完整 Commit SHA | **待收尾修改合并并同步后冻结，填写到课程提交入口** |
| 运行说明 | [README](../README.md) |
| 验收记录与截图 | [validation.md](validation.md)，以及其中链接的 `docs/evidence/` |

截止时间、提交入口和助教账号以课程通知为准。

## 2026-10-10 检查结果

- 上午自动化复测基线为 `ba87cf52eb50c6cf429bdf1013e1c2873f81f972`，当时 GitHub 和新 CodeArts 仓库的 `master` 一致。随后收尾文档合并，本地 `master` 与史冠航从 CodeArts 新克隆的版本均为 `fb6c48085b1d9f2d25592343309f28de0e21c520`。
- 五名成员均有实际提交；README 已补提交作者名和对应任务，区分查询与加减职责。
- 完整源码、依赖锁文件、前后端 Dockerfile、MySQL 8.4、三服务 Compose、就绪检查、首次初始化和命名数据卷均已具备。
- 杨润东从 CodeArts 验证的版本为 `d3ebee121acf153ab77cd684d246a74ebadfb916`，16 项自动化覆盖项通过；SQL 数值序列、三个容器 ID 的变化、原卷复用和命令退出码已核对。
- `d3ebee1` 到 `ba87cf5` 没有应用运行代码或部署配置变化；新增验收材料和验证工具兼容性修复。已从 CodeArts 干净克隆 `ba87cf5`，在史冠航本机由 Codex 完成 16 项自动化复测，全部通过；本轮截图和原始结果已保存于 [验收记录](validation.md)。不将本次自动化执行代签为组员的人工复核。
- CodeArts 网页在自动化检查时要求登录；用户随后提供了 [项目页面](images/codearts/project-20261010.png) 和 [仓库页面](images/codearts/repository-20261010.png) 截图，项目名称与仓库网页链接已核实。用户进一步提供了项目及仓库成员截图：五名组员与助教李展发均已加入，仓库成员状态为“使用中”；助教项目/仓库角色均为“浏览者”。用户随后提供权限矩阵，确认“浏览者”已开启代码下载，未开启提交；“使用项目权限配置”关闭。项目、成员和仓库权限配置证据已齐；未声称助教本人已执行克隆。

- 史冠航（26113050105）在上述 `fb6c480` 完成另一位组员的 [README 人工复核](qa/reproduction-review.md)：0 → 2 → -1 → 0 → 7 → 6，刷新/无痕读取、服务重启、保留原卷重建及恢复后写入均通过，最终本人 SQL 查询为 `id=1, value=6`。Codex 协助排障和只读采集的步骤已单独注明。
- Git 对照确认 `ba87cf5` 到 `fb6c480` 只有 README、文档及证据变化，应用代码与部署配置未变；历史自动化报告保留各自真实 SHA。本次新增材料仍需提交评审和同步。

## 组长收尾顺序

1. **CodeArts 证据已补齐**：项目名称、网页链接、五名组员及助教李展发的加入状态和角色均已留图；[仓库权限矩阵](images/codearts/repository-code-permissions-viewer-20261010.png) 显示助教“浏览者”允许下载、不允许提交。此处核验的是实际权限配置，未代称助教本人克隆成功。
2. **README 组员复核已完成**：主验收由杨润东执行，史冠航作为另一名组员于 2026-10-10 完成复核，见 [实际记录](qa/reproduction-review.md)。本轮 Mac 以前部署过项目，但使用新克隆、独立项目及新卷；不将该主机描述为从未部署过项目。协助排障与 Codex 自动化执行均单独注明。
3. **整理并评审收尾修改**：确认执行人、日期、环境、截图链接与实际版本一致。通过 PR 合并文档和必要修复，等待 GitHub 到 CodeArts 的同步成功。功能或部署配置如有修改，需针对新版本复测。
4. **补充卡片并结束验收**：材料合并并同步后，在 #71144922 留下 PR 链接、实际被测 SHA、复核人史冠航及证据位置，按团队流程将验收卡和父 Story 收尾。不要把合并后的新 SHA 改写为既有报告的被测版本。
5. **冻结并提交版本**：在原开发仓库 `~/ASE_Assignment` 核对下面两条命令输出的 SHA 相同，再把 `master` 和完整 40 位 SHA 填入课程提交入口。已有验收记录必须保留真实被测 SHA，不能直接把旧报告中的 SHA 改成新值。若要验证冻结后的同一 SHA，可将新报告作为卡片/提交附件补充，避免为了填写报告反复产生新提交。

```bash
git ls-remote origin refs/heads/master
git ls-remote codearts refs/heads/master
```

课程没有强制要求单元测试、压测或 CI 覆盖率门槛；当前已有浏览器、API、SQL 和持久化自动验证。额外测试可作为改进，不阻塞上述收尾工作。
