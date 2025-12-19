import * as Sentry from '@sentry/react';

export function initSentry() {
  // Sentry disabled - causes initialization errors
  console.log('Sentry disabled');
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('Error:', error.message, context);
  // Sentry disabled - no remote error tracking
}

export { Sentry };
