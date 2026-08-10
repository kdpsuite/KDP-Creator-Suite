# Web Dashboard — Member Readiness

**Updated:** 2026-08-10  
**Surface:** `web-dashboard/kdp-creator-dashboard` + Flask API  
**Companion status:** [`urgent/cursor_please_readme.md`](../urgent/cursor_please_readme.md)  
**Launch ops checklist:** [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md)

## Current state (post-merge)

`feat/coloring-engine-upgrade` is merged into **`main`**. Membership lock, Stripe Checkout/portal/webhooks, upgrade CTAs, tier gates, account delete, member smoke script, and opt-in enhanced coloring are in the codebase.

**Public paying members are still not live** until Stripe env + webhook + sandbox charge are completed.

## Scores

| Lens | Code on `main` | Launch-ready |
|------|---------------:|--------------|
| Free-tier creator product | **~80%** | Invite beta OK after quotas proven; free `/upgrade` disabled |
| Paid membership SaaS | **~72% coded** | **~50% live** until Stripe env + webhook + deploy |
| Full product vision | **~45%** | Mobile / KDP OAuth / orgs still open |
| Launch checklist ops | **~45%** | Audit, sandbox pay test, beta, support still Manual |

## When can you accept members?

| Goal | Status | Gate |
|------|--------|------|
| Invite-only free beta (tools only) | **Ready for trusted invitees** | Confirm quotas; Sentry verified |
| Open free public signup | **Close** | Quotas proven in prod |
| Paying members | **Not yet** | Stripe Checkout + webhook + sandbox charge |
| Launch checklist green | **Not yet** | Audit, support, beta cohort |

## P0 / P1 / P2

### P0 — before any public signup

| Item | Status |
|------|--------|
| Disable free `POST /upgrade` | **Shipped** (`UPGRADE_DISABLED`) |
| Hide `unlimited` from public `/tiers` | **Shipped** |
| Strict JWT in production | **Partial** — confirm `SUPABASE_JWT_SECRET` |
| Real payment path | **Coded** / **Partial (live)** — needs Stripe env |

### P1 — before invite-only free beta

| Item | Status |
|------|--------|
| Prod smoke health/templates/auth | **Partial** — `scripts/pre-launch-check.sh` + `scripts/member-readiness-smoke.sh` |
| Convert / batch / template / analytics | **Shipped** |
| Support path | **Partial** — mailto/docs + Settings support |
| Error monitoring | **Shipped** — Sentry verified on FE+BE (2026-08-10) |
| Env parity | **Partial** — Sentry set; Stripe vars still needed |

### P2 — before paid public launch

| Item | Status |
|------|--------|
| Stripe Checkout + portal + webhook | **Coded** — wire live |
| Overview upgrade CTA + pricing | **Shipped** |
| Template / quota upgrade prompts | **Shipped** |
| Account delete | **Shipped** |
| Formal security + Stripe sandbox | **Not started** |
| Invites / roles / orgs / 2FA UI / KDP OAuth | **Not started** |

## Monitoring

| Project | Env var | Vercel project | Sentry project slug |
|---------|---------|----------------|---------------------|
| Flask API | `SENTRY_DSN` | `dashboard-backend` | currently `kdp-creator-dashboard` (retargeted; create dedicated `kdp-creator-api` when org allows) |
| Vite dashboard | `VITE_SENTRY_DSN` | `dashboard-frontend` | `kdp-creator-dashboard` |

Optional: `SENTRY_TRACES_SAMPLE_RATE` / `VITE_SENTRY_TRACES_SAMPLE_RATE` (default `0.1`).

## You must do next

1. Run `SUPABASE_STRIPE_CUSTOMER.sql`
2. Set Stripe price IDs + `STRIPE_*` env + webhook endpoint
3. Smoke `/checkout` and `/account` (expect **401**, not 404)
4. Sandbox charge → entitlement flip

## Not blockers for trusted invitees (tools only)

Enhanced coloring (opt-in), mobile stores, 2FA UI, API keys, Amazon KDP OAuth, multi-user collab.
