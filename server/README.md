# Legacy Express Server (NOT USED IN PRODUCTION)

This directory contains the original Express server implementation. Production is served entirely via the serverless function in `api/index.ts`.

If you need to run the Express server locally for debugging:

1. Run `npm run build:server`
2. Run `npm start`

DO NOT deploy the Express build to Vercel—it conflicts with the serverless routing and causes body parsing issues.
