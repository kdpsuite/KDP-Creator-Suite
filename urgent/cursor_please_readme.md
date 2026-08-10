# Cursor, Please Readme: KDP Creator Suite Dashboard Status

**Updated:** 2026-08-08  
**Branch context:** `feat/coloring-engine-upgrade` (ahead of `main`)  
**Member readiness:** see [`docs/MEMBER_READINESS.md`](../docs/MEMBER_READINESS.md)  
**Launch ops:** see [`docs/LAUNCH_CHECKLIST.md`](../docs/LAUNCH_CHECKLIST.md)

Status of the web dashboard + Flask API. Trust this file and the two docs above over older “complete” banners in root summaries.

**Out of scope permanently:** APF, Shadowcast, and Mission Control — do not integrate into this dashboard or the Android app.

**Legend**
- **Shipped** — in the codebase on this branch
- **Partial** — coded but undeployed, unconfigured, or incomplete
- **Not started** — no product-ready implementation

---

## Shipped

### Auth and session
- Supabase email/password login, register, forgot-password, recovery callback
- Backend `/user/profile-sync` creates `user_profiles` for new Auth users
- Session bridge (`/sync-session`, `/validate-session`)
- Login spinner fix: frontend unwraps `success_response` envelope after auth

### Core KDP tools
- KDP PDF convert (`/pdf/format-kdp`) with trim size + print/ebook target
- Image → coloring page (`/pdf/convert-coloring`) — PNG, trim + bleed pad
- KDP PDF validation (`/pdf/validate-kdp`)
- Product Builder + template library generate (interior + paperback cover)
- Batch coloring PDF: multi-image upload, drag reorder, optional title cover
- Safe-zone overlay on previews (`KdpSafeZoneOverlay.jsx`)

### Coloring engine upgrade (this branch)
- `backend-api/kdp-creator-api/src/services/coloring.py`
- Opt-in enhanced line-art controls in dashboard; **default remains legacy**
- Wired through existing convert + batch coloring endpoints

### Analytics
- `analytics_events` table + backend record on PDF/batch success/failure
- Live `/user-metrics` on Analytics tab (not mock data)
- Frontend `trackEvent()` / `POST /api/analytics/events`

### UI
- OKLCH palette + dark mode, typography, card/button polish
- Empty-state SVGs, `OnboardingTooltip` + `useOnboarding` (localStorage)
- `PageTransition` + shimmer/pulse loading utilities

### Membership (code)
- `POST /upgrade` disabled — returns `UPGRADE_DISABLED` (no free self-promote)
- Public `GET /tiers` hides `unlimited`
- Stripe Checkout `POST /checkout`, billing portal, `POST /webhooks/stripe` → `subscription_tier`
- Overview pricing / Upgrade to Pro|Studio CTAs
- Client + server Pro template gate; quota errors prompt upgrade
- `DELETE /api/account` (+ existing self `DELETE /users/<id>`) deletes profile and attempts Auth user delete
- Settings: support mailto, no “coming soon” delete stub

### Monitoring and smokes (code)
- Optional Sentry: Flask `SENTRY_DSN`, client `VITE_SENTRY_DSN`
- Settings support email (`VITE_SUPPORT_EMAIL` / `support@kdpsuite.com`)
- `scripts/pre-launch-check.sh`
- `scripts/member-readiness-smoke.sh`

### Infra already in use
- Vercel dashboard + API proxy (`/api` → backend)
- Supabase Auth + Postgres `user_profiles`
- Rate limiting, `/api/health` `/ready` `/live`

---

## Partial

| Item | What’s true | What’s missing |
|------|-------------|----------------|
| Stripe live path | Code + UI exist | Prod `/checkout` and `/account` still 404 until **backend deploy**; `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_STUDIO`, `FRONTEND_URL` unset/unverified; `SUPABASE_STRIPE_CUSTOMER.sql` not confirmed run |
| Sentry | SDK init in `main.py` + `monitoring.js` | Inactive until DSNs set |
| JWT verify | Prod/staging refuse unsigned decode | Dev still soft-verifies if `SUPABASE_JWT_SECRET` unset |
| Onboarding | First-visit tooltips | Completes immediately; no real product tour |
| Recent projects | localStorage templates | Not cloud projects |
| Coloring enhanced | Coded on this branch | Not merged to `main`; not verified in prod |
| Launch ops | Health + analytics foundation | Security audit, Stripe sandbox pay test, beta cohort, support desk — Manual |
| Mobile / stores | Flutter app exists | Store submissions unchecked; not the web member funnel |
| Cross-subdomain SSO | Partial docs/code | Cookie-domain still open (`SESSION_PERSISTENCE.md`) |

Seed note: `urgent/supabase_seed_script.sql` still useful for empty analytics charts. Prefer live conversions over fake seed in prod.

---

## Not started

- Invites, roles, orgs, multi-seat / multi-user batch collab
- Personal API keys
- 2FA UI (backend `totp.py` exists; no dashboard)
- Amazon KDP OAuth / listing sync (`kdp_integration` tier flag unused)
- Formal pen-test, load test, status page, help desk
- Mixpanel / New Relic / full APM
- Coloring non-goals: skimage parity, PDF→raster / Poppler, `format-kdp` rewrite

---

## Do next (ops, not code)

1. Run `SUPABASE_STRIPE_CUSTOMER.sql` in Supabase SQL editor
2. Set Stripe + `SUPABASE_JWT_SECRET` + optional Sentry on Vercel
3. Point Stripe webhook to `POST /api/webhooks/stripe`
4. Deploy backend then dashboard
5. Re-run `scripts/member-readiness-smoke.sh` (checkout/account must be 401, not 404)

Surgical edits only. Do not rewrite working convert/auth/quota paths unless that is the task.
