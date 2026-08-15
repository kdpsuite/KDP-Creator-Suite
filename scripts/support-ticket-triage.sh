#!/usr/bin/env bash
# Weekly support-ticket triage scaffold (ops checklist + SQL pointer).
# Tickets land in analytics_events (event_type=support_ticket) via POST /api/support/ticket.
#
# Usage: ./scripts/support-ticket-triage.sh
# Cadence: weekly during launch; monthly after volume stabilizes.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/scripts/support-ticket-query.sql"

echo "KDP Creator Suite — Support ticket triage"
echo "Date: $(date -u +%Y-%m-%dT%H:%MZ)"
echo ""
echo "== Ops checklist =="
echo "  [ ] Open Supabase SQL editor (project kdp_creator_suite)"
echo "  [ ] Run scripts/support-ticket-query.sql"
echo "  [ ] Reply to billing/account tickets first (email support@kdpsuite.com thread)"
echo "  [ ] Bug tickets: reproduce → GitHub issue or fix; note ticket created_at"
echo "  [ ] If volume > ~20/week sustained: evaluate SaaS help desk"
echo "  [ ] Confirm /help FAQ still matches current billing/portal behavior"
echo ""
echo "== SQL file =="
if [ -f "$SQL" ]; then
  echo "  $SQL ($(wc -l <"$SQL") lines)"
else
  echo "  MISSING $SQL"
  exit 1
fi
echo ""
echo "Triage scaffold ready. Intake path: Settings ticket → analytics_events."
