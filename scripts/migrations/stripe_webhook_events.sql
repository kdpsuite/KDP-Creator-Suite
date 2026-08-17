-- Stripe webhook idempotency ledger (service role writes only).
-- Applied via Supabase MCP 2026-08-15 as stripe_webhook_events_idempotency.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Stripe webhook idempotency ledger; written by API service role only.';
