import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';

// Self-hosted fonts - no external dependencies, full cache control
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initSentry } from './lib/sentry';

// Initialize Sentry for error tracking
initSentry();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
    <Analytics />
  </ErrorBoundary>
);
