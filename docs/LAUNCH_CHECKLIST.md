# KDP Creator Suite — Launch Checklist

Tracks deployment_guide.md §10 items. **Coded** = implemented in repo; **Manual** = requires human/ops action.

**Updated:** 2026-09-08 (corrected against code-to-function audit) · See also [`MEMBER_READINESS.md`](MEMBER_READINESS.md) and [`urgent/cursor_please_readme.md`](../urgent/cursor_please_readme.md).

## Pre-Launch (Week -2)

| Item | Status | Notes |
|------|--------|-------|
| Security audit | Partial | CORS + headers + expanded `security-smoke` + `security-audit-checklist.sh`; formal pen-test still pending |
| Performance testing | Partial | `load-smoke.sh` health + unauth gates; set `LOAD_SMOKE_JWT` for authenticated convert/batch/status probes |
| Beta user testing | Manual | Recruit beta cohort; no code dependency |
| Payment processing testing | Manual | Stripe key + webhook secret are configured in prod (unsigned webhook POST returns `INVALID_SIGNATURE`). Still needs one real charge → entitlement flip, and confirmation that `stripe_webhook_events` exists. |
| Marketing claim accuracy | **Failing** | `kdpsuite.com` advertises a royalty calculator, team workspaces, API access, KDP integration, 500+ templates and lifetime pricing — none implemented. Highest-exposure open item. |
| Monthly usage reset | **Missing** | `last_usage_reset` is never updated; free tier is a lifetime 5-conversion cap. Blocks open free signup. |
| App store submissions | Manual | iOS/Android store listings |

### Coded pre-launch hooks (`main`)

| Item | Status | Location |
|------|--------|----------|
| Health endpoint | Done | `GET /api/health` |
| Readiness probe | Partial | `GET /api/health/ready` — `database: true` is a `SELECT 1` against ephemeral `/tmp` SQLite and `supabase: true` only means the client constructed. Cannot detect a Postgres or storage outage. |
| Liveness probe | Done | `GET /api/health/live` |
| Pre-launch smoke script | Done | `scripts/pre-launch-check.sh` |
| Security smoke script | Done | `scripts/security-smoke.sh` |
| Load smoke script | Done | `scripts/load-smoke.sh` (+ optional `LOAD_SMOKE_JWT`) |
| Support ticket intake | Partial | `POST /api/support/ticket` + public `/help` — writes a `support_ticket` row into `analytics_events` only; no notification, status or reply path, triage via `scripts/support-ticket-query.sql` |
| Production CORS allowlist | Done | `CORS_ORIGINS` / defaults in `src/main.py` |
| Env var startup validation | Done | `backend-api/kdp-creator-api/src/main.py` |
| Rate limiting | Partial | `src/utils/rate_limit.py` — Postgres-backed via `rate_limit_events`, silently falls back to per-instance memory if the table is missing; upload/PDF limits key on IP, not user |
| Analytics event recording | Done | `POST /api/analytics/events` — note `client_error` is not in `ALLOWED_EVENT_TYPES`, so client-error tracking always 400s |
| Sentry (Flask + React) | Done (verified) | Events confirmed 2026-08-10; `SENTRY_DSN` / `VITE_SENTRY_DSN` on Vercel |
| Stripe Checkout + webhook entitlement | Done (live in prod) | `POST /api/checkout`, `POST /api/webhooks/stripe` |
| Free `/upgrade` disabled | Done | Returns `UPGRADE_DISABLED` |
| Account self-delete | Done | `DELETE /api/account` |
| Member readiness smoke | Done | `scripts/member-readiness-smoke.sh` |
| Enhanced coloring engine | Done (opt-in) | `src/services/coloring.py` |

## Launch Week

| Item | Status | Notes |
|------|--------|-------|
| Deploy production systems | Manual | Vercel (API + dashboard); see deployment_guide.md |
| Configure monitoring | Done | Sentry verified on FE+BE |
| Launch marketing campaigns | Manual | Out of scope for code |
| Monitor system performance | Partial | `/api/health/*` + analytics + Sentry |
| Customer support readiness | Partial | Public `/help` FAQ + Settings ticket form → `POST /api/support/ticket`; mailto SLA; no SaaS desk |

## Post-Launch (Week +1)

| Item | Status | Notes |
|------|--------|-------|
| Analyze user feedback | Manual | Use analytics dashboard + support tickets |
| Monitor conversion rates | Partial | `conversion-funnel-query.sql` + `conversion-funnel-review.sh` monthly cadence |
| Track technical metrics | Partial | Health endpoints + Sentry; full APM deferred |
| Plan first update | Manual | Product planning |

**Months 1–12 roadmap (manual):** see `post_launch_strategy.md` at repo root. Coded foundation: analytics events + Sentry.

## Deferred (not in this launch)

- Multi-user batch collaboration
- Mixpanel / New Relic (Sentry is the chosen error tracker)
- APF, Shadowcast, Mission Control — **out of scope permanently**
