# Run Database Migration on Production

**Issue**: Endpoints return 500 errors because `centcom_sessions` table doesn't exist on production Supabase.

**Solution**: Run the migration SQL on your production Supabase database.

---

## Quick Fix (Supabase Dashboard)

1. Go to https://supabase.com/dashboard
2. Click on your `lyceum` project
3. Click "SQL Editor" in the left sidebar
4. Click "+ New Query"
5. Copy the entire migration file below
6. Paste into the SQL editor
7. Click "Run" (or press Ctrl+Enter)

---

## Migration SQL

Copy this entire block:

```sql
-- Centcom Sessions Tracking Tables
-- Created: 2025-10-16
-- Purpose: Track Centcom session metadata, activity, and user data

-- 1. User Sessions Table
-- Stores session metadata after authentication
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT,
  instance_id TEXT,
  user_agent TEXT,
  platform TEXT,
  build TEXT,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);

-- 2. Session Activity Table
-- Stores session heartbeat/activity status
CREATE TABLE IF NOT EXISTS session_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'idle')),
  last_activity TIMESTAMPTZ NOT NULL,
  platform TEXT,
  version TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_activity_user_id ON session_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_session_id ON session_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_status ON session_activity(status);

-- 3. Data Clusters Table
-- Stores user's data clusters
CREATE TABLE IF NOT EXISTS data_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cluster_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_clusters_user_id ON data_clusters(user_id);

-- 4. Centcom Measurements Table
-- Stores measurements with optional project association
CREATE TABLE IF NOT EXISTS centcom_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  measurement_type TEXT,
  value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_centcom_measurements_user_id ON centcom_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_centcom_measurements_project_id ON centcom_measurements(project_id);
CREATE INDEX IF NOT EXISTS idx_centcom_measurements_created_at ON centcom_measurements(created_at);

-- 5. User Storage Table
-- Tracks user's storage usage
CREATE TABLE IF NOT EXISTS user_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_bytes BIGINT DEFAULT 0,
  last_calculated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_storage_user_id ON user_storage(user_id);

-- Update triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_activity_updated_at ON session_activity;
CREATE TRIGGER update_session_activity_updated_at BEFORE UPDATE ON session_activity
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_data_clusters_updated_at ON data_clusters;
CREATE TRIGGER update_data_clusters_updated_at BEFORE UPDATE ON data_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_storage_updated_at ON user_storage;
CREATE TRIGGER update_user_storage_updated_at BEFORE UPDATE ON user_storage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE updated_at < NOW() - INTERVAL '30 days';
  DELETE FROM session_activity WHERE updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Centcom tables created successfully!';
  RAISE NOTICE 'Tables: user_sessions, session_activity, data_clusters, centcom_measurements, user_storage';
END $$;
```

---

## Alternative: Use Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project (if not already linked)
npx supabase link --project-ref kffiaqsihldgqdwagook

# Run the migration
npx supabase db push

# Or run the specific migration file
npx supabase db execute -f supabase/migrations/20251016_centcom_FINAL.sql
```

---

## Verification

After running the migration, verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'user_sessions',
  'session_activity',
  'data_clusters',
  'centcom_measurements',
  'user_storage'
);

-- Should return 5 rows
```

Expected output:
```
table_name
------------------
user_sessions
session_activity
data_clusters
centcom_measurements
user_storage
```

---

## Test After Migration

Once the migration is complete, test the endpoints from Centcom console:

```javascript
// Get token
const session = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
const token = session?.session?.session_token;

// Test session sync (should now return 200, not 500)
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
.then(d => console.log(r.ok ? '✅' : '❌', 'Session Sync:', d))
.catch(e => console.error('❌ Failed:', e));
```

**Expected**: ✅ `{success: true, message: 'Session synced successfully', action: 'created'}`
**Before**: ❌ `{success: false, error: 'Failed to sync session data'}` (500)

---

## Troubleshooting

### Error: "relation does not exist"
- The table wasn't created
- Re-run the migration SQL
- Check for syntax errors in the SQL editor

### Error: "permission denied"
- You don't have permissions to create tables
- Contact your Supabase project owner
- Or use the service role key in your `.env`

### Still Getting 500 Errors
- Clear Vercel edge cache (wait 30 seconds)
- Hard refresh Centcom (Ctrl+Shift+R)
- Check Vercel function logs for detailed error

---

## Summary

The 500 errors are happening because:
1. ✅ Code is deployed to Vercel
2. ✅ JWT authentication is working
3. ❌ Database tables don't exist on production
4. ❌ Supabase returns error when trying to insert/query

**Fix**: Run the migration SQL above in Supabase dashboard → SQL Editor

**ETA**: 2 minutes to run migration + test
