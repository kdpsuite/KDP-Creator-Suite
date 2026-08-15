-- Support ticket triage queries (analytics_events.event_type = 'support_ticket')
-- Run in Supabase SQL editor. No secrets required.

-- 1) Volume last 30 days by category
SELECT coalesce(event_data->>'category', 'unknown') AS category,
       count(*) AS tickets
FROM analytics_events
WHERE event_type = 'support_ticket'
  AND created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY tickets DESC;

-- 2) Recent tickets (latest 50)
SELECT created_at,
       user_id,
       event_data->>'category' AS category,
       event_data->>'subject' AS subject,
       left(coalesce(event_data->>'body', ''), 200) AS body_preview
FROM analytics_events
WHERE event_type = 'support_ticket'
ORDER BY created_at DESC
LIMIT 50;

-- 3) Unanswered backlog heuristic: tickets with no later support_ticket
--    reply event (we only store intake today — use for weekly owner review)
SELECT count(*) AS tickets_7d
FROM analytics_events
WHERE event_type = 'support_ticket'
  AND created_at >= now() - interval '7 days';
