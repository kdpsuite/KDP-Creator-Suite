-- KDP Creator Suite — free→paid / usage conversion funnel queries
-- Run in Supabase SQL editor (service role / dashboard). No secrets required.
-- Depends on public.analytics_events(user_id, event_type, event_data, created_at)
-- and public.user_profiles(id, subscription_tier, created_at).

-- 1) Event volume last 30 days by type
SELECT event_type, count(*) AS events
FROM analytics_events
WHERE created_at >= now() - interval '30 days'
GROUP BY event_type
ORDER BY events DESC;

-- 2) Distinct active users (any product event) last 30 days
SELECT count(DISTINCT user_id) AS active_users
FROM analytics_events
WHERE created_at >= now() - interval '30 days'
  AND event_type IN (
    'pdf_conversion_completed',
    'pdf_conversion',
    'pdf_coloring_conversion',
    'batch_processing_initiated',
    'batch_process',
    'batch_coloring_conversion',
    'batch_coloring',
    'kdp_formatting',
    'kdp_validation'
  );

-- 3) Users who converted a PDF vs users marked upgraded (in-app event)
WITH converts AS (
  SELECT DISTINCT user_id
  FROM analytics_events
  WHERE created_at >= now() - interval '30 days'
    AND event_type IN (
      'pdf_conversion_completed',
      'pdf_conversion',
      'pdf_coloring_conversion',
      'kdp_formatting'
    )
),
upgrades AS (
  SELECT DISTINCT user_id
  FROM analytics_events
  WHERE created_at >= now() - interval '30 days'
    AND event_type = 'subscription_upgraded'
)
SELECT
  (SELECT count(*) FROM converts) AS converters,
  (SELECT count(*) FROM upgrades) AS upgrade_events,
  CASE
    WHEN (SELECT count(*) FROM converts) = 0 THEN 0
    ELSE round(
      100.0 * (SELECT count(*) FROM upgrades)
      / (SELECT count(*) FROM converts),
      2
    )
  END AS upgrade_event_rate_pct;

-- 4) Tier mix from profiles (source of truth for paid after Stripe webhook)
SELECT coalesce(subscription_tier, 'free') AS tier, count(*) AS users
FROM user_profiles
GROUP BY 1
ORDER BY users DESC;

-- 5) New signups last 30 days vs paid tiers
SELECT
  count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_profiles_30d,
  count(*) FILTER (
    WHERE created_at >= now() - interval '30 days'
      AND coalesce(subscription_tier, 'free') <> 'free'
  ) AS new_paid_profiles_30d
FROM user_profiles;
