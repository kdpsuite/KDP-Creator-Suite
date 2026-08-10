# Cursor, Please Readme: KDP Creator Suite Dashboard Status

**Updated:** 2026-08-10  
**Branch:** `main` (includes merged `feat/coloring-engine-upgrade`)  
**Member readiness:** [`docs/MEMBER_READINESS.md`](../docs/MEMBER_READINESS.md)  
**Launch ops:** [`docs/LAUNCH_CHECKLIST.md`](../docs/LAUNCH_CHECKLIST.md)

Trust this file and those two docs over older root “complete” banners.

**Out of scope permanently:** APF, Shadowcast, Mission Control — do not integrate into this dashboard or the Android app.

**Legend**
- **Shipped** — in `main` codebase (and/or configured in prod env)
- **Partial** — coded but undeployed/incomplete, or live ops unfinished
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

### Membership / billing (code)
- Free `POST /upgrade` disabled (`UPGRADE_DISABLED`)
- Public `/tiers` hides `unlimited`
- Stripe Checkout `/checkout`, billing portal, webhook `/webhooks/stripe`
- Overview upgrade CTAs; template/quota upgrade prompts
- Account self-delete `DELETE /api/account`
- Member smoke: `scripts/member-readiness-smoke.sh`

### Analytics
- `analytics_events` table + backend record on PDF/batch success/failure
- Live `/user-metrics` on Analytics tab (not mock data)
- Frontend `trackEvent()` / `POST /api/analytics/events`

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
- Rate limiting, `/api/health` `/ready` `/live`
- Smokes: `scripts/pre-launch-check.sh`, `scripts/member-readiness-smoke.sh`

---

## Partial

| Item | What’s true | What’s missing |
|------|-------------|----------------|
| Stripe live payments | Checkout/webhook code shipped | Stripe price IDs, webhook endpoint, SQL, sandbox charge |
| JWT soft-verify | Prod should refuse unsigned decode | Confirm `SUPABASE_JWT_SECRET` on prod |
| Onboarding | First-visit tooltips | Completes early; thin product tour |
| Recent projects | localStorage | Not cloud projects |
| Cross-subdomain SSO | Bridge shipped | Cookie-domain / shared storage still open |
| Launch ops | Health + analytics + Sentry verified | Security audit, Stripe sandbox, beta cohort, support desk |
| Mobile / stores | Flutter app exists | Store submissions unchecked |
| Dedicated API Sentry project | BE events work via dashboard project DSN | Create `kdp-creator-api` when org allows member project creation |

Seed note: `urgent/supabase_seed_script.sql` still useful for empty analytics charts.

---

## Not started

- Invites, roles, orgs, multi-seat / multi-user batch collab
- Personal API keys
- 2FA UI (backend `totp.py` may exist; no dashboard)
- Amazon KDP OAuth / listing sync
- Formal pen-test, load test, status page, help desk
- Mixpanel / New Relic / full APM
- Coloring non-goals: skimage parity, PDF→raster / Poppler, `format-kdp` rewrite

---

## Do next

1. Run `SUPABASE_STRIPE_CUSTOMER.sql`; set Stripe env + webhook; smoke `/checkout` `/account` (401 not 404)
2. Sandbox charge → entitlement flip
3. Formal security audit + support desk before paid public launch

Surgical edits only. Do not rewrite working convert/auth paths unless that is the task.
