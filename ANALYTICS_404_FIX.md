# Analytics 404 Error - Diagnosis & Fix

## Problem
`POST /api/analytics/event` returns 404 Not Found on production (https://rewriteme.app)

## Root Cause Analysis

### What We Know:
1. ✅ Analytics routes ARE in the code (`server/routes/analytics.routes.ts`)
2. ✅ Analytics routes ARE registered in `server/routes/index.ts` line 18
3. ✅ Analytics routes ARE in the build (`dist/index.cjs` contains the code)
4. ✅ Health endpoint works (`/api/health` returns 200)
5. ❌ Analytics endpoint returns 404

### Possible Causes:

#### Cause #1: Production Hasn't Deployed Latest Code (MOST LIKELY)
**Symptom**: Push happened but auto-deploy hasn't completed
**Solution**: Wait 2-5 more minutes for deploy to complete

**How to verify**:
```bash
# Check when last deploy happened on Vercel/Railway
# If it's older than your last push, redeploy manually
```

#### Cause #2: Analytics Table Doesn't Exist
**Symptom**: Route registers but crashes immediately on first request
**Solution**: Run the migration to create tables

```bash
node run-production-migration.js
```

This creates:
- `analytics_events` table
- `funnel_steps` table

#### Cause #3: Build Config Excludes Analytics
**Symptom**: Route not in production build
**Solution**: Check build script

```bash
# Verify analytics in build
grep -a "/api/analytics" dist/index.cjs
# Should output: e.use("/api/analytics",CH)
```

---

## Quick Fixes (Try In Order)

### Fix #1: Force Redeploy ⚡ (Fastest)
If using Vercel:
```bash
vercel --prod
```

If using Railway:
```bash
railway up
```

Or just:
```bash
git commit --allow-empty -m "chore: Trigger redeploy for analytics fix"
git push
```

---

### Fix #2: Run Migration 🗄️
If Fix #1 doesn't work, the table might be missing:

```bash
node run-production-migration.js
```

Expected output:
```
🔗 Connecting to production database...
✅ Connected!
⚡ Running migration...
✅ Migration completed successfully!
```

---

### Fix #3: Manual Database Check 🔍
If both fail, verify the table exists:

```bash
# Connect to production database
psql $DATABASE_URL

# Check if table exists
\dt analytics_events

# If it doesn't exist, create it:
CREATE TABLE IF NOT EXISTS analytics_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event TEXT NOT NULL,
  properties JSONB,
  page TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_event_idx ON analytics_events(event);
CREATE INDEX IF NOT EXISTS analytics_session_idx ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS analytics_created_at_idx ON analytics_events(created_at);
```

---

## Verification Steps

After applying a fix, verify:

### Test 1: Check Endpoint Exists
```bash
curl -X POST https://rewriteme.app/api/analytics/event \
  -H "Content-Type: application/json" \
  -d '{"event":"test","sessionId":"test-123"}'

# Should return: {"success":true}
# Should NOT return: 404
```

### Test 2: Check in Browser
1. Open https://rewriteme.app
2. Open DevTools (F12) → Console
3. Look for analytics error
4. Should see: ✅ No 404 errors
5. If still 404: Check Network tab for response headers

### Test 3: Check Server Logs
```bash
# Vercel
vercel logs production

# Railway
railway logs

# Look for:
# ✅ "Analytics error:" - means route exists, table might be missing
# ❌ No mention of analytics - means route not registered
```

---

## Why This Happens

### The Route Registration Flow:
1. `server/index.ts` imports `registerRoutes`
2. `registerRoutes` is called from `server/routes/index.ts`
3. Line 18: `app.use("/api/analytics", analyticsRoutes)`
4. `analyticsRoutes` imported from `./analytics.routes`

### Where It Can Break:
- ❌ Import fails (missing file) → Build would fail
- ❌ Router not exported → TypeScript would error
- ❌ Route registration commented out → We checked, it's not
- ❌ Production running old code → **MOST LIKELY**
- ❌ Table missing → Route registers but errors on use

---

## Current Status

**Local Build**: ✅ Analytics routes included
**Production Deploy**: ⏳ May not have latest code yet
**Database Table**: ❓ Unknown if exists in production

---

## Recommended Action

**Right Now**:
1. Wait 5 minutes for auto-deploy to complete
2. Test: `curl -X POST https://rewriteme.app/api/analytics/event -H "Content-Type: application/json" -d '{"event":"test"}'`
3. If still 404: Run `node run-production-migration.js`
4. If still 404: Force redeploy with `git commit --allow-empty && git push`

---

## Expected Timeline

- **Now**: 404 error (production on old code)
- **+5 min**: Auto-deploy completes
- **+5 min**: 404 fixed OR 500 error (table missing)
- **+10 min**: Run migration if needed
- **+10 min**: Everything works ✅

---

## If Nothing Works

The nuclear option:

```bash
# 1. Verify local works
npm run build
npm start
# Test: curl http://localhost:5000/api/analytics/event

# 2. If local works but production doesn't:
# Check deployment platform logs
# Check if DATABASE_URL is set in production
# Check if build step is running
# Check if dist/index.cjs is being deployed
```

---

**Status**: Waiting for production deploy to complete
**ETA**: 2-5 minutes from last push (64201bc)
**Next Check**: Test analytics endpoint after deploy window
