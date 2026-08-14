#!/usr/bin/env bash
# Create (or verify) the live Stripe Customer Portal configuration.
#
# Stripe MCP cannot write portal configs. The Stripe CLI restricted key
# (rk_live) needs "Customer Portal Write" (customer_portal_write) OR use a
# full secret key via STRIPE_SECRET_KEY / --api-key.
#
# Usage:
#   # Prefer: grant customer_portal_write on the CLI rk_live key, then:
#   ./scripts/stripe-live-portal-config.sh
#
#   # Or with a secret that already has portal write:
#   STRIPE_SECRET_KEY=sk_live_… ./scripts/stripe-live-portal-config.sh
#
# Dashboard alternative (no API key changes):
#   1. https://dashboard.stripe.com/settings/billing/portal  (LIVE mode toggle ON)
#   2. Activate Customer Portal if prompted
#   3. Enable: invoice history, payment method update, cancel at period end
#   4. Set default return URL: https://dashboard.kdpsuite.com/?tab=settings
#   5. Save — Stripe marks the first saved config as default
#
# App code (POST /api/billing-portal) uses the account default config; no
# configuration= id is required unless you add multi-config later.

set -euo pipefail

API_ARGS=(--live --confirm)
if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  API_ARGS+=(--api-key "${STRIPE_SECRET_KEY}")
fi

echo "Listing existing live portal configurations…"
EXISTING=$(stripe billing_portal configurations list "${API_ARGS[@]}" --limit 10)
COUNT=$(printf '%s' "${EXISTING}" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("data") or []))')
if [[ "${COUNT}" -gt 0 ]]; then
  printf '%s\n' "${EXISTING}" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for c in d.get("data") or []:
    print("%s default=%s active=%s name=%s" % (
        c.get("id"), c.get("is_default"), c.get("active"), c.get("name")))
'
  echo "OK: portal configuration(s) already exist. Nothing to create."
  exit 0
fi

echo "Creating live default Customer Portal configuration…"
set +e
OUT=$(stripe billing_portal configurations create "${API_ARGS[@]}" \
  --name "KDP Creator Suite default" \
  --default-return-url "https://dashboard.kdpsuite.com/?tab=settings" \
  --features.customer-update.enabled=true \
  --features.customer-update.allowed-updates=email \
  --features.customer-update.allowed-updates=address \
  --features.invoice-history.enabled=true \
  --features.payment-method-update.enabled=true \
  --features.subscription-cancel.enabled=true \
  --features.subscription-cancel.mode=at_period_end \
  --features.subscription-cancel.cancellation-reason.enabled=true \
  --features.subscription-cancel.cancellation-reason.options=too_expensive \
  --features.subscription-cancel.cancellation-reason.options=missing_features \
  --features.subscription-cancel.cancellation-reason.options=switched_service \
  --features.subscription-cancel.cancellation-reason.options=unused \
  --features.subscription-cancel.cancellation-reason.options=other \
  --features.subscription-update.enabled=false)
set -e

printf '%s\n' "${OUT}" | python3 -c '
import sys, json
d = json.loads(sys.stdin.read())
if d.get("error"):
    err = d["error"]
    print("FAILED:", err.get("message"), file=sys.stderr)
    print("Fix: enable Customer Portal Write on the restricted key,", file=sys.stderr)
    print("or run with STRIPE_SECRET_KEY=sk_live_…, or use Dashboard steps in script header.", file=sys.stderr)
    sys.exit(1)
print("created id=%s is_default=%s active=%s" % (
    d.get("id"), d.get("is_default"), d.get("active")))
feats = d.get("features") or {}
for k, v in feats.items():
    en = v.get("enabled") if isinstance(v, dict) else v
    print("  feature %s: enabled=%s" % (k, en))
'
echo "OK: live portal configuration ready."
