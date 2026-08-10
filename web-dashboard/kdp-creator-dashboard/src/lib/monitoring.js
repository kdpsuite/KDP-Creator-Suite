import * as Sentry from '@sentry/react'

let sentryReady = false

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || typeof window === 'undefined') return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'production',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/([a-z0-9-]+\.)?kdpsuite\.com/i,
      /^https:\/\/dashboard-backend-hazel\.vercel\.app/i,
    ],
  })
  sentryReady = true
}

export function captureException(error, context = {}) {
  const err = error instanceof Error ? error : new Error(String(error))
  if (sentryReady) {
    Sentry.captureException(err, { extra: context })
    return
  }
  console.error('[monitoring]', err, context)
}
