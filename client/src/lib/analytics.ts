export class Analytics {
  static pageView(path: string) {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "page_view", { page_path: path });
    }
    this.track("page_view", { page: path });
  }

  static track(event: string, properties?: Record<string, any>) {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", event, properties);
    }

    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ event, properties }),
    }).catch(() => {});
  }

  static funnelStep(step: string) {
    this.track("funnel_step", { step });
    fetch(`/api/analytics/funnel/${step}`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }

  static conversion(value: number, currency: string = "USD") {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "purchase", { value, currency });
    }
    this.track("conversion", { value, currency });
  }
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
