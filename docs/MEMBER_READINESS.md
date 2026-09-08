# Web Dashboard — Member Readiness

**Updated:** 2026-09-08 (corrected against code-to-function audit)  
**Surface:** `web-dashboard/kdp-creator-dashboard` + Flask API  
**Companion status:** [`urgent/cursor_please_readme.md`](../urgent/cursor_please_readme.md)  
**Launch ops checklist:** [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md)

## Current state (post-merge)

`feat/coloring-engine-upgrade` is merged into **`main`**. Membership lock, Stripe Checkout/portal/webhooks, upgrade CTAs, tier gates, account delete, member smoke script, and opt-in enhanced coloring are in the codebase.

**Stripe is now configured in production** — an unsigned POST to `/api/webhooks/stripe` returns `INVALID_SIGNATURE`, which requires both the API key and the webhook secret. The remaining payment gap is a proven end-to-end charge, not env setup.

**The new blockers are product-truth, not plumbing:** the “monthly” quota never resets, five advertised tier perks are unimplemented booleans, and the marketing site sells four features that do not exist in this codebase.

## Scores

| Lens | Code on `main` | Launch-ready |
|------|---------------:|--------------|
| Free-tier creator product | **~80%** | **Blocked** — quota never resets, so free tier is a lifetime 5-conversion cap |
| Paid membership SaaS | **~80% coded** | **~65% live** — Stripe wired in prod; charge → entitlement flip unproven; perks unimplemented |
| Full product vision | **~45%** | Mobile / KDP OAuth / orgs / royalty calc still open |
| Launch checklist ops | **~45%** | Audit, live pay test, beta, support desk still Manual |
| Marketing accuracy | **~25%** | **Worst score in the project** — see `urgent/cursor_please_readme.md` |

## When can you accept members?

| Goal | Status | Gate |
|------|--------|------|
| Invite-only free beta (tools only) | **Ready for trusted invitees** | They will hit the lifetime cap at 5 conversions — raise their tier or ship the reset |
| Open free public signup | **Not yet** | Monthly usage reset must exist first |
| Paying members | **Close** | Stripe live; needs one real charge → entitlement flip, plus honest tier copy |
| Launch checklist green | **Not yet** | Audit, support, beta cohort, marketing-claim cleanup |

## P0 / P1 / P2

### P0 — before any public signup

| Item | Status |
|------|--------|
| Disable free `POST /upgrade` | **Shipped** (`UPGRADE_DISABLED`) |
| Hide `unlimited` from public `/tiers` | **Shipped** |
| Strict JWT in production | **Resolved / not applicable** — live auth calls `supabase.auth.get_user()` per request; there is no local unsigned decode. `SUPABASE_JWT_SECRET` is used only by two orphan legacy endpoints. |
| Real payment path | **Live** — Stripe key + webhook secret configured in prod; one real charge → entitlement flip still unverified |
| Monthly usage reset | **Missing** — `last_usage_reset` is written once at profile creation and never updated; no cron/job/endpoint resets counters. Free tier is a lifetime cap today. |
| Public `/tiers` perk booleans | **Fake** — `watermark_free`, `cloud_storage`, `priority_support`, `advanced_features`, `kdp_integration` are read by no code. Implement or stop advertising. |
| Marketing claims match the product | **Failing** — royalty calculator, team workspaces, API access, KDP integration, “500+ templates” and lifetime pricing have no implementation |

### P1 — before invite-only free beta

| Item | Status |
|------|--------|
| Prod smoke health/templates/auth | **Partial** — `scripts/pre-launch-check.sh` + `scripts/member-readiness-smoke.sh`. Note `/api/health/ready` proves little: it checks ephemeral `/tmp` SQLite, not Postgres. |
| Convert / batch / template / analytics | **Shipped** — convert, batch-coloring and the template generator are genuinely real (15 spec/generator tests pass). Caveats: “Storage Used” is always 0.0 MB, and `client_error` events 400. |
| Support path | **Partial** — Settings form writes an `analytics_events` row only. No notification, status or reply path; triage is manual SQL while the UI promises 1–2 business days. |
| Error monitoring | **Shipped** — Sentry verified on FE+BE; live `/api/health` reports `sentry_configured: true` |
| Env parity | **Shipped for Sentry + Stripe** — confirm `stripe_webhook_events` and `rate_limit_events` tables exist, or idempotency and rate limiting fail open |

### P2 — before paid public launch

| Item | Status |
|------|--------|
| Stripe Checkout + portal + webhook | **Live in prod** — verify one real charge → entitlement flip |
| Overview upgrade CTA + pricing | **Shipped in-app** — but in-app pricing (monthly $19.99 / $49.99) contradicts the landing page (lifetime $99–$9,999). Nothing can fulfil a lifetime purchase. |
| Template / quota upgrade prompts | **Shipped** |
| Account delete | **Shipped** — verified: deletes profile row and Supabase Auth user |
| Formal security + live charge test | **Not started** |
| Invites / roles / orgs / KDP OAuth | **Not started** |
| 2FA UI | **Not started** — backend `totp.py` setup/verify/disable is complete and orphaned; no user can enable 2FA |

## Monitoring

| Project | Env var | Vercel project | Sentry project slug |
|---------|---------|----------------|---------------------|
| Flask API | `SENTRY_DSN` | `dashboard-backend` | currently `kdp-creator-dashboard` (retargeted; create dedicated `kdp-creator-api` when org allows) |
| Vite dashboard | `VITE_SENTRY_DSN` | `dashboard-frontend` | `kdp-creator-dashboard` |

Optional: `SENTRY_TRACES_SAMPLE_RATE` / `VITE_SENTRY_TRACES_SAMPLE_RATE` (default `0.1`).

## You must do next

1. Correct or remove the unimplemented marketing claims — Stripe is live, so this is the only item carrying real liability
2. Ship a monthly usage reset before open free signup
3. Verify one real charge → entitlement flip, and confirm `stripe_webhook_events` exists in prod
4. Implement or delete the five `SUBSCRIPTION_TIERS` perk booleans served by public `/api/tiers`

## Not blockers for trusted invitees (tools only)

Enhanced coloring (opt-in), mobile stores, 2FA UI, API keys, Amazon KDP OAuth, multi-user collab.

**Is a blocker even for trusted invitees:** the quota reset. Invitees on the free tier get 5 conversions for the lifetime of the account.
