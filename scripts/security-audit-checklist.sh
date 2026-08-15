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
echo "  [ ] Backend CI: bandit -lll + flake8 F-rules"
echo "  [ ] Confirm ALLOW_SENTRY_DEBUG unset in Production"
echo "  [ ] Confirm CORS_ORIGINS is allowlist (not *) in Production"
echo ""

echo "== Manual / external (before public paid launch) =="
echo "  [ ] Third-party or independent pen-test of dashboard + API"
echo "  [ ] Review Supabase RLS policies on user_profiles, analytics_events, batch_jobs"
echo "  [ ] Confirm Production secrets are Sensitive in Vercel"
echo "  [ ] Rotate any keys that were pasted in chat or logs"
echo "  [ ] Verify Stripe live webhook signing + idempotency after first charge"
echo "  [ ] Document incident contact + support SLA for paid members"
echo ""

if [ -x "$ROOT/scripts/security-smoke.sh" ]; then
  echo "== Running security-smoke now =="
  "$ROOT/scripts/security-smoke.sh" "$API_BASE"
else
  echo "security-smoke.sh not executable; skip auto-run."
fi
