-- Revoke default anon GRANT ALL on public tables (GraphQL lint 0026).
-- stripe_webhook_events: service_role only.
-- Applied 2026-08-17 as revoke_anon_public_grants. Safe to re-run.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

REVOKE ALL ON TABLE public.stripe_webhook_events FROM authenticated;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
