# Database Troubleshooting - Table Not Found

## Error
```
ERROR: relation "local_cluster_usage" does not exist
```

## Your Supabase Configuration
- **Project URL:** `https://kffiaqsihldgqdwagook.supabase.co`
- **Project ID:** `kffiaqsihldgqdwagook`

---

## ✅ Solution: Verify You're in the Correct Project

### Step 1: Open the Correct Supabase Project

1. Go to: https://supabase.com/dashboard/projects
2. Find and click on project: **kffiaqsihldgqdwagook**
3. Click **SQL Editor** in the left sidebar

### Step 2: Verify the Table Exists

Run this query first:
```sql
-- Check if table exists
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'local_cluster_usage';
```

**Expected Result:**
```
table_name          | table_schema
--------------------|-------------
local_cluster_usage | public
```

---

## Scenario A: Table Exists

If the table exists, run the cleanup script in [FIX_DUPLICATE_CLUSTERS.sql](FIX_DUPLICATE_CLUSTERS.sql).

---

## Scenario B: Table Doesn't Exist

If the table doesn't exist, it means the schema hasn't been migrated yet. Here are the options:

### Option 1: Create the Table (Recommended)

Run this SQL to create the `local_cluster_usage` table:

```sql
-- Create local_cluster_usage table
CREATE TABLE IF NOT EXISTS public.local_cluster_usage (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID UNIQUE DEFAULT gen_random_uuid(),
  cluster_key VARCHAR(50) UNIQUE,

  -- User and license
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_id UUID REFERENCES public.license_keys(id),
  license_key_id UUID REFERENCES public.license_keys(id),

  -- Machine identification
  machine_fingerprint VARCHAR(255) NOT NULL,
  installation_id VARCHAR(255),
  hostname VARCHAR(255),

  -- Cluster information
  cluster_name VARCHAR(255),
  cluster_status VARCHAR(50) DEFAULT 'registered',

  -- Software versions
  clickhouse_version VARCHAR(50),
  centcom_version VARCHAR(50),

  -- System information
  machine_os VARCHAR(100),
  os_version VARCHAR(100),
  architecture VARCHAR(50),
  machine_cpu_cores INTEGER,
  machine_memory_gb NUMERIC(10, 2),

  -- Usage metrics
  storage_used_gb NUMERIC(10, 4) DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  queries_this_month INTEGER DEFAULT 0,
  project_count INTEGER DEFAULT 0,
  measurement_count INTEGER DEFAULT 0,
  table_count INTEGER DEFAULT 0,

  -- Runtime status
  is_running BOOLEAN DEFAULT false,
  uptime_seconds BIGINT,

  -- Sync tracking
  sync_token_hash VARCHAR(255),
  last_heartbeat_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, machine_fingerprint)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_user_id
  ON public.local_cluster_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_cluster_key
  ON public.local_cluster_usage(cluster_key);

CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_machine_fingerprint
  ON public.local_cluster_usage(machine_fingerprint);

CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_last_heartbeat
  ON public.local_cluster_usage(last_heartbeat_at DESC);

-- Enable Row Level Security
ALTER TABLE public.local_cluster_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own clusters"
  ON public.local_cluster_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clusters"
  ON public.local_cluster_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clusters"
  ON public.local_cluster_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add constraint to prevent corrupted fingerprints
ALTER TABLE public.local_cluster_usage
ADD CONSTRAINT valid_machine_fingerprint
CHECK (
  machine_fingerprint IS NOT NULL
  AND LENGTH(machine_fingerprint) >= 8
  AND machine_fingerprint NOT LIKE '[object%'
  AND machine_fingerprint NOT LIKE '%undefined%'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Table local_cluster_usage created successfully!';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '✅ Row Level Security enabled';
  RAISE NOTICE '✅ Validation constraint added to prevent corrupted data';
END $$;
```

### Option 2: Check for Existing Clusters

If the table was just created, there won't be any data yet. The Tauri app will populate it when it connects.

---

## Scenario C: Multiple Supabase Projects

If you have multiple Supabase projects, make sure you're in the right one:

### Check Your Projects
```bash
# List all your Supabase projects (if using CLI)
npx supabase projects list
```

### Verify Connection in Browser
1. Open your app: http://localhost:3594/clusters
2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Refresh the page
5. Look for API calls to `/api/clusters`
6. Check the response - if you see cluster data, the table exists

---

## Quick Test: Does Data Exist?

Your application logs showed:
```
Found 2 local cluster records for user 2c3d4747-8d67-45af-90f5-b5e9058ec246
```

This means the table **definitely exists** and has data. You're likely in the **wrong Supabase project** or **wrong database**.

### Verify Your Database Connection

Run this in SQL Editor:
```sql
-- Show current database info
SELECT
  current_database() as database,
  current_schema() as schema,
  current_user as user;

-- Check if you have the expected user
SELECT id, email
FROM auth.users
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
LIMIT 1;
```

**Expected Result:**
- Database: `postgres`
- Schema: `public`
- User: Your admin user
- Email: `josh@thelyceum.io`

If you see your email, you're in the **correct project**. If not, switch projects.

---

## Alternative: Use the Admin Dashboard

Instead of SQL, you can clean up clusters using the Supabase dashboard:

1. Go to: **Table Editor** > `local_cluster_usage`
2. Find row where `cluster_key = 'LOCAL-0002'`
3. Click the row
4. Click **Delete** button
5. Confirm deletion

---

## Still Having Issues?

Run this diagnostic query and share the results:

```sql
-- Diagnostic information
SELECT
  'Database' as info_type,
  current_database() as value
UNION ALL
SELECT 'Schema', current_schema()
UNION ALL
SELECT 'User', current_user
UNION ALL
SELECT 'Project ID', (
  SELECT setting
  FROM pg_settings
  WHERE name = 'cluster_name'
);

-- Check if our tables exist
SELECT
  table_name,
  CASE
    WHEN table_name = 'local_cluster_usage' THEN '✅ FOUND'
    ELSE '✓ exists'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'local_cluster_usage',
    'license_keys',
    'user_profiles',
    'unified_clusters'
  )
ORDER BY table_name;
```

Share the output and I can help you further!

---

## Summary

**Most Likely Issue:** You're in the wrong Supabase project

**Solution:**
1. Go to https://supabase.com/dashboard/projects
2. Select project **kffiaqsihldgqdwagook**
3. Open SQL Editor
4. Run [FIND_CORRECT_DATABASE.sql](FIND_CORRECT_DATABASE.sql) to verify
5. Then run [FIX_DUPLICATE_CLUSTERS.sql](FIX_DUPLICATE_CLUSTERS.sql)
