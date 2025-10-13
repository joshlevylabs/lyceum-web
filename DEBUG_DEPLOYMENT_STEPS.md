# Debug Deployment Steps

## Changes Made
Added extensive logging to:
1. **Frontend** (`src/app/admin/users/[userId]/profile/page.tsx`) - Shows session details
2. **API Route** (`src/app/api/admin/users/resolve-key/[userKey]/route.ts`) - Shows received headers
3. **Auth Utils** (`src/lib/auth-utils.ts`) - Shows token validation process

## Deploy These Changes

```powershell
# Commit and push
git add .
git commit -m "Debug: Add extensive logging for auth issue"
git push origin main
```

Or use Vercel CLI:
```powershell
vercel --prod
```

## After Deployment - Check Logs

### 1. Frontend Logs (Browser Console)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to: `https://www.thelyceum.io/admin/users/USER-3/profile`
4. Look for these logs:
   - 🔐 Getting Supabase session...
   - 🔐 Session check: { hasSession: true/false, hasAccessToken: true/false, ... }
   - 📞 Calling API to resolve user key with auth header...

### 2. Backend Logs (Vercel Dashboard)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **lyceum** project
3. Click on the **Functions** tab (or **Logs** tab)
4. Filter for: `/api/admin/users/resolve-key`
5. Look for these logs:
   - 🔑 User key resolution API - Starting request...
   - 🔑 Authorization header present: true/false
   - 🔑 Authorization header preview: Bearer eyJ...
   - 🔐 authenticateRequest - authHeader: Bearer eyJ...
   - 🔐 Validating token: ... length: XXX

## What to Look For

### Scenario 1: No Access Token on Frontend
**Frontend logs show:**
```
🔐 Session check: { hasSession: false, hasAccessToken: false, ... }
❌ No access token found
```
**Problem:** User session is not persisting
**Solution:** Check Supabase auth configuration

### Scenario 2: Token Not Reaching Backend
**Frontend logs show token exists:**
```
🔐 Session check: { hasSession: true, hasAccessToken: true, tokenPreview: "eyJhbGciOiJIUzI1NiIs..." }
```
**Backend logs show:**
```
🔑 Authorization header present: false
```
**Problem:** Headers not being sent in fetch request (middleware stripping them?)
**Solution:** Check Next.js middleware or CORS settings

### Scenario 3: Token Invalid/Expired
**Both frontend and backend show token present:**
**Backend logs show:**
```
Token expired: [date]
or
Invalid token issuer: [issuer]
```
**Problem:** Token validation failing
**Solution:** Check token expiration, refresh token, or issuer validation logic

### Scenario 4: Everything Looks Good But Still 401
**All logs show token present and valid:**
**Problem:** Might be a different authentication check
**Solution:** Check if requireAuth has additional checks

## Quick Test Command

After deployment, run this in PowerShell to check live:

```powershell
# Check if deployment is live
curl https://www.thelyceum.io/api/admin/users/resolve-key/USER-3 `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -H "Content-Type: application/json"
```

Replace `YOUR_TOKEN_HERE` with your actual Supabase session token (get it from browser DevTools → Application → Local Storage → `sb-kffiaqsihldgqdwagook-auth-token`)

## Next Steps

Once you deploy and test, share:
1. **Frontend console logs** (the 🔐 Session check line)
2. **Backend function logs** from Vercel (the 🔑 Authorization header lines)

This will tell us exactly where the auth is breaking down.


