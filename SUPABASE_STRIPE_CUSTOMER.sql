-- Add Stripe customer id for billing portal / webhook entitlement sync.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id
    ON public.user_profiles (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;
