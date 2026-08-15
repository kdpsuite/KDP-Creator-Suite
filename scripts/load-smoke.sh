#!/usr/bin/env bash
# Lightweight concurrent smoke load against public health endpoints.
# Usage: ./scripts/load-smoke.sh [API_BASE_URL] [CONCURRENCY] [REQUESTS]
# Defaults: production hazel API, 8 workers, 40 total requests.

set -euo pipefail

API_BASE="${1:-https://dashboard-backend-hazel.vercel.app}"
CONCURRENCY="${2:-8}"
REQUESTS="${3:-40}"
PATHS=("/api/health" "/api/health/live" "/")

PASS=0
FAIL=0
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "KDP Creator Suite — Load smoke"
echo "API base: $API_BASE"
echo "Concurrency: $CONCURRENCY · Requests: $REQUESTS"
echo ""

worker() {
  local id="$1"
  local path="${PATHS[$((id % ${#PATHS[@]}))]}"
  local out="$TMPDIR/r-$id"
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code} %{time_total}' --max-time 15 "${API_BASE}${path}" || echo "000 0")
  echo "$path $code" >"$out"
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
  read -r path code elapsed <"$f"
  if [ "$code" = "200" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL  $path → HTTP $code"
  fi
  # flag >2s responses
  awk -v t="$elapsed" 'BEGIN { exit !(t+0 > 2.0) }' && slow=$((slow + 1)) || true
done

echo ""
echo "Summary: $PASS ok, $FAIL failed, $slow slower than 2s"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Load smoke passed."
