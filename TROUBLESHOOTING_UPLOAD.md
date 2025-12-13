# Upload Troubleshooting Guide

## If you can't upload files on https://rewriteme.app

### Step 1: Check Your Browser Console
1. Open the site: https://rewriteme.app
2. Press F12 to open Developer Tools
3. Click the "Console" tab
4. Try to upload a file
5. Look for any RED error messages

### Step 2: Common Issues & Fixes

#### Issue: "Not authenticated" error
**Cause**: You're not logged in or your session expired
**Fix**:
1. Click "Sign Out"
2. Sign back in with c.hatfield309@gmail.com
3. Try uploading again

#### Issue: "No credits remaining" error
**Cause**: Your account has 0 credits (shouldn't happen for admin)
**Fix**: Your account should have 9999 credits. Run this script:
```bash
node check-admin.js
```

#### Issue: "Invalid file type" error
**Cause**: File format not supported
**Fix**: Only upload .PDF, .DOCX, .DOC, or .TXT files
**Note**: PDFs might fail in production (serverless limitation) - use DOCX instead

#### Issue: Upload spins forever / hangs
**Cause**: Could be several things:
1. Network timeout
2. File too large (>10MB)
3. OpenAI API error
4. Database error

**Fix**:
1. Try a smaller file (< 1MB)
2. Try a .TXT file instead
3. Check browser console for errors
4. Try in incognito mode (clear cookies/cache)

### Step 3: Test with a Simple Text File

Create a file called `test.txt` with this content:
```
JOHN DOE
Software Engineer
john@email.com

EXPERIENCE
Software Engineer at Tech Corp (2020-Present)
- Built web applications

EDUCATION
BS Computer Science, University (2018)

SKILLS
JavaScript, Python, React
```

Try uploading that simple text file. If it works, the issue is with your PDF/DOCX file.

### Step 4: Check Production Logs

If you have access to Vercel dashboard:
1. Go to https://vercel.com
2. Select the "Resume-Repairer" project
3. Click "Logs"
4. Try uploading a file
5. Look for errors in real-time logs

### Step 5: What to Send Me

If none of this works, send me:
1. Screenshot of browser console errors (F12 → Console tab)
2. The exact error message you see
3. File type you're trying to upload (.pdf, .docx, .txt)
4. File size
5. Whether you can see your account credits in the top right

### Production URL
https://rewriteme.app

### Your Admin Account
- Email: c.hatfield309@gmail.com
- Plan: admin
- Credits: 9999
- Should have unlimited uploads

### Testing locally (if production doesn't work)
1. Make sure dev server is running: `npm run dev`
2. Open http://localhost:5173
3. Upload a file there
4. If it works locally but not production, it's a deployment issue
