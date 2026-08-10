# KDP Creator Suite

All-in-one platform for turning artwork, stories, and journals into **Amazon KDP–ready books**.

Primary surfaces:
- **Web dashboard** — `web-dashboard/kdp-creator-dashboard` (Vite + React on Vercel)
- **API** — `backend-api/kdp-creator-api` (Flask on Vercel)
- **Landing** — root / marketing site
- **Mobile** — `mobile-app/` (Flutter; parallel, not the web member funnel)

## Features (web)

- Coloring book conversion (image → line art / KDP trim)
- KDP PDF format + validate
- Batch coloring PDFs (reorder, optional cover)
- Template Product Builder
- Safe-zone preview overlay
- Supabase auth + usage analytics
- Optional Sentry error monitoring

## Tech stack

- React 19 + Vite + Tailwind + Radix/shadcn-style UI
- Flask + Supabase Auth/Postgres
- Vercel hosting (dashboard-frontend / dashboard-backend)

## Status docs (read these)

| Doc | Purpose |
|-----|---------|
| [`urgent/cursor_please_readme.md`](urgent/cursor_please_readme.md) | Shipped / Partial / Not started |
| [`docs/MEMBER_READINESS.md`](docs/MEMBER_READINESS.md) | Member / billing readiness |
| [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) | Launch ops checklist |
| [`ENV_VARS.md`](ENV_VARS.md) | Environment variables |

Membership/Stripe and enhanced coloring live on branch `feat/coloring-engine-upgrade` until merged.

## Dashboard local setup

```bash
cd web-dashboard/kdp-creator-dashboard
pnpm install
cp .env.example .env.local   # set VITE_SUPABASE_* and optional VITE_SENTRY_DSN
pnpm dev
```

## API local setup

```bash
cd backend-api/kdp-creator-api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env.local   # set Supabase + optional SENTRY_DSN
flask --app src.main run
```

**Out of scope permanently:** APF, Shadowcast, Mission Control.
