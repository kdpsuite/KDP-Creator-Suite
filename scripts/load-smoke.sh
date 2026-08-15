#!/usr/bin/env bash
# Concurrent smoke load against public health + auth-gated convert/batch paths.
# Unauthenticated POSTs expect 401/422/429 — measures gate latency.
# Optional authenticated probes: set LOAD_SMOKE_JWT to a valid access token.
# Auth probes expect 400/401/422/429 (auth accepted or validation/quota — not 5xx).
# Usage: ./scripts/load-smoke.sh [API_BASE_URL] [CONCURRENCY] [REQUESTS]
# Defaults: production hazel API, 8 workers, 40 total requests.

set -euo pipefail

API_BASE="${1:-https://dashboard-backend-hazel.vercel.app}"
CONCURRENCY="${2:-8}"
REQUESTS="${3:-40}"
JWT="${LOAD_SMOKE_JWT:-}"

# path|method|ok_codes|auth (0=no bearer, 1=require JWT)
PROBES=(
  "/api/health|GET|200|0"
  "/api/health/live|GET|200|0"
  "/api/health/ready|GET|200|0"
  "/|GET|200|0"
  "/api/pdf/format-kdp|POST|401,422,429|0"
  "/api/pdf/batch-coloring|POST|401,422,429|0"
  "/api/batch/submit|POST|401,422,429|0"
  "/api/support/ticket|POST|401,422,429|0"
)

if [ -n "$JWT" ]; then
  PROBES+=(
    "/api/status|GET|200,401,422|1"
    "/api/pdf/format-kdp|POST|400,401,422,429|1"
    "/api/pdf/convert-coloring|POST|400,401,422,429|1"
    "/api/batch/submit|POST|400,401,422,429|1"
    "/api/user-metrics|GET|200,401,422|1"
  )
fi

PASS=0
FAIL=0
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "KDP Creator Suite — Load smoke"
echo "API base: $API_BASE"
echo "Concurrency: $CONCURRENCY · Requests: $REQUESTS"
if [ -n "$JWT" ]; then
  echo "Auth probes: enabled (LOAD_SMOKE_JWT set)"
else
  echo "Auth probes: skipped (set LOAD_SMOKE_JWT for authenticated convert/batch)"
fi
echo ""

worker() {
  local id="$1"
  local probe="${PROBES[$((id % ${#PROBES[@]}))]}"
  local path method ok_codes auth
  IFS='|' read -r path method ok_codes auth <<<"$probe"
  local out="$TMPDIR/r-$id"
  local code
  local -a curl_args=( -sS -o /dev/null -w '%{http_code} %{time_total}' --max-time 15 )
  if [ "$auth" = "1" ]; then
    curl_args+=( -H "Authorization: Bearer ${JWT}" )
  fi
  if [ "$method" = "POST" ]; then
    code=$(curl "${curl_args[@]}" \
      -X POST -H "Content-Type: application/json" -d '{}' \
      "${API_BASE}${path}" || echo "000 0")
  else
    code=$(curl "${curl_args[@]}" \
      "${API_BASE}${path}" || echo "000 0")
  fi
  echo "$path|$method|$ok_codes|$code" >"$out"
}

running=0
for ((i = 0; i < REQUESTS; i++)); do
  worker "$i" &
  running=$((running + 1))
  if [ "$running" -ge "$CONCURRENCY" ]; then
    wait -n || true
    running=$((running - 1))
  fi
done
wait || true

slow=0
for f in "$TMPDIR"/r-*; do
  IFS='|' read -r path method ok_codes rest <"$f"
  code="${rest%% *}"
  elapsed="${rest#* }"
  ok=0
  IFS=',' read -ra allowed <<<"$ok_codes"
  for a in "${allowed[@]}"; do
    if [ "$code" = "$a" ]; then ok=1; break; fi
  done
  if [ "$ok" -eq 1 ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL  $method $path → HTTP $code (expected $ok_codes)"
  fi
  awk -v t="$elapsed" 'BEGIN { exit !(t+0 > 2.0) }' && slow=$((slow + 1)) || true
done

echo ""
echo "Summary: $PASS ok, $FAIL failed, $slow slower than 2s"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Load smoke passed."
