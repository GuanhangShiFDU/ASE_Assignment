#!/usr/bin/env bash
# Run from the host. All writes target a fresh, disposable Compose project.
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
command -v openssl >/dev/null
docker info >/dev/null
docker compose version

umask 077
work_dir=$(mktemp -d "${TMPDIR:-/tmp}/ase-counter-query.XXXXXXXX")
project="ase-query-$(openssl rand -hex 6)"
export MYSQL_DATABASE=counter_query_test MYSQL_USER=query_user
MYSQL_PASSWORD=$(openssl rand -hex 24)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
export MYSQL_PASSWORD MYSQL_ROOT_PASSWORD
export BACKEND_PORT=3000 FRONTEND_PORT=8080

# Clear the inherited port mapping; requests run inside the backend container.
cat > "$work_dir/override.yaml" <<YAML
services:
  backend:
    ports: !reset []
    environment:
      QUERY_DISPOSABLE_TEST: "1"
    volumes:
      - "$repo_root/backend/test:/app/test:ro"
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

printf 'Query verification: %s\nBaseline: %s + working files\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$(git -C "$repo_root" rev-parse HEAD)"
"${dc[@]}" config --quiet
"${dc[@]}" up -d --build --wait --wait-timeout 180 backend db
"${dc[@]}" exec -T backend npm run check
"${dc[@]}" exec -T backend npm run test:mutation
"${dc[@]}" exec -T backend node --test test/counter-query.integration.test.js
"${dc[@]}" stop db
"${dc[@]}" exec -T backend node --input-type=module <<'JS'
import assert from 'node:assert/strict';
const response = await fetch('http://127.0.0.1:3000/api/counter', {signal: AbortSignal.timeout(5000)});
assert.equal(response.status, 503);
assert.deepEqual(await response.json(), {error: 'COUNTER_READ_FAILED'});
console.log('PASS real database outage: query returns 503 without a value');
JS
"${dc[@]}" up -d --wait --wait-timeout 120 db
"${dc[@]}" exec -T backend node --input-type=module <<'JS'
import assert from 'node:assert/strict';
const response = await fetch('http://127.0.0.1:3000/api/counter', {signal: AbortSignal.timeout(5000)});
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), {value: -8});
console.log('PASS recovery: query returns retained value -8');
JS
printf 'PASS query verification\n'
