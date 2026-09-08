# Cursor, Please Readme: KDP Creator Suite Dashboard Status

**Updated:** 2026-09-08 (corrected against code-to-function audit)  
**Branch:** `main` (includes merged `feat/coloring-engine-upgrade`)  
**Member readiness:** [`docs/MEMBER_READINESS.md`](../docs/MEMBER_READINESS.md)  
**Launch ops:** [`docs/LAUNCH_CHECKLIST.md`](../docs/LAUNCH_CHECKLIST.md)

Trust this file and those two docs over older root “complete” banners.

**Out of scope permanently:** APF, Shadowcast, Mission Control — do not integrate into this dashboard or the Android app.

**Legend**
- **Shipped** — in `main` codebase (and/or configured in prod env)
- **Partial** — coded but undeployed/incomplete, or live ops unfinished
- **Fake** — the path returns success while simulating, substituting, or measuring nothing
- **Not started** — no product-ready implementation

---

## Shipped (on `main`)

### Auth and session
- Supabase email/password login, register, forgot-password, recovery callback
- Backend `/user/profile-sync` creates `user_profiles` for new Auth users
- Session bridge (`/sync-session`, `/validate-session`)
- Login spinner fix: frontend unwraps `success_response` envelope after auth

### Core KDP tools
- KDP PDF convert (`/pdf/format-kdp`) with trim size + print/ebook target
- Image → coloring page (`/pdf/convert-coloring`) — PNG, trim + bleed pad (legacy default; enhanced engine opt-in)
- KDP PDF validation (`/pdf/validate-kdp`)
- Product Builder + template library generate (interior + paperback cover)
- Batch coloring PDF: multi-image upload, drag reorder, optional title cover
- Safe-zone overlay on previews (`KdpSafeZoneOverlay.jsx`)

### Membership / billing
- Free `POST /upgrade` disabled (`UPGRADE_DISABLED`)
- Public `/tiers` hides `unlimited`
- Stripe Checkout `/checkout`, billing portal, webhook `/webhooks/stripe` — **live in prod**: an unsigned POST to `/api/webhooks/stripe` returns `INVALID_SIGNATURE`, which requires both `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` to be set
- Webhook does real signature verification, event-id idempotency (`stripe_webhook_events`), tier flip, and downgrade on cancel
- Overview upgrade CTAs; template/quota upgrade prompts
- Account self-delete `DELETE /api/account` — verified real (deletes profile row **and** Supabase Auth user). Older notes calling this a stub are wrong.
- Member smoke: `scripts/member-readiness-smoke.sh`

### Analytics
- `analytics_events` table + backend record on PDF/batch success/failure
- Live `/user-metrics` on Analytics tab (not mock data)
- Frontend `trackEvent()` / `POST /api/analytics/events` — **except** `client_error`, see Fake table

### UI polish
- OKLCH palette + dark mode, typography, card/button polish
- Empty-state SVGs, `OnboardingTooltip` + `useOnboarding` (localStorage)
- `PageTransition` + shimmer/pulse loading utilities
- `ErrorBoundary` reports to Sentry when DSN is set

### Monitoring (Sentry) — verified 2026-08-10
- Flask: `sentry_sdk` + FlaskIntegration when `SENTRY_DSN` is set
- Dashboard: `@sentry/react` init + replay + logs when `VITE_SENTRY_DSN` is set
- Vercel env set; production test events confirmed in `kdp-creator-dashboard`
- Sample rates default **0.1**

### Infra already in use
- Vercel dashboard + API proxy (`/api` → backend)
- Supabase Auth + Postgres `user_profiles`
- Rate limiting (Postgres `rate_limit_events`, in-memory fallback), `/api/health` `/ready` `/live`
- Smokes: `scripts/pre-launch-check.sh`, `scripts/member-readiness-smoke.sh`

---

## Partial

| Item | What’s true | What’s missing |
|------|-------------|----------------|
| Stripe live payments | Keys + webhook secret configured in prod; Checkout/portal/webhook code is real | End-to-end charge → entitlement flip still unproven; confirm `stripe_webhook_events` table exists (idempotency fails open without it) |
| KDP “compliance” validation | `/pdf/validate-kdp` checks page size, even/min page count, color-profile floor | No font-embedding, image-DPI, color-space or ink-coverage check. The word “compliance” overpromises what runs. |
| Cloud storage of outputs | `upload_file` really writes to Supabase Storage | Signed URL expires in 1h and no screen lists past files — lose the tab, lose the download |
| Support tickets | `POST /support/ticket` really writes a `support_ticket` row | No email/notification/status/reply path; triage is manual via `scripts/support-ticket-query.sql`, while UI promises 1–2 business days |
| Readiness probe | `/api/health/ready` responds 200 in prod | `database: true` is a `SELECT 1` against ephemeral `/tmp` SQLite; `supabase: true` only means the client object constructed. It cannot detect a Postgres or storage outage. |
| Public status page | Polls the three health endpoints | “All systems operational” can be green while convert, storage or billing are down |
| Rate limiting | Postgres-backed via `rate_limit_events` | Silent fallback to per-instance memory if the table is missing (near useless on serverless); upload/PDF limits key on **IP**, not user, despite the per-user docstring |
| Cross-subdomain SSO | Bridge shipped | Bridge only clears legacy cookies; shared sign-in depends on backend cookie domain + Supabase redirect config, unproven |
| Onboarding | First-visit tooltips | Completes early; thin product tour |
| Launch ops | Health + analytics + Sentry verified | Security audit, live charge test, beta cohort, support desk |
| Mobile / stores | Flutter app exists | Store submissions unchecked |
| Dedicated API Sentry project | BE events work via dashboard project DSN | Create `kdp-creator-api` when org allows member project creation |

**Corrected:** the old “JWT soft-verify — confirm `SUPABASE_JWT_SECRET`” row is moot. The live auth path calls `supabase.auth.get_user()` per request and never decodes locally. `SUPABASE_JWT_SECRET` is used only by `/sync-supabase-user` and `/validate-supabase-token`, both orphans.

Seed note: `urgent/supabase_seed_script.sql` still useful for empty analytics charts.

---

## Fake — succeeds while doing nothing

| Item | What the code actually does |
|------|-----------------------------|
| “Monthly” conversion / batch quota | `record_conversion_usage` only ever increments. `last_usage_reset` is written once at profile creation and never updated — no cron, SQL job, or endpoint resets it. Free users get **5 conversions total, then permanent `QUOTA_EXCEEDED`**, while the UI says “Monthly Usage”. Blocker for open free signup. |
| Overview “Storage Used” card | Reads `profile.storage_used_mb`; nothing in the codebase writes that column. Permanently `0.0 MB`. |
| Paid tier perks | `watermark_free`, `cloud_storage`, `priority_support`, `advanced_features`, `kdp_integration` are booleans in `SUBSCRIPTION_TIERS`, served publicly by `/api/tiers`, and read by **no code**. There is no watermark to remove. Only `monthly_conversions` and `batch_processing_limit` are enforced. |
| Client-error analytics | `captureException` → `trackEvent('client_error')`, but `client_error` is not in `ALLOWED_EVENT_TYPES`, so every POST returns 400 and is swallowed. Sentry still gets the error. |
| `/batch/submit` job queue | `_process_batch_job_optimized` runs `time.sleep(0.1)` per file (“Simulate actual work”) and marks the job complete — while consuming real batch quota via `record_batch_usage`. No UI calls it; only `tests/e2e/batch-processing.spec.js` does, so e2e asserts the fake path. |
| Batch progress bar | Jumps 0 → 100 around one blocking POST. Cosmetic only; the conversion behind it is real. |

---

## Orphan / Dead — no user-reachable path

| Item | Status |
|------|--------|
| `/2fa/setup`, `/2fa/verify`, `/2fa/disable` | Working pyotp endpoints with QR provisioning; **no UI**, so nobody can enable 2FA. The challenge, signed MFA token, and per-request enforcement are all real — one screen away from shipping. |
| `GET /business-metrics` | Admin-only, no dashboard. `total_revenue` = tier headcount × hardcoded list price, not Stripe data. |
| `/sync-supabase-user`, `/validate-supabase-token` | Write the legacy SQLAlchemy `users` table, which on Vercel is a throwaway `/tmp` SQLite file. Nothing calls them. |
| Legacy `User` / `Session` ORM models + `db.create_all()` | Recreated at every cold start for models no product path reads. |
| `accountApi.deleteUser(userId)` | Exported client method no screen calls; backend rejects anything but self-delete. |
| “Recent Projects” on Overview | Reads the `kdp_templates` localStorage key that `templateApi.save` would populate — and `save` is never called. Permanently empty; “Create Project” just switches tabs. The SQL `templates` table is unused too. |
| Flask `/register`, `/login`, `/request-password-reset`, `/reset-password` | All return 400 `DEPRECATED_ENDPOINT`. |
| Personal API keys | Honestly absent, and Settings says so. |

---

## Marketing site vs this codebase

`kdpsuite.com` is a separate Next.js app, not in this repo. Scored against the rendered page, it sells things that have **zero implementing code here**:

- Royalty calculator — no reference to “royalty” anywhere in API or dashboard source
- Team collaboration / multi-user workspaces — no orgs, roles, invites or sharing; every route is self-scoped
- Enterprise “API access” — contradicted by Settings, which says personal API keys don’t exist
- Direct KDP integration — no Amazon OAuth or listing sync (yet `/api/tiers` advertises `kdp_integration: true`)
- “500+ KDP-compliant templates” — `src/data/templates.py` has **5**, across 5 generator niches
- Lifetime tiers $99 / $249 / $499 / $9,999 — the API only sells `pro` $19.99/mo and `studio` $49.99/mo in Stripe `mode: "subscription"`. No code path can fulfil a founding purchase or grant a lifetime entitlement.
- “10,000+ users / 500K+ books / $50M+ revenue / 4.8★”, three named testimonials, three case studies with dollar figures — no data source exists for any of it
- “Free trial”, “money-back guarantee”, “24/7 support”, a fixed-date live demo — none implemented
- A rendered `Google AdSense Banner Placeholder` / `Configure NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID` string shipped to real visitors

With live Stripe keys in prod, this is the highest-exposure item in the project.

---

## Not started

- Invites, roles, orgs, multi-seat / multi-user batch collab
- Personal API keys
- 2FA UI (backend `totp.py` is real and complete; no dashboard screen)
- Amazon KDP OAuth / listing sync
- Royalty calculator
- Monthly usage reset job
- Formal pen-test, load test, status page, help desk
- Mixpanel / New Relic / full APM
- Coloring non-goals: skimage parity, PDF→raster / Poppler, `format-kdp` rewrite

---

## Do next

1. **Pull or rewrite the marketing claims** that have no code behind them — this is the only item with legal exposure, and Stripe is already live
2. Ship a monthly usage reset (cron or `last_usage_reset`-aware check) before open free signup — today the free tier is a lifetime 5-conversion cap
3. Either implement or stop advertising the five `SUBSCRIPTION_TIERS` perk booleans on public `/api/tiers`
4. Add a 2FA setup screen (backend is done) and either delete or wire `/batch/submit`, `/business-metrics`, and the legacy sync endpoints
5. Confirm `stripe_webhook_events` and `rate_limit_events` exist in prod; verify one real charge → entitlement flip
6. Fix the two dead dials: `storage_used_mb` has no writer, `client_error` is not an allowed event type

Surgical edits only. Do not rewrite working convert/auth paths unless that is the task.
