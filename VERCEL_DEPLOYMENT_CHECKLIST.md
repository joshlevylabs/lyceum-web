# Vercel Deployment Checklist - Fix Production Errors

**Current Status**: Local implementation is ✅ COMPLETE and correct
**Issue**: Vercel deployment has errors (405, 404, 401)
**Root Cause**: Likely stale deployment or missing files in Vercel

---

## 🔍 Pre-Deployment Verification (Local)

### ✅ All Endpoints Have Correct Exports

| Endpoint | POST | GET | PUT | OPTIONS | Status |
|----------|------|-----|-----|---------|--------|
| `/api/centcom/auth/session-update` | ✅ | - | - | ✅ | Ready |
| `/api/admin/sessions/update` | ✅ | - | - | ✅ | Ready |
| `/api/user/dashboard/stats` | - | ✅ | - | ✅ | Ready |
| `/api/user/onboarding/sessions` | - | ✅ | ✅ | ✅ | Ready |
| `/api/centcom/sessions/sync` | ✅ | - | - | ✅ | Ready |

### ✅ All Files Use JWT Authentication

All endpoints correctly use:
```typescript
import { getUserIdFromToken } from '@/lib/auth'

const token = authHeader?.substring(7)
const userId = getUserIdFromToken(token)
```

### ✅ CORS Middleware Configured

File `src/middleware.ts` properly handles:
- Preflight OPTIONS requests
- All required origins (tauri://, localhost)
- Credentials and headers

---

## 🚀 Deployment Steps

### Step 1: Verify Git Status

```bash
cd /c/Users/joshual/Documents/Cursor/lyceum

# Check what files are staged
git status

# You should see:
# Modified:
#   src/app/api/centcom/sessions/sync/route.ts
#   src/app/api/user/onboarding/sessions/route.ts
#   src/middleware.ts
#
# Untracked:
#   src/app/api/admin/sessions/
#   src/app/api/centcom/auth/session-update/
#   src/app/api/user/dashboard/
#   src/lib/auth.ts
#   supabase/
```

### Step 2: Add All Necessary Files

```bash
# Add all new API endpoints
git add src/app/api/centcom/auth/session-update/
git add src/app/api/admin/sessions/
git add src/app/api/user/dashboard/
git add src/lib/auth.ts

# Add modified files
git add src/app/api/centcom/sessions/sync/route.ts
git add src/app/api/user/onboarding/sessions/route.ts
git add src/middleware.ts

# Add database migration (optional but recommended)
git add supabase/migrations/20251016_centcom_FINAL.sql
```

### Step 3: Commit Changes

```bash
git commit -m "feat: Add JWT authentication to all Centcom endpoints

- Add session update endpoint (/api/centcom/auth/session-update)
- Add admin session update fallback (/api/admin/sessions/update)
- Add dashboard stats endpoint (/api/user/dashboard/stats)
- Update session sync endpoint with JWT auth
- Update onboarding sessions endpoint with JWT auth
- Add shared JWT authentication library (src/lib/auth.ts)
- Update CORS middleware for Centcom origins

All endpoints now use consistent Lyceum JWT token validation
instead of Supabase auth tokens."
```

### Step 4: Push to GitHub/Vercel

```bash
# Push to your main branch (Vercel will auto-deploy)
git push origin main

# If you use a different branch for production:
# git push origin production
```

### Step 5: Monitor Vercel Deployment

1. Go to https://vercel.com/dashboard
2. Click on your `lyceum` project
3. Watch the deployment progress
4. **Expected deployment time**: 2-3 minutes

---

## 🧪 Post-Deployment Testing

### Test 1: Check Deployment Status

Wait for Vercel to finish building, then:

```bash
# Check if deployment is live
curl https://lyceum-sable.vercel.app/api/health -I

# Should return 200 or 404 (404 is OK if health endpoint doesn't exist)
```

### Test 2: Test Session Update (POST)

**From Centcom Console:**
```javascript
const session = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
const token = session?.session?.session_token;

fetch('https://lyceum-sable.vercel.app/api/centcom/auth/session-update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: crypto.randomUUID(),
    version: '1.0.0',
    platform: navigator.platform
  })
})
.then(r => r.json())
.then(d => console.log('✅ Session Update:', d))
.catch(e => console.error('❌ Failed:', e));
```

**Expected**: `{success: true, message: 'Session updated successfully'}`
**Previous Error**: 405 Method Not Allowed

### Test 3: Test Dashboard Stats (GET)

```javascript
fetch('https://lyceum-sable.vercel.app/api/user/dashboard/stats', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(d => console.log('✅ Dashboard Stats:', d))
.catch(e => console.error('❌ Failed:', e));
```

**Expected**: Object with 8 numeric fields
**Previous Error**: 404 Not Found

### Test 4: Test Onboarding Sessions (GET)

```javascript
fetch('https://lyceum-sable.vercel.app/api/user/onboarding/sessions', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(d => console.log('✅ Onboarding Sessions:', d))
.catch(e => console.error('❌ Failed:', e));
```

**Expected**: Object with `sessions`, `progress`, and `summary`
**Previous Error**: 401 Unauthorized

### Test 5: Test Session Sync (POST)

```javascript
fetch('https://lyceum-sable.vercel.app/api/centcom/sessions/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_data: {
      session_id: crypto.randomUUID(),
      status: 'active',
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      location: { ip: '127.0.0.1', country: 'US', city: 'Dev', timezone: 'UTC', formatted: 'Dev, US' },
      device_info: { platform: navigator.platform, device_type: 'desktop', browser: 'CentCom', user_agent: navigator.userAgent, formatted: 'Desktop' },
      application_info: { app_name: 'centcom', app_version: '1.0.0', license_type: 'enterprise' },
      security_info: { mfa_verified: false, risk_score: 0.1 }
    },
    sync_metadata: {
      sync_timestamp: new Date().toISOString(),
      sync_source: 'centcom_desktop',
      sync_version: '2.0_optimized'
    }
  })
})
.then(r => r.json())
.then(d => console.log('✅ Session Sync:', d))
.catch(e => console.error('❌ Failed:', e));
```

**Expected**: `{success: true, message: 'Session synced successfully'}`

---

## 🔧 Troubleshooting Vercel Deployment

### Issue: Still Getting 405 Errors

**Possible Causes:**
1. **Deployment not finished** - Wait 2-3 minutes
2. **Cached old deployment** - Clear Vercel cache
3. **Wrong branch deployed** - Check Vercel project settings

**Fix:**
```bash
# In Vercel dashboard:
# 1. Go to Settings → Git
# 2. Check "Production Branch" is correct
# 3. Redeploy latest commit manually
```

### Issue: Still Getting 404 Errors

**Possible Causes:**
1. **Files not committed** - Check `git status`
2. **Build error** - Check Vercel build logs
3. **Incorrect file structure** - Verify paths

**Fix:**
```bash
# Verify files exist locally
ls src/app/api/user/dashboard/stats/route.ts
ls src/app/api/centcom/auth/session-update/route.ts
ls src/app/api/admin/sessions/update/route.ts

# If missing, you didn't commit them!
git add src/app/api/
git commit -m "Add missing endpoint files"
git push
```

### Issue: Still Getting 401 Errors

**Possible Causes:**
1. **JWT auth library not deployed** - Missing `src/lib/auth.ts`
2. **Environment variables missing** - Check Vercel env vars
3. **Token expired** - Get fresh token from Centcom

**Fix:**
```bash
# Verify auth lib exists
ls src/lib/auth.ts

# In Vercel dashboard:
# 1. Go to Settings → Environment Variables
# 2. Verify these exist:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - SUPABASE_SERVICE_ROLE_KEY
```

### Issue: CORS Errors

**Fix:**

Check Vercel Function Logs for CORS errors:
```bash
# In Vercel Dashboard:
# 1. Click Deployments → Latest
# 2. Click "Functions" tab
# 3. Click on failing endpoint
# 4. Check logs for CORS errors
```

Verify `src/middleware.ts` is deployed:
```bash
git log --oneline -1 src/middleware.ts
# Should show your latest commit
```

---

## 📋 Verification Checklist

After deployment, check all these:

- [ ] Vercel deployment shows "Ready" status
- [ ] All 5 endpoints return 200 (not 404, 405, or 401)
- [ ] Session update endpoint accepts POST requests
- [ ] Dashboard stats endpoint returns real data
- [ ] Onboarding sessions endpoint authenticates with JWT
- [ ] Session sync endpoint accepts JWT tokens
- [ ] No CORS errors in browser console
- [ ] Centcom dashboard shows real data (not fallback)

---

## 🎯 Expected Outcomes

### Before Deployment
```
❌ POST /api/centcom/auth/session-update → 405 Method Not Allowed
❌ POST /api/admin/sessions/update → 405 Method Not Allowed
❌ GET /api/user/dashboard/stats → 404 Not Found
❌ GET /api/user/onboarding/sessions → 401 Unauthorized
```

### After Deployment
```
✅ POST /api/centcom/auth/session-update → 200 {success: true}
✅ POST /api/admin/sessions/update → 200 {success: true}
✅ GET /api/user/dashboard/stats → 200 {data_clusters: 0, ...}
✅ GET /api/user/onboarding/sessions → 200 {sessions: {...}}
✅ POST /api/centcom/sessions/sync → 200 {success: true}
```

---

## 📞 If Still Having Issues

### Check Vercel Build Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Click "Deployments" → Latest deployment
4. Scroll to "Build Logs"
5. Look for:
   - TypeScript errors
   - Missing module errors
   - Import path errors

### Common Build Errors

**Error**: `Cannot find module '@/lib/auth'`
**Fix**: Verify `tsconfig.json` has correct paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Error**: `Module not found: Can't resolve 'src/lib/auth'`
**Fix**: Use `@/lib/auth` (with @ alias) not `src/lib/auth`

**Error**: Route handlers not found
**Fix**: Ensure files are named exactly `route.ts` (not `route.tsx`, `index.ts`, etc.)

---

## 🚨 Critical Files Checklist

Before pushing, verify these files exist:

```bash
# Run this command to verify all files exist:
for file in \
  "src/lib/auth.ts" \
  "src/middleware.ts" \
  "src/app/api/centcom/auth/session-update/route.ts" \
  "src/app/api/admin/sessions/update/route.ts" \
  "src/app/api/user/dashboard/stats/route.ts" \
  "src/app/api/user/onboarding/sessions/route.ts" \
  "src/app/api/centcom/sessions/sync/route.ts"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ MISSING: $file"
  fi
done
```

All should show ✅. If any show ❌, that file is missing!

---

## 📦 What Gets Deployed

When you push to Vercel, these files will be deployed:

```
src/
├── lib/
│   └── auth.ts                                    ← JWT decoder
├── middleware.ts                                  ← CORS handler
└── app/
    └── api/
        ├── centcom/
        │   ├── auth/
        │   │   └── session-update/
        │   │       └── route.ts                   ← New endpoint
        │   └── sessions/
        │       └── sync/
        │           └── route.ts                   ← Updated
        ├── admin/
        │   └── sessions/
        │       └── update/
        │           └── route.ts                   ← New endpoint
        └── user/
            ├── dashboard/
            │   └── stats/
            │       └── route.ts                   ← New endpoint
            └── onboarding/
                └── sessions/
                    └── route.ts                   ← Updated
```

---

## ✅ Success Criteria

Deployment is successful when:

1. ✅ Vercel shows "Deployment Ready"
2. ✅ All curl tests return 200 status
3. ✅ Centcom console shows no API errors
4. ✅ Dashboard displays real data (not "fallback data" warning)
5. ✅ Browser Network tab shows 200 responses for all endpoints

---

**Next Step**: Run the git commands above to deploy to Vercel, then test with Centcom!
