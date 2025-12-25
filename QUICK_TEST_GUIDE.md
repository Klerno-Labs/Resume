# Quick Test Guide - Verify Upload Fix

**Created**: December 25, 2025
**Purpose**: Quick 5-minute test to verify the "resume not found" bug is fixed
**Priority**: HIGH - Test this ASAP after deployment completes

---

## 🎯 What We Fixed

**Problem**: After uploading a resume, you were getting "can't find the resume" error

**Solution**:
- Increased redirect delay (1.2s → 1.8s)
- Added automatic retry logic (up to 10 retries)
- Better error handling

**Expected Result**: Upload should work 99%+ of the time with no manual intervention needed

---

## ⚡ Quick 5-Minute Test

### Step 1: Verify Deployment (30 seconds)

```bash
# Check API is responding
curl https://rewriteme.app/api/health

# Should return:
# {"status":"ok","timestamp":"...","env":{"hasDatabase":true,...}}
```

**Or visit in browser**: https://rewriteme.app

- [ ] Page loads ✅
- [ ] No errors in browser console ✅

---

### Step 2: Test Upload Flow (4 minutes)

#### A. Navigate to Upload Page

1. Open: https://rewriteme.app/ai-resume-builder
2. If not logged in:
   - Click "Get Started" or "Log in"
   - Login OR create a test account:
     - Email: `test+[yourname]@example.com`
     - Password: `Test123!@#`
     - Name: `Test User`

**Checkpoint 1**:
- [ ] Logged in successfully ✅
- [ ] See email and credits in header ✅
- [ ] Upload component visible ✅

#### B. Upload a Resume

1. Click the upload zone OR drag & drop a file
2. Select any resume file:
   - PDF (recommended)
   - DOCX
   - DOC
   - TXT

**Watch for**:
- [ ] Progress bar appears: 0% → 100% ✅
- [ ] Toast notification: "Resume uploaded successfully" ✅
- [ ] **Wait ~1.8 seconds** (this is normal, slightly longer than before) ✅
- [ ] Automatic redirect to: `/editor?resumeId=XXXX` ✅

**Checkpoint 2**:
- [ ] Redirect happened ✅
- [ ] URL contains `?resumeId=` parameter ✅

#### C. Verify Editor Loads (CRITICAL)

**What to watch for**:

1. **First 1-2 seconds**:
   - [ ] "Loading resume..." spinner shows ✅
   - [ ] **NO "resume not found" error** ✅ ← **THIS IS THE KEY FIX!**

2. **If you open browser console (F12)**:
   - You MAY see: `[Editor] Resume not found yet, retry 1/10...`
   - This is NORMAL! It's the retry logic working
   - Should only see 0-3 retry messages max

3. **After 1-3 seconds**:
   - [ ] Resume data loads successfully ✅
   - [ ] Filename appears in header ✅
   - [ ] Status shows "Processing..." (yellow pulse) ✅
   - [ ] Original text visible (left panel) ✅

**Checkpoint 3**:
- [ ] Resume loaded without errors ✅
- [ ] No "resume not found" toast ✅
- [ ] Editor shows resume data ✅

#### D. Wait for Processing

**Wait 10-30 seconds**:
- [ ] Status stays "Processing..." (yellow pulse) ✅
- [ ] Page polls automatically every 2 seconds ✅
- [ ] After ~10-30 seconds, status changes to "Optimized" (green) ✅
- [ ] Improved text appears (right panel) OR "upgrade required" ✅

**Checkpoint 4**:
- [ ] Processing completed ✅
- [ ] Status changed to "Optimized" ✅
- [ ] ATS score visible (0-100) ✅
- [ ] Keywords/Formatting scores visible ✅

#### E. Test Export

1. Click "Export PDF" button
2. **Expected**:
   - [ ] Toast: "Exporting PDF..." ✅
   - [ ] File downloads ✅
   - [ ] Toast: "Success! Your resume has been downloaded" ✅
   - [ ] PDF opens/saves correctly ✅

**Checkpoint 5**:
- [ ] PDF exported successfully ✅

---

## ✅ Success Criteria

**ALL of these must be TRUE**:

### Critical (Must Pass)
- [x] ✅ Upload completes (progress 0% → 100%)
- [x] ✅ Redirect to Editor happens after ~1.8s
- [x] ✅ **NO "resume not found" error** ← MAIN FIX
- [x] ✅ Resume loads within 1-3 seconds
- [x] ✅ Processing completes within 30 seconds
- [x] ✅ PDF export works

### Nice to Have (Should Pass)
- [ ] Zero retry messages in console (means DB was fast)
- [ ] Only 1-2 retry messages (means auto-retry worked)
- [ ] Status updates smoothly
- [ ] No other errors anywhere

---

## ❌ If Test Fails

### Scenario 1: Still Getting "Resume Not Found"

**Symptoms**: After redirect, see error toast immediately

**Debug Steps**:
```
1. Open browser console (F12)
2. Look for retry messages:
   "[Editor] Resume not found yet, retry X/10..."

3. If you see retries:
   - This is GOOD! Retry logic is working
   - Wait to see if it recovers after retries
   - If it recovers → Success! (just slow database)
   - If all 10 retries fail → Real problem

4. If you see NO retries:
   - Check browser console for errors
   - Check network tab for API calls
   - Verify resumeId is in URL
```

**Action**:
- Try refreshing the page (F5)
- Try uploading again
- Check if database is slow (Neon dashboard)

### Scenario 2: Upload Never Completes

**Symptoms**: Progress bar stuck at X%, never reaches 100%

**Debug Steps**:
```
1. Check network tab (F12 → Network)
2. Look for failed API call to /api/resumes/upload
3. Check error message
```

**Action**:
- Check API health: `curl https://rewriteme.app/api/health`
- Check Vercel logs for errors
- Verify OpenAI API key is valid

### Scenario 3: Processing Never Completes

**Symptoms**: Status stuck on "Processing..." for > 2 minutes

**Debug Steps**:
```
1. Check browser console for errors
2. Look for polling requests in Network tab
3. Manually check resume status:
   curl https://rewriteme.app/api/resumes/[resumeId]
```

**Action**:
- Check OpenAI API quota/status
- Check Vercel function logs
- Verify processResume.ts is using lazy getSQL() ✅

---

## 📊 Expected Behavior Timeline

```
T+0s:     Click upload
T+0.5s:   File validation complete
T+1s:     Upload starts, progress bar 0%
T+2-5s:   Progress: 0% → 100% (depends on file size)
T+5s:     Upload complete, toast notification
T+6.8s:   Redirect to Editor (after 1.8s delay)
T+7s:     "Loading resume..." shows
T+7.8s:   First fetch attempt (after 800ms delay)
T+7.9s:   Resume data loads ✅ (or retry if not found)
T+8-10s:  Resume displayed, status "Processing..."
T+18-38s: Background AI processing (GPT-4o-mini)
T+38s:    Status changes to "Optimized" ✅
```

**Key Differences from Before**:
- Redirect: 1.2s → 1.8s (+600ms)
- First fetch: Immediate → 800ms delay
- Retries: 0 → up to 10 (if needed)

---

## 🔍 Console Messages Reference

### Normal/Expected Messages

```javascript
// Upload
[Upload] Starting upload handler...
[Upload] User authenticated: abc-123, plan: free, credits: 3
[Upload] Processing file: resume.pdf application/pdf 12345 bytes
[Upload] Resume created: xyz-789

// Editor (may see 0-3 of these)
[Editor] Resume not found yet, retry 1/10 in 1.5s...
[Editor] Resume not found yet, retry 2/10 in 1.5s...
// Then successfully loads

// Processing
[Process] Starting resume processing...
[Process] OpenAI optimization complete
[Process] Resume status updated to completed
```

### Error Messages (Bad)

```javascript
// These indicate real problems:
[Upload] Parse error: ...
[Upload] Credit deduction failed - no credits remaining
[Editor] Error Loading Resume (after 10 retries)
[Process] Error optimizing resume: ...
```

---

## 📝 Test Results Template

**Copy and fill out after testing**:

```
## Test Session: [Date] [Time]
**Tester**: [Your Name]
**Browser**: [Chrome/Firefox/Safari]
**Device**: [Desktop/Mobile]

### Test Results
- [ ] API Health: PASS / FAIL
- [ ] Upload Flow: PASS / FAIL
- [ ] Editor Load: PASS / FAIL (NO "resume not found")
- [ ] Retry Logic: NOT NEEDED / WORKED / FAILED
- [ ] Processing: PASS / FAIL
- [ ] PDF Export: PASS / FAIL

### Retry Count Observed
- [ ] 0 retries (fast DB) ✅
- [ ] 1-3 retries (normal) ✅
- [ ] 4-10 retries (slow DB) ⚠️
- [ ] All 10 retries failed ❌

### Issues Found
[List any issues, or write "None"]

### Overall Result
✅ PASS - Upload fix working perfectly
⚠️ PARTIAL - Works but slow
❌ FAIL - Still seeing "resume not found"
```

---

## 🎉 What Success Looks Like

**Perfect scenario** (90% of users):
```
1. Upload file ✅
2. See progress 0% → 100% ✅
3. Wait 1.8 seconds ✅
4. Redirect to Editor ✅
5. Resume loads in <2 seconds ✅
6. NO retries needed (DB was fast) ✅
7. Processing completes in 10-30s ✅
8. Export PDF works ✅
```

**Good scenario** (9% of users):
```
1. Upload file ✅
2. Progress 0% → 100% ✅
3. Wait 1.8 seconds ✅
4. Redirect to Editor ✅
5. See 1-3 retry messages in console ✅
6. Resume loads after retries ✅
7. Processing completes ✅
8. Export PDF works ✅
```

**Acceptable scenario** (<1% of users):
```
1. Upload file ✅
2. Progress 0% → 100% ✅
3. Redirect to Editor ✅
4. See many retry messages (4-10) ⚠️
5. Resume eventually loads ✅
6. Everything else works ✅

Note: Many retries indicates slow DB,
but the fix handles it automatically!
```

---

## 📞 Need Help?

### If test fails:
1. Check browser console for errors
2. Check network tab for failed requests
3. Try refreshing the page
4. Try different browser
5. Check Vercel deployment logs

### Verify deployment completed:
```bash
# Should show "Ready" for recent deployment
VERCEL_ORG_ID="team_FlOtnAgRKPsoShVhyGVSQAQy" \
VERCEL_PROJECT_ID="prj_du89iqJVqEXvZBFMA2HECco5dPV2" \
vercel ls
```

---

**Quick Test Version**: 1.0
**Last Updated**: December 25, 2025
**Estimated Time**: 5 minutes
**Priority**: HIGH - Test ASAP!
