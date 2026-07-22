#!/usr/bin/env bash
# Pre-launch smoke checks for KDP Creator Suite API.
# Usage: ./scripts/pre-launch-check.sh [API_BASE_URL]
# Default API_BASE_URL: http://localhost:5000

set -euo pipefail

API_BASE="${1:-http://localhost:5000}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expect_ok="${3:-true}"

  if response=$(curl -sf --max-time 10 "$url" 2>/dev/null); then
    if echo "$response" | grep -q '"ok":true'; then
      echo "  PASS  $name"
      PASS=$((PASS + 1))
      return 0
    fi
    if [ "$expect_ok" = "false" ]; then
      echo "  PASS  $name (expected non-ok response)"
      PASS=$((PASS + 1))
      return 0
    fi
    echo "  FAIL  $name — response missing ok:true"
    FAIL=$((FAIL + 1))
    return 1
  else
    echo "  FAIL  $name — unreachable ($url)"
    FAIL=$((FAIL + 1))
    return 1
  fi
}

echo "KDP Creator Suite — Pre-Launch Checks"
echo "API base: $API_BASE"
echo ""

echo "Health endpoints:"
check "GET /api/health" "$API_BASE/api/health" || true
check "GET /api/health/live" "$API_BASE/api/health/live" || true
check "GET /api/health/ready" "$API_BASE/api/health/ready" || true

echo ""
echo "Public routes:"
check "GET /" "$API_BASE/" || true

echo ""
echo "Protected routes (expect 401 without token):"
if code=$(curl -sf -o /dev/null -w '%{http_code}' "$API_BASE/api/user-metrics" 2>/dev/null); then
  if [ "$code" = "401" ] || [ "$code" = "422" ]; then
    echo "  PASS  GET /api/user-metrics rejects unauthenticated"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  GET /api/user-metrics returned HTTP $code (expected 401/422)"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  FAIL  GET /api/user-metrics — unreachable"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "Templates library:"
check "GET /api/templates" "$API_BASE/api/templates" || true

echo ""
echo "Summary: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "All checks passed."
