# Resume-Repairer System Architecture

## Overview

Resume-Repairer is a full-stack web application built with React (client) and Vercel serverless functions (API) that provides AI-powered resume optimization and ATS scoring.

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React Router alternative)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animations**: Framer Motion
- **State Management**: React hooks (useState, useEffect, useCallback)
- **HTTP Client**: Fetch API + XMLHttpRequest (for upload progress)
- **Build Tool**: Vite
- **Bundle Size**: 385KB total (gzipped)

### Backend
- **Runtime**: Node.js on Vercel Serverless Functions
- **Language**: TypeScript with ES modules
- **API Framework**: Vercel @vercel/node
- **Database**: Neon Serverless PostgreSQL
- **Authentication**: JWT with httpOnly cookies
- **File Parsing**: mammoth (DOCX), pdf-parse (PDF)
- **AI Processing**: OpenAI GPT-4o-mini
- **Payment Processing**: Stripe

### Infrastructure
- **Hosting**: Vercel
- **Database**: Neon (serverless PostgreSQL)
- **Domain**: https://rewriteme.app
- **CI/CD**: Vercel Git integration
- **Environment**: Production

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT (React)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Home Page  │  │ AI Builder   │  │    Editor    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                  │
│                            │                                      │
│                    ┌───────▼────────┐                            │
│                    │  FileUpload    │                            │
│                    │  Component     │                            │
│                    └───────┬────────┘                            │
│                            │                                      │
│                    ┌───────▼────────┐                            │
│                    │   API Client   │                            │
│                    │  (api.ts)      │                            │
│                    └───────┬────────┘                            │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │ HTTPS (fetch/XHR)
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                            │
│                   (CORS, SSL, CDN)                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                  API LAYER (Serverless Functions)                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Authentication Endpoints (6)                                     │
│  ┌────────────┬────────────┬────────────┬────────────┐          │
│  │ /register  │  /login    │  /logout   │    /me     │          │
│  └────────────┴────────────┴────────────┴────────────┘          │
│                                                                   │
│  Resume Management Endpoints (3)                                  │
│  ┌──────────────────┬────────────────────┬─────────────┐        │
│  │ /resumes/upload  │  /resumes/[id]     │  /resumes   │        │
│  └────────┬─────────┴──────────┬─────────┴─────────────┘        │
│           │                    │                                  │
│           │                    │                                  │
│  ┌────────▼────────┐  ┌────────▼────────┐                       │
│  │  parseFile()    │  │   getResume()   │                       │
│  │  (fileParser)   │  │                 │                       │
│  └────────┬────────┘  └─────────────────┘                       │
│           │                                                       │
│           │                                                       │
│  ┌────────▼─────────────────────┐                                │
│  │   processResume()            │ ◄─── Background Processing     │
│  │   (lib/processResume.ts)     │                                │
│  │                              │                                │
│  │  - Lazy DB init (getSQL)     │                                │
│  │  - Lazy OpenAI init          │                                │
│  │  - Parallel API calls        │                                │
│  │  - Error handling            │                                │
│  │  - Credit refund             │                                │
│  └────────┬─────────────────────┘                                │
│           │                                                       │
│           │                                                       │
│  Upload Flow Endpoints (2)                                        │
│  ┌──────────────────┬────────────────────┐                       │
│  │ /uploads/presign │ /uploads/complete  │                       │
│  └──────────────────┴────────────────────┘                       │
│                                                                   │
│  Analytics Endpoints (1)                                          │
│  ┌──────────────────┐                                            │
│  │ /analytics/event │                                            │
│  └──────────────────┘                                            │
│                                                                   │
│  System Endpoints (1)                                             │
│  ┌──────────────────┐                                            │
│  │   /api/health    │                                            │
│  └──────────────────┘                                            │
│                                                                   │
└───────────────────┬───────────────────┬──────────────────────────┘
                    │                   │
                    │                   │
        ┌───────────▼────────┐  ┌───────▼──────────┐
        │  Neon Database     │  │  OpenAI API      │
        │  (PostgreSQL)      │  │  (GPT-4o-mini)   │
        │                    │  │                  │
        │  - users           │  │  - Resume opt.   │
        │  - resumes         │  │  - ATS scoring   │
        │  - payments        │  │                  │
        │  - analytics       │  └──────────────────┘
        │                    │
        │  Lazy Init:        │
        │  getSQL()          │
        └────────────────────┘
```

---

## Upload Flow (Detailed)

### 1. Client-Side Upload
```
FileUpload.tsx
├── User selects file (drag & drop or click)
├── Client-side validation
│   ├── File size: max 10MB
│   ├── File type: PDF, DOCX, DOC, TXT
│   └── Extension check
├── Create FormData
└── XMLHttpRequest to /api/resumes/upload
    ├── Progress tracking (0-100%)
    ├── AbortController for cancellation
    └── withCredentials: true (include cookies)
```

### 2. Server-Side Processing
```
api/resumes/upload.ts
├── CORS validation
├── Authentication (JWT from cookie)
│   └── getUserFromRequest()
├── Multipart form parsing (formidable)
│   ├── Parse file from request body
│   ├── Write to temp file
│   ├── Read file contents
│   └── Delete temp file
├── File content parsing
│   └── parseFile() - PDF/DOCX/TXT
├── Duplicate detection (SHA-256)
│   ├── Skip if admin user
│   ├── Hash file content
│   ├── Query database by user_id + content_hash
│   └── Return existing resume if found
├── Atomic credit deduction
│   ├── Skip if admin user
│   ├── UPDATE users SET credits = credits - 1 WHERE credits > 0
│   └── Fail if no credits remaining
├── Database record creation
│   └── INSERT INTO resumes (status: 'processing')
├── Background processing trigger
│   └── processResume().catch()
└── Response to client
    └── { resumeId, status: 'processing' }
```

### 3. Background AI Processing
```
api/lib/processResume.ts
├── Lazy initialization
│   ├── getSQL() - Database connection
│   └── getOpenAI() - OpenAI client
├── Parallel API calls (Promise.all)
│   ├── GPT-4o-mini: Resume optimization (2500 tokens)
│   └── GPT-4o-mini: ATS scoring (500 tokens)
├── Parse JSON responses
├── Update database
│   └── UPDATE resumes SET improved_text, ats_score, status = 'completed'
└── Error handling
    ├── UPDATE resumes SET status = 'failed'
    └── Refund credit (non-admin users)
```

### 4. Client-Side Polling
```
ai-resume-builder.tsx
├── FileUpload triggers onUpload callback
├── setLoadingResumeId(resumeId)
├── useEffect polling loop (20 iterations max)
│   ├── Wait 1500ms between polls
│   ├── api.getResume(resumeId)
│   └── Stop when status !== 'processing'
├── Redirect to /editor after 1200ms
└── Editor page continues polling if needed
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',
  credits_remaining INTEGER DEFAULT 3,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Resumes Table
```sql
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  file_name VARCHAR(255),
  original_file_name VARCHAR(255),
  original_text TEXT,
  improved_text TEXT,
  ats_score INTEGER,
  keywords_score INTEGER,
  formatting_score INTEGER,
  issues JSONB,
  status VARCHAR(50) DEFAULT 'processing',
  content_hash VARCHAR(64),  -- SHA-256 hash for duplicate detection
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_content_hash ON resumes(user_id, content_hash);
```

### Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan VARCHAR(50),
  amount INTEGER,
  status VARCHAR(50),
  stripe_session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Analytics Events Table
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_name VARCHAR(255),
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Authentication Flow

### Registration
```
1. Client: POST /api/auth/register { email, password, name }
2. Server: Hash password with bcrypt
3. Server: INSERT INTO users
4. Server: Generate JWT token
5. Server: Set httpOnly cookie
6. Server: Return { user }
```

### Login
```
1. Client: POST /api/auth/login { email, password }
2. Server: Query user by email
3. Server: Verify password with bcrypt
4. Server: Generate JWT token
5. Server: Set httpOnly cookie
6. Server: Return { user }
```

### Authentication Check
```
1. Client: GET /api/auth/me
2. Server: Parse JWT from cookie
3. Server: Verify token with JWT_SECRET
4. Server: Query user by ID from token
5. Server: Return { user, authenticated: true }
```

---

## Security Measures

### Authentication
- ✅ JWT tokens in httpOnly cookies (XSS protection)
- ✅ bcrypt password hashing (10 rounds)
- ✅ Token verification on all protected routes
- ✅ User ID scoping in database queries

### File Upload
- ✅ File size limit: 10MB
- ✅ File type whitelist: .pdf, .docx, .doc, .txt
- ✅ MIME type validation
- ✅ Content parsing with error handling
- ✅ Temp file cleanup after processing
- ✅ Multipart form data parsing with formidable

### Database
- ✅ Parameterized queries (SQL injection prevention)
- ✅ User ID scoping (users can only access own data)
- ✅ Atomic credit operations (race condition prevention)
- ✅ Environment variable for DATABASE_URL

### API
- ✅ CORS whitelist: rewriteme.app, localhost:5174, *.vercel.app
- ✅ Rate limiting via Vercel
- ✅ Authentication required for user operations
- ✅ Admin privilege checks for special features

---

## Performance Optimizations

### Frontend
- Code splitting (vendor bundles separated)
- Lazy loading of routes
- Memoized components (useCallback, useMemo)
- Optimized font loading (WOFF/WOFF2)
- Gzip compression (74% reduction)

### Backend
- Lazy database initialization (no cold start penalty)
- Lazy OpenAI client initialization
- Connection pooling via Neon serverless
- Parallel AI API calls (Promise.all)
- Background processing (fire-and-forget)

### Database
- Indexes on frequently queried columns
- SHA-256 hash index for duplicate detection
- Atomic credit operations (single query)
- Replication lag handling (500ms delay)

---

## Error Handling

### Client-Side
- Form validation with clear error messages
- Network error handling (retry logic)
- Upload cancellation (AbortController)
- Toast notifications for user feedback
- Error boundaries for React component errors

### Server-Side
- Try-catch blocks in all handlers
- Detailed console logging
- Credit refund on processing failure
- Status updates for failed resumes
- Stack traces in development mode

### Database
- Lazy initialization with error checking
- Connection retry logic
- Transaction rollback on error
- Graceful degradation for missing data

---

## Monitoring and Logging

### Production Logs
- Console logging throughout codebase
- Error tracking with stack traces
- Vercel function logs
- API request/response logging
- Database query logging

### Health Checks
- /api/health endpoint
- Database connection verification
- Environment variable checks
- Service availability monitoring

---

## Deployment Pipeline

### Git Workflow
```
1. Developer commits to main branch
2. Vercel detects git push
3. CI/CD pipeline triggered
4. Build process:
   - npm install
   - npm run build (Vite)
   - TypeScript compilation
5. Deploy to production
6. Health check verification
7. Domain update (rewriteme.app)
```

### Environment Variables
- DATABASE_URL (Neon connection string)
- JWT_SECRET (token signing)
- OPENAI_API_KEY (AI processing)
- STRIPE_SECRET_KEY (payments)
- NODE_ENV (production/development)

---

## API Endpoint Inventory

### Authentication (6 endpoints)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/verify-email
- POST /api/auth/forgot-password

### Resume Management (3 endpoints)
- POST /api/resumes/upload
- GET /api/resumes/[id]
- GET /api/resumes (user's resumes)

### Upload Flow (2 endpoints)
- POST /api/uploads/presign (S3 direct upload)
- POST /api/uploads/complete (S3 upload confirmation)

### Analytics (1 endpoint)
- POST /api/analytics/event

### System (1 endpoint)
- GET /api/health

**Total**: 13 active serverless function handlers

---

## Key Features

### Admin Privileges
- Bypass duplicate detection
- Bypass credit deduction
- Unlimited uploads
- No restrictions on processing

### Duplicate Detection
- SHA-256 content hashing
- Database lookup by user_id + content_hash
- Verification before returning duplicate
- Graceful handling if duplicate deleted
- Clear error message to user

### Credit System
- Atomic credit deduction (race condition safe)
- Credit refund on processing failure
- Free tier: 3 credits
- Paid tiers: Unlimited (subscription-based)

### AI Processing
- GPT-4o-mini for optimization (2500 tokens)
- GPT-4o-mini for scoring (500 tokens)
- Parallel API calls for speed
- JSON response format
- Error handling with retries

---

## Future Enhancements

### Potential Improvements
- WebSocket for real-time status updates
- S3/R2 for resume file storage
- Multiple AI model support
- Cover letter generation
- LinkedIn profile optimization
- Job description matching
- Resume template selection
- PDF export with custom styling

### Scalability Considerations
- Database connection pooling optimization
- Redis caching for frequently accessed data
- CDN for static assets
- Background job queue (Bull/BullMQ)
- Rate limiting per user
- API usage analytics

---

**Document Version**: 1.0
**Last Updated**: December 25, 2025
**System Version**: Production-ready with critical bug fix
