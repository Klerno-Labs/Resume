# Migration Guide: Server Directory Cleanup

**Date**: December 25, 2025
**Purpose**: Guide for archiving legacy Express server code
**Estimated Time**: 2-3 hours
**Risk Level**: Low (server/ not used in production)

---

## 🎯 Migration Overview

### What We're Doing

Moving from a **dual-architecture** (Express + Serverless) to **pure serverless** architecture:

```
BEFORE:
├── api/          (Vercel serverless - PRODUCTION)
├── server/       (Express - NOT USED)
└── shared/

AFTER:
├── api/          (Vercel serverless - PRODUCTION)
├── shared/
└── archive/
    └── server-express-legacy/
```

### Why This Migration

1. **Eliminate Confusion**: Single source of truth
2. **Remove Outdated Code**: server/ has critical bugs we already fixed in api/
3. **Reduce Maintenance**: -23 files, -500+ lines of code
4. **Improve Onboarding**: Clear what's used in production
5. **Prevent Bugs**: No risk of referencing broken server/ code

---

## 📋 Pre-Migration Checklist

### Verify Current State ✅

```bash
# 1. Confirm production uses api/ only
grep -r "from.*server/" api/ --include="*.ts"
# Should return: (no matches)

# 2. Check package.json for server/ references
grep "server/" package.json
# Expected:
#   "db:migrate": "tsx server/db/migrate.ts"
#   "worker": "node server/worker/processor.ts"

# 3. Verify server/README.md documents "NOT USED"
cat server/README.md
# Should contain: "NOT USED IN PRODUCTION"

# 4. Check last commit to server/
git log --oneline -1 -- server/
# Should show: December 8 or earlier (17+ days ago)

# 5. Test current migrations work
npm run db:migrate
# Should complete successfully
```

### Backup Current State ✅

```bash
# Create a branch for this migration
git checkout -b migration/archive-server-directory
git push -u origin migration/archive-server-directory

# Tag current state
git tag pre-server-archive
git push origin pre-server-archive

# Optional: Create full backup
tar -czf backup-server-$(date +%Y%m%d).tar.gz server/
```

---

## 🚀 Migration Steps

### Step 1: Create Archive Directory

```bash
# Create archive directory structure
mkdir -p archive/server-express-legacy

# Add README to archive
cat > archive/README.md << 'EOF'
# Archive Directory

This directory contains legacy code that has been archived but preserved for reference.

## Contents

- **server-express-legacy/**: Original Express server implementation (archived Dec 25, 2025)
  - NOT USED IN PRODUCTION
  - Replaced by Vercel serverless functions in api/
  - Contains outdated code with known bugs
  - Preserved for reference only

## Restoring Archived Code

If you need to reference archived code:

```bash
# View archived files
ls -la archive/server-express-legacy/

# Compare with current implementation
diff archive/server-express-legacy/lib/processResume.ts api/lib/processResume.ts
```

Do NOT use archived code directly - it contains outdated patterns and bugs.
EOF

git add archive/README.md
git commit -m "docs: add archive directory documentation"
```

### Step 2: Move Database Migrations

```bash
# Create api/db directory
mkdir -p api/db

# Copy migration file
cp server/db/migrate.ts api/db/migrate.ts

# Update import paths in api/db/migrate.ts
# Change any server/ imports to use api/ or shared/

# Test migration works from new location
DATABASE_URL=$DATABASE_URL tsx api/db/migrate.ts

# Update package.json
# Change: "db:migrate": "tsx server/db/migrate.ts"
# To:     "db:migrate": "tsx api/db/migrate.ts"

# Test via npm script
npm run db:migrate

# Commit the change
git add api/db/migrate.ts package.json
git commit -m "feat: move database migrations to api/db

Moved from server/db/migrate.ts to api/db/migrate.ts
to consolidate all production code in api/ directory."
```

### Step 3: Check Worker Script

```bash
# Determine if worker is actually used
grep -r "processor.ts" . --include="*.json" --include="*.yaml" --include="*.yml"

# Check Vercel cron jobs
cat vercel.json 2>/dev/null | grep -i "cron\|worker"

# If worker IS used:
mkdir -p api/worker
cp server/worker/processor.ts api/worker/processor.ts
# Update package.json to reference api/worker/processor.ts

# If worker is NOT used:
# Just archive it with the rest of server/
```

### Step 4: Archive Server Directory

```bash
# Move server directory to archive
git mv server archive/server-express-legacy

# Commit the archive
git commit -m "chore: archive legacy Express server implementation

The server/ directory contained the original Express server
implementation that is NOT USED IN PRODUCTION.

Key issues with server/ code:
- server/lib/processResume.ts: Contains old module-load initialization bug
- server/lib/fileParser.ts: Exact duplicate of api/lib/fileParser.ts
- server/lib/db.ts: Outdated version missing lazy initialization

Production runs entirely on Vercel serverless functions (api/).

Database migrations moved to api/db/migrate.ts and continue to work.

Archived to:
- Preserve code history
- Clean up main codebase
- Eliminate confusion about what's used in production
- Prevent accidental use of buggy server/ code

See archive/README.md for details."
```

### Step 5: Update Documentation

```bash
# Update README.md to remove server references
# Update ARCHITECTURE.md to reflect pure serverless architecture
# Update SETUP.md to remove server setup steps

# Commit documentation updates
git add README.md ARCHITECTURE.md SETUP.md
git commit -m "docs: update documentation to reflect serverless-only architecture"
```

### Step 6: Clean Up Configuration

```bash
# Update tsconfig.json if needed
# Remove server/** from include/exclude if present

# Update .gitignore if needed
# May want to add: archive/**/node_modules/

# Commit configuration updates
git add tsconfig.json .gitignore
git commit -m "chore: update configuration for serverless-only architecture"
```

---

## ✅ Post-Migration Verification

### Verify Everything Still Works

```bash
# 1. TypeScript compilation
npm run check
# Expected: 0 errors

# 2. Build succeeds
npm run build
# Expected: Successful build in < 10 seconds

# 3. Migrations work
npm run db:migrate
# Expected: Migrations apply successfully

# 4. All tests pass (when implemented)
npm run test
# Expected: All tests pass

# 5. Development server runs
npm run dev
# Expected: Server starts on port 5174

# 6. Production deployment works
git push origin migration/archive-server-directory
# Expected: Vercel deploys successfully
```

### Verify No Broken Imports

```bash
# Check for any lingering server/ imports
grep -r "from.*server/" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=archive

# Should return: (no matches)

# Check for any server/ references in config files
grep -r "server/" package.json tsconfig.json vercel.json .gitignore

# Expected: Only in archive/ references, no active paths
```

### Test Critical User Flows

**Upload Flow**:
```bash
# 1. Navigate to https://rewriteme.app/ai-resume-builder
# 2. Login
# 3. Upload a test resume
# 4. Verify processing completes
# 5. Check results appear in editor
```

**Authentication**:
```bash
# 1. Logout
# 2. Login again
# 3. Verify session persists
```

**API Health**:
```bash
curl https://rewriteme.app/api/health
# Expected: {"status":"ok", ...}
```

---

## 🔄 Rollback Procedure

### If Migration Causes Issues

**Option 1: Revert Git Commits**

```bash
# Find the commit before migration
git log --oneline | grep "pre-migration"

# Revert to that commit
git revert HEAD~3..HEAD  # Adjust number based on commits

# Push revert
git push origin migration/archive-server-directory
```

**Option 2: Use Git Tag**

```bash
# Reset to pre-migration tag
git checkout pre-server-archive

# Create new branch from tag
git checkout -b rollback/restore-server
git push origin rollback/restore-server
```

**Option 3: Restore from Backup**

```bash
# Extract backup
tar -xzf backup-server-YYYYMMDD.tar.gz

# Restore files
git checkout main
git checkout -b restore/server-directory
# Manually restore files
git add server/
git commit -m "restore: bring back server directory"
```

---

## 📊 Expected Impact

### Code Metrics

**Before Migration**:
```
Total Files: ~150
Lines of Code: 12,896
Active Directories: api/, server/, shared/, client/
```

**After Migration**:
```
Total Files: ~127 (-23 files)
Lines of Code: ~12,400 (-500 lines)
Active Directories: api/, shared/, client/
Archived: archive/server-express-legacy/
```

### Build Performance

**Expected**: No change (server/ wasn't in build path)

### Documentation Clarity

**Before**: Confusion about which files are used
**After**: Clear that api/ is production code

### Maintenance Burden

**Before**: Must maintain duplicate code in api/ and server/
**After**: Single source of truth in api/

---

## 🎯 Success Criteria

Migration is successful when:

- ✅ Build completes with 0 errors
- ✅ TypeScript compilation succeeds
- ✅ Database migrations work
- ✅ No imports from server/ in active code
- ✅ Vercel deployment succeeds
- ✅ API health check returns OK
- ✅ Upload flow works end-to-end
- ✅ Authentication works
- ✅ All production features functional
- ✅ No increase in error rate
- ✅ Team understands new structure

---

## 📝 Communication Plan

### Before Migration

**Team Notification** (Slack/Email):
```
📢 Upcoming Change: Server Directory Archive

What: Moving server/ to archive/server-express-legacy/
When: [Date/Time]
Why: Clean up outdated Express code not used in production
Impact: None - server/ already not used
Duration: ~2 hours

Questions? Reply to this thread or DM [Your Name]
```

### During Migration

**Status Updates**:
- Start: "🚀 Starting server directory migration"
- After each step: "✅ Step X complete"
- Issues: "⚠️ Issue encountered, investigating..."
- Complete: "🎉 Migration complete, testing now"

### After Migration

**Completion Notice**:
```
✅ Server Directory Migration Complete

Changes:
- server/ moved to archive/server-express-legacy/
- Database migrations now at api/db/migrate.ts
- All tests passing
- Deployment successful

Impact:
- No production impact
- Cleaner codebase structure
- Single source of truth (api/ directory)

See MIGRATION_GUIDE.md for details
```

---

## 🔍 Troubleshooting

### Issue: Build Fails After Migration

**Symptoms**: TypeScript errors, missing modules
**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist/ .vite/

# Rebuild
npm run build
```

### Issue: Migrations Don't Work

**Symptoms**: `npm run db:migrate` fails
**Solution**:
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test direct execution
tsx api/db/migrate.ts

# Check import paths in migrate.ts
# Ensure no server/ imports remain
grep "server/" api/db/migrate.ts
```

### Issue: Vercel Deployment Fails

**Symptoms**: Deployment errors in Vercel dashboard
**Solution**:
```bash
# Check vercel.json for server/ references
cat vercel.json | grep "server/"

# Redeploy
vercel --prod

# Check deployment logs
vercel logs
```

### Issue: Import Errors

**Symptoms**: "Cannot find module" errors
**Solution**:
```bash
# Find all server/ imports
grep -r "from.*server/" . --include="*.ts" --exclude-dir=node_modules --exclude-dir=archive

# Update to use api/ or shared/
# Example:
# from '../../server/lib/db' → from '../lib/db'
```

---

## 📚 Reference: File Mapping

### Files Moved to Archive

| Original Path | Archived To |
|---------------|-------------|
| server/lib/processResume.ts | archive/server-express-legacy/lib/processResume.ts |
| server/lib/fileParser.ts | archive/server-express-legacy/lib/fileParser.ts |
| server/lib/db.ts | archive/server-express-legacy/lib/db.ts |
| server/db/migrate.ts | **MOVED to api/db/migrate.ts** |
| (all other server files) | archive/server-express-legacy/ |

### Equivalent Files in api/

| Archived File | Use This Instead |
|---------------|------------------|
| server/lib/processResume.ts | api/lib/processResume.ts ✅ |
| server/lib/fileParser.ts | api/lib/fileParser.ts ✅ |
| server/lib/db.ts | api/lib/db.ts ✅ |
| server/lib/openai.ts | api/lib/openai.ts ✅ |

---

## ✨ Benefits After Migration

### Developer Experience

**Before**:
- "Which processResume.ts should I edit?"
- "Is server/ code used in production?"
- "Why are there two versions of this file?"

**After**:
- "Edit api/lib/processResume.ts"
- "api/ is production code"
- "One version, one source of truth"

### Code Quality

**Before**:
- Duplicate code in server/ and api/
- Outdated code with critical bugs
- Confusion about what's maintained

**After**:
- Single source of truth
- All code up to date
- Clear ownership and maintenance

### Onboarding

**Before**: 30 minutes explaining server/ vs api/
**After**: 5 minutes - "everything in api/ is production code"

---

## 📅 Timeline

### Recommended Schedule

**Week 1: Preparation**
- Day 1: Review this migration guide
- Day 2: Run pre-migration checklist
- Day 3: Create backups and git tags
- Day 4: Team notification
- Day 5: Questions and concerns

**Week 2: Execution**
- Monday: Execute migration (low-traffic time)
- Tuesday: Monitor and verify
- Wednesday: Documentation updates
- Thursday: Team training
- Friday: Post-migration review

---

**Migration Guide Version**: 1.0
**Last Updated**: December 25, 2025
**Estimated Completion**: 2-3 hours
**Risk Level**: Low
**Rollback Available**: Yes
