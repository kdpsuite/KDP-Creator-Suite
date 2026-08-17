#!/usr/bin/env bash
# Verify Supabase Auth redirect / Site URL allowlist for cross-subdomain SSO.
# Does not mutate Auth settings. Prints required hosts and optional API check.
#
# Usage:
#   ./scripts/supabase-redirect-allowlist-check.sh
#   SUPABASE_ACCESS_TOKEN=sbp_… ./scripts/supabase-redirect-allowlist-check.sh
#
# Required hosts (Site URL + Additional Redirect URLs in Supabase Auth):
#   https://kdpsuite.com
#   https://www.kdpsuite.com
#   https://dashboard.kdpsuite.com
#   https://www.dashboard.kdpsuite.com  (Vercel alias)
#   http://localhost:5173  (dev)
#   http://localhost:3000  (dev)
#
# Dashboard path: Authentication → URL Configuration
# Docs: SESSION_PERSISTENCE.md · sessionBridge Domain=.kdpsuite.com cookies

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-yjzgiunyjmjftpmhezuk}"
REQUIRED=(
  "https://kdpsuite.com"
  "https://www.kdpsuite.com"
  "https://dashboard.kdpsuite.com"
  "https://www.dashboard.kdpsuite.com"
  "http://localhost:5173"
  "http://localhost:3000"
)

echo "KDP Creator Suite — Supabase redirect allowlist check"
echo "Project ref: $PROJECT_REF"
echo ""
echo "Required Site URL / Additional Redirect URLs:"
for u in "${REQUIRED[@]}"; do
  echo "  - $u"
done
echo ""
echo "Also confirm:"
echo "  [ ] Site URL is https://dashboard.kdpsuite.com (canonical; www.dashboard 308s there)"
echo "  [ ] Wildcard not required — explicit hosts above"
echo "  [ ] sessionBridge dual-writes Domain=.kdpsuite.com cookies on both hosts"
echo "  [ ] Auth → Attack Protection: leaked password protection enabled"
echo ""
echo "Dashboard: https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration"
echo ""

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "No SUPABASE_ACCESS_TOKEN — manual Dashboard verification required."
  echo "Set a personal access token to query Auth config via Management API."
  exit 0
fi

# Management API: Auth config (redirect allow list)
resp=$(curl -sS --max-time 20 \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" || echo "")

if [ -z "$resp" ] || ! echo "$resp" | grep -q 'site_url\|uri_allow_list\|redirect'; then
  echo "WARN: Could not read Auth config (token scope or API shape)."
  echo "Verify manually in Supabase Dashboard → Authentication → URL Configuration."
  exit 0
fi

missing=0
for u in "${REQUIRED[@]}"; do
  if echo "$resp" | grep -Fq "$u"; then
    echo "  OK  $u present in Auth config payload"
  else
    echo "  MISSING  $u — add to Additional Redirect URLs (or Site URL)"
    missing=$((missing + 1))
  fi
done

if [ "$missing" -gt 0 ]; then
  echo ""
  echo "Allowlist incomplete ($missing missing). Cross-subdomain SSO may fail after OAuth/magic-link."
  exit 1
fi

echo ""
echo "Allowlist check passed against Management API payload."
