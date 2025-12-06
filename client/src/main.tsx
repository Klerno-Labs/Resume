import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initSentry, Sentry } from "./lib/sentry";

// Initialize Sentry
initSentry();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<ErrorBoundary />} showDialog>
    <App />
  </Sentry.ErrorBoundary>
);
