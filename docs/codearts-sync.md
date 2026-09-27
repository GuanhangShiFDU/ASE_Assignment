# GitHub → CodeArts 自动同步

GitHub 为日常开发入口。PR 合并到 `master` 后，`Sync master to CodeArts` workflow 将最新 `master` 及完整提交历史推送到 CodeArts。它不复制 PR、评审或工作卡，也不运行业务测试。

只同步 `master`，不自动推送其他分支或标签，不强制覆盖远端。CodeArts 保持普通可写仓库，不开启只读镜像的定时同步功能。

## 一次性配置

1. 在自己的电脑生成一把**专用** RSA 同步密钥，不复用日常登录密钥。下面的命令在文件已存在时不会覆盖它；无需设置口令，私钥将由 GitHub Actions Secret 保管。

   ```bash
   test ! -e ~/.ssh/codearts_actions && test ! -e ~/.ssh/codearts_actions.pub && \
     ssh-keygen -t rsa -b 4096 -C "github-actions-codearts-sync" -N '' -f ~/.ssh/codearts_actions
   ```

2. 将 `~/.ssh/codearts_actions.pub` 的公钥添加到 CodeArts 的「设置我的 SSH 密钥」。该账号需要目标仓库 `master` 的推送权限；仓库保护规则也必须允许同步账号推送。条件允许时，使用仅有目标仓库写权限的同步账号。

3. 在 GitHub 仓库 **Settings → Secrets and variables → Actions → New repository secret** 添加：

   | 名称 | 值 |
   | --- | --- |
   | `CODEARTS_SSH_PRIVATE_KEY` | `~/.ssh/codearts_actions` 的完整私钥内容，包括首尾标记行 |

   macOS 可执行 `pbcopy < ~/.ssh/codearts_actions`，再粘贴到 Secret 输入框。不要把私钥发到聊天、写入仓库或贴进日志。设置完后可清空剪贴板：`printf '' | pbcopy`。

4. 将本次 workflow 变更通过 PR 合并到 GitHub `master`。凭据提前配置好后，这次合并即会触发同步。

SSH 主机公钥固定在 `.github/codearts_known_hosts`，来源是本机此前连接 CodeArts 时保存的 `known_hosts` 记录（2026-09-27）。它是服务器的公开身份信息，不是用户私钥。workflow 开启严格主机校验；服务端换钥时，先核实新指纹，再更新该文件，不要关闭校验。

## 查看与重试

- 在 GitHub **Actions → Sync master to CodeArts** 查看运行结果；成功摘要显示同步的完整 commit SHA。
- 手动重试：**Run workflow**，分支选择 `master`。其他分支运行会被跳过。
- 并发同步串行执行；每次取执行时最新的 GitHub `master`。
- 如果提示 `Permission denied (publickey)`，检查 Secret、CodeArts 公钥以及同步账号权限。
- 如果提示主机公钥不匹配，核实服务器身份后更新固定公钥。
- 如果提示 non-fast-forward，说明 CodeArts 有独立提交，先人工协调历史，不要改成强制推送。

PR 的测试与审批要求仍由 GitHub 分支规则负责。本 workflow 在合并后运行，不应设为合并前的必需检查。若管理员绕过检查合并，该提交同样会被同步。

## 当前验证范围

配置和脚本可在本地检查，但只有添加专用密钥并在 GitHub 实际运行成功后，才能确认 GitHub runner 到 CodeArts 的连通性与账号权限。仓库里存在 workflow 文件不代表自动同步已经启用成功。
