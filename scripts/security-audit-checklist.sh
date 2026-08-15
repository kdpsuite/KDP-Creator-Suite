#!/usr/bin/env bash
# Ops checklist for formal security review (not a pen-test substitute).
# Prints what is already automated vs what still needs a human auditor.
# Usage: ./scripts/security-audit-checklist.sh [API_BASE_URL]

set -euo pipefail

API_BASE="${1:-https://dashboard-backend-hazel.vercel.app}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "KDP Creator Suite — Security audit checklist"
echo "API base: $API_BASE"
echo ""

echo "== Automated (run these) =="
echo "  [ ] ./scripts/security-smoke.sh $API_BASE"
echo "  [ ] ./scripts/load-smoke.sh $API_BASE"
echo "  [ ] ./scripts/mint-load-smoke-jwt.sh && LOAD_SMOKE_JWT=\$(cat /tmp/load_smoke_jwt.txt) ./scripts/load-smoke.sh $API_BASE"
echo "  [ ] ./scripts/stripe-live-portal-smoke.sh   # requires Stripe customer on test user"
echo "  [ ] ./scripts/supabase-redirect-allowlist-check.sh"
echo "  [ ] Backend CI: bandit -lll + flake8 F-rules"
echo "  [ ] Confirm ALLOW_SENTRY_DEBUG unset in Production"
echo "  [ ] Confirm CORS_ORIGINS allowlist includes dashboard + www.dashboard + marketing hosts (not *)"
echo ""

echo "== Manual / external (before public paid launch) =="
echo "  [ ] Third-party or independent pen-test of dashboard + API"
echo "  [ ] Review Supabase RLS policies on user_profiles, analytics_events, batch_jobs"
echo "  [ ] Confirm Supabase Auth redirect allowlist includes kdpsuite.com + dashboard.kdpsuite.com"
echo "  [ ] Confirm Production secrets are Sensitive in Vercel"
echo "  [ ] Rotate Production STRIPE_SECRET_KEY sk_live → rk_live (scripts/stripe-rotate-prod-to-rk.sh)"
echo "  [ ] Revoke any sk_live that was pasted in chat or logs"
echo "  [ ] Verify Stripe live webhook signing after live Checkout (done for \$0 E2E)"
echo "  [ ] Confirm Settings → Manage billing opens billing.stripe.com portal"
echo "  [ ] Document incident contact + support SLA for paid members (see /help)"
echo "  [ ] Triage analytics_events support_ticket rows weekly during launch"
echo ""

if [ -x "$ROOT/scripts/security-smoke.sh" ]; then
  echo "== Running security-smoke now =="
  "$ROOT/scripts/security-smoke.sh" "$API_BASE"
else
  echo "security-smoke.sh not executable; skip auto-run."
fi
