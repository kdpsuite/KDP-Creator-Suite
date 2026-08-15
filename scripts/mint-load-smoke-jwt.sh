#!/usr/bin/env bash
# Mint a short-lived access token for LOAD_SMOKE_JWT / auth probes.
# Does not print the token when STDOUT is a TTY unless --print is passed;
# default writes to a file path (arg1 or /tmp/load_smoke_jwt.txt).
#
# Usage:
#   export SUPABASE_URL=... SUPABASE_ANON_KEY=... \
#          TEST_USER_EMAIL=... TEST_USER_PASSWORD=...
#   ./scripts/mint-load-smoke-jwt.sh [/tmp/load_smoke_jwt.txt]
#   LOAD_SMOKE_JWT="$(cat /tmp/load_smoke_jwt.txt)" ./scripts/load-smoke.sh

set -euo pipefail

OUT="${1:-/tmp/load_smoke_jwt.txt}"
PRINT=0
if [[ "${1:-}" == "--print" ]]; then
  PRINT=1
  OUT="${2:-/tmp/load_smoke_jwt.txt}"
fi

SUPABASE_URL="${SUPABASE_URL:?}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:?}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:?}"

TOKEN=$(curl -sS --max-time 30 \
  -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); t=d.get("access_token");
assert t, d; print(t)')

umask 077
printf '%s' "$TOKEN" >"$OUT"
echo "Wrote JWT to $OUT (len=${#TOKEN})" >&2
if [[ "$PRINT" -eq 1 ]]; then
  printf '%s' "$TOKEN"
fi
