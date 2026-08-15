import * as Sentry from '@sentry/react'

import { trackEvent } from './analytics'

export const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || 'support@kdpsuite.com'

export const STATUS_URL =
  import.meta.env.VITE_STATUS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/status`
    : 'https://dashboard.kdpsuite.com/status')

export const HELP_URL =
  import.meta.env.VITE_HELP_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/help`
    : 'https://dashboard.kdpsuite.com/help')

let sentryReady = false

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || typeof window === 'undefined') return

  const integrations = [Sentry.browserTracingIntegration()]
  if (typeof Sentry.replayIntegration === 'function') {
    integrations.push(Sentry.replayIntegration())
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'production',
    integrations,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/([a-z0-9-]+\.)?kdpsuite\.com/i,
      /^https:\/\/dashboard-backend-hazel\.vercel\.app/i,
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
  })
  sentryReady = true
  if (typeof window !== 'undefined') {
    window.Sentry = Sentry
  }
}

export function captureException(error, context = {}) {
  const err = error instanceof Error ? error : new Error(String(error))
  if (sentryReady) {
    Sentry.captureException(err, { extra: context })
  } else {
    console.error('[monitoring]', err, context)
  }

  trackEvent('client_error', {
    message: err.message,
    name: err.name,
    ...context,
  })
}
