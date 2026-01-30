# Rate Limiting Implementation Guide

## Overview
Rate limiting has been added to prevent API abuse and DDoS attacks. The implementation uses in-memory storage optimized for Vercel serverless functions.

## How It Works

The rate limiter tracks requests by:
- **Authenticated users**: By user ID (`user:123`)
- **Anonymous requests**: By IP address (`ip:192.168.1.1`)

Default limits:
- **60 requests per minute** (general endpoints)
- **10 requests per minute** for free users (uploads)
- **30 requests per minute** for paid users (uploads)

## Adding Rate Limiting to an Endpoint

### 1. Import the rate limiting functions

```typescript
import { checkRateLimit, getRateLimitIdentifier, getUserFromRequest } from '../_shared';
```

### 2. Add rate limit check after authentication

```typescript
const user = await getUserFromRequest(req);

// Rate limiting
const rateLimit = user?.plan === 'free' ? 10 : 30; // Adjust limits as needed
const rateLimitCheck = checkRateLimit(getRateLimitIdentifier(req, user), rateLimit);

// Set rate limit headers
res.setHeader('X-RateLimit-Limit', rateLimit.toString());
res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
res.setHeader('X-RateLimit-Reset', new Date(rateLimitCheck.resetAt).toISOString());

if (!rateLimitCheck.allowed) {
  return res.status(429).json({
    error: 'Too many requests',
    message: `Rate limit exceeded. Try again after ${new Date(rateLimitCheck.resetAt).toISOString()}`,
    retryAfter: Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000),
  });
}
```

### 3. Customize limits per endpoint

Different endpoints have different requirements:

```typescript
// Expensive operations (AI generation, file uploads)
const rateLimit = user?.plan === 'free' ? 5 : 20;

// Read operations (list, view)
const rateLimit = user?.plan === 'free' ? 30 : 100;

// Authentication endpoints (login, register)
const rateLimit = 10; // Same for everyone, prevent brute force
```

## Recommended Limits by Endpoint

| Endpoint | Free Users | Paid Users | Reason |
|----------|-----------|------------|---------|
| `/api/resumes/upload` | 10/min | 30/min | Expensive AI processing |
| `/api/resumes/list` | 30/min | 100/min | Read-only, less expensive |
| `/api/resumes/preview-designs` | 5/min | 15/min | Multiple AI calls |
| `/api/resumes/regenerate-design` | 5/min | 15/min | Multiple AI calls |
| `/api/auth/login` | 5/min | 5/min | Prevent brute force |
| `/api/auth/register` | 3/min | 3/min | Prevent spam accounts |
| `/api/cover-letters/generate` | 5/min | 20/min | AI generation |
| `/api/analytics/event` | 60/min | 120/min | High-frequency tracking |

## Priority Implementation

**High Priority** (add rate limiting immediately):
1. ✅ `/api/resumes/upload` (already implemented)
2. `/api/auth/login` (prevent brute force)
3. `/api/auth/register` (prevent spam)
4. `/api/resumes/preview-designs` (expensive AI calls)
5. `/api/resumes/regenerate-design` (expensive AI calls)
6. `/api/cover-letters/generate` (expensive AI calls)

**Medium Priority**:
7. `/api/resumes/create`
8. `/api/templates/save`
9. `/api/uploads/presign`

**Low Priority** (read-only endpoints):
10. `/api/resumes/list`
11. `/api/resumes/[id]`
12. `/api/templates/index`

## Response Headers

All rate-limited endpoints return these headers:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 2026-01-29T19:00:00.000Z
```

When rate limit is exceeded (429 response):

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again after 2026-01-29T19:00:00.000Z",
  "retryAfter": 45
}
```

## Upgrading to Redis (Optional)

For production at scale, consider upgrading to Redis-based rate limiting:

1. Use Vercel KV or Upstash Redis
2. Replace `rateLimitStore` Map with Redis
3. Use Redis TTL for automatic cleanup
4. Share rate limits across serverless instances

## Testing Rate Limits

```bash
# Test rate limiting
for i in {1..15}; do
  curl -X POST https://your-app.com/api/resumes/upload \
    -H "Cookie: token=YOUR_TOKEN" \
    -F "file=@test.pdf"
  echo "Request $i"
  sleep 1
done
```

## Notes

- Rate limits reset every 60 seconds (sliding window)
- In-memory storage means limits are per-serverless-instance
- For distributed rate limiting, upgrade to Redis
- Consider adding IP-based rate limiting for unauthenticated endpoints
