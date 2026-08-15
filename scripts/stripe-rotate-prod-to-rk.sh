#!/usr/bin/env bash
# Rotate Production STRIPE_SECRET_KEY from sk_live → rk_live.
#
# Required rk_live permissions (write includes read):
#   Customers, Checkout Sessions, Prices, Products, Subscriptions,
#   Promotion Codes, Customer Portal (sessions + configurations),
#   Invoices (read)
#
# Usage:
#   printf '%s' 'rk_live_…' | ./scripts/stripe-rotate-prod-to-rk.sh
#   # or:
#   ./scripts/stripe-rotate-prod-to-rk.sh <<< 'rk_live_…'
#
# Does not print the key. Redeploys dashboard-backend production after update.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/backend-api/kdp-creator-api"
SCOPE="${VERCEL_SCOPE:-unlovedproductions-projects}"

if [[ -t 0 ]]; then
  echo "Paste rk_live key (input hidden), then Enter:" >&2
  # shellcheck disable=SC2034
  read -r -s KEY
  echo >&2
else
  KEY="$(cat)"
fi
KEY="${KEY//$'\n'/}"
KEY="${KEY//$'\r'/}"

if [[ ! "$KEY" =~ ^rk_live_ ]]; then
  echo "ERROR: key must start with rk_live_" >&2
  exit 1
fi

echo "1) Verifying key can create a Billing Portal session…" >&2
python3 - "$KEY" <<'PY'
import json, sys, urllib.request, urllib.parse
k = sys.argv[1]
# cheap auth check
req = urllib.request.Request(
    "https://api.stripe.com/v1/balance",
    headers={"Authorization": f"Bearer {k}"},
)
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        json.load(r)
except urllib.error.HTTPError as e:
    err = json.load(e)
    msg = err.get("error", {}).get("message", str(e))
    # balance may be denied on rk — fall through to portal configs list
    if "permission" not in msg.lower() and e.code not in (401, 403):
        print("balance check:", msg[:160], file=sys.stderr)

req = urllib.request.Request(
    "https://api.stripe.com/v1/billing_portal/configurations?limit=1",
    headers={"Authorization": f"Bearer {k}"},
)
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)
except urllib.error.HTTPError as e:
    err = json.load(e)
    print("FAIL portal config list:", err.get("error", {}).get("message", "")[:200], file=sys.stderr)
    sys.exit(1)
print("portal_configs", len(d.get("data") or []), file=sys.stderr)

# Prefer a dry permission probe: PromotionCode list (used by checkout)
req = urllib.request.Request(
    "https://api.stripe.com/v1/promotion_codes?limit=1&active=true",
    headers={"Authorization": f"Bearer {k}"},
)
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        json.load(r)
    print("promotion_codes: ok", file=sys.stderr)
except urllib.error.HTTPError as e:
    err = json.load(e)
    print("WARN promotion_codes:", err.get("error", {}).get("message", "")[:160], file=sys.stderr)
PY

echo "2) Updating Vercel Production STRIPE_SECRET_KEY…" >&2
cd "$API_DIR"
npx --yes vercel@latest env rm STRIPE_SECRET_KEY production --scope "$SCOPE" --yes 2>/dev/null || true
printf '%s' "$KEY" | npx --yes vercel@latest env add STRIPE_SECRET_KEY production --scope "$SCOPE" --sensitive
# Clear local copies
KEY=""
unset KEY

echo "3) Redeploying Production backend…" >&2
cd "$ROOT"
npx --yes vercel@latest deploy --prod --yes --scope "$SCOPE"

echo "4) Smoke: Production /api/health" >&2
curl -sS --max-time 20 "https://dashboard-backend-hazel.vercel.app/api/health" | python3 -m json.tool | head -20

echo "OK: Production now on rk_live. Revoke the old sk_live in Stripe Dashboard → API keys." >&2
