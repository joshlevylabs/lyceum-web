# Lyceum Team Action Plan: Fix Centcom Authentication

**Date:** 2025-10-20
**Priority:** P0 - Critical
**Assigned To:** Lyceum Backend Team
**ETA:** 2-4 hours

---

## Issue Summary

The Centcom desktop application is receiving 401 "Invalid token issuer" errors when calling Lyceum API endpoints. Root cause: JWT validation logic only accepts Supabase-issued tokens, but our login endpoint generates Lyceum-issued tokens.

**Impact:** All Centcom cluster discovery and usage sync features are blocked.

---

## Root Cause Analysis

### The Problem

**File:** [src/lib/auth-utils.ts](src/lib/auth-utils.ts#L68-L72)

**Current code (BROKEN):**
```typescript
// Line 68-72
// Check if it's a Supabase JWT with proper issuer
if (!payload.iss || !payload.iss.includes('supabase')) {
  console.log('Invalid issuer:', payload.iss)
  return { user: null, error: 'Invalid token issuer' }
}
```

**What happens:**
1. User logs in via `/api/centcom/auth/login`
2. Login endpoint generates JWT with `iss: 'lyceum'`
3. Centcom calls `/api/centcom/clusters/discover` with that token
4. `requireAuth()` calls `authenticateRequest()`
5. Token validation fails because `'lyceum'.includes('supabase')` is false
6. Returns 401 with "Invalid token issuer"

### Why This Happened

Historical context:
- `auth-utils.ts` was originally written for web app (Supabase auth)
- Centcom integration added later with custom Lyceum tokens
- Token generation updated, but validation logic wasn't

---

## Solution: Code Changes Required

### Change #1: Update JWT Issuer Validation

**File:** [src/lib/auth-utils.ts](src/lib/auth-utils.ts)

**Lines to change:** 68-72

**OLD CODE:**
```typescript
// Check if it's a Supabase JWT with proper issuer
if (!payload.iss || !payload.iss.includes('supabase')) {
  console.log('Invalid issuer:', payload.iss)
  return { user: null, error: 'Invalid token issuer' }
}
```

**NEW CODE:**
```typescript
// Check if it's a valid JWT from Lyceum or Supabase
if (!payload.iss || (!payload.iss.includes('supabase') && payload.iss !== 'lyceum')) {
  console.log('Invalid issuer:', payload.iss)
  return { user: null, error: 'Invalid token issuer' }
}

// For Lyceum tokens, verify audience
if (payload.iss === 'lyceum' && payload.aud !== 'centcom') {
  console.log('Invalid audience for Lyceum token:', payload.aud)
  return { user: null, error: 'Invalid token audience' }
}
```

**Why this works:**
- Accepts tokens where `iss` includes 'supabase' (existing web app)
- Accepts tokens where `iss` equals 'lyceum' (Centcom)
- Validates `aud: 'centcom'` for Lyceum tokens (security)
- Backward compatible with existing authentication

---

## Implementation Checklist

### Step 1: Code Changes

- [ ] Update [src/lib/auth-utils.ts](src/lib/auth-utils.ts) lines 68-72
- [ ] Add audience validation for Lyceum tokens (lines 73-77)
- [ ] Review for any other hardcoded 'supabase' checks

### Step 2: Local Testing

**Test 1: Centcom login flow**
```bash
# 1. Start Next.js dev server
npm run dev

# 2. Test login endpoint
curl -X POST http://localhost:3000/api/centcom/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lyceum-analytics.com",
    "password": "your-password"
  }'

# Expected: 200 OK with access_token
# Save the access_token for next steps
```

**Test 2: Cluster discovery with Lyceum token**
```bash
# Use access_token from previous step
export TOKEN="eyJhbGc..."

curl -X GET http://localhost:3000/api/centcom/clusters/discover \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with clusters array
# NOT: 401 "Invalid token issuer"
```

**Test 3: Usage sync with Lyceum token**
```bash
curl -X POST http://localhost:3000/api/centcom/usage/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_fingerprint": "test-machine-123",
    "storage_used_gb": 5,
    "queries_this_month": 1000,
    "clickhouse_version": "23.3",
    "machine_info": {
      "os": "Windows",
      "memory_gb": 16,
      "cpu_cores": 8
    }
  }'

# Expected: 200 OK with usage stats
```

**Test 4: Verify Supabase tokens still work**
```bash
# Log in via web app
# Get Supabase token from browser localStorage: sb-kffiaqsihldgqdwagook-auth-token
# Extract access_token

curl -X GET http://localhost:3000/api/byod/connections \
  -H "Authorization: Bearer <supabase-token>"

# Expected: 200 OK (backward compatibility maintained)
```

### Step 3: Code Review

- [ ] Review changes with team member
- [ ] Verify security implications of accepting both issuers
- [ ] Confirm audience validation is sufficient
- [ ] Check for any other files that validate JWT issuers

**Files to check for similar issues:**
```bash
# Search for other issuer checks
grep -r "includes('supabase')" src/
grep -r "iss.*supabase" src/
grep -r "issuer" src/lib/
```

### Step 4: Deploy to Vercel

**Branch strategy:**
```bash
# Create fix branch
git checkout -b fix/centcom-authentication-issuer

# Make changes
# ... edit src/lib/auth-utils.ts

# Commit with clear message
git add src/lib/auth-utils.ts
git commit -m "fix: Accept Lyceum-issued JWT tokens for Centcom API

- Update JWT issuer validation to accept both 'supabase' and 'lyceum'
- Add audience validation for Lyceum tokens (aud='centcom')
- Maintains backward compatibility with existing Supabase auth
- Fixes 401 'Invalid token issuer' errors for Centcom API calls

Resolves Centcom authentication blocking issue
Refs: CENTCOM_AUTHENTICATION_ISSUE_RESPONSE.md"

# Push to GitHub
git push origin fix/centcom-authentication-issuer
```

**Deployment options:**

**Option A: Direct merge to main (fastest)**
```bash
git checkout main
git merge fix/centcom-authentication-issuer
git push origin main

# Vercel auto-deploys main branch
# Wait ~2-3 minutes for deployment
```

**Option B: PR review (recommended for safety)**
```bash
# Create PR on GitHub
gh pr create --title "Fix: Accept Lyceum JWT tokens for Centcom" \
  --body "Fixes authentication for Centcom API endpoints"

# After approval, merge via GitHub
# Vercel auto-deploys on merge
```

### Step 5: Production Verification

**Once deployed, verify endpoints:**

```bash
# Get production URL
export API_URL="https://lyceum-sable.vercel.app"

# Test 1: Login
curl -X POST $API_URL/api/centcom/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lyceum-analytics.com",
    "password": "your-password"
  }'

# Save access_token
export TOKEN="<access_token_from_response>"

# Test 2: Cluster discovery
curl -X GET $API_URL/api/centcom/clusters/discover \
  -H "Authorization: Bearer $TOKEN" \
  -v

# Should see: HTTP/2 200
# Should NOT see: HTTP/2 401

# Test 3: Usage sync
curl -X POST $API_URL/api/centcom/usage/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_fingerprint": "prod-test",
    "storage_used_gb": 1,
    "queries_this_month": 100
  }'

# Should see: HTTP/2 200
```

### Step 6: Notify Centcom Team

**Update:** [CENTCOM_AUTHENTICATION_ISSUE_RESPONSE.md](CENTCOM_AUTHENTICATION_ISSUE_RESPONSE.md)

Add deployment section:
```markdown
## ✅ DEPLOYMENT COMPLETE

**Deployed:** 2025-10-20 at [TIME]
**Version:** [commit hash]
**Status:** Live on production

### Verification Results:
- ✅ Login endpoint: Working
- ✅ Cluster discovery: Returns 200 (was 401)
- ✅ Usage sync: Returns 200 (was 401)
- ✅ Backward compatibility: Supabase tokens still work

### Ready for Centcom Testing
Please test with your desktop application and report any issues.
```

**Communication:**
- Update this document thread
- Send notification via your team's channel
- Provide test credentials if needed

---

## Testing Matrix

### Authentication Test Cases

| Test Case | Token Type | Expected Result | Status |
|-----------|------------|-----------------|--------|
| 1. Login generates Lyceum token | N/A | iss='lyceum', aud='centcom' | ⏱️ Test |
| 2. Cluster discovery with Lyceum token | Lyceum | 200 OK | ⏱️ Test |
| 3. Usage sync with Lyceum token | Lyceum | 200 OK | ⏱️ Test |
| 4. Validate cluster access with Lyceum token | Lyceum | 200 OK | ⏱️ Test |
| 5. Web app with Supabase token | Supabase | 200 OK | ⏱️ Test |
| 6. Invalid issuer (random JWT) | Invalid | 401 Error | ⏱️ Test |
| 7. Lyceum token with wrong audience | Lyceum (wrong aud) | 401 Error | ⏱️ Test |
| 8. Expired Lyceum token | Lyceum (expired) | 401 Error | ⏱️ Test |

### Endpoints to Test

| Endpoint | Auth Required | Expected Status Before | Expected Status After |
|----------|---------------|------------------------|----------------------|
| POST /api/centcom/auth/login | No | 200 ✅ | 200 ✅ |
| GET /api/centcom/clusters/discover | Yes | 401 ❌ | 200 ✅ |
| POST /api/centcom/usage/sync | Yes | 401 ❌ | 200 ✅ |
| POST /api/centcom/validate-cluster-access | Yes | 401 ❌ | 200 ✅ |
| GET /api/centcom/health | No | 200 ✅ | 200 ✅ |
| POST /api/centcom/connection/track | Yes | 401 ❌ | 200 ✅ |
| POST /api/centcom/sessions/sync | Yes | 401 ❌ | 200 ✅ |
| GET /api/byod/connections | Yes (Supabase) | 200 ✅ | 200 ✅ |

---

## Rollback Plan

If issues arise after deployment:

### Quick Rollback (Vercel)

```bash
# Via Vercel dashboard:
# 1. Go to deployments
# 2. Find previous working deployment
# 3. Click "Promote to Production"

# Via CLI:
vercel rollback
```

### Git Rollback

```bash
git revert <commit-hash>
git push origin main
# Vercel auto-deploys
```

### Emergency: Revert auth-utils.ts only

```bash
git checkout HEAD~1 -- src/lib/auth-utils.ts
git commit -m "Revert auth changes"
git push origin main
```

---

## Post-Deployment Tasks

### Documentation Updates

- [ ] Update `CENTCOM_API_REFERENCE.md` with authentication details
- [ ] Add section on JWT token formats (Lyceum vs Supabase)
- [ ] Document issuer and audience claims
- [ ] Add troubleshooting guide for 401 errors

### Monitoring

- [ ] Watch Vercel logs for authentication errors
- [ ] Monitor Sentry/error tracking for auth failures
- [ ] Check Supabase dashboard for session activity
- [ ] Review `centcom_sessions` table for new sessions

### Follow-up Items

**Short-term (this week):**
- [ ] Add integration tests for both auth types
- [ ] Document the dual-authentication architecture
- [ ] Create API testing suite with example tokens

**Medium-term (next sprint):**
- [ ] Consider token refresh mechanism (currently 24h expiry)
- [ ] Add rate limiting to auth endpoints
- [ ] Implement API key alternative for machine-to-machine

**Long-term (future):**
- [ ] Evaluate moving to OAuth2/OpenID Connect
- [ ] Consider unified token format
- [ ] Add token revocation mechanism

---

## Security Considerations

### Token Validation Checklist

- [x] Issuer validation (lyceum OR supabase)
- [x] Audience validation (centcom for Lyceum tokens)
- [x] Expiration check (existing code)
- [ ] Signature verification (currently decode-only)
- [ ] Token revocation support (future)

### Recommendations

**Immediate:**
- Current HS256 + decode approach is acceptable for MVP
- CENTCOM_SIGNING_KEY is properly secured in env vars

**Future enhancements:**
1. **Full signature verification:**
   ```typescript
   import jwt from 'jsonwebtoken'

   // Replace decode with verify
   const payload = jwt.verify(token, CENTCOM_SIGNING_KEY, {
     issuer: ['lyceum', 'supabase'],
     audience: 'centcom'
   })
   ```

2. **Add token revocation:**
   - Store active tokens in database
   - Check against revocation list on each request
   - Provide `/api/centcom/auth/logout` endpoint

3. **Add refresh tokens:**
   - Short-lived access tokens (1 hour)
   - Long-lived refresh tokens (7 days)
   - `/api/centcom/auth/refresh` endpoint

---

## Code Review Checklist

Before deploying, verify:

**Functionality:**
- [ ] Lyceum tokens with iss='lyceum' are accepted
- [ ] Lyceum tokens with aud='centcom' are required
- [ ] Supabase tokens still work (backward compatibility)
- [ ] Invalid issuers are rejected
- [ ] Wrong audience is rejected
- [ ] Expired tokens are rejected

**Code Quality:**
- [ ] No hardcoded credentials
- [ ] Clear error messages
- [ ] Proper logging for debugging
- [ ] TypeScript types are correct
- [ ] Comments explain the logic

**Security:**
- [ ] No token leakage in logs
- [ ] Proper error handling (no stack traces to client)
- [ ] CORS headers remain restrictive
- [ ] No regression in existing auth flows

**Testing:**
- [ ] Local tests pass
- [ ] Production verification completed
- [ ] Backward compatibility verified
- [ ] Edge cases tested (expired, malformed, etc.)

---

## Timeline

### Estimated Breakdown

| Task | Duration | Status |
|------|----------|--------|
| Code changes | 15 min | ⏱️ To Do |
| Local testing | 30 min | ⏱️ To Do |
| Code review | 15 min | ⏱️ To Do |
| Deployment | 15 min | ⏱️ To Do |
| Production verification | 30 min | ⏱️ To Do |
| Notify Centcom team | 15 min | ⏱️ To Do |
| **Total** | **2 hours** | |

### Schedule

**Immediate start:**
- Start: Now
- Code complete: +30 min
- Testing complete: +1 hour
- Deployed: +1.5 hours
- Verified & notified: +2 hours

---

## Success Criteria

**Definition of Done:**

1. ✅ Code changes merged to main
2. ✅ Deployed to production (lyceum-sable.vercel.app)
3. ✅ All test cases pass
4. ✅ Centcom endpoints return 200 (not 401)
5. ✅ Backward compatibility maintained
6. ✅ Centcom team notified
7. ✅ Documentation updated

**Metrics to monitor:**

- 401 error rate (should drop to ~0%)
- Successful Centcom authentications (should increase)
- Session creation rate in `centcom_sessions` table
- Usage sync requests in `local_cluster_usage` table

---

## Contacts & Resources

### Team Members

**Assigned to:** Backend engineer (you)
**Code reviewer:** [Team lead name]
**Deployment approval:** [If required]

### Resources

**Documentation:**
- [CENTCOM_AUTHENTICATION_ISSUE_RESPONSE.md](CENTCOM_AUTHENTICATION_ISSUE_RESPONSE.md) - Response to Centcom
- [CENTCOM_API_REFERENCE.md](CENTCOM_API_REFERENCE.md) - API reference
- [src/lib/auth-utils.ts](src/lib/auth-utils.ts) - File to modify

**Testing:**
- Vercel dashboard: https://vercel.com/[your-team]/lyceum
- Database: Supabase dashboard
- Logs: Vercel deployment logs

**Communication:**
- Update CENTCOM_AUTHENTICATION_ISSUE_RESPONSE.md when deployed
- Notify via team channel
- Monitor for Centcom team's test results

---

## Notes & Observations

### Why This Issue Wasn't Caught Earlier

1. **Separate development paths:** Web app (Supabase) and Centcom (Lyceum) developed independently
2. **Missing integration tests:** No automated tests for Centcom auth flow
3. **Local testing limitation:** Centcom team may have been testing against localhost with different validation

### Lessons Learned

1. **Add integration tests** for all authentication methods
2. **Document token formats** clearly (issuer, audience, expiration)
3. **Test backward compatibility** when adding new auth methods
4. **Monitor auth errors** in production (set up alerts)

### Future Improvements

1. **Unified auth library:** Create `@lyceum/auth` package for consistent validation
2. **Auth testing suite:** Automated tests for all token types
3. **Better error messages:** Include hints about expected issuers/audience
4. **Token inspection tool:** Admin endpoint to decode/validate tokens for debugging

---

## Ready to Begin?

**Pre-flight checklist:**
- [ ] Development environment ready (Node.js, npm)
- [ ] Access to Lyceum codebase
- [ ] Vercel deployment access
- [ ] Test credentials for admin@lyceum-analytics.com
- [ ] Understanding of JWT authentication
- [ ] Communication channel with Centcom team

**Start here:**
1. Create branch: `git checkout -b fix/centcom-authentication-issuer`
2. Open file: `src/lib/auth-utils.ts`
3. Make changes: Lines 68-77
4. Test locally: Follow Step 2 checklist
5. Deploy: Follow Step 4 checklist
6. Verify: Follow Step 5 checklist
7. Notify: Update CENTCOM_AUTHENTICATION_ISSUE_RESPONSE.md

---

**Let's ship this fix! 🚀**
