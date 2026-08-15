#!/usr/bin/env bash
# Monthly conversion-funnel review cadence (ops checklist + SQL pointer).
# Does not require secrets. Run the SQL in Supabase SQL editor.
#
# Usage: ./scripts/conversion-funnel-review.sh
# Cadence: monthly after Stripe live; weekly during beta if volume justifies it.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/scripts/conversion-funnel-query.sql"

echo "KDP Creator Suite — Conversion funnel review"
echo "Date: $(date -u +%Y-%m-%dT%H:%MZ)"
echo ""
echo "== Ops checklist =="
echo "  [ ] Open Supabase SQL editor (project kdp_creator_suite)"
echo "  [ ] Run scripts/conversion-funnel-query.sql"
echo "  [ ] Note active users, converters, upgrade_event_rate_pct, tier mix"
echo "  [ ] Query support tickets: event_type = 'support_ticket' last 30d"
echo "  [ ] File numbers in launch notes / MEMBER_READINESS if launching paid"
echo "  [ ] If free→paid rate is 0 with live catalog: confirm Checkout + webhook path"
echo ""
echo "== SQL file =="
if [ -f "$SQL" ]; then
  echo "  $SQL ($(wc -l <"$SQL") lines)"
else
  echo "  MISSING $SQL"
  exit 1
fi
echo ""
echo "== Suggested support_ticket volume (paste in SQL editor) =="
cat <<'SQL'
SELECT count(*) AS tickets_30d,
       count(*) FILTER (WHERE event_data->>'category' = 'billing') AS billing,
       count(*) FILTER (WHERE event_data->>'category' = 'bug') AS bugs
FROM analytics_events
WHERE event_type = 'support_ticket'
  AND created_at >= now() - interval '30 days';
SQL
echo ""
echo "Review scaffold ready. No automated warehouse export on Hobby."
