# KDP Creator Suite — Launch Checklist

Tracks deployment_guide.md §10 items. **Coded** = implemented in repo; **Manual** = requires human/ops action.

## Pre-Launch (Week -2)

| Item | Status | Notes |
|------|--------|-------|
| Security audit | Manual | JWT auth, rate limiting, CORS configured; formal audit pending |
| Performance testing | Manual | Load tests not automated; use `scripts/pre-launch-check.sh` for smoke |
| Beta user testing | Manual | Recruit beta cohort; no code dependency |
| Payment processing testing | Manual | RevenueCat/Stripe sandbox verification |
| App store submissions | Manual | iOS/Android store listings |

### Coded pre-launch hooks

| Item | Status | Location |
|------|--------|----------|
| Health endpoint | Done | `GET /api/health` |
| Readiness probe | Done | `GET /api/health/ready` |
| Liveness probe | Done | `GET /api/health/live` |
| Pre-launch smoke script | Done | `scripts/pre-launch-check.sh` |
| Env var startup validation | Done | `backend-api/kdp-creator-api/src/main.py` |
| Rate limiting | Done | `src/utils/rate_limit.py` |
| Analytics event recording | Done | `POST /api/analytics/events` |

## Launch Week

| Item | Status | Notes |
|------|--------|-------|
| Deploy production systems | Manual | Vercel (API + dashboard); see deployment_guide.md |
| Configure monitoring | Partial | Health probes ready; Sentry/New Relic not wired |
| Launch marketing campaigns | Manual | Out of scope for code |
| Monitor system performance | Partial | `/api/health/*` + analytics events foundation |
| Customer support readiness | Manual | Help desk, docs, status page |

## Post-Launch (Week +1)

| Item | Status | Notes |
|------|--------|-------|
| Analyze user feedback | Manual | Use analytics dashboard + support tickets |
| Monitor conversion rates | Partial | `analytics_events` table + frontend `trackEvent()` |
| Track technical metrics | Partial | Health endpoints; full APM deferred |
| Plan first update | Manual | Product planning |

## Deferred (not in this launch)

- Multi-user batch collaboration
- Mixpanel / New Relic / Sentry integration (external SaaS)
- APF, Shadowcast, Mission Control — **out of scope permanently**
