# API Endpoint Inventory

## Authentication Endpoints (6)
✅ `/api/auth/login` - Email/password login
✅ `/api/auth/register` - User registration  
✅ `/api/auth/logout` - Session logout
✅ `/api/auth/me` - Get current user
✅ `/api/auth/google` - Google OAuth initiation
✅ `/api/auth/google/callback` - Google OAuth callback

## Resume Management (3)
✅ `/api/resumes/upload` - Multipart file upload with admin bypass
✅ `/api/resumes/[id]` - Get resume by ID with logging
✅ `/api/resumes/index` - List user resumes

## Upload Flow (2)
✅ `/api/uploads/presign` - Generate S3 presigned URL
✅ `/api/uploads/complete` - Complete S3 upload and process

## Analytics (1)
✅ `/api/analytics/event` - Track user events

## System (1)
✅ `/api/health` - API health check

## Total: 13 Active Handlers

## Admin Features
- Bypass duplicate detection (plan !== 'admin')
- Bypass credit deduction (plan !== 'admin')
- Unlimited uploads

## Duplicate Detection
- SHA-256 content hashing
- Verification before returning duplicate
- Allows new upload if duplicate deleted
- Clear error messages

## Upload Flow
- Primary: S3 presigned URL (300s expiry)
- Fallback: Multipart upload via formidable
- Progress tracking via XHR
- Abort controller support

## Database
- Lazy initialization (prevents module-load errors)
- Neon serverless PostgreSQL
- Tagged template literals
- 500ms delay for replication lag

## Pages Tested
✅ https://rewriteme.app/ (Home)
✅ https://rewriteme.app/ai-resume-builder
✅ https://rewriteme.app/pricing
✅ https://rewriteme.app/auth
✅ https://rewriteme.app/api/health

All endpoints returning 200 OK ✅
