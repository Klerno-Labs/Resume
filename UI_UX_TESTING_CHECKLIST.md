# UI/UX Testing Checklist - Complete Verification

**Date**: December 25, 2025
**Purpose**: Verify all buttons, tabs, and user flows work 100%
**Status**: Ready for testing after deployment

---

## 🎯 Critical User Flows

### Flow 1: New User Upload Journey ⭐⭐⭐

**Start**: https://rewriteme.app

#### Step 1: Landing Page
- [ ] Page loads without errors
- [ ] Hero section visible
- [ ] "Get Started" button clickable
- [ ] Navigation links work:
  - [ ] Features (scrolls to #features)
  - [ ] AI Builder (links to /ai-resume-builder)
  - [ ] Pricing (scrolls to #pricing)
  - [ ] Success Stories (scrolls to #testimonials)

#### Step 2: Navigate to AI Builder
- [ ] Click "AI Builder" in nav OR "Get Started" button
- [ ] Redirects to /auth (if not logged in)
- [ ] Auth page loads correctly

#### Step 3: Registration
- [ ] Registration form visible
- [ ] Email input works
- [ ] Password input works
- [ ] Name input works
- [ ] "Sign Up" button clickable
- [ ] Submit form → creates account
- [ ] Success: Redirects to /ai-resume-builder
- [ ] Cookie set (token in httpOnly cookie)

#### Step 4: Upload Resume
- [ ] File upload component visible
- [ ] Drag & drop zone responsive
- [ ] Click to upload works
- [ ] File browser opens
- [ ] Select PDF/DOCX/TXT file
- [ ] File validation works:
  - [ ] Accepts .pdf
  - [ ] Accepts .docx
  - [ ] Accepts .doc
  - [ ] Accepts .txt
  - [ ] Rejects .exe, .zip, etc.
- [ ] Progress bar appears (0-100%)
- [ ] Upload completes successfully
- [ ] Toast notification: "Resume uploaded"
- [ ] **Wait 1.8 seconds** (new timing)
- [ ] Redirect to /editor?resumeId=XXX

#### Step 5: Editor Page Loads
- [ ] URL has resumeId parameter
- [ ] "Loading resume..." shows initially
- [ ] **NEW: Automatic retries if not found**
- [ ] Resume data loads within 2-3 seconds
- [ ] No "resume not found" error ✅
- [ ] Status shows "Processing..."

#### Step 6: Wait for Processing
- [ ] Status indicator shows "Processing..." (yellow pulse)
- [ ] Page polls every 2 seconds
- [ ] After 10-30 seconds, status changes to "Optimized"
- [ ] Green indicator shows completion

#### Step 7: View Results
- [ ] ATS Score displayed (0-100)
- [ ] Keywords Score shown
- [ ] Formatting Score shown
- [ ] Issues list populated
- [ ] Original text visible (left panel)
- [ ] Improved text visible (right panel) OR "requires upgrade" message

**Expected Result**: ✅ Complete upload → processing → results flow works without errors

---

### Flow 2: Existing User Returns ⭐⭐

**Start**: https://rewriteme.app/ai-resume-builder

#### Step 1: Already Logged In
- [ ] Page loads
- [ ] User email shown in header
- [ ] Credits displayed
- [ ] "Dashboard" link visible
- [ ] "Log out" button visible

#### Step 2: Upload Another Resume
- [ ] Same upload flow as Flow 1, Step 4-7
- [ ] Credits decrease by 1 after upload
- [ ] All features work

#### Step 3: Access Dashboard
- [ ] Click "Dashboard" link
- [ ] Redirects to /editor
- [ ] If no resumeId in URL, shows previous resumes OR redirects to home

**Expected Result**: ✅ Returning users can upload easily

---

### Flow 3: Editor Page Features ⭐⭐⭐

**Start**: /editor?resumeId=XXX (after upload completes)

#### Header Section
- [ ] Resume filename displayed
- [ ] Status indicator (Processing/Optimized)
- [ ] Back arrow button → navigates to home
- [ ] "Cover Letter" button visible
- [ ] "Export PDF" button visible
  - [ ] Disabled while processing
  - [ ] Enabled when completed

#### Sidebar (Left Panel)
- [ ] Performance section visible
- [ ] ATS Score gauge displayed
  - [ ] Score 0-100 shown
  - [ ] Color coding (red/yellow/green)
- [ ] Keywords Score (0-10)
- [ ] Formatting Score (0-10)
- [ ] Critical Issues section
  - [ ] Issue count shown
  - [ ] Top 3 issues displayed
  - [ ] Each issue shows:
    - [ ] Type
    - [ ] Message
    - [ ] Severity (high/medium/low)
- [ ] "Re-Optimize with AI" button
  - [ ] Clickable
  - [ ] Shows processing state
  - [ ] Returns after 2 seconds (demo)

#### Tab Navigation
- [ ] Two tabs visible: "Resume Editor" and "Print Preview"
- [ ] "Resume Editor" tab selected by default
- [ ] Click "Print Preview" tab
  - [ ] Switches to preview mode
  - [ ] Shows formatted resume
- [ ] Click back to "Resume Editor"
  - [ ] Returns to comparison view

#### Resume Editor Tab
- [ ] Two-column layout (Before/After)
- [ ] Left panel: "Original Resume"
  - [ ] Original text displayed
  - [ ] Scrollable
  - [ ] Read-only
- [ ] Right panel: "Improved Resume"
  - [ ] Improved text displayed (if paid plan)
  - [ ] OR "Upgrade Required" message (if free)
  - [ ] Scrollable

#### Print Preview Tab
- [ ] Single column layout
- [ ] Styled resume preview
- [ ] Professional formatting
- [ ] Print-ready view
- [ ] Scrollable

#### Export PDF Button
- [ ] Click "Export PDF"
- [ ] Toast: "Exporting PDF..."
- [ ] File downloads
- [ ] Toast: "Success! Your resume has been downloaded"
- [ ] PDF opens/saves
- [ ] Free plan: Has watermark ✅
- [ ] Paid plan: No watermark ✅

#### Cover Letter Button
- [ ] Click "Cover Letter" button
- [ ] Dialog/Modal opens
- [ ] Job description input visible
- [ ] Tone selector (Professional/Casual/Enthusiastic/Formal)
- [ ] "Generate" button
- [ ] Can close modal

**Expected Result**: ✅ All editor features accessible and functional

---

### Flow 4: Authentication Flows ⭐

**Start**: https://rewriteme.app/auth

#### Login Tab
- [ ] "Login" tab selected by default
- [ ] Email input field
- [ ] Password input field
- [ ] "Log in" button
- [ ] Submit with valid credentials → success
- [ ] Redirects to /ai-resume-builder
- [ ] Token cookie set

#### Register Tab
- [ ] Click "Sign Up" tab (or similar)
- [ ] Registration form visible
- [ ] Email, password, name fields
- [ ] "Sign Up" button
- [ ] Submit → creates account
- [ ] Redirects to /ai-resume-builder
- [ ] Token cookie set

#### Error Handling
- [ ] Invalid email → shows error
- [ ] Wrong password → shows error
- [ ] Email already exists → shows error
- [ ] Weak password → shows error (if validation enabled)

#### Logout
- [ ] Click "Log out" button in header
- [ ] Cookie cleared
- [ ] Redirects to home page
- [ ] Nav shows "Log in" and "Get Started" again

**Expected Result**: ✅ Full auth flow works

---

### Flow 5: Pricing & Payment ⭐

**Start**: https://rewriteme.app/pricing OR https://rewriteme.app/#pricing

#### Pricing Section
- [ ] Three pricing tiers visible:
  - [ ] Free tier
  - [ ] Basic/Pro tier
  - [ ] Premium tier
- [ ] Each tier shows:
  - [ ] Price
  - [ ] Features list
  - [ ] "Get Started" or "Upgrade" button
- [ ] Click upgrade button → Stripe checkout
- [ ] Stripe modal/redirect opens
- [ ] Can complete test payment

#### Payment Success
- [ ] After payment, redirects to /payment-success
- [ ] Success message displayed
- [ ] Credits updated
- [ ] Plan upgraded

**Expected Result**: ✅ Payment flow functional (if Stripe configured)

---

### Flow 6: Duplicate Detection ⭐

**Start**: https://rewriteme.app/ai-resume-builder (logged in)

#### Test Duplicate Upload
- [ ] Upload a resume
- [ ] Wait for completion
- [ ] Upload THE SAME resume again
- [ ] Toast shows: "Duplicate Resume Detected"
- [ ] Error message: "You've already uploaded this exact resume"
- [ ] No redirect happens ✅
- [ ] Credits NOT deducted ✅
- [ ] Upload form resets
- [ ] Can upload a different file

**Expected Result**: ✅ Duplicate detection working, prevents wasted credits

---

### Flow 7: Admin User Features ⭐

**Start**: Login as admin user

#### Admin Privileges
- [ ] Credits show as "unlimited" or high number
- [ ] Upload resume → credits NOT deducted
- [ ] Upload duplicate → NO duplicate error (bypass)
- [ ] All features accessible
- [ ] Can upload unlimited times

**Expected Result**: ✅ Admin bypass working

---

## 🔘 Button-by-Button Check

### Home Page (/)
| Button/Link | Expected Action | Status |
|-------------|----------------|--------|
| Logo (top left) | Reload home page | [ ] |
| Features (nav) | Scroll to #features | [ ] |
| AI Builder (nav) | Navigate to /ai-resume-builder | [ ] |
| Pricing (nav) | Scroll to #pricing | [ ] |
| Success Stories (nav) | Scroll to #testimonials | [ ] |
| Log in (nav) | Navigate to /auth | [ ] |
| Get Started (nav) | Navigate to /auth | [ ] |
| Get Started (hero) | Navigate to /auth | [ ] |
| Try Free Analysis | Navigate to /auth | [ ] |
| See Pricing | Navigate to /pricing or scroll | [ ] |

### AI Resume Builder (/ai-resume-builder)
| Button/Link | Expected Action | Status |
|-------------|----------------|--------|
| Logo | Navigate to / | [ ] |
| Features | Navigate to /#features | [ ] |
| AI Builder | Stay on page | [ ] |
| Pricing | Navigate to /#pricing | [ ] |
| Success Stories | Navigate to /#testimonials | [ ] |
| Email (when logged in) | Show user info | [ ] |
| Dashboard | Navigate to /editor | [ ] |
| Log out | Logout + navigate to / | [ ] |
| Upload file | Open file browser | [ ] |
| Drag & drop zone | Accept dropped files | [ ] |

### Editor (/editor)
| Button/Link | Expected Action | Status |
|-------------|----------------|--------|
| Back arrow | Navigate to / | [ ] |
| Cover Letter | Open cover letter dialog | [ ] |
| Export PDF | Download PDF file | [ ] |
| Re-Optimize with AI | Start re-optimization | [ ] |
| Resume Editor tab | Show comparison view | [ ] |
| Print Preview tab | Show print preview | [ ] |

### Auth Page (/auth)
| Button/Link | Expected Action | Status |
|-------------|----------------|--------|
| Login tab | Show login form | [ ] |
| Sign Up tab | Show registration form | [ ] |
| Log in button | Submit login | [ ] |
| Sign Up button | Submit registration | [ ] |
| Forgot Password | Open forgot password flow | [ ] |

### Pricing Page (/pricing)
| Button/Link | Expected Action | Status |
|-------------|----------------|--------|
| Get Started (Free) | Navigate to /auth | [ ] |
| Upgrade (Basic) | Open Stripe checkout | [ ] |
| Upgrade (Pro) | Open Stripe checkout | [ ] |
| Upgrade (Premium) | Open Stripe checkout | [ ] |

---

## 🎨 Tab-by-Tab Check

### Editor Tabs
| Tab | Content | Functionality | Status |
|-----|---------|---------------|--------|
| Resume Editor | Before/After comparison | Shows original + improved | [ ] |
| Print Preview | Formatted resume | Shows styled output | [ ] |

### Auth Tabs
| Tab | Content | Functionality | Status |
|-----|---------|---------------|--------|
| Login | Login form | Email + password auth | [ ] |
| Sign Up | Registration form | Create new account | [ ] |

---

## 🧪 Edge Cases & Error Handling

### Upload Edge Cases
- [ ] Upload file > 10MB → Size limit error
- [ ] Upload unsupported format (.exe) → Type error
- [ ] Upload while not logged in → Auth error
- [ ] Upload with 0 credits → Credit error
- [ ] Cancel upload mid-progress → Cancels cleanly
- [ ] Upload same file twice → Duplicate detection

### Network Edge Cases
- [ ] Slow connection → Progress bar works
- [ ] Connection drops mid-upload → Error shown
- [ ] API timeout → Retry logic kicks in
- [ ] Database lag → **NEW: Automatic retries** ✅

### UI Edge Cases
- [ ] Very long resume text → Scrollable
- [ ] Resume with special characters → Renders correctly
- [ ] Empty resume → Handled gracefully
- [ ] Corrupted file → Parse error shown

---

## 📱 Responsive Design Check

### Mobile (< 768px)
- [ ] Navigation collapses to hamburger menu
- [ ] Upload component responsive
- [ ] Editor switches to single column
- [ ] Tabs stack vertically
- [ ] All buttons accessible
- [ ] Touch interactions work

### Tablet (768px - 1024px)
- [ ] Navigation responsive
- [ ] Editor layout adjusts
- [ ] Sidebar width appropriate
- [ ] All features accessible

### Desktop (> 1024px)
- [ ] Full layout visible
- [ ] Two-column editor
- [ ] Sidebar fixed width
- [ ] All features optimal

---

## ♿ Accessibility Check

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] Focus indicators visible

### Screen Reader
- [ ] Alt text on images
- [ ] ARIA labels on buttons
- [ ] Form labels properly associated
- [ ] Status messages announced

### Color Contrast
- [ ] Text readable on backgrounds
- [ ] Buttons have sufficient contrast
- [ ] Error states clearly visible

---

## 🔒 Security Checks

### Authentication
- [ ] Can't access /editor without login
- [ ] Can't upload without login
- [ ] Logout clears session
- [ ] Token expires after 7 days

### Data Privacy
- [ ] Users only see their own resumes
- [ ] Resume IDs not guessable
- [ ] API validates user ownership
- [ ] No data leakage in errors

---

## ⚡ Performance Checks

### Page Load Times
- [ ] Home page: < 2 seconds
- [ ] AI Builder: < 2 seconds
- [ ] Editor: < 3 seconds
- [ ] Auth: < 1 second

### Interactive Elements
- [ ] Buttons respond immediately (<100ms)
- [ ] Tabs switch instantly
- [ ] Upload progress updates smoothly
- [ ] No layout shifts (CLS < 0.1)

### API Response Times
- [ ] Health check: < 300ms
- [ ] Upload: < 2 seconds (1MB file)
- [ ] Get resume: < 500ms
- [ ] Auth: < 500ms

---

## 🐛 Known Issues to Verify Fixed

### Issue 1: Resume Not Found ✅ FIXED
- [x] After upload, Editor shows "resume not found"
- [x] Fix: Added retry logic + increased delays
- [x] Test: Upload → redirect → should load successfully

### Issue 2: Processing Never Completes
- [ ] Resume stuck in "processing" state
- [ ] Verify: processResume.ts uses lazy getSQL() ✅
- [ ] Test: Upload → wait 30s → should show "completed"

### Issue 3: Duplicate Detection
- [ ] Duplicate uploads not detected
- [ ] Verify: SHA-256 hashing working
- [ ] Test: Upload twice → second shows duplicate error

---

## 📊 Success Criteria

**All tests must pass before marking complete**:

### Critical (Must Pass)
- [ ] Upload flow works end-to-end (0 errors)
- [ ] Editor loads resume successfully (with retries)
- [ ] Processing completes within 30 seconds
- [ ] Export PDF downloads correctly
- [ ] Auth flows work (login/logout/register)
- [ ] Navigation links work
- [ ] All buttons clickable and functional

### Important (Should Pass)
- [ ] Duplicate detection working
- [ ] Admin bypass working
- [ ] Tabs switch correctly
- [ ] Responsive design works
- [ ] Error messages clear and helpful
- [ ] Performance meets targets

### Nice-to-Have (May Pass)
- [ ] Cover letter generation
- [ ] Payment flow (if Stripe configured)
- [ ] Re-optimize button
- [ ] Perfect accessibility

---

## 🎯 Testing Instructions

### Quick Smoke Test (5 minutes)
```
1. Open https://rewriteme.app
2. Click "Get Started"
3. Create test account: test+[timestamp]@example.com
4. Upload sample resume
5. Wait 2-3 seconds for redirect
6. Verify Editor loads without "resume not found" error ✅
7. Wait for processing (10-30s)
8. Verify status changes to "Optimized"
9. Click "Export PDF"
10. Verify PDF downloads
```

### Comprehensive Test (30 minutes)
```
1. Test all buttons on home page
2. Test all navigation links
3. Complete new user signup
4. Upload 3 different resumes
5. Test duplicate upload
6. Test all Editor tabs
7. Test Export PDF
8. Test Cover Letter (if available)
9. Logout and login again
10. Verify all data persists
```

### Edge Case Test (15 minutes)
```
1. Upload invalid file types
2. Upload file > 10MB
3. Test with slow network (throttling)
4. Rapid page refreshes during upload
5. Cancel upload mid-progress
6. Test with 0 credits
7. Test admin user bypass
```

---

## 📝 Test Results Template

```markdown
## Test Session: [Date/Time]
**Tester**: [Name]
**Environment**: [Production/Staging]
**Browser**: [Chrome/Firefox/Safari]
**Device**: [Desktop/Mobile/Tablet]

### Critical Flows
- [ ] Upload Flow: PASS/FAIL
- [ ] Editor Load: PASS/FAIL (with retry logic)
- [ ] Processing: PASS/FAIL
- [ ] Export PDF: PASS/FAIL
- [ ] Auth: PASS/FAIL

### Issues Found
1. [Description]
   - Severity: High/Medium/Low
   - Steps to reproduce: ...
   - Expected: ...
   - Actual: ...

### Overall Result
✅ PASS - All critical features working
⚠️ PARTIAL - Some issues found
❌ FAIL - Critical issues blocking
```

---

**Checklist Version**: 1.0
**Last Updated**: December 25, 2025
**Status**: Ready for comprehensive testing
**Priority**: Test upload flow first (most critical fix)
