#!/usr/bin/env bash
# Point the stable Preview webhook alias at a Ready Preview deployment.
#
# Usage:
#   ./scripts/stripe-staging-alias.sh
#   ./scripts/stripe-staging-alias.sh https://dashboard-backend-<id>-unlovedproductions-projects.vercel.app
#
# Stripe test webhook should stay on:
#   https://dashboard-backend-staging-unlovedproductions-projects.vercel.app/api/webhooks/stripe

set -euo pipefail

SCOPE="${VERCEL_SCOPE:-unlovedproductions-projects}"
ALIAS="${STAGING_ALIAS:-dashboard-backend-staging-unlovedproductions-projects.vercel.app}"
TARGET="${1:-}"

if [[ -z "${TARGET}" ]]; then
  TARGET=$(npx --yes vercel@latest ls dashboard-backend --scope "${SCOPE}" 2>/dev/null \
    | python3 -c '
import sys, re
lines = sys.stdin.read().splitlines()
for line in lines:
    if "Preview" not in line or "Ready" not in line:
        continue
    m = re.search(r"https://dashboard-backend-[a-z0-9]+-unlovedproductions-projects\.vercel\.app", line)
    if m:
        print(m.group(0))
        break
')
fi

if [[ -z "${TARGET}" ]]; then
  echo "No Ready Preview URL found. Pass one explicitly." >&2
  exit 1
fi

echo "Aliasing ${ALIAS} -> ${TARGET}"
npx --yes vercel@latest alias set "${TARGET#https://}" "${ALIAS}" --scope "${SCOPE}"
echo "Test webhook URL:"
echo "  https://${ALIAS}/api/webhooks/stripe"
