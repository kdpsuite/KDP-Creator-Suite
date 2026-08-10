# Cursor, Please Readme: KDP Creator Suite Dashboard Status

**Updated:** 2026-08-10  
**Branch:** `main`  
**Member readiness:** [`docs/MEMBER_READINESS.md`](../docs/MEMBER_READINESS.md)  
**Launch ops:** [`docs/LAUNCH_CHECKLIST.md`](../docs/LAUNCH_CHECKLIST.md)

Trust this file and those two docs over older root “complete” banners.

**Out of scope permanently:** APF, Shadowcast, Mission Control — do not integrate into this dashboard or the Android app.

**Legend**
- **Shipped** — in `main` codebase (and/or configured in prod env)
- **Partial** — coded, undeployed, on another branch, or incomplete
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
- Image → coloring page (`/pdf/convert-coloring`) — PNG, trim + bleed pad (legacy engine default)
- KDP PDF validation (`/pdf/validate-kdp`)
- Product Builder + template library generate (interior + paperback cover)
- Batch coloring PDF: multi-image upload, drag reorder, optional title cover
- Safe-zone overlay on previews (`KdpSafeZoneOverlay.jsx`)

### Analytics
- `analytics_events` table + backend record on PDF/batch success/failure
- Live `/user-metrics` on Analytics tab (not mock data)
- Frontend `trackEvent()` / `POST /api/analytics/events`

### UI polish
- OKLCH palette + dark mode, typography, card/button polish
- Empty-state SVGs, `OnboardingTooltip` + `useOnboarding` (localStorage)
- `PageTransition` + shimmer/pulse loading utilities
- `ErrorBoundary` reports to Sentry when DSN is set

### Monitoring (Sentry)
- Flask: `sentry_sdk` + FlaskIntegration when `SENTRY_DSN` is set (`main.py`)
- Dashboard: `@sentry/react` init + replay + logs when `VITE_SENTRY_DSN` is set (`monitoring.js`)
- Sentry projects: `kdp-creator-api` (Python), `kdp-creator-dashboard` (React)
- **Vercel env set** on `dashboard-backend` (`SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`) and `dashboard-frontend` (`VITE_SENTRY_DSN`, `VITE_SENTRY_TRACES_SAMPLE_RATE`)
- Sample rates default **0.1** (not 1.0) to protect quota

### Infra already in use
- Vercel dashboard + API proxy (`/api` → backend)
- Supabase Auth + Postgres `user_profiles`
- Rate limiting, `/api/health` `/ready` `/live`
- Smokes: `scripts/pre-launch-check.sh`

---

## Partial

| Item | What’s true | What’s missing |
|------|-------------|----------------|
| Sentry live traffic | Code + Vercel DSNs set | **Redeploy** both Vercel apps so frontend bakes `VITE_*`; confirm a test error in each Sentry project |
| Membership / Stripe / free-upgrade lock | Implemented on `feat/coloring-engine-upgrade` | **Not merged to `main`**; prod `/checkout` / `/account` / `UPGRADE_DISABLED` absent until merge + deploy |
| Coloring engine upgrade (enhanced line-art) | On `feat/coloring-engine-upgrade` | Not on `main`; default on main remains legacy |
| JWT soft-verify | Prod/staging should refuse unsigned decode (on feat branch) | Confirm `SUPABASE_JWT_SECRET` on prod; feat-branch hardening may not be on `main` |
| Onboarding | First-visit tooltips | Completes early; thin product tour |
| Recent projects | localStorage | Not cloud projects |
| Cross-subdomain SSO | Bridge shipped | Cookie-domain / shared storage still open (`SESSION_PERSISTENCE.md`) |
| Launch ops | Health + analytics + Sentry env | Security audit, Stripe sandbox pay test, beta cohort, support desk — Manual |
| Mobile / stores | Flutter app exists | Store submissions unchecked |

Seed note: `urgent/supabase_seed_script.sql` still useful for empty analytics charts.

---

## Not started

- Invites, roles, orgs, multi-seat / multi-user batch collab
- Personal API keys
- 2FA UI (backend `totp.py` may exist; no dashboard)
- Amazon KDP OAuth / listing sync
- Formal pen-test, load test, status page, help desk
- Mixpanel / New Relic / full APM
- Coloring non-goals (when upgrade merges): skimage parity, PDF→raster / Poppler, `format-kdp` rewrite

---

## Do next

1. Redeploy `dashboard-backend` and `dashboard-frontend` on Vercel (Sentry DSNs already in project env)
2. Trigger one test error in each Sentry project and confirm it lands
3. Merge `feat/coloring-engine-upgrade` when ready for Stripe + membership + enhanced coloring
4. After that merge: run Stripe SQL/env/webhook steps in `docs/MEMBER_READINESS.md`

Surgical edits only. Do not rewrite working convert/auth paths unless that is the task.
