# Production Deployment Checklist

**Last Updated**: December 25, 2025
**Use this checklist for every production deployment**

---

## 📋 Pre-Deployment Checklist

### Code Quality ✅

- [ ] **No TypeScript errors**
  ```bash
  npm run check
  # Should complete with 0 errors
  ```

- [ ] **Build succeeds**
  ```bash
  npm run build
  # Should complete in < 10 seconds
  # Check for warnings about bundle size
  ```

- [ ] **Linting passes**
  ```bash
  npm run lint
  # Max warnings acceptable: 1000 (currently configured)
  ```

- [ ] **Code formatted**
  ```bash
  npm run format:check
  # Or run: npm run format
  ```

### Testing ✅

- [ ] **Unit tests pass** (when implemented)
  ```bash
  npm run test
  ```

- [ ] **Integration tests pass** (when implemented)
  ```bash
  npm run test:integration
  ```

- [ ] **E2E tests pass** (when implemented)
  ```bash
  npm run test:e2e
  ```

### Manual Testing ✅

- [ ] **Upload flow works**
  - Login to https://rewriteme.app/ai-resume-builder
  - Upload a test resume (PDF or DOCX)
  - Verify progress tracking works (0-100%)
  - Wait for processing to complete
  - Verify results appear in editor

- [ ] **Authentication works**
  - Register new account
  - Login with existing account
  - Logout
  - Password reset (if implemented)

- [ ] **Payment flow works** (if applicable)
  - Navigate to pricing page
  - Click upgrade button
  - Complete Stripe checkout
  - Verify credits updated

### Environment Variables ✅

- [ ] **All required variables set in Vercel**
  ```
  DATABASE_URL          ✅
  JWT_SECRET            ✅
  OPENAI_API_KEY        ✅
  STRIPE_SECRET_KEY     ✅
  STRIPE_WEBHOOK_SECRET ✅
  NODE_ENV=production   ✅
  ```

- [ ] **Verify via Vercel dashboard**
  ```bash
  vercel env ls
  ```

### Database ✅

- [ ] **Migrations applied**
  ```bash
  # Check latest migration
  SELECT * FROM migrations ORDER BY created_at DESC LIMIT 1;
  ```

- [ ] **Indexes exist**
  ```sql
  SELECT indexname, tablename
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename IN ('users', 'resumes', 'payments');
  ```

- [ ] **Backup recent** (recommended)
  - Check Neon dashboard for latest backup
  - Verify backup is < 24 hours old

### Security ✅

- [ ] **No secrets in code**
  ```bash
  # Search for potential secrets
  grep -r "sk-" client/ api/ --exclude-dir=node_modules
  grep -r "password" client/ api/ --exclude-dir=node_modules --include="*.ts"
  ```

- [ ] **CORS configured correctly**
  - Check api endpoints have proper CORS headers
  - Verify allowed origins list

- [ ] **JWT_SECRET is strong**
  - Should be 32+ characters
  - Random, not guessable

---

## 🚀 Deployment Steps

### Step 1: Create Feature Branch ✅

```bash
# Create branch from main
git checkout main
git pull origin main
git checkout -b release/v2.x.x

# Make your changes...
# Commit with clear messages
git add .
git commit -m "feat: description of changes"
```

### Step 2: Test Locally ✅

```bash
# Run all checks
npm run check
npm run build
npm run lint

# Test manually
npm run dev
# Visit http://localhost:5174
# Test upload flow end-to-end
```

### Step 3: Create Pull Request ✅

```bash
# Push to GitHub
git push origin release/v2.x.x

# Create PR via GitHub UI
# - Add description of changes
# - Link to related issues
# - Request review from team
# - Wait for CI/CD to pass
```

### Step 4: Review & Merge ✅

- [ ] **Code review approved**
- [ ] **CI/CD passing** (GitHub Actions or Vercel checks)
- [ ] **No merge conflicts**
- [ ] **Branch up to date with main**

```bash
# Merge PR via GitHub UI
# Or locally:
git checkout main
git merge release/v2.x.x
git push origin main
```

### Step 5: Automatic Deployment ✅

**Vercel auto-deploys when you push to main**

- [ ] Watch deployment progress in Vercel dashboard
- [ ] Wait for "Ready" status (usually 1-2 minutes)
- [ ] Note deployment URL

### Step 6: Verify Deployment ✅

```bash
# Check API health
curl https://rewriteme.app/api/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2025-12-25T...",
#   "env": {
#     "hasDatabase": true,
#     "hasJwt": true,
#     "hasOpenAI": true,
#     "hasStripe": true
#   }
# }
```

- [ ] **API health check returns OK**
- [ ] **Website loads**: https://rewriteme.app
- [ ] **AI Builder works**: https://rewriteme.app/ai-resume-builder
- [ ] **No JavaScript console errors**

### Step 7: Smoke Test Production ✅

**Critical User Journeys**:

1. **Upload Flow**
   - [ ] Navigate to AI Resume Builder
   - [ ] Login (or use existing session)
   - [ ] Upload test resume
   - [ ] Verify processing completes
   - [ ] Check results appear

2. **Authentication**
   - [ ] Logout
   - [ ] Login again
   - [ ] Verify session persists

3. **Payment** (if changes affect payment)
   - [ ] View pricing page
   - [ ] Initiate checkout
   - [ ] Complete test payment (use Stripe test mode)

### Step 8: Monitor Logs ✅

```bash
# Watch logs for first 5-10 minutes
vercel logs https://rewriteme.app --follow

# Look for:
# - Any errors or warnings
# - Successful uploads
# - Processing completions
# - User activity
```

### Step 9: Update Documentation ✅

- [ ] **Update CHANGES.md** with release notes
- [ ] **Update version number** in package.json (if applicable)
- [ ] **Create GitHub release** with changelog
- [ ] **Update documentation** if API or features changed

---

## 🔄 Rollback Procedure

### If Deployment Has Issues:

**Option 1: Rollback via Vercel Dashboard**
1. Go to Vercel dashboard
2. Find previous "Ready" deployment
3. Click "Promote to Production"

**Option 2: Rollback via CLI**
```bash
# List recent deployments
vercel ls

# Promote previous deployment
vercel promote <previous-deployment-url>
```

**Option 3: Git Revert**
```bash
# Revert the problematic commit
git revert HEAD
git push origin main

# Vercel will auto-deploy the revert
```

### After Rollback:

- [ ] Notify team in Slack/Discord
- [ ] Document issue in GitHub issue
- [ ] Create post-mortem (for major issues)
- [ ] Fix issue in new branch
- [ ] Test thoroughly before re-deploying

---

## 📊 Post-Deployment Monitoring

### First Hour After Deployment

**Monitor**:
- [ ] Error rate (should be < 0.5%)
- [ ] API response times (p95 < 500ms)
- [ ] Upload success rate (should be > 99%)
- [ ] User activity patterns
- [ ] Any spike in errors or warnings

**Tools**:
- Vercel dashboard (Analytics tab)
- Vercel logs (Runtime logs)
- Sentry (when implemented)
- Database monitoring (Neon dashboard)

### First 24 Hours After Deployment

**Check**:
- [ ] No increase in error rate
- [ ] Performance metrics stable
- [ ] User feedback (support tickets, emails)
- [ ] Database performance
- [ ] API quota usage (OpenAI, Stripe)

### First Week After Deployment

**Review**:
- [ ] Overall system health
- [ ] Feature adoption (if new feature)
- [ ] User feedback and bug reports
- [ ] Performance trends
- [ ] Cost impacts (API usage, infrastructure)

---

## 🚨 Incident Response

### If Critical Issue Detected:

**Severity 1 (Critical - System Down)**:
1. **Immediate**: Rollback to last known good deployment
2. **Notify**: Alert team in #incidents channel
3. **Investigate**: Check logs, database, external services
4. **Fix**: Create hotfix branch
5. **Deploy**: Fast-track through testing
6. **Document**: Write post-mortem

**Severity 2 (High - Feature Broken)**:
1. **Assess**: Determine impact (how many users?)
2. **Decide**: Rollback vs hotfix
3. **Communicate**: Notify affected users if needed
4. **Fix**: Standard process or hotfix
5. **Deploy**: Within 24 hours

**Severity 3 (Medium - Minor Issue)**:
1. **Document**: Create GitHub issue
2. **Prioritize**: Add to sprint backlog
3. **Fix**: In next regular deployment
4. **Communicate**: Include in release notes

---

## ✅ Deployment Success Criteria

### All Must Be True:

- ✅ **API health check returns 200 OK**
- ✅ **Website loads without errors**
- ✅ **Upload flow works end-to-end**
- ✅ **Authentication works**
- ✅ **No critical errors in logs**
- ✅ **Database queries performing well**
- ✅ **All environment variables set**
- ✅ **No increase in error rate**

### Performance Targets:

- ✅ **Build time**: < 10 seconds
- ✅ **Deploy time**: < 2 minutes
- ✅ **API p95**: < 500ms
- ✅ **Page load (LCP)**: < 2.5 seconds
- ✅ **Error rate**: < 0.5%

---

## 📝 Deployment Log Template

**Copy and fill out for each deployment**:

```
## Deployment: YYYY-MM-DD HH:MM

### Changes
- Feature/fix 1: Description
- Feature/fix 2: Description
- Bug fix: Description

### Pre-Deployment Checklist
- [x] Build passed
- [x] Tests passed
- [x] Manual testing completed
- [x] Environment variables verified
- [x] Database migrations applied

### Deployment
- Branch: main
- Commit: abc123def
- Vercel URL: https://resume-repairer-xxxx.vercel.app
- Deployment time: 1m 32s

### Post-Deployment Verification
- [x] API health check OK
- [x] Website loads
- [x] Upload flow tested
- [x] Logs checked (no errors)

### Monitoring (First Hour)
- Error rate: 0.1% ✅
- API p95: 420ms ✅
- Upload success: 100% ✅
- User activity: Normal ✅

### Issues Detected
- None

### Rollback Required
- No

### Notes
- Deployment successful
- All systems nominal
```

---

## 🔐 Security Checklist (For Major Releases)

### Before Major Production Release:

- [ ] **Security audit completed**
  - Check for XSS vulnerabilities
  - Verify SQL injection prevention
  - Review authentication logic
  - Check for exposed secrets

- [ ] **Dependencies updated**
  ```bash
  npm audit
  npm audit fix
  ```

- [ ] **HTTPS enforced**
  - All endpoints use HTTPS
  - No mixed content warnings

- [ ] **Rate limiting active**
  - Vercel provides automatic rate limiting
  - Consider additional per-user limits

- [ ] **Input validation**
  - File upload size limits (10MB)
  - File type validation
  - SQL parameterization
  - JWT validation

---

## 📞 Emergency Contacts

### If Deployment Goes Wrong:

**Technical Team**:
- Tech Lead: [Name] - [Email/Phone]
- DevOps: [Name] - [Email/Phone]
- On-call: [Name] - [Email/Phone]

**External Services**:
- Vercel Support: https://vercel.com/support
- Neon Support: support@neon.tech
- OpenAI Status: https://status.openai.com
- Stripe Status: https://status.stripe.com

---

## ✨ Best Practices

### Do's ✅

- ✅ Deploy during low-traffic hours (if possible)
- ✅ Keep deployments small and frequent
- ✅ Test thoroughly before deploying
- ✅ Monitor logs after deployment
- ✅ Document all changes
- ✅ Communicate with team
- ✅ Have rollback plan ready

### Don'ts ❌

- ❌ Deploy on Friday afternoon (hard to rollback over weekend)
- ❌ Deploy multiple large features at once
- ❌ Skip testing to "save time"
- ❌ Ignore warnings in build output
- ❌ Deploy without reviewing changes
- ❌ Forget to backup database
- ❌ Panic if something goes wrong (rollback exists)

---

**Checklist Version**: 1.0
**Last Updated**: December 25, 2025
**Next Review**: January 2026
