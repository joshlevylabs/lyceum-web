# Fix: Centcom Role Mismatch - Vercel Deployment Guide

## The Real Issue

You're right - the Lyceum backend is **deployed on Vercel**, not running locally. The fix has been committed to the code, but **Vercel is still serving the old version**.

## Why the Fix Isn't Live Yet

When you deploy to Vercel:

1. ✅ Code changes are committed to Git
2. ❌ **Vercel hasn't re-deployed** with the new code
3. ❌ Production is still serving the old code from the last successful deployment

### How Vercel Deployments Work

```
Code Change → Git Commit → Push to GitHub → Vercel Auto-Deploy → Live
                                              ↑
                                              THIS STEP MIGHT NOT HAVE HAPPENED
```

## Solution: Trigger a Vercel Deployment

### Option 1: Automatic Deployment (If Connected to Git)

If Vercel is connected to your GitHub repository:

```bash
# 1. Commit the changes (if not already done)
git add .
git commit -m "Fix: Use service role key for Centcom auth to return correct roles"

# 2. Push to the branch Vercel is watching (usually main)
git push origin main

# 3. Wait for Vercel to deploy (usually 1-3 minutes)
```

**Check deployment status:**
- Go to https://vercel.com/dashboard
- Find your Lyceum project
- Check "Deployments" tab
- Look for a new deployment with your commit message
- Wait for status to change from "Building" → "Ready"

### Option 2: Manual Deployment via Vercel CLI

If auto-deploy isn't working:

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from the lyceum directory
cd /path/to/lyceum
vercel --prod

# This will deploy the current code to production
```

### Option 3: Redeploy from Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your Lyceum project
3. Go to "Deployments" tab
4. Find the most recent deployment
5. Click the **three dots menu (⋯)**
6. Select **"Redeploy"**
7. Confirm the redeployment

### Option 4: Trigger Deployment via Git

If automatic deployment is enabled:

```bash
# Create an empty commit to trigger deployment
git commit --allow-empty -m "Trigger Vercel deployment for role fix"
git push origin main
```

## Verify the Deployment

### Step 1: Check Vercel Deployment Logs

1. Go to https://vercel.com/dashboard
2. Select your Lyceum project
3. Click on the latest deployment
4. Check the "Build Logs" tab
5. Verify the build succeeded
6. Check "Function Logs" for runtime logs

### Step 2: Test the Production Endpoint

**Replace `localhost:3594` with your production URL:**

```bash
# Test the production endpoint
curl -X POST https://www.thelyceum.io/api/centcom/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"josh@thelyceum.io","password":"W00dpusher!!"}' \
  | jq '.user.roles'
```

**Expected output:**
```json
[
  "admin"
]
```

### Step 3: Check the Deployed Code

Verify the fix is in the deployed version:

```bash
# Check the deployed code on Vercel
curl https://www.thelyceum.io/api/centcom/auth/login

# You can also check the source on GitHub to confirm the commit is there
```

## Environment Variables on Vercel

**CRITICAL:** Vercel needs the `SUPABASE_SERVICE_ROLE_KEY` environment variable!

### Check Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your Lyceum project
3. Go to **Settings** → **Environment Variables**
4. Check if `SUPABASE_SERVICE_ROLE_KEY` exists

### If Missing, Add It:

1. Click **Add New**
2. **Key:** `SUPABASE_SERVICE_ROLE_KEY`
3. **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4`
4. **Environment:** Select **Production**, **Preview**, and **Development**
5. Click **Save**
6. **IMPORTANT:** Redeploy after adding environment variables!

### Redeploy After Adding Environment Variables

```bash
# Trigger a redeployment
git commit --allow-empty -m "Redeploy with service role key env var"
git push origin main
```

Or click "Redeploy" in the Vercel dashboard.

## Common Vercel Deployment Issues

### Issue 1: Deployment Didn't Trigger

**Symptoms:**
- Pushed to Git but no new deployment in Vercel dashboard
- Old deployment is still "Current"

**Solutions:**
1. Check if the Git integration is connected
2. Check if the branch name matches (main vs master)
3. Manually trigger deployment from Vercel dashboard
4. Check if auto-deployment is enabled in project settings

### Issue 2: Deployment Failed

**Symptoms:**
- Deployment shows "Error" status in Vercel
- Build logs show errors

**Solutions:**
1. Check build logs for errors
2. Verify all dependencies are in `package.json`
3. Check for TypeScript errors
4. Ensure environment variables are set

### Issue 3: Environment Variable Not Loaded

**Symptoms:**
- Deployment succeeded but endpoint still returns wrong roles
- Logs show undefined or placeholder values

**Solutions:**
1. Verify environment variable is set in Vercel dashboard
2. Check the environment (Production vs Preview vs Development)
3. Redeploy after adding environment variables
4. Check if variable name matches exactly (case-sensitive)

### Issue 4: Cache Issue

**Symptoms:**
- New deployment is live but old code is still running
- Function logs show old code execution

**Solutions:**
1. Clear Vercel's edge cache
2. Redeploy with "Clear Cache" option
3. Wait a few minutes for CDN propagation
4. Try accessing from incognito/private window

## Verification Checklist for Vercel

- [ ] Code changes are committed to Git
- [ ] Code is pushed to the branch Vercel is watching (usually `main`)
- [ ] New deployment appears in Vercel dashboard
- [ ] Deployment status is "Ready" (not "Building" or "Error")
- [ ] `SUPABASE_SERVICE_ROLE_KEY` environment variable is set in Vercel
- [ ] Environment variable is enabled for "Production"
- [ ] Redeployed after adding environment variables (if newly added)
- [ ] Production endpoint returns `"roles": ["admin"]`
- [ ] Vercel function logs show the correct role being retrieved

## Testing on Vercel (Production)

### Test the Live Endpoint

```bash
# Test production (replace with your domain)
curl -X POST https://www.thelyceum.io/api/centcom/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"josh@thelyceum.io","password":"W00dpusher!!"}' \
  | jq '.user.roles'
```

### Check Vercel Function Logs

1. Go to https://vercel.com/dashboard
2. Select your Lyceum project
3. Go to **Deployments** → Click latest deployment
4. Go to **Functions** tab
5. Click on `api/centcom/auth/login`
6. View the logs for your test request

**Look for:**
```
🔐 SECURITY: Authoritative role from database: admin → roles array: ["admin"]
```

### Test from Centcom

1. Open Centcom application
2. Login as josh@thelyceum.io
3. Check console logs
4. Check profile page shows "Roles: admin"
5. Try accessing Flag Cleanup feature

## Database Check (Still Important)

Even with Vercel deployment, verify the database has the correct role:

```sql
-- Run in Supabase SQL Editor
SELECT email, role FROM public.user_profiles WHERE email = 'josh@thelyceum.io';
```

**Expected:** `role = 'admin'`

**If wrong, fix it:**
```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'josh@thelyceum.io';
```

## Quick Fix Summary (Vercel)

```bash
# 1. Ensure code changes are committed
git status
git log -1

# 2. Push to GitHub (triggers Vercel deployment)
git push origin main

# 3. Wait for deployment (check Vercel dashboard)
# https://vercel.com/dashboard

# 4. Verify environment variables are set
# https://vercel.com/dashboard → Settings → Environment Variables

# 5. Test production endpoint
curl -X POST https://www.thelyceum.io/api/centcom/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"josh@thelyceum.io","password":"W00dpusher!!"}' \
  | jq '.user.roles'

# Should output: ["admin"]
```

## Why Vercel is Different from Local

| Aspect | Local Development | Vercel Production |
|--------|------------------|-------------------|
| Code Changes | Instant (or hot reload) | Requires deployment |
| Restart | `npm run dev` or `pm2 restart` | Redeploy on Vercel |
| Environment Variables | `.env` file | Vercel dashboard settings |
| Logs | Terminal/console | Vercel function logs |
| Testing | `localhost:3594` | `www.thelyceum.io` |
| Deployment Time | Instant | 1-3 minutes |

## Current Status

Based on your test:

```json
{
  "roles": ["user"]  ← Still wrong
}
```

This means **ONE OF:**

1. ❌ Vercel hasn't deployed the new code yet
2. ❌ Environment variable not set on Vercel
3. ❌ Database actually has `role = 'user'` (not `admin`)

## Action Items (In Priority Order)

### Priority 1: Check Vercel Deployment Status

Go to https://vercel.com/dashboard and verify:
- [ ] Latest commit is deployed
- [ ] Deployment status is "Ready"
- [ ] Deployment timestamp is recent (after the code fix)

### Priority 2: Check Environment Variables

Go to Vercel Settings → Environment Variables:
- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists
- [ ] It's enabled for "Production"
- [ ] The value is correct (starts with `eyJhbGci...`)

### Priority 3: Check Database

Run in Supabase SQL Editor:
```sql
SELECT email, role FROM public.user_profiles WHERE email = 'josh@thelyceum.io';
```

- [ ] Result shows `role = 'admin'` (not `user`)

### Priority 4: Trigger Redeployment

If all above are correct but it still doesn't work:
```bash
git commit --allow-empty -m "Force Vercel redeploy for role fix"
git push origin main
```

Then wait 2-3 minutes and test again.

## Need Help?

If following this guide doesn't work, provide:
1. Screenshot of latest Vercel deployment status
2. Screenshot of Vercel environment variables (blur the values)
3. Output of database query: `SELECT email, role FROM user_profiles WHERE email = 'josh@thelyceum.io'`
4. Output of: `curl https://www.thelyceum.io/api/centcom/auth/login` test
5. Vercel function logs for the `/api/centcom/auth/login` endpoint

---

**Key Takeaway:** On Vercel, code changes don't apply instantly - you need to **deploy** (push to Git) and wait for Vercel to build and deploy the new version.
