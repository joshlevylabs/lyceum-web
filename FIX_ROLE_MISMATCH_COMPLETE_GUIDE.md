# Complete Fix Guide: Centcom Role Mismatch

## Quick Diagnosis

The `/centcom/auth/login` endpoint is returning `roles: ["user"]` instead of `roles: ["admin"]` for josh@thelyceum.io.

**Most Likely Cause:** Server not restarted after code changes OR role is wrong in database.

## Fix Steps (In Order)

### Step 1: Verify Database Has Correct Role

Run [VERIFY_USER_ROLES_IN_DATABASE.sql](VERIFY_USER_ROLES_IN_DATABASE.sql):

```sql
SELECT email, role FROM public.user_profiles WHERE email = 'josh@thelyceum.io';
```

**Expected Result:**
```
email: josh@thelyceum.io
role: admin  (or Admin or super_admin)
```

**If role is 'user', fix it:**
```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'josh@thelyceum.io';

-- Verify the change
SELECT email, role FROM public.user_profiles WHERE email = 'josh@thelyceum.io';
```

### Step 2: Verify Environment Variables

Check that `.env` file has the service role key:

```bash
# In lyceum directory
cat .env | grep SUPABASE_SERVICE_ROLE_KEY
```

**Expected:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4
```

**If missing, add it:**
```bash
echo 'SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4' >> .env
```

### Step 3: Restart the Server

**CRITICAL: This is the most likely missing step!**

```bash
# If using pm2
pm2 restart lyceum
pm2 logs lyceum --lines 50

# If using npm directly
# Stop the server (Ctrl+C)
npm run dev

# If using systemd
sudo systemctl restart lyceum
sudo journalctl -u lyceum -n 50 -f
```

### Step 4: Test the Endpoint

```bash
curl -X POST http://localhost:3594/api/centcom/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"josh@thelyceum.io","password":"W00dpusher!!"}' \
  | jq '.user.roles'
```

**Expected Output:**
```json
[
  "admin"
]
```

**NOT:**
```json
[
  "user"
]
```

### Step 5: Check Server Logs

Look for these log messages:

```
🔐 Centcom authentication attempt: { email: 'josh@thelyceum.io', app_id: undefined }
✅ Supabase authentication successful: 2c3d4747-8d67-45af-90f5-b5e9058ec246
🎫 Found licenses for user: ...
🎫 Selected license: ...
🔐 SECURITY: Authoritative role from database: admin → roles array: ["admin"]
✅ Centcom authentication successful for: josh@thelyceum.io
```

**Key line to look for:**
```
🔐 SECURITY: Authoritative role from database: admin → roles array: ["admin"]
```

If you see:
```
🔐 SECURITY: Authoritative role from database: user → roles array: ["user"]
```

Then the **database has the wrong role** - go back to Step 1.

### Step 6: Verify Both Endpoints Match

Test both endpoints and compare:

**Endpoint 1: `/centcom/user/verify`**
```bash
curl "http://localhost:3594/api/centcom/user/verify?email=josh@thelyceum.io"
```

Expected: `"roles": ["admin"]`

**Endpoint 2: `/centcom/auth/login`**
```bash
curl -X POST http://localhost:3594/api/centcom/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"josh@thelyceum.io","password":"W00dpusher!!"}'
```

Expected: `"roles": ["admin"]`

**Both should return IDENTICAL roles!**

## Common Issues and Solutions

### Issue 1: Server Not Restarted

**Symptoms:**
- Code was changed but API still returns old values
- No new log messages appear
- Old console logs still showing

**Solution:**
```bash
pm2 restart lyceum
# OR kill the process and start again
```

### Issue 2: Environment Variable Not Loaded

**Symptoms:**
- Logs show: `⚠️ Profile query error: ...`
- Response still returns `roles: ["user"]`

**Solution:**
```bash
# Verify .env file exists and has the key
cat .env | grep SUPABASE_SERVICE_ROLE_KEY

# Restart server to load environment variables
pm2 restart lyceum
```

### Issue 3: Database Has Wrong Role

**Symptoms:**
- Logs show: `🔐 SECURITY: Authoritative role from database: user`
- Server was restarted
- Environment variables are correct

**Solution:**
```sql
-- Update the database
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'josh@thelyceum.io';
```

### Issue 4: Wrong File Modified

**Symptoms:**
- Code looks correct but changes aren't being applied
- Old code still executing

**Solution:**
```bash
# Verify the correct file path
ls -la src/app/api/centcom/auth/login/route.ts

# Check git status
git status

# Check file contents
grep "serviceSupabase" src/app/api/centcom/auth/login/route.ts
```

### Issue 5: Caching

**Symptoms:**
- First request returns old data
- Subsequent requests return new data
- Or: all requests return cached old data

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# Restart
pm2 restart lyceum
```

## Verification Checklist

After completing all steps:

- [ ] Database query shows: `role = 'admin'` for josh@thelyceum.io
- [ ] `.env` file contains `SUPABASE_SERVICE_ROLE_KEY=...`
- [ ] Server was restarted (new logs showing up with timestamps)
- [ ] Code file contains the fix (line 70-73: service role client creation)
- [ ] Server logs show: `Authoritative role from database: admin`
- [ ] `/centcom/auth/login` returns: `"roles": ["admin"]`
- [ ] `/centcom/user/verify` returns: `"roles": ["admin"]`
- [ ] Both endpoints return IDENTICAL roles
- [ ] Centcom app shows "Roles: admin" in profile
- [ ] Admin features accessible (Flag Cleanup, User Management)

## Still Not Working?

If you've completed all steps and it's still not working:

### Debug Mode

Add additional logging to the file:

```typescript
// In getUserProfile function, after line 76
console.log('🔍 DEBUG: About to query user_profiles with service role')
console.log('🔍 DEBUG: userId:', userId)
console.log('🔍 DEBUG: Using service key:', serviceKey?.substring(0, 20) + '...')

const { data: profile, error: profileError } = await serviceSupabase
  .from('user_profiles')
  .select(`
    username,
    full_name,
    company,
    role,
    is_active
  `)
  .eq('id', userId)
  .single()

console.log('🔍 DEBUG: Query completed')
console.log('🔍 DEBUG: Error:', profileError)
console.log('🔍 DEBUG: Profile data:', JSON.stringify(profile, null, 2))
console.log('🔍 DEBUG: Role value:', profile?.role)
```

Then restart and test again. Share the debug logs.

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Logs → Postgres Logs
3. Look for queries from the service role
4. Check if RLS is blocking anything

### Test Direct Database Access

```sql
-- Test with service role in Supabase SQL Editor
SELECT role FROM user_profiles WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
```

Expected: `admin`

If this returns `user`, then the database itself is wrong and needs to be updated.

## Contact

If still having issues after following this guide:
- Share server logs (with the debug lines added)
- Share output of `VERIFY_USER_ROLES_IN_DATABASE.sql`
- Share the exact curl command used and its output
- Confirm server was restarted (check log timestamps)
