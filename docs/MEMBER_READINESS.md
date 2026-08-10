# Web Dashboard — Member Readiness

**Updated:** 2026-08-10  
**Surface:** `web-dashboard/kdp-creator-dashboard` + Flask API  
**Companion status:** [`urgent/cursor_please_readme.md`](../urgent/cursor_please_readme.md)  
**Launch ops checklist:** [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md)

## Branch split (important)

| Capability | Where it lives |
|------------|----------------|
| Core tools, auth, analytics, safe-zone, **Sentry** | **`main`** (Sentry DSNs set on Vercel; redeploy to activate frontend) |
| Free `/upgrade` lock, Stripe Checkout/portal/webhooks, upgrade CTAs, tier gates, account delete, member smoke script, enhanced coloring engine | **`feat/coloring-engine-upgrade`** — not on `main` until merge |

**Public paying members are not live.** Invite-only free beta on `main` is usable for tools; paid path requires merging the feature branch + Stripe ops.

## Scores

| Lens | Code on `main` | With feat branch merged (code) | Launch-ready |
|------|---------------:|-------------------------------:|--------------|
| Free-tier creator product | **~78%** | **~80%** | Invite beta after Sentry redeploy smoke |
| Paid membership SaaS | **~35%** (quotas only; free upgrade hole still on `main`) | **~72% coded** | **~50% live** until Stripe env + webhook + deploy |
| Full product vision | **~42%** | **~45%** | Mobile / KDP OAuth / orgs still open |
| Launch checklist ops | **~42%** | **~45%** | Audit, sandbox pay test, beta, support still Manual |

## When can you accept members?

| Goal | Status | Gate |
|------|--------|------|
| Invite-only free beta (tools only) | **Close on `main`** | Redeploy for Sentry; do **not** open public signup while free `/upgrade` still exists on `main` |
| Open free public signup | **Blocked** | Merge feat branch (kills free upgrade) + quotas proven |
| Paying members | **Not yet** | Merge feat + Stripe Checkout + webhook + sandbox charge |
| Launch checklist green | **Not yet** | Audit, support, beta cohort |

## P0 / P1 / P2

### P0 — before any public signup

| Item | Status |
|------|--------|
| Disable free `POST /upgrade` | **On feat branch only** — **Not on `main`** (hole still open if endpoint exists) |
| Hide `unlimited` from public `/tiers` | **On feat branch only** |
| Strict JWT in production | **Partial** — confirm `SUPABASE_JWT_SECRET` |
| Real payment path | **On feat branch (code)** / **Partial (live)** |

### P1 — before invite-only free beta

| Item | Status |
|------|--------|
| Prod smoke health/templates/auth | **Partial** — `scripts/pre-launch-check.sh`; member smoke on feat |
| Convert / batch / template / analytics | **Shipped** on `main` |
| Support path | **Partial** — mailto/docs; Settings support on feat |
| Error monitoring | **Shipped (code + Vercel DSN)** / **Partial (redeploy + verify event)** |
| Env parity | **Partial** — Sentry set; Stripe vars still needed after merge |

### P2 — before paid public launch

| Item | Status |
|------|--------|
| Stripe Checkout + portal + webhook | **On feat branch** |
| Overview upgrade CTA + pricing | **On feat branch** |
| Template / quota upgrade prompts | **On feat branch** |
| Account delete | **On feat branch** |
| Formal security + Stripe sandbox | **Not started** |
| Invites / roles / orgs / 2FA UI / KDP OAuth | **Not started** |

## Monitoring (done on `main`)

| Project | Env var | Vercel project | Sentry project slug |
|---------|---------|----------------|---------------------|
| Flask API | `SENTRY_DSN` | `dashboard-backend` | `kdp-creator-api` |
| Vite dashboard | `VITE_SENTRY_DSN` | `dashboard-frontend` | `kdp-creator-dashboard` |

Optional: `SENTRY_TRACES_SAMPLE_RATE` / `VITE_SENTRY_TRACES_SAMPLE_RATE` (default `0.1`).

## You must do next

1. **Redeploy** `dashboard-backend` and `dashboard-frontend` (DSNs already in Vercel)
2. Confirm a test error in each Sentry project
3. Merge `feat/coloring-engine-upgrade` before public signup
4. After merge: run `SUPABASE_STRIPE_CUSTOMER.sql`; set Stripe price IDs + webhook; smoke `/checkout` and `/account` (expect **401**, not 404)

## Not blockers for trusted invitees (tools only)

Enhanced coloring (feat branch), mobile stores, 2FA UI, API keys, Amazon KDP OAuth, multi-user collab.
