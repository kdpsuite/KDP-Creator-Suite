#!/usr/bin/env bash
# Stripe test-mode Checkout E2E against a deployed API (Preview recommended).
# Requires a working sk_test on that deployment and a Supabase user JWT.
#
# Usage:
#   export API_BASE=https://<preview>-dashboard-backend-....vercel.app
#   export SUPABASE_URL=...
#   export SUPABASE_ANON_KEY=...
#   export TEST_USER_EMAIL=...
#   export TEST_USER_PASSWORD=...
#   ./scripts/stripe-test-checkout-e2e.sh
#
# Then open checkout_url, pay with test card 4242 4242 4242 4242, and confirm
# GET /api/status shows tier=pro (or studio).

set -euo pipefail

API_BASE="${API_BASE:?Set API_BASE to Preview API origin (no trailing slash)}"
SUPABASE_URL="${SUPABASE_URL:?}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:?}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:?}"
TIER="${TIER:-pro}"

echo "1) Supabase password login..."
TOKEN=$(curl -sS --max-time 30 \
  -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); t=d.get("access_token");
assert t, d; print(t)')

echo "2) GET /api/status (before)..."
curl -sS --max-time 30 "${API_BASE}/api/status" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool

echo "3) POST /api/checkout tier=${TIER}..."
RESP=$(curl -sS --max-time 45 -X POST "${API_BASE}/api/checkout" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"tier\":\"${TIER}\"}")
echo "$RESP" | python3 -m json.tool
URL=$(echo "$RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); u=(d.get("data") or {}).get("checkout_url");
assert u, d; print(u)')

echo ""
echo "4) Open this Checkout URL and pay with test card 4242 4242 4242 4242:"
echo "$URL"
echo ""
echo "5) After payment, re-check status:"
echo "   curl -sS ${API_BASE}/api/status -H \"Authorization: Bearer \$TOKEN\" | python3 -m json.tool"
