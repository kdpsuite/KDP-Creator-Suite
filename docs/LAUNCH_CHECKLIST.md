# KDP Creator Suite — Launch Checklist

Tracks deployment_guide.md §10 items. **Coded** = implemented in repo; **Manual** = requires human/ops action.

**Updated:** 2026-08-10 · See also [`MEMBER_READINESS.md`](MEMBER_READINESS.md) and [`urgent/cursor_please_readme.md`](../urgent/cursor_please_readme.md).

## Pre-Launch (Week -2)

| Item | Status | Notes |
|------|--------|-------|
| Security audit | Manual | JWT auth, rate limiting, CORS configured; formal audit pending |
| Performance testing | Manual | Load tests not automated; use `scripts/pre-launch-check.sh` for smoke |
| Beta user testing | Manual | Recruit beta cohort; no code dependency |
| Payment processing testing | Manual | RevenueCat/Stripe sandbox verification — Stripe Checkout code is on `feat/coloring-engine-upgrade`, not `main` |
| App store submissions | Manual | iOS/Android store listings |

### Coded pre-launch hooks (`main`)

| Item | Status | Location |
|------|--------|----------|
| Health endpoint | Done | `GET /api/health` |
| Readiness probe | Done | `GET /api/health/ready` |
| Liveness probe | Done | `GET /api/health/live` |
| Pre-launch smoke script | Done | `scripts/pre-launch-check.sh` |
| Env var startup validation | Done | `backend-api/kdp-creator-api/src/main.py` |
| Rate limiting | Done | `src/utils/rate_limit.py` |
| Analytics event recording | Done | `POST /api/analytics/events` |
| Sentry (Flask + React) | Done (env set) | `SENTRY_DSN` / `VITE_SENTRY_DSN` on Vercel; **redeploy required** for frontend bake-in |

### On `feat/coloring-engine-upgrade` (not yet on `main`)

| Item | Status | Location |
|------|--------|----------|
| Stripe Checkout + webhook entitlement | Done (needs Stripe env after merge) | `POST /api/checkout`, `POST /api/webhooks/stripe` |
| Free `/upgrade` disabled | Done | Returns `UPGRADE_DISABLED` |
| Account self-delete | Done | `DELETE /api/account` |
| Member readiness smoke | Done | `scripts/member-readiness-smoke.sh` |
| Enhanced coloring engine | Done (opt-in) | `src/services/coloring.py` |

## Launch Week

| Item | Status | Notes |
|------|--------|-------|
| Deploy production systems | Manual | Vercel (API + dashboard); see deployment_guide.md |
| Configure monitoring | Partial | Sentry **coded + Vercel DSNs set**; confirm events after redeploy. New Relic not used |
| Launch marketing campaigns | Manual | Out of scope for code |
| Monitor system performance | Partial | `/api/health/*` + analytics + Sentry (post-redeploy) |
| Customer support readiness | Manual | Help desk, docs, status page |

## Post-Launch (Week +1)

| Item | Status | Notes |
|------|--------|-------|
| Analyze user feedback | Manual | Use analytics dashboard + support tickets |
| Monitor conversion rates | Partial | `analytics_events` table + frontend `trackEvent()` |
| Track technical metrics | Partial | Health endpoints + Sentry; full APM deferred |
| Plan first update | Manual | Product planning |

**Months 1–12 roadmap (manual):** see `post_launch_strategy.md` at repo root. Coded foundation: analytics events + Sentry.

## Deferred (not in this launch)

- Multi-user batch collaboration
- Mixpanel / New Relic (Sentry is the chosen error tracker)
- APF, Shadowcast, Mission Control — **out of scope permanently**
