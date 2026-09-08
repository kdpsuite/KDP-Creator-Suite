-- Lifetime/founding entitlements bought through Stripe Payment Links.
-- Cold traffic pays before an account exists, so the purchase is parked here
-- by email and claimed on the buyer's first authenticated request.
-- Service role writes only. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.pending_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tier TEXT NOT NULL,
  plan_id TEXT,
  stripe_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  amount_total INTEGER,
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  claimed_by UUID
);

CREATE INDEX IF NOT EXISTS pending_entitlements_unclaimed_email_idx
  ON public.pending_entitlements (email)
  WHERE claimed_at IS NULL;

ALTER TABLE public.pending_entitlements ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.pending_entitlements IS
  'Paid lifetime purchases awaiting an account; written by API service role only.';

-- Marks a profile as holding a one-time lifetime plan so billing UI does not
-- offer a subscription portal for it.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS lifetime_plan TEXT;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS lifetime_granted_at TIMESTAMPTZ;
