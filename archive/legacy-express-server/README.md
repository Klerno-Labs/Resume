# Legacy Express Server (archived)

These files hold the original Express-based API stack that powered the app before the migration to the Vercel serverless handler in `api/index.ts`.

Production deployments now use the serverless function inside `api/index.ts`, so this folder is kept only for historical purposes and for any future reference.

To run the legacy code locally:
1. `npm run build:server` (if the script still exists)
2. `npm start`

**Do not deploy** this folder to Vercel — it conflicts with the serverless routes and the cache/body-parsing model.
