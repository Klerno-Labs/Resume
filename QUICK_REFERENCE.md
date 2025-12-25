# Quick Reference Guide

**Last Updated**: December 25, 2025
**Quick access to common commands, URLs, and troubleshooting**

---

## 🚀 Essential Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

### Database
```bash
# Generate migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema changes
npm run db:push

# Open database studio
npm run db:studio
```

### Deployment
```bash
# Deploy to production
git push origin main  # Auto-deploys via Vercel

# Manual deploy
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs <deployment-url>
```

---

## 🔗 Important URLs

### Production
- **Website**: https://rewriteme.app
- **AI Builder**: https://rewriteme.app/ai-resume-builder
- **Editor**: https://rewriteme.app/editor
- **API Health**: https://rewriteme.app/api/health

### Dashboards
- **Vercel**: https://vercel.com/dashboard
- **Neon DB**: https://console.neon.tech
- **OpenAI**: https://platform.openai.com
- **Stripe**: https://dashboard.stripe.com

### Documentation
- **Main Docs**: [README.md](README.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Reference**: [API_INVENTORY.md](API_INVENTORY.md)
- **All Docs**: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

---

## 🐛 Common Issues & Solutions

### "Upload stuck in processing"
**Cause**: Background AI processing failed
**Check**:
```bash
# View processResume logs
vercel logs <deployment> | grep "Process"

# Check resume status in database
SELECT id, status, updated_at FROM resumes
WHERE id = '<resume-id>';
```
**Fix**: Check OpenAI API key and quota

### "Database connection error"
**Cause**: DATABASE_URL not configured or invalid
**Check**:
```bash
# Verify environment variable
vercel env ls

# Test connection
curl https://rewriteme.app/api/health
```
**Fix**: Set DATABASE_URL in Vercel dashboard

### "Build failing"
**Cause**: TypeScript errors or missing dependencies
**Check**:
```bash
# Run local build
npm run build

# Check TypeScript
npx tsc --noEmit
```
**Fix**: Fix TypeScript errors shown in output

### "Duplicate detection not working"
**Cause**: Missing content_hash index
**Check**:
```sql
SELECT * FROM pg_indexes
WHERE tablename = 'resumes'
AND indexname = 'resumes_user_content_hash_idx';
```
**Fix**: Run database migration

---

## 📊 Health Check Checklist

### Quick System Check
```bash
# 1. Check API health
curl https://rewriteme.app/api/health

# 2. Check build status
npm run build

# 3. Check database
# (via Neon dashboard or SQL query)

# 4. Check recent deploys
vercel ls --limit 5

# 5. Check recent logs
vercel logs <deployment> --limit 50
```

### Expected Results
- ✅ API health returns `{"status":"ok"}`
- ✅ Build completes in < 10 seconds
- ✅ Database shows connected
- ✅ Recent deploys show "Ready"
- ✅ No errors in logs

---

## 🔐 Environment Variables

### Required Variables
```env
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key

# AI Processing
OPENAI_API_KEY=sk-...

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Node Environment
NODE_ENV=production
```

### Optional Variables
```env
# Email (if using)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=password

# S3 Upload (if using)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=us-east-1
```

---

## 📁 Project Structure

```
Resume-Repairer/
├── api/                    # Serverless API functions
│   ├── auth/              # Authentication endpoints
│   ├── resumes/           # Resume management
│   ├── uploads/           # File upload handlers
│   ├── analytics/         # Analytics tracking
│   └── lib/               # Shared utilities
│       ├── db.ts          # Database connection (lazy init)
│       ├── processResume.ts  # AI processing (CRITICAL)
│       └── fileParser.ts  # File parsing logic
├── client/                # React frontend
│   └── src/
│       ├── pages/         # Route components
│       ├── components/    # React components
│       ├── lib/           # Client utilities
│       │   └── api.ts     # API client (upload logic)
│       └── hooks/         # Custom React hooks
├── shared/                # Shared types & schemas
│   └── schema.ts          # Database schema (Drizzle)
├── dist/                  # Build output (gitignored)
└── docs/                  # Documentation (17 files)
```

---

## 🧪 Testing Commands

### Manual Testing
```bash
# Test upload endpoint
curl -X POST https://rewriteme.app/api/resumes/upload \
  -H "Cookie: token=your-jwt-token" \
  -F "file=@sample-resume.pdf"

# Test auth endpoint
curl https://rewriteme.app/api/auth/me \
  -H "Cookie: token=your-jwt-token"

# Test health endpoint
curl https://rewriteme.app/api/health
```

### Automated Testing
```bash
# Run unit tests (when implemented)
npm run test

# Run integration tests (when implemented)
npm run test:integration

# Run E2E tests (when implemented)
npm run test:e2e
```

---

## 🚨 Emergency Procedures

### Production Down
1. Check Vercel status: https://www.vercel-status.com
2. Check recent deployments: `vercel ls`
3. Rollback if needed: `vercel rollback <deployment-id>`
4. Check error logs: `vercel logs <deployment>`

### Database Issues
1. Check Neon dashboard: https://console.neon.tech
2. Verify DATABASE_URL in environment
3. Test connection via health endpoint
4. Contact Neon support if needed

### High Error Rate
1. Open Sentry (when implemented)
2. Check error patterns and stack traces
3. Identify affected endpoint/feature
4. Deploy hotfix or rollback
5. Post-mortem after resolution

---

## 💡 Pro Tips

### Development Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes, commit often
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature

# After PR approval, merge to main
# Vercel auto-deploys to production
```

### Debugging in Production
```bash
# View real-time logs
vercel logs <deployment> --follow

# Filter logs by search term
vercel logs <deployment> | grep "Upload"

# Check specific function
vercel logs <deployment> --scope api/resumes/upload.ts
```

### Database Quick Queries
```sql
-- Check recent uploads
SELECT id, file_name, status, created_at
FROM resumes
ORDER BY created_at DESC
LIMIT 10;

-- Check user credits
SELECT email, plan, credits_remaining
FROM users
WHERE email = 'user@example.com';

-- Check processing failures
SELECT id, file_name, status, updated_at
FROM resumes
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

---

## 📞 Support Contacts

### Internal Team
- **Tech Lead**: [Name] - [Email]
- **DevOps**: [Name] - [Email]
- **Product**: [Name] - [Email]

### External Services
- **Vercel Support**: https://vercel.com/support
- **Neon Support**: support@neon.tech
- **OpenAI Support**: https://help.openai.com
- **Stripe Support**: https://support.stripe.com

---

## 📚 Learning Resources

### Key Documentation
1. **Start Here**: [README.md](README.md)
2. **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
3. **Production Guide**: [PRODUCTION_VERIFICATION.md](PRODUCTION_VERIFICATION.md)
4. **Performance**: [PERFORMANCE_ANALYSIS.md](PERFORMANCE_ANALYSIS.md)
5. **Action Plan**: [ACTION_PLAN.md](ACTION_PLAN.md)

### External Resources
- **React Docs**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **OpenAI API**: https://platform.openai.com/docs

---

## 🎯 Performance Targets

### Build & Deploy
- Build Time: < 10 seconds
- Deploy Time: < 2 minutes
- Bundle Size: < 400KB gzipped

### Runtime Performance
- API p95: < 500ms
- Upload: < 2 seconds (for 1MB file)
- AI Processing: 10-30 seconds
- Database Query: < 200ms

### Reliability
- Uptime: 99.9%
- Error Rate: < 0.5%
- Upload Success: > 99%
- Processing Success: > 98%

---

## ✅ Pre-Deployment Checklist

Before deploying to production:
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] No console errors in dev
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] API health check working
- [ ] Upload flow tested
- [ ] Error handling verified
- [ ] Performance acceptable
- [ ] Documentation updated

---

**Quick Reference Version**: 1.0
**Maintained By**: Development Team
**Update Frequency**: As needed
