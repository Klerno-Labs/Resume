import * as Sentry from '@sentry/node';
import { env } from './env.js';

export function initSentry() {
  if (env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
      // Don't send errors in development unless explicitly enabled
      enabled: env.NODE_ENV === 'production' || !!env.SENTRY_DSN,
    });
    console.log('✅ Sentry initialized for error tracking');
  } else {
    console.log('ℹ️ Sentry DSN not configured, error tracking disabled');
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('Error:', error.message, context);
  if (env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

export { Sentry };
