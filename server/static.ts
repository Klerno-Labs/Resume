import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';

const hashedAssetPattern = /\.(?:js|css|png|jpe?g|gif|ico|svg|woff2?|ttf|eot)(?:\?.*)?$/i;

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, 'public');
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  const applyCacheHeaders = (res: express.Response, filePath: string) => {
    res.removeHeader('Expires');
    const cacheControlValue = hashedAssetPattern.test(filePath)
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600, stale-while-revalidate=86400';
    res.setHeader('Cache-Control', cacheControlValue);
  };

  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => applyCacheHeaders(res, filePath),
    })
  );

  // fall through to index.html if the file doesn't exist
  app.use('*', (_req, res) => {
    applyCacheHeaders(res, path.resolve(distPath, 'index.html'));
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}
