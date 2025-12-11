# Quick Setup Guide

Follow these steps to get Resume Repairer running on your machine.

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 16 or higher
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and fill in these REQUIRED values:
# - DATABASE_URL (your PostgreSQL connection string)
# - OPENAI_API_KEY (starts with sk-)
# - JWT_SECRET (generate a random 32+ character string)
```

### Generating a secure JWT_SECRET

**Option 1 - Using Node.js:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2 - Using OpenSSL:**

```bash
openssl rand -hex 32
```

**Option 3 - Online:**
Visit https://generate-secret.vercel.app/32

Copy the output and paste it as your `JWT_SECRET` in `.env`

## Step 3: Set Up Database

```bash
# Create database (if it doesn't exist)
createdb resume_repairer

# Push schema to database
npm run db:push
```

## Step 4: Verify Setup

Your `.env` file should look like this:

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/resume_repairer
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=64_random_characters_here_like_abc123def456...

# Optional - App works without these
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:5000
```

## Step 5: Start Development Server

```bash
npm run dev
```

Visit http://localhost:5000 - you should see the Resume Repairer homepage!

## Step 6: Test the App

1. Click "Get Started" or "Sign Up"
2. Create an account with any email
3. Upload a test resume (PDF, DOCX, or TXT)
4. Wait for AI optimization
5. View the improved resume and ATS score
6. Try exporting to PDF

## Common Issues

### Database connection error

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:** Make sure PostgreSQL is running:

```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
```

### Environment validation error

**Error:** `DATABASE_URL must be a valid PostgreSQL URL`

**Solution:** Make sure your DATABASE_URL is formatted correctly:

```
postgresql://username:password@host:port/database
```

Example:

```
postgresql://postgres:mypassword@localhost:5432/resume_repairer
```

### OpenAI API error

**Error:** `Incorrect API key provided`

**Solution:**

- Verify your API key starts with `sk-`
- Check you have credits in your OpenAI account
- Ensure there are no extra spaces in your `.env` file

### JWT_SECRET too short

**Error:** `JWT_SECRET must be at least 32 characters`

**Solution:** Generate a longer secret using one of the methods in Step 2

## Optional: Configure Stripe (for payments)

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your test API keys from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
3. Add to `.env`:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

**Note:** The app works fine without Stripe - payments will use mock mode.

## Optional: Configure Email (for verification)

Add SMTP credentials to `.env`:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@resumerepairer.com
```

**For Gmail:**

1. Enable 2FA on your Google account
2. Generate an "App Password" from [account settings](https://myaccount.google.com/apppasswords)
3. Use the app password as `EMAIL_PASSWORD`

**Note:** The app works without email - verification tokens just won't be sent.

## Production Deployment

See [README.md](README.md) for production deployment instructions.

## Need Help?

- Check [README.md](README.md) for detailed documentation
- See [CHANGES.md](CHANGES.md) for list of recent changes
- Review `.env.example` for all available configuration options

## Success! 🎉

You should now have Resume Repairer running locally. Try uploading a resume and see the AI optimization in action!
