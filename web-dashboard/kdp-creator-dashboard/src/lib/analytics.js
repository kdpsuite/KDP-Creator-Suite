import api from './api';

/**
 * Record a product analytics event (persisted via POST /api/analytics/events).
 * Failures are logged but never block the UI.
 */
export async function trackEvent(eventType, eventData = {}) {
  try {
    await api.post('/analytics/events', {
      event_type: eventType,
      event_data: eventData,
    });
  } catch (error) {
    console.warn('[analytics]', eventType, error?.message || error);
  }
}

export const AnalyticsEvents = {
  USER_REGISTERED: 'user_registered',
  PDF_CONVERSION_STARTED: 'pdf_conversion_started',
  PDF_CONVERSION_COMPLETED: 'pdf_conversion_completed',
  BATCH_PROCESSING_INITIATED: 'batch_processing_initiated',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
};
