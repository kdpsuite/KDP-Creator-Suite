-- Analytics seed for dashboard demo metrics (kdp_creator_suite / yjzgiunyjmjftpmhezuk)
-- User: unlovedproducts@gmail.com (a7384892-e10f-4e21-a3cf-bf76025a184a)
--
-- Status: Applied to production 2026-07-22 (verified via Supabase MCP execute_sql).
-- Re-running is safe: inserts only when this user has zero analytics_events rows.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM analytics_events
    WHERE user_id = 'a7384892-e10f-4e21-a3cf-bf76025a184a'
    LIMIT 1
  ) THEN
    RAISE NOTICE 'Seed skipped: analytics_events already populated for user.';
    RETURN;
  END IF;

  INSERT INTO analytics_events (user_id, event_type, event_data, created_at) VALUES
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'kdp_formatting', '{"error":"Invalid dimensions","status":"failed"}'::jsonb, '2026-06-27 16:30:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'pdf_coloring_conversion', '{"format":"PNG","status":"success","file_size_mb":4.5}'::jsonb, '2026-06-28 11:10:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'kdp_formatting', '{"format":"PDF","status":"success","file_size_mb":8.9}'::jsonb, '2026-06-29 14:20:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'kdp_validation', '{"status":"success","is_valid":true}'::jsonb, '2026-06-29 15:00:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'pdf_coloring_conversion', '{"format":"PNG","status":"success","file_size_mb":3.1}'::jsonb, '2026-06-30 09:15:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'pdf_coloring_conversion', '{"error":"Timeout","status":"failed"}'::jsonb, '2026-07-01 15:45:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'kdp_formatting', '{"format":"PDF","status":"success","file_size_mb":12.5}'::jsonb, '2026-07-02 10:30:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'kdp_validation', '{"status":"success","is_valid":true}'::jsonb, '2026-07-02 11:00:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'pdf_coloring_conversion', '{"format":"PNG","status":"success","file_size_mb":5.2}'::jsonb, '2026-07-03 07:52:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'batch_coloring_conversion', '{"status":"success","trim_size":"6x9","file_count":3}'::jsonb, '2026-07-03 08:00:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'batch_coloring_conversion', '{"status":"success","trim_size":"8.5x11","file_count":5}'::jsonb, '2026-07-03 08:05:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'batch_coloring_conversion', '{"status":"success","trim_size":"6x9","file_count":2}'::jsonb, '2026-07-03 08:10:00+00'),
    ('a7384892-e10f-4e21-a3cf-bf76025a184a', 'batch_coloring_conversion', '{"error":"Partial failure","status":"failed","trim_size":"6x9","file_count":4}'::jsonb, '2026-07-03 08:15:00+00');

  RAISE NOTICE 'Seed complete: 13 analytics_events inserted.';
END $$;
