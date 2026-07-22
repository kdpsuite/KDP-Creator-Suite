# Instructions for Seeding Analytics Data in Supabase

**Production status (2026-07-22):** Seed verified via Supabase MCP on project `kdp_creator_suite` (`yjzgiunyjmjftpmhezuk`). User `unlovedproducts@gmail.com` has analytics events in `analytics_events`; dashboard metrics should populate.

## Option A — Supabase MCP (Cursor)

With Supabase MCP authenticated in Cursor, run `execute_sql` against project `yjzgiunyjmjftpmhezuk` using the contents of [`supabase_seed_script.sql`](./supabase_seed_script.sql). The script is idempotent and skips if rows already exist for the user.

## Option B — Supabase SQL Editor

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **kdp_creator_suite**.
2. Go to **SQL Editor**.
3. Paste the full contents of [`urgent/supabase_seed_script.sql`](./supabase_seed_script.sql).
4. Run. Safe to re-run; existing data is not duplicated.

**Note:** The `user_id` is `a7384892-e10f-4e21-a3cf-bf76025a184a`. Change it in the script if seeding for a different account.
