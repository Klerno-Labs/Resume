import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
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

console.log('Main.tsx loading...');

try {
  console.log('Creating root...');
  const root = createRoot(document.getElementById('root')!);
  console.log('Root created, rendering...');
  root.render(
    <>
      <App />
      <Analytics />
      <SpeedInsights />
    </>
  );
  console.log('Render complete!');
} catch (error) {
  console.error('FATAL ERROR in main.tsx:', error);
  document.body.innerHTML = '<div style="padding:20px;color:red;font-family:monospace;"><h1>Fatal Error</h1><pre>' + (error instanceof Error ? error.message + '\n\n' + error.stack : String(error)) + '</pre></div>';
}
