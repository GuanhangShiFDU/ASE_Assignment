#!/usr/bin/env bash
# Run from the host. All writes target a fresh, disposable Compose project.
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
command -v openssl >/dev/null
docker info >/dev/null
docker compose version

umask 077
work_dir=$(mktemp -d "${TMPDIR:-/tmp}/ase-backend-onboarding.XXXXXXXX")
project="ase-onboarding-$(openssl rand -hex 6)"
export MYSQL_DATABASE=counter_onboarding MYSQL_USER=onboarding_user
MYSQL_PASSWORD=$(openssl rand -hex 24)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
export MYSQL_PASSWORD MYSQL_ROOT_PASSWORD
export BACKEND_PORT=3000 FRONTEND_PORT=8080

# Clear the inherited port mapping; requests run inside the backend container.
cat > "$work_dir/override.yaml" <<'YAML'
services:
  backend:
    ports: !reset []
YAML

dc=(docker compose --project-name "$project" --env-file /dev/null
    -f "$repo_root/compose.yaml" -f "$work_dir/override.yaml")
cleanup() {
  result=$?
  trap - EXIT
  if ! "${dc[@]}" down --volumes --remove-orphans --rmi local; then
    printf 'Cleanup failed; inspect only the test project: %s\n' "$project" >&2
    result=1
  fi
  rm -rf "$work_dir"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

db_sql() {
  "${dc[@]}" exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --protocol=TCP -h 127.0.0.1 -u"$MYSQL_USER" "$MYSQL_DATABASE" --batch --skip-column-names'
}

check_health() {
  "${dc[@]}" exec -T backend node --input-type=module - "$1" "$2" <<'JS'
import assert from 'node:assert/strict';
const expectedStatus = Number(process.argv[2]);
const database = process.argv[3];
const response = await fetch('http://127.0.0.1:3000/api/health', {
  signal: AbortSignal.timeout(5000),
});
const body = await response.json();
assert.equal(response.status, expectedStatus);
assert.deepEqual(body, {
  status: expectedStatus === 200 ? 'ok' : 'error',
  database,
});
console.log(`PASS health: HTTP ${response.status} ${JSON.stringify(body)}`);
JS
}

printf 'Verification started: %s\nTest project: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$project"
"${dc[@]}" config --quiet
"${dc[@]}" up -d --build --wait --wait-timeout 180 backend db
"${dc[@]}" ps
"${dc[@]}" exec -T backend node --version
"${dc[@]}" exec -T backend npm run check
"${dc[@]}" exec -T db mysql --version
check_health 200 connected

rows=$(printf 'SELECT id, value FROM counter ORDER BY id;\n' | db_sql)
[[ "$rows" == $'1\t0' ]] || { printf 'FAIL initial row: %s\n' "$rows"; exit 1; }
printf 'PASS initial row: id=1 value=0 (exactly one row)\n'

# A non-zero sentinel proves initialization does not silently reset the value.
printf 'UPDATE counter SET value=7 WHERE id=1;\n' | db_sql
db_sql < "$repo_root/database/init.sql"
db_sql < "$repo_root/database/init.sql"
rows=$(printf 'SELECT id, value FROM counter ORDER BY id;\n' | db_sql)
[[ "$rows" == $'1\t7' ]] || { printf 'FAIL repeated initialization: %s\n' "$rows"; exit 1; }
printf 'PASS repeated initialization: id=1 value=7 after two reruns (exactly one row)\n'

"${dc[@]}" stop db
check_health 503 unavailable
"${dc[@]}" up -d --wait --wait-timeout 120 db
check_health 200 connected
printf 'PASS backend onboarding runtime checks; disposable resources will now be removed.\n'
