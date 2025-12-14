# Resume Repairer

An AI-powered resume optimization platform that helps job seekers improve their resumes for Applicant Tracking Systems (ATS) and get past initial screening.

## Features

✨ **AI Resume Optimization** - Powered by GPT-5 to rewrite weak language into strong, measurable achievements
📊 **ATS Scoring** - Real-time compatibility score with keyword and formatting breakdowns
📝 **Cover Letter Generation** - AI-generated cover letters tailored to job descriptions
💳 **Payment Integration** - Stripe integration for subscription plans
🔐 **Secure Authentication** - JWT-based auth with email verification and password reset
📄 **PDF Export** - Download optimized resumes as professional PDFs
🛡️ **Security Features** - Rate limiting, file validation, CORS, and security headers

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Tailwind CSS v4** + shadcn/ui components
- **Wouter** for routing
- **Zustand** for state management
- **TanStack Query** for server state
- **Framer Motion** for animations
- **jsPDF** for PDF generation

### Backend

- **Node.js + Express** with TypeScript
- **PostgreSQL** database
- **Drizzle ORM** for database management
- **OpenAI GPT-5** for AI features
- **Stripe** for payments
- **JWT** for authentication
- **Nodemailer** for email notifications

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16+
- OpenAI API key
- (Optional) Stripe account for payments
- (Optional) SMTP server for emails

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Resume-Repairer
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory (use `.env.example` as template):

   ```bash
   # Required
   DATABASE_URL=postgresql://user:password@localhost:5432/resume_repairer
   OPENAI_API_KEY=sk-your-openai-api-key-here
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars

   # Optional for development
   PORT=5000
   NODE_ENV=development
   APP_URL=http://localhost:5000
   CORS_ORIGIN=http://localhost:5000

   # Optional for payments (works without Stripe in development)
   STRIPE_SECRET_KEY=sk_test_your-stripe-key
   STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
   STRIPE_RETURN_URL=https://your-site.com/payments/return

   # Optional for emails (app works without email configured)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=noreply@resumerepairer.com
   ```

# Optional for design assist (Figma)

FIGMA_TOKEN=your-figma-personal-access-token

# Optional default file key so clients don't need to pass ?fileKey=

# FIGMA_FILE_KEY=your-figma-file-key

````

4. **Set up the database**

   Create a PostgreSQL database:
   ```bash
   createdb resume_repairer
````

Run database migrations:

```bash
npm run db:push
```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5000`

## Project Structure

```
Resume-Repairer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities (API client, auth, etc.)
│   │   └── hooks/         # Custom React hooks
│   └── index.html
├── server/                # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database layer
│   └── lib/
│       ├── env.ts        # Environment validation
│       ├── jwt.ts        # JWT utilities
│       ├── email.ts      # Email service
│       ├── openai.ts     # AI integration
│       └── fileParser.ts # File processing
├── shared/               # Shared code
│   └── schema.ts         # Database schema + types
└── .env.example          # Environment template
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Resumes

- `POST /api/resumes/upload` - Upload and optimize resume
- `GET /api/resumes/:id` - Get resume by ID
- `GET /api/users/:userId/resumes` - Get user's resumes

### Cover Letters

- `POST /api/cover-letters/generate` - Generate cover letter

### Design

- `GET /api/design/templates` - Fetch resume design frames from the configured Figma file (auth; optional `?fileKey=` override)

### Payments

- `POST /api/payments/create` - Create payment
- `GET /api/payments/:id` - Get payment status
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Worker (background processing)

This project uses a small worker process to fetch uploaded files from S3 (or S3-compatible storage) and run the AI optimization job. This prevents serverless functions from timing out when downloading or processing files.

Start the worker locally:

```bash
npm run worker
```

Environment variables required for the worker:

- `DATABASE_URL` - Postgres connection string
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `AWS_REGION` - S3 access
- `OPENAI_API_KEY` - OpenAI API key
- `REDIS_URL` - Redis connection for job queue (defaults to `redis://127.0.0.1:6379`)

CI note: The GitHub Actions workflow can run a MinIO service for end-to-end presign+upload tests and start a worker to process queued jobs during the test run.

## Features in Detail

### Resume Optimization

The AI analyzes resumes and:

- Rewrites weak, passive language into strong, active voice
- Quantifies accomplishments with metrics and numbers
- Removes clichés and vague statements
- Ensures ATS-friendly formatting
- Identifies critical issues with severity levels
- Calculates an ATS compatibility score (0-100)
- Provides keyword and formatting sub-scores

### Payment Plans

- **Free**: 1 credit (new user bonus)
- **Basic**: $7 - 1 resume optimization
- **Pro**: $19 - 3 resumes + ATS report + keyword optimization
- **Premium**: $29 - Unlimited resumes + cover letters

### Security Features

- **Rate Limiting**:
  - Auth endpoints: 5 attempts per 15 minutes
  - Upload endpoint: 10 uploads per hour
  - General API: 100 requests per 15 minutes
- **File Validation**: Max 10MB, only PDF/DOCX/TXT
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet.js integration
- **JWT Authentication**: HTTP-only cookies
- **Password Hashing**: bcrypt with salt rounds

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run check        # Type check
npm run db:push      # Push database schema changes
```

### Database Migrations

When you modify the schema in `shared/schema.ts`, push changes to the database:

```bash
npm run db:push
```

## Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production `DATABASE_URL`
3. Set strong `JWT_SECRET` (min 32 characters)
4. Configure Stripe keys for real payments
5. Set up email service for notifications

### Build and Start

```bash
npm run build
npm start
```

### Replit Deployment

The app is pre-configured for Replit deployment:

- `.replit` file includes run configuration
- PostgreSQL database integration
- Port 5000 mapped to port 80

## Troubleshooting

### Environment Variable Errors

If you see validation errors on startup:

- Check `.env` file exists and all required variables are set
- Ensure `DATABASE_URL` is a valid PostgreSQL URL
- Verify `OPENAI_API_KEY` starts with `sk-`
- Ensure `JWT_SECRET` is at least 32 characters

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Test connection: `psql $DATABASE_URL`
- Check firewall settings

### OpenAI API Errors

- Verify API key is valid and has credits
- Check OpenAI service status
- Ensure you have access to GPT-5 model

### File Upload Guidelines

- **Accepted Formats & Limits** – Uploads must be PDF, DOCX, or TXT and smaller than 10 MB; files must contain at least ~50 characters or you’ll receive a validation error from `parseFile`. Legacy `.doc` files are not parsed, so convert them to `.docx` or TXT before uploading.
- **Plan Credit Limits** – Free users start with one credit (per month), Basic/Pro/Premium plans unlock 1/3/unlimited credits respectively, and uploads deduct credits atomically; if credits reach zero you’ll see a 403 error with “No credits remaining.”
- **Serverless PDF Support** – Vercel’s Hobby plan runs serverless functions that cannot execute `pdf-parse`, so PDF parsing is disabled in production builds. Upload a DOCX or TXT file, or convert your PDF to one of those formats before uploading (or run uploads locally using `npm run dev:server` if you need PDF support).
- **Upload Stability** – Multipart parsing runs inside `api/index.ts`, so if uploads keep failing look at the console logs (or Vercel logs) for parser failures, credit enforcement, or schema validation errors before rerunning.

## Security Notes

### Observability & Monitoring

- **Sentry** – The API server initializes Sentry when `SENTRY_DSN` is configured so every 500/uncaught exception, unhandled rejection, or upload parser failure (with stack trace/context) is captured in production. Set `SENTRY_DSN`, `NODE_ENV=production`, and `VERCEL=1` before deploying to Vercel.
- **Schema Validation** – The serverless handler now validates that `content_hash` and `original_file_name` exist on `resumes` at startup and runs `npm run db:push` before every build, so migrations must accompany schema changes in `shared/schema.ts`.
- **Upload Transparency** – The logs include upload metadata (user ID, file name, parse status) so you know exactly why Vercel returns 500/400 responses; tail `vercel logs --prod` while exercising `/api/resumes/upload` when debugging.

### Production Checklist

- [ ] Use strong `JWT_SECRET` (min 32 random characters)
- [ ] Enable HTTPS in production
- [ ] Set `secure: true` for cookies in production
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Set up Stripe webhooks for payment verification
- [ ] Enable email verification for new users
- [ ] Configure rate limiting based on your traffic
- [ ] Set up monitoring and error tracking
- [ ] Regular database backups
- [ ] Keep dependencies updated

### Environment Security

- Never commit `.env` file
- Rotate secrets regularly
- Use environment-specific configurations
- Implement proper access controls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

For issues and questions:

- Check existing issues on GitHub
- Review this README and `.env.example`
- Check server logs for error messages

## Roadmap

- [ ] LinkedIn profile optimization
- [ ] Real-time collaboration
- [ ] Resume templates
- [ ] Interview preparation tools
- [ ] Job application tracking
- [ ] Chrome extension for LinkedIn
