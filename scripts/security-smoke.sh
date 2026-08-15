#!/usr/bin/env bash
# Internal security smoke checks (not a formal pen-test).
# Usage: ./scripts/security-smoke.sh [API_BASE_URL]
# Verifies: health up, unauth protected routes reject, CORS not wildcard on ACAO,
# debug-sentry disabled, security headers present.

set -euo pipefail

API_BASE="${1:-https://dashboard-backend-hazel.vercel.app}"
ORIGIN="${CHECK_ORIGIN:-https://dashboard.kdpsuite.com}"
PASS=0
FAIL=0

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; FAIL=$((FAIL + 1)); }

expect_auth_reject() {
  local method="$1"
  local path="$2"
  local code
  if [ "$method" = "POST" ]; then
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
      -X POST -H "Content-Type: application/json" -d '{}' \
      "${API_BASE}${path}" || echo 000)
  else
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
      "${API_BASE}${path}" || echo 000)
  fi
  if [ "$code" = "401" ] || [ "$code" = "422" ] || [ "$code" = "429" ]; then
    pass "$method $path rejects unauthenticated ($code)"
  else
    fail "$method $path → $code (expected 401/422/429)"
  fi
}

echo "KDP Creator Suite — Security smoke"
echo "API base: $API_BASE"
echo "Probe Origin: $ORIGIN"
echo ""

echo "Health:"
code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$API_BASE/api/health" || echo 000)
if [ "$code" = "200" ]; then pass "GET /api/health → 200"; else fail "GET /api/health → $code"; fi

code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$API_BASE/api/health/ready" || echo 000)
if [ "$code" = "200" ] || [ "$code" = "503" ]; then
  pass "GET /api/health/ready → $code"
else
  fail "GET /api/health/ready → $code (expected 200/503)"
fi

echo ""
echo "Auth gate:"
expect_auth_reject GET /api/user-metrics
expect_auth_reject GET /api/batch/jobs
expect_auth_reject POST /api/pdf/format-kdp
expect_auth_reject POST /api/pdf/batch-coloring
expect_auth_reject POST /api/batch/submit
expect_auth_reject POST /api/checkout

code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
  -H "Authorization: Bearer not.a.jwt" "$API_BASE/api/status" || echo 000)
if [ "$code" = "401" ] || [ "$code" = "422" ]; then
  pass "Invalid JWT rejected on /api/status ($code)"
else
  fail "/api/status with junk JWT → $code (expected 401/422)"
fi

echo ""
echo "Debug endpoints:"
code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$API_BASE/api/debug-sentry" || echo 000)
if [ "$code" = "404" ]; then
  pass "GET /api/debug-sentry disabled ($code)"
else
  fail "GET /api/debug-sentry → $code (expected 404)"
fi

echo ""
echo "CORS / headers:"
headers=$(curl -sS -D - -o /dev/null --max-time 15 \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS "$API_BASE/api/health" || true)
acao=$(echo "$headers" | tr -d '\r' | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2; exit}')
if [ -z "$acao" ]; then
  # Some platforms skip OPTIONS; check GET
  headers=$(curl -sS -D - -o /dev/null --max-time 15 -H "Origin: $ORIGIN" "$API_BASE/api/health" || true)
  acao=$(echo "$headers" | tr -d '\r' | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2; exit}')
fi
if [ "$acao" = "*" ]; then
  fail "Access-Control-Allow-Origin is wildcard *"
elif [ -n "$acao" ]; then
  pass "Access-Control-Allow-Origin is restricted ($acao)"
else
  fail "No Access-Control-Allow-Origin header observed"
fi

bad_origin_headers=$(curl -sS -D - -o /dev/null --max-time 15 \
  -H "Origin: https://evil.example" "$API_BASE/api/health" || true)
bad_acao=$(echo "$bad_origin_headers" | tr -d '\r' | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2; exit}')
if [ "$bad_acao" = "*" ] || [ "$bad_acao" = "https://evil.example" ]; then
  fail "Untrusted origin reflected/allowed ($bad_acao)"
else
  pass "Untrusted origin not allowed"
fi

get_headers=$(curl -sS -D - -o /dev/null --max-time 15 "$API_BASE/api/health" || true)
for h in "x-content-type-options" "x-frame-options" "referrer-policy"; do
  if echo "$get_headers" | tr -d '\r' | awk -F': ' -v k="$h" 'tolower($1)==k{found=1} END{exit !found}'; then
    pass "Header present: $h"
  else
    fail "Missing header: $h"
  fi
done

echo ""
echo "Summary: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Security smoke passed. Formal audit still required before public paid launch."
