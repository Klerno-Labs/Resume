# Deployment Setup

## Auto-Deploy Configuration

This project has two methods for automatic deployment to Vercel:

### 1. Git Post-Commit Hook (Local)

A git hook automatically deploys when you commit to the `main` branch locally.

**Location**: `.git/hooks/post-commit`

**Features**:
- Automatically deploys on every commit to main
- Clears build cache with `--force` flag
- Runs in background so commits are fast

### 2. GitHub Actions (Remote)

GitHub Actions deploys automatically when you push to the `main` branch.

**Location**: `.github/workflows/deploy.yml`

**Setup Required**:

You need to add three secrets to your GitHub repository:

1. Go to https://github.com/Klerno-Labs/Resume/settings/secrets/actions
2. Add these secrets:

#### VERCEL_TOKEN
Get from: https://vercel.com/account/tokens
- Create a new token
- Copy and paste it

#### VERCEL_ORG_ID
Value: `team_FlOtnAgRKPsoShVhyGVSQAQy`
(Found in `.vercel/project.json`)

#### VERCEL_PROJECT_ID
Value: `prj_du89iqJVqEXvZBFMA2HECco5dPV2`
(Found in `.vercel/project.json`)

## Cache Management

### Build Cache
- The `--force` flag in deployments skips build cache
- This ensures fresh builds every time
- Prevents corrupted bundle issues

### CDN Cache
Cache headers in `vercel.json`:
- **HTML files**: `max-age=0` (always fresh) with `stale-while-revalidate`
- **JS/CSS/Assets**: `max-age=31536000, immutable` (1 year cache with content hash)
- **API responses**: `no-store, no-cache` (never cached)

### Manual Cache Clear

To manually clear cache and force a fresh deployment:

```bash
vercel --prod --force --yes
```

Or use the Vercel CLI with cache purging:

```bash
# Clear build cache
vercel --force --yes

# Full redeploy with fresh cache
vercel --prod --force --yes
```

## Testing Auto-Deploy

To test if auto-deploy works:

1. Make a small change to any file
2. Commit: `git commit -m "test: verify auto-deploy"`
3. Push: `git push`
4. Check:
   - Local: Watch terminal for "Deployment started in background"
   - GitHub: Check https://github.com/Klerno-Labs/Resume/actions
   - Vercel: Check https://vercel.com/hatfield-legacy-trusts-projects/resume-repairer

## Troubleshooting

### Auto-deploy not working?

**Check git hook**:
```bash
ls -la .git/hooks/post-commit
# Should be executable (-rwxr-xr-x)
```

**Make executable if needed**:
```bash
chmod +x .git/hooks/post-commit
```

**Check GitHub Actions**:
- Verify secrets are set correctly
- Check workflow runs: https://github.com/Klerno-Labs/Resume/actions
- Look for error messages in failed runs

### White screen after deployment?

1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check if new bundle is deployed:
   ```bash
   curl -s https://rewriteme.app | grep -o "assets/vendor-react-[^\"']*\.js"
   ```
3. Force fresh deployment:
   ```bash
   vercel --prod --force --yes
   ```

### Deployment is slow?

The build cache is intentionally disabled (`--force`) to prevent corruption issues. This makes deployments take 30-60 seconds but ensures reliability.
