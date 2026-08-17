#!/usr/bin/env bash
# After a Preview backend deploy, refresh the stable staging alias used by the
# Stripe *test* webhook. Production (hazel) is untouched.
#
# Usage:
#   ./scripts/stripe-staging-alias-after-preview.sh
#   ./scripts/stripe-staging-alias-after-preview.sh https://dashboard-backend-….vercel.app
#
# Cadence: run whenever you deploy dashboard-backend Preview (or add to CI).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ALIAS_SCRIPT="$ROOT/scripts/stripe-staging-alias.sh"

echo "KDP Creator Suite — Stripe staging alias after Preview deploy"
echo "Date: $(date -u +%Y-%m-%dT%H:%MZ)"
echo ""
echo "Test webhook must stay on:"
echo "  https://dashboard-backend-staging-unlovedproductions-projects.vercel.app/api/webhooks/stripe"
echo ""

if [[ ! -x "$ALIAS_SCRIPT" ]]; then
  echo "MISSING executable $ALIAS_SCRIPT" >&2
  exit 1
fi

"$ALIAS_SCRIPT" "${1:-}"

echo ""
echo "OK: staging alias refreshed. Confirm Stripe Dashboard → Developers → Webhooks (test mode)."
