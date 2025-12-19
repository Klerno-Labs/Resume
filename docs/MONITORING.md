# Site Monitoring Setup

## Overview

RewriteMe production monitoring using UptimeRobot to ensure 99.9% uptime.

## Quick Setup (Manual - Recommended)

### 1. Create UptimeRobot Account
- Visit: https://uptimerobot.com/
- Sign up with your email
- Free tier: 50 monitors, 5-minute intervals

### 2. Add Monitor

**Monitor Configuration:**
```
Monitor Type:     HTTP(s)
Friendly Name:    RewriteMe Production
URL:              https://rewriteme.app
Interval:         5 minutes
Timeout:          30 seconds
Monitor Keyword:  root (optional - checks if "root" div exists)
```

### 3. Configure Alerts

**Email Alerts:**
```
Alert Type:       Email
Email:            your-email@example.com
Send alerts:      When down AND when back up
Alert after:      1 minute down
```

**Recommended Additional Alerts:**
- Slack integration for team notifications
- SMS for critical downtime (premium)
- Discord webhook for dev team

### 4. SSL Certificate Monitoring

```
Enable:           SSL Certificate Expiration Alerts
Alert before:     7 days before expiry
```

### 5. Create Status Page (Optional)

```
URL:              rewriteme.statuspage.io
Visibility:       Public
Include:          Uptime %, Response times, Incident history
```

---

## Automated Setup (API Method)

### Prerequisites
1. Get API key: https://uptimerobot.com/dashboard#mySettings
2. Set environment variable:
```bash
export UPTIMEROBOT_API_KEY='your-api-key-here'
export ALERT_EMAIL='your-email@example.com'
```

### Run Setup Script
```bash
bash scripts/setup-monitoring.sh
```

This will:
- Create HTTP(S) monitor for https://rewriteme.app
- Configure 5-minute checks
- Return monitor ID for dashboard access

---

## Local Health Checks

### Quick Check
```bash
bash scripts/check-uptime.sh
```

**Output:**
```
✅ Site is UP
✅ HTML structure present
✅ React bundle referenced
Response Time: 0.246s
```

### Continuous Monitoring (Local)
```bash
# Check every 5 minutes
watch -n 300 bash scripts/check-uptime.sh
```

---

## Monitoring Metrics

### What UptimeRobot Checks
- HTTP status code (200 = healthy)
- Response time
- SSL certificate validity
- Optional: keyword presence in HTML

### Expected Performance
```
Response Time:    < 500ms (target)
Uptime:           99.9% (target)
SSL Expiry:       > 30 days
```

### Current Status
- ✅ Site operational
- ✅ React 18.3.1 deployed
- ✅ All bundles loading
- ✅ Response time: ~246ms

---

## Alert Scenarios

### Downtime Alert
**When:** Site returns non-200 status or timeout
**Action:**
1. Check Vercel deployment status
2. Check error logs: `vercel logs`
3. Verify DNS resolution
4. Check GitHub Actions for failed deployments

### Slow Response Alert
**When:** Response time > 2s consistently
**Action:**
1. Check Vercel analytics
2. Review bundle sizes
3. Check database query performance
4. Verify CDN caching

### SSL Expiration Alert
**When:** Certificate expires in < 7 days
**Action:**
1. Vercel auto-renews SSL - should not happen
2. Check domain DNS settings if alert triggers
3. Contact Vercel support if issue persists

---

## Dashboard Access

**UptimeRobot Dashboard:**
https://uptimerobot.com/dashboard

**Vercel Analytics:**
https://vercel.com/hatfield-legacy-trusts-projects/resume-repairer/analytics

**Production Site:**
https://rewriteme.app

---

## Incident Response Checklist

### Site Down
- [ ] Check UptimeRobot alert details
- [ ] Verify site manually in browser
- [ ] Check Vercel deployment logs
- [ ] Review recent commits
- [ ] Check API health endpoint
- [ ] Rollback if needed: `vercel rollback`

### Performance Degradation
- [ ] Check response times in UptimeRobot
- [ ] Review Vercel analytics
- [ ] Check database connection pool
- [ ] Verify CDN cache hit rate
- [ ] Review recent code changes

### SSL Issues
- [ ] Verify certificate expiry date
- [ ] Check domain DNS records
- [ ] Verify Vercel SSL settings
- [ ] Test with: `openssl s_client -connect rewriteme.app:443`

---

## Integration with CI/CD

### Pre-Deployment Health Check
Add to `.github/workflows/deploy.yml`:
```yaml
- name: Health Check
  run: bash scripts/check-uptime.sh
```

### Post-Deployment Verification
```yaml
- name: Verify Deployment
  run: |
    sleep 30
    bash scripts/check-uptime.sh
```

---

## Additional Monitoring (Advanced)

### Vercel Analytics
- Already enabled in production
- Tracks Core Web Vitals
- Real user monitoring (RUM)

### Error Tracking
- Consider re-enabling Sentry for production errors
- Alternative: Vercel Error Tracking

### Performance Monitoring
- Vercel Speed Insights (already enabled)
- Lighthouse CI for continuous performance audits

---

## Support

**UptimeRobot Support:**
https://uptimerobot.com/support

**Vercel Support:**
https://vercel.com/support

**Emergency Contact:**
[Your escalation contact here]
