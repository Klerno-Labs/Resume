# Resume Upload Flow Architecture

## Overview
The upload system uses a dual-path approach: S3 presigned URLs (preferred) with graceful fallback to multipart upload.

## Upload Paths

### Path 1: S3 Presigned URL (Preferred)
1. **Client** → POST `/api/uploads/presign` with filename and contentType
2. **Server** generates presigned S3 URL (300s expiry)
3. **Client** → PUT file directly to S3 URL (with progress tracking via XHR)
4. **Client** → POST `/api/uploads/complete` with S3 key and filename
5. **Server** fetches file from S3, processes, creates resume record
6. **Response** → `{ resumeId, status }`

### Path 2: Multipart Upload (Fallback)
1. **Client** → POST `/api/resumes/upload` with FormData
2. **Server** receives file via formidable (with bodyParser disabled)
3. **Server** processes file and creates resume record
4. **Response** → `{ resumeId, status }` or `{ isDuplicate: true }`

## Fallback Conditions
- S3 credentials not configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY missing)
- S3_BUCKET not set
- Presign URL generation fails
- Network error during S3 upload

## Admin Privileges
Admin users (plan === 'admin') bypass:
- ✅ Duplicate detection (line 185 in upload.ts)
- ✅ Credit deduction (line 230 in upload.ts)

## Duplicate Detection (Non-Admin Only)
1. SHA-256 hash of resume content
2. Check for existing hash in database
3. **Verify duplicate actually exists** before returning
4. If duplicate deleted → allow new upload
5. Client shows error toast instead of redirect

## Database Replication Handling
- 500ms delay before polling starts (FileUpload.tsx:133)
- 1200ms delay before redirect (FileUpload.tsx:138)
- Logging in resumes/[id].ts for debugging

## Files Involved

### API Endpoints
- `api/uploads/presign.ts` - Generate S3 presigned URL
- `api/uploads/complete.ts` - Complete S3 upload and process
- `api/resumes/upload.ts` - Multipart upload handler
- `api/resumes/[id].ts` - Get resume by ID

### Client
- `client/src/lib/api.ts` - API client with XHR-based upload
- `client/src/components/FileUpload.tsx` - Upload UI component

### Libraries
- `api/lib/s3.ts` - S3 client initialization
- `api/lib/fileParser.ts` - File parsing utilities
- `api/lib/processResume.ts` - Resume analysis logic

## Error Handling
- Client retries with multipart if presign fails
- Clear error messages for duplicates
- Progress tracking for user feedback
- Abort controller for cancellation
