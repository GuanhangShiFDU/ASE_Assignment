#!/usr/bin/env bash
# Read-only environment collection; this does not execute acceptance cases.
set -euo pipefail
[[ $# -eq 0 ]] || { echo 'Usage: bash scripts/qa/capture-environment.sh' >&2; exit 1; }
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo"
command -v git >/dev/null
command -v docker >/dev/null
git_version=$(git --version)
docker_client=$(docker version --format '{{.Client.Version}}')
docker_server=$(docker version --format '{{.Server.Version}}')
[[ -n "$docker_server" ]] || { echo 'Docker Engine must be running.' >&2; exit 1; }
compose_version=$(docker compose version --short)
docker_platform=$(docker info --format '{{.OSType}}/{{.Architecture}}')
operating_system=$(uname -sr)
if command -v sw_vers >/dev/null; then
  operating_system="macOS $(sw_vers -productVersion) ($operating_system)"
fi
branch=$(git branch --show-current)
sha=$(git rev-parse HEAD)
changes=$(git status --short)
mkdir -p docs/qa/local-evidence
output=$(mktemp -d "$repo/docs/qa/local-evidence/environment-XXXXXXXX")
{
  printf '# QA 本机环境采集\n\n'
  printf -- '- 采集时间（UTC）：%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf -- '- 操作系统：%s\n' "$operating_system"
  printf -- '- CPU 架构：%s\n' "$(uname -m)"
  printf -- '- Git：%s\n' "$git_version"
  printf -- '- Docker 客户端 / 服务端：%s / %s\n' "$docker_client" "$docker_server"
  printf -- '- Compose：%s\n' "$compose_version"
  printf -- '- Docker 平台：%s\n' "$docker_platform"
  printf -- '- 当前分支：`%s`\n' "${branch:-DETACHED}"
  printf -- '- 当前 HEAD：`%s`\n' "$sha"
  if [[ -z "$changes" ]]; then
    printf -- '- 工作区：干净。\n'
  else
    printf -- '- 工作区：存在未提交修改；此 HEAD 不能代表修改后的全部文件。\n\n```text\n%s\n```\n' "$changes"
  fi
  printf '\n这里只采集环境信息，没有启动应用或执行业务用例。验收来源、浏览器版本、真实访问地址、卷信息及最终被测 SHA 仍须另行记录。\n'
} > "$output/environment.md"
printf '%s\n' "$output/environment.md"
