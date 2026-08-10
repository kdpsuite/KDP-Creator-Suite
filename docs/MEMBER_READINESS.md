# Web Dashboard — Member Readiness

**Updated:** 2026-08-08  
**Surface:** `web-dashboard/kdp-creator-dashboard` + Flask API  
**Companion status:** [`urgent/cursor_please_readme.md`](../urgent/cursor_please_readme.md)  
**Launch ops checklist:** [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md)

Code for invite-only free beta and paid checkout is on `feat/coloring-engine-upgrade`. **Public paying members are not live** until Stripe env, SQL, webhook, and backend deploy land.

## Scores

| Lens | Was (review) | Now (code on branch) | Launch-ready |
|------|-------------:|---------------------:|--------------|
| Free-tier creator product | ~72% | **~80%** | Invite beta after deploy + smoke |
| Paid membership SaaS | ~48% | **~72% coded** | **~50% live** until Stripe env + webhook + deploy |
| Full product vision | ~40% | **~45%** | Mobile / KDP OAuth / orgs still open |
| Launch checklist ops | ~35% | **~40%** | Audit, sandbox pay test, beta, support still Manual |

## When can you accept members?

| Goal | Status | Gate |
|------|--------|------|
| Invite-only free beta | **Close** | Deploy membership backend + confirm `/upgrade` stays 403 + smoke |
| Open free public signup | **Not yet** | Quotas proven in prod + abuse watch |
| Paying members | **Not yet** | Stripe Checkout + webhook entitlements + sandbox charge |
| Launch checklist green | **Not yet** | Audit, monitoring DSN, support, beta cohort |

## P0 / P1 / P2

### P0 — before any public signup

| Item | Status |
|------|--------|
| Disable free `POST /upgrade` | **Shipped** — `UPGRADE_DISABLED` |
| Hide `unlimited` from public `/tiers` | **Shipped** |
| Strict JWT in production (`SUPABASE_JWT_SECRET`) | **Partial** — coded; confirm prod env |
| Real payment path (not free flip) | **Shipped (code)** / **Partial (live)** |

### P1 — before invite-only free beta

| Item | Status |
|------|--------|
| Prod smoke: health, templates, auth gates | **Partial** — script shipped; re-run after deploy |
| Authenticated convert / batch / template / analytics | **Shipped** in code; last Playwright run mixed (prod UI lag) |
| Hide client `subscriptionApi.upgrade` | **Shipped** — client rejects; server 403 |
| Support path | **Partial** — Settings mailto only |
| Error monitoring | **Partial** — Sentry coded, DSN unset |
| Env parity vs `.env.example` / `ENV_VARS.md` | **Not started** (ops confirm) |

### P2 — before paid public launch

| Item | Status |
|------|--------|
| Stripe Checkout + Customer Portal + webhook → tier | **Shipped (code)** / **Partial (env + deploy)** |
| Overview upgrade CTA + pricing cards | **Shipped** |
| UI + server Pro template / quota upgrade prompts | **Shipped** |
| Account delete | **Shipped (code)** / **Partial (undeployed)** |
| Formal security pass + Stripe sandbox test | **Not started** |
| Invites / roles / orgs | **Not started** |
| 2FA UI / API keys / KDP OAuth | **Not started** |

## You must do next

1. Run [`SUPABASE_STRIPE_CUSTOMER.sql`](../SUPABASE_STRIPE_CUSTOMER.sql) in Supabase
2. Set backend env: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_STUDIO`, `FRONTEND_URL`, `SUPABASE_JWT_SECRET`
3. Stripe Dashboard webhook → `POST https://<api-host>/api/webhooks/stripe`  
   Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Optional: `SENTRY_DSN`, `VITE_SENTRY_DSN`, `VITE_SUPPORT_EMAIL`
5. Deploy **backend first**, then dashboard
6. `./scripts/member-readiness-smoke.sh` — `/checkout` and `/account` must be **401**, not 404
7. Sandbox: register → checkout test card → confirm `subscription_tier` updates

## Not blockers for first invitees

Coloring-engine upgrade (opt-in, this branch), mobile store listings, 2FA UI, personal API keys, Amazon KDP OAuth, multi-user collab.
