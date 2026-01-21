# FundOps Deployment Guide

**Last Updated:** January 20, 2026  
**Deployment Stack:** Vercel (Frontend/Backend) + Supabase (Database/Auth/Storage)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Supabase Setup](#supabase-setup)
4. [Environment Variables](#environment-variables)
5. [Deploy to Vercel](#deploy-to-vercel)
6. [Background Jobs Setup](#background-jobs-setup)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- [ ] GitHub account (for repo hosting)
- [ ] Vercel account (free tier works for MVP)
- [ ] Supabase account (free tier works for MVP)
- [ ] Anthropic API key (for Claude)
- [ ] Google Cloud Console project (for Gmail OAuth)
- [ ] Microsoft Azure app (for Outlook OAuth) - Optional for Phase 1

### Local Development Tools
```bash
# Required versions
node >= 18.0.0
npm >= 9.0.0
git >= 2.30.0

# Check your versions
node --version
npm --version
git --version
```

---

## Local Development Setup

### 1. Clone Repository
```bash
cd ~/Documents/05.\ Projects/GitHub/
git clone <your-repo-url> FundOps
cd FundOps
```

### 2. Install Dependencies

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd ../backend
npm install
# OR if using Python for utilities
pip install -r requirements.txt --break-system-packages
```

**Utilities (Python):**
```bash
cd ../utilities
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Environment Setup

Copy example env files:
```bash
# Root level
cp .env.example .env.local

# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env.local

# Utilities
cp utilities/.env.example utilities/.env
```

---

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name:** `fundops-prod` (or `fundops-dev` for development)
   - **Database Password:** Generate strong password (save to password manager)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
4. Wait 2-3 minutes for provisioning

### 2. Get Supabase Credentials

From your project dashboard:

**Settings → API:**
- Copy `Project URL` → This is `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → This is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy `service_role` key (secret) → This is `SUPABASE_SERVICE_ROLE_KEY`

**Settings → Database:**
- Copy `Connection string` → This is `DATABASE_URL`
- Replace `[YOUR-PASSWORD]` with your database password

### 3. Run Database Migrations

```bash
cd infra/supabase/migrations

# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push

# OR manually via SQL Editor in Supabase dashboard:
# Copy contents of each migration file and run in order
```

### 4. Set Up Storage Buckets

In Supabase Dashboard:

**Storage → New Bucket:**
1. **Name:** `email_attachments`
2. **Public:** ❌ (Private)
3. **File size limit:** 25 MB
4. **Allowed MIME types:** 
   - `application/pdf`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
   - `image/png`
   - `image/jpeg`

**Set Bucket Policies:**
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email_attachments');

-- Allow users to read their own org's files
CREATE POLICY "Allow org file access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'email_attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 5. Enable Row-Level Security (RLS)

Run these in SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE lp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails_parsed ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their organization's data
CREATE POLICY "Users see own org data"
ON lp_contacts FOR ALL
TO authenticated
USING (organization_id IN (
  SELECT organization_id FROM users WHERE id = auth.uid()
));

-- Repeat for other tables (see infra/supabase/policies.sql)
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# API
NEXT_PUBLIC_API_URL=http://localhost:3001  # Local dev
# NEXT_PUBLIC_API_URL=https://fundops.vercel.app/api  # Production

# OAuth Redirect (after Vercel deployment)
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://fundops.vercel.app/auth/callback
```

### Backend (`backend/.env.local`)
```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # SECRET - never commit!
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx  # Get from console.anthropic.com

# Gmail OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Outlook OAuth (optional for Phase 1)
MICROSOFT_CLIENT_ID=xxxxx
MICROSOFT_CLIENT_SECRET=xxxxx

# App Config
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-random-secret-here
```

### Utilities (`utilities/.env`)
```bash
# Same as backend/.env.local
# Plus:

# Cron config
POLL_INTERVAL_MINUTES=5
BATCH_SIZE=100

# Parsing config
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CONFIDENCE_THRESHOLD=0.7
```

---

## Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy Frontend

```bash
cd frontend

# First deployment (follow prompts)
vercel

# Configure project:
# - Set up and deploy? Yes
# - Which scope? <your-account>
# - Link to existing project? No
# - Project name? fundops
# - Directory? ./
# - Override settings? No

# Production deployment
vercel --prod
```

**After first deployment, Vercel will give you a URL:**
- Preview: `fundops-git-main-yourname.vercel.app`
- Production: `fundops.vercel.app`

### 4. Set Environment Variables in Vercel

**Via Vercel Dashboard:**
1. Go to `vercel.com` → Your Project → Settings → Environment Variables
2. Add each variable from `frontend/.env.local`
3. Select environments: Production, Preview, Development

**Via CLI:**
```bash
# Add production env vars
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_API_URL production

# Repeat for all variables
```

### 5. Deploy Backend API Routes

If using Next.js API routes (recommended for MVP):
```bash
# Backend is in frontend/pages/api/ or frontend/app/api/
# Already deployed with frontend, no separate step needed
```

If using separate backend (Node.js/Python):
```bash
cd backend

# Deploy as serverless functions
vercel

# Set environment variables
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add ANTHROPIC_API_KEY production
# ... etc
```

### 6. Configure Custom Domain (Optional)

**In Vercel Dashboard:**
1. Project Settings → Domains
2. Add Domain: `fundops.yourcompany.com`
3. Update DNS:
   - Type: `CNAME`
   - Name: `fundops`
   - Value: `cname.vercel-dns.com`
4. Wait for verification (1-60 min)

---

## Background Jobs Setup

**Problem:** Vercel serverless functions timeout after 10 seconds (free) or 60 seconds (pro).  
**Solution:** Use Vercel Cron Jobs or external service.

### Option 1: Vercel Cron (Recommended for MVP)

Create `vercel.json` in root:
```json
{
  "crons": [
    {
      "path": "/api/cron/poll-inbox",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Create `frontend/pages/api/cron/poll-inbox.ts`:
```typescript
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Trigger email polling
  // ... implementation
  
  return res.status(200).json({ success: true });
}
```

**Set CRON_SECRET in Vercel:**
```bash
vercel env add CRON_SECRET production
# Enter a random secret: openssl rand -base64 32
```

### Option 2: GitHub Actions (Free, more control)

Create `.github/workflows/poll-emails.yml`:
```yaml
name: Poll Emails

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd utilities
          pip install -r requirements.txt
      - name: Run polling script
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
        run: |
          cd utilities
          python jobs/poll_inbox.py
```

**Add secrets to GitHub:**
Settings → Secrets and variables → Actions → New repository secret

### Option 3: Railway/Render (Paid, long-running)

For production at scale, deploy utilities as a separate service:

**Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd utilities
railway up

# Set env vars in Railway dashboard
```

---

## Post-Deployment Configuration

### 1. Set Up Gmail OAuth

**Google Cloud Console:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project: "FundOps"
3. Enable Gmail API:
   - APIs & Services → Library → Search "Gmail API" → Enable
4. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Name: "FundOps Production"
   - Authorized redirect URIs:
     - `https://fundops.vercel.app/auth/callback/google`
     - `http://localhost:3000/auth/callback/google` (for dev)
5. Copy Client ID and Client Secret to environment variables

**Scopes needed:**
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.metadata
```

### 2. Set Up Outlook OAuth (Optional)

**Azure Portal:**
1. Go to [portal.azure.com](https://portal.azure.com)
2. Azure Active Directory → App registrations → New registration
3. Name: "FundOps"
4. Redirect URI: `https://fundops.vercel.app/auth/callback/microsoft`
5. Permissions: Add `Mail.Read` delegated permission
6. Copy Application (client) ID and create Client Secret

### 3. Test End-to-End

1. **Local test first:**
   ```bash
   npm run dev  # Start frontend
   npm run dev:backend  # Start backend
   ```
   Visit `http://localhost:3000`, sign in, authorize Gmail

2. **Production test:**
   Visit `https://fundops.vercel.app`
   - Sign up
   - Authorize Gmail
   - Send test email to yourself
   - Wait 5 minutes (for cron)
   - Check inbox in app

### 4. Monitor Deployments

**Vercel Dashboard:**
- Deployments → View logs
- Analytics → Check traffic
- Speed Insights → Monitor performance

**Supabase Dashboard:**
- Database → Table Editor (view data)
- Logs → Edge Functions logs
- Storage → Check file uploads

---

## Development Workflow

### Running Locally

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
# Visit http://localhost:3000
```

**Terminal 2 - Backend (if separate):**
```bash
cd backend
npm run dev
# API at http://localhost:3001
```

**Terminal 3 - Email Polling (manual test):**
```bash
cd utilities
source venv/bin/activate
python jobs/poll_inbox.py
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/add-outlook-support

# 2. Make changes, test locally

# 3. Commit
git add .
git commit -m "Add Outlook OAuth integration"

# 4. Push
git push origin feature/add-outlook-support

# 5. Vercel auto-deploys preview
# Check preview URL in Vercel dashboard

# 6. Merge to main
git checkout main
git merge feature/add-outlook-support
git push origin main

# 7. Vercel auto-deploys to production
```

### Database Migrations

```bash
# Create new migration
cd infra/supabase/migrations
touch 003_add_sentiment_to_emails.sql

# Write SQL
echo "ALTER TABLE emails_parsed ADD COLUMN sentiment TEXT;" > 003_add_sentiment_to_emails.sql

# Apply to local
supabase db push

# Apply to production
supabase db push --project-ref <prod-project-ref>
```

---

## Troubleshooting

### Issue: Vercel deployment fails

**Check:**
```bash
# View build logs
vercel logs <deployment-url>

# Common fixes:
# - Missing environment variables
# - Node version mismatch (add engines to package.json)
# - Build command incorrect in vercel.json
```

### Issue: Gmail OAuth not working

**Check:**
1. Redirect URI matches exactly (including https)
2. Client ID/Secret in environment variables
3. Gmail API enabled in Google Cloud Console
4. OAuth consent screen configured

**Debug:**
```bash
# Check env vars are set
vercel env ls

# Test OAuth flow locally first
# Check browser console for errors
```

### Issue: Emails not being ingested

**Check:**
1. Cron job running? (Vercel Cron shows last run in dashboard)
2. OAuth tokens expired? (Check `auth_accounts` table)
3. API rate limits hit? (Check logs for 429 errors)

**Debug:**
```bash
# Manual trigger
curl -X POST https://fundops.vercel.app/api/cron/poll-inbox \
  -H "Authorization: Bearer $CRON_SECRET"

# Check Supabase logs
# Dashboard → Logs → Filter by "poll_inbox"
```

### Issue: Attachments not downloading

**Check:**
1. Storage bucket exists and is private
2. RLS policies allow authenticated users
3. File size under 25MB limit
4. MIME type allowed

**Debug:**
```sql
-- Check storage objects
SELECT * FROM storage.objects 
WHERE bucket_id = 'email_attachments' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check bucket configuration
SELECT * FROM storage.buckets 
WHERE id = 'email_attachments';
```

### Issue: AI parsing returning errors

**Check:**
1. Anthropic API key valid (test at console.anthropic.com)
2. Rate limits (50 req/min for free tier)
3. Prompt too long (max 200k tokens)

**Debug:**
```bash
# Test parsing locally
cd utilities
python -c "
from parsing.parser import parse_email
result = parse_email('test email content')
print(result)
"
```

---

## Performance Optimization

### 1. Enable Vercel Edge Caching
```typescript
// frontend/pages/api/deals/index.ts
export const config = {
  runtime: 'edge',
};

// Add cache headers
res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
```

### 2. Database Connection Pooling
```bash
# Use Supabase connection pooler
# In DATABASE_URL, change port from :5432 to :6543
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres
```

### 3. Optimize Images
```bash
# Use Next.js Image component
import Image from 'next/image';

<Image src="/logo.png" width={200} height={100} />
```

---

## Security Checklist

- [ ] All API keys in environment variables (never in code)
- [ ] RLS enabled on all Supabase tables
- [ ] Storage buckets are private
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] OAuth tokens encrypted in database
- [ ] Cron endpoints protected with secret
- [ ] Rate limiting on API routes
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (React does this by default)

---

## Monitoring & Alerts

### Set up Sentry (Error Tracking)
```bash
npm install @sentry/nextjs

# Follow setup wizard
npx @sentry/wizard -i nextjs
```

### Set up Vercel Analytics
```bash
npm install @vercel/analytics

# Add to _app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

### Uptime Monitoring
Use [UptimeRobot](https://uptimerobot.com) (free):
- Monitor: `https://fundops.vercel.app/api/health`
- Alert: Email if down for >5 minutes

---

## Costs Estimate

### Free Tier (MVP):
- **Vercel:** Free (100GB bandwidth, unlimited deployments)
- **Supabase:** Free (500MB database, 1GB storage, 50K MAU)
- **Anthropic:** $5/month (500 emails parsed)
- **Gmail API:** Free (quota: 1B units/day)
- **GitHub Actions:** Free (2,000 minutes/month)

**Total: ~$5/month**

### Paid Tier (10 users, 10K emails/month):
- **Vercel Pro:** $20/month (faster builds, analytics)
- **Supabase Pro:** $25/month (8GB database, 100GB storage)
- **Anthropic:** $100/month (10K emails)
- **Total: ~$145/month**

---

## Next Steps After Deployment

1. [ ] Invite alpha users
2. [ ] Set up error monitoring (Sentry)
3. [ ] Configure custom domain
4. [ ] Set up Slack notifications for errors
5. [ ] Enable Vercel Speed Insights
6. [ ] Create admin dashboard for monitoring
7. [ ] Schedule weekly backup of Supabase database
8. [ ] Document runbook for common issues

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Anthropic Docs:** https://docs.anthropic.com
- **Gmail API:** https://developers.google.com/gmail/api
- **Next.js Docs:** https://nextjs.org/docs

---

**Last Updated:** January 20, 2026  
**Maintained By:** FundOps Team  
**Questions?** Open an issue in the repo or contact the team.
