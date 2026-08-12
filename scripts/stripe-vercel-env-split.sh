#!/usr/bin/env bash
# Configure Vercel dashboard-backend Stripe env with correct mode split.
# Does NOT print secrets. Run from repo root after restoring keys from Stripe Dashboard.
#
# Required env (export before run — do not commit):
#   STRIPE_LIVE_SECRET          sk_live_... or rk_live_...  (Production)
#   STRIPE_TEST_SECRET          sk_test_... or rk_test_...  (Preview + Development)
#   STRIPE_LIVE_WEBHOOK_SECRET  whsec_... for live endpoint (Production)
#   STRIPE_TEST_WEBHOOK_SECRET  whsec_... for test endpoint we_1U38WTCFmkZmkrd4 (Preview + Development)
# Optional:
#   STRIPE_PRICE_PRO / STRIPE_PRICE_STUDIO  (or rely on lookup keys kdp_pro_monthly / kdp_studio_monthly)
#
# Usage:
#   export STRIPE_LIVE_SECRET=sk_live_...
#   export STRIPE_TEST_SECRET=sk_test_...
#   export STRIPE_LIVE_WEBHOOK_SECRET=whsec_...
#   export STRIPE_TEST_WEBHOOK_SECRET=whsec_...
#   ./scripts/stripe-vercel-env-split.sh

set -euo pipefail

SCOPE="${VERCEL_SCOPE:-unlovedproductions-projects}"
PROJECT_DIR="${1:-backend-api/kdp-creator-api}"

need() {
  if [ -z "${!1:-}" ]; then
    echo "Missing required env: $1" >&2
    exit 1
  fi
}

need STRIPE_LIVE_SECRET
need STRIPE_TEST_SECRET
need STRIPE_LIVE_WEBHOOK_SECRET
need STRIPE_TEST_WEBHOOK_SECRET

cd "$PROJECT_DIR"

echo "Removing existing Stripe secret/webhook env (all targets)..."
npx vercel env rm STRIPE_SECRET_KEY production --scope "$SCOPE" --yes 2>/dev/null || true
npx vercel env rm STRIPE_SECRET_KEY preview --scope "$SCOPE" --yes 2>/dev/null || true
npx vercel env rm STRIPE_SECRET_KEY development --scope "$SCOPE" --yes 2>/dev/null || true
npx vercel env rm STRIPE_API_KEY production --scope "$SCOPE" --yes 2>/dev/null || true
npx vercel env rm STRIPE_API_KEY preview --scope "$SCOPE" --yes 2>/dev/null || true
npx vercel env rm STRIPE_API_KEY development --scope "$SCOPE" --yes 2>/dev/null || true
npx vercel env rm STRIPE_WEBHOOK_SECRET production --scope "$SCOPE" --yes 2>/dev/null || true
npx vercel env rm STRIPE_WEBHOOK_SECRET preview --scope "$SCOPE" --yes 2>/dev/null || true
npx vercel env rm STRIPE_WEBHOOK_SECRET development --scope "$SCOPE" --yes 2>/dev/null || true

echo "Adding Production (live) secrets..."
printf '%s' "$STRIPE_LIVE_SECRET" | npx vercel env add STRIPE_SECRET_KEY production --scope "$SCOPE" --sensitive --yes
printf '%s' "$STRIPE_LIVE_WEBHOOK_SECRET" | npx vercel env add STRIPE_WEBHOOK_SECRET production --scope "$SCOPE" --sensitive --yes

echo "Adding Preview (test) secrets..."
printf '%s' "$STRIPE_TEST_SECRET" | npx vercel env add STRIPE_SECRET_KEY preview --scope "$SCOPE" --sensitive --yes
printf '%s' "$STRIPE_TEST_WEBHOOK_SECRET" | npx vercel env add STRIPE_WEBHOOK_SECRET preview --scope "$SCOPE" --sensitive --yes

echo "Adding Development (test) secrets..."
printf '%s' "$STRIPE_TEST_SECRET" | npx vercel env add STRIPE_SECRET_KEY development --scope "$SCOPE" --yes
printf '%s' "$STRIPE_TEST_WEBHOOK_SECRET" | npx vercel env add STRIPE_WEBHOOK_SECRET development --scope "$SCOPE" --yes

if [ -n "${STRIPE_PRICE_PRO:-}" ]; then
  printf '%s' "$STRIPE_PRICE_PRO" | npx vercel env add STRIPE_PRICE_PRO preview --scope "$SCOPE" --force --sensitive --yes
  printf '%s' "$STRIPE_PRICE_PRO" | npx vercel env add STRIPE_PRICE_PRO development --scope "$SCOPE" --force --yes
fi
if [ -n "${STRIPE_PRICE_STUDIO:-}" ]; then
  printf '%s' "$STRIPE_PRICE_STUDIO" | npx vercel env add STRIPE_PRICE_STUDIO preview --scope "$SCOPE" --force --sensitive --yes
  printf '%s' "$STRIPE_PRICE_STUDIO" | npx vercel env add STRIPE_PRICE_STUDIO development --scope "$SCOPE" --force --yes
fi

echo "Done. Redeploy Preview, then run scripts/stripe-test-checkout-e2e.sh against the Preview API URL."
npx vercel env ls --scope "$SCOPE" | rg 'STRIPE_' || true
