/**
 * Client error monitoring + support contact.
 * - Always captures unhandled errors to console + analytics when authenticated.
 * - Optionally loads @sentry/browser when VITE_SENTRY_DSN is set.
 */

import { trackEvent } from './analytics'

export const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || 'support@kdpsuite.com'

let sentryModule = null

export async function initMonitoring() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    captureException(event.error || new Error(event.message), {
      source: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason, { source: 'unhandledrejection' })
  })

  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  try {
    sentryModule = await import('@sentry/browser')
    sentryModule.init({
      dsn,
      environment: import.meta.env.MODE || 'production',
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    })
  } catch (error) {
    console.warn(
      '[monitoring] @sentry/browser not available; using analytics fallback only',
      error?.message || error
    )
  }
}

export function captureException(error, context = {}) {
  const err = error instanceof Error ? error : new Error(String(error))
  console.error('[monitoring]', err, context)

  if (sentryModule?.captureException) {
    sentryModule.captureException(err, { extra: context })
  }

  trackEvent('client_error', {
    message: err.message,
    name: err.name,
    ...context,
  })
}
