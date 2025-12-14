let sessionId: string;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = localStorage.getItem('analytics_session_id') || crypto.randomUUID();
    localStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

export class Analytics {
  static pageView(path: string) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', { page_path: path });
    }
    this.track('page_view', { page: path });
  }

  static track(event: string, properties?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, properties);
    }

    const sessionId = getSessionId();
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event,
        properties,
        sessionId,
        page: window.location.pathname,
        referrer: document.referrer
      }),
    }).catch(() => {});
  }

  static funnelStep(step: string) {
    this.track('funnel_step', { step });
    void fetch(`/api/analytics/funnel/${step}`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  }

  static conversion(value: number, currency: string = 'USD') {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', { value, currency });
    }
    this.track('conversion', { value, currency });
  }
}

declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}
