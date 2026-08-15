#!/usr/bin/env bash
# Smoke live Billing Portal session creation against Production API.
# Requires a user that already has stripe_customer_id (e.g. after Checkout).
#
# Usage:
#   export SUPABASE_URL=... SUPABASE_ANON_KEY=... \
#          TEST_USER_EMAIL=... TEST_USER_PASSWORD=...
#   ./scripts/stripe-live-portal-smoke.sh
#
# Optional: API_BASE (default hazel Production).

set -euo pipefail

API_BASE="${API_BASE:-https://dashboard-backend-hazel.vercel.app}"
SUPABASE_URL="${SUPABASE_URL:?}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:?}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:?}"

echo "1) Supabase password login…"
TOKEN=$(curl -sS --max-time 30 \
  -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); t=d.get("access_token");
assert t, d; print(t)')

echo "2) GET /api/status…"
curl -sS --max-time 30 "${API_BASE}/api/status" \
  -H "Authorization: Bearer ${TOKEN}" \
  | python3 -c '
import sys, json
d = (json.load(sys.stdin).get("data") or {})
billing = d.get("billing") or {}
print("tier=%s has_customer=%s stripe_configured=%s" % (
    d.get("tier"), billing.get("has_customer"), billing.get("stripe_configured")))
assert billing.get("has_customer"), "user needs stripe_customer_id (complete Checkout first)"
'

echo "3) POST /api/billing-portal…"
RESP=$(curl -sS --max-time 45 -X POST "${API_BASE}/api/billing-portal" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "$RESP" | python3 -c '
import sys, json
d = json.load(sys.stdin)
url = (d.get("data") or {}).get("portal_url") or ""
assert url.startswith("https://billing.stripe.com/"), d
print("portal_url_ok host=%s" % url.split("/")[2])
'

echo "OK: live Billing Portal session created."
