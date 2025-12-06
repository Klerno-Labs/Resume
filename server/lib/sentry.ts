import * as Sentry from "@sentry/node";
import { Express } from "express";
import { logger } from "./logger";

export function initSentry(app: Express) {
  // Initialize Sentry only if DSN is provided
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    logger.info("Sentry DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [
      // HTTP integration to trace requests
      new Sentry.Integrations.Http({ tracing: true }),
      // Express integration
      new Sentry.Integrations.Express({ app }),
    ],
  });

  // The request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler());

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());

  logger.info("Sentry error tracking initialized");
}

export function attachSentryErrorHandler(app: Express) {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    return;
  }

  // The error handler must be registered before any other error middleware
  app.use(Sentry.Handlers.errorHandler());
}

export { Sentry };
