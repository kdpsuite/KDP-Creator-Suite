#!/usr/bin/env bash
# Poll Production /api/status after a live Checkout payment.
# Usage:
#   export SUPABASE_URL=... SUPABASE_ANON_KEY=...
#   export LIVE_E2E_EMAIL=... LIVE_E2E_PASSWORD=...
#   ./scripts/stripe-live-checkout-poll.sh

set -euo pipefail

API_BASE="${API_BASE:-https://dashboard-backend-hazel.vercel.app}"
SUPABASE_URL="${SUPABASE_URL:?}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?}"
LIVE_E2E_EMAIL="${LIVE_E2E_EMAIL:?}"
LIVE_E2E_PASSWORD="${LIVE_E2E_PASSWORD:?}"
EXPECT_TIER="${EXPECT_TIER:-pro}"
TRIES="${TRIES:-30}"

TOKEN=$(curl -sS --max-time 30 \
  -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${LIVE_E2E_EMAIL}\",\"password\":\"${LIVE_E2E_PASSWORD}\"}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); t=d.get("access_token"); assert t, d; print(t)')

for i in $(seq 1 "${TRIES}"); do
  OUT=$(curl -sS --max-time 30 "${API_BASE}/api/status" -H "Authorization: Bearer ${TOKEN}")
  TIER=$(printf '%s' "${OUT}" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or {}).get("tier"))')
  CUST=$(printf '%s' "${OUT}" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(((d.get("data") or {}).get("billing") or {}).get("has_customer"))')
  echo "[${i}] tier=${TIER} has_customer=${CUST}"
  if [[ "${TIER}" == "${EXPECT_TIER}" ]]; then
    printf '%s\n' "${OUT}" | python3 -m json.tool
    echo "OK: tier is ${EXPECT_TIER}"
    exit 0
  fi
  sleep 5
done

echo "Timed out waiting for tier=${EXPECT_TIER}" >&2
exit 1
