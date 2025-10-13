# 🚀 Quick Setup: Groups System Database Migration

## The Issue
You're getting a **500 Internal Server Error** because the Groups database tables don't exist yet.

## Solution: Run the Migration

### Option 1: Using Supabase Dashboard (Easiest)

1. **Go to your Supabase Dashboard**:
   - Visit https://supabase.com/dashboard
   - Select your project: `kffiaqsihldgqdwagook`

2. **Open SQL Editor**:
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste the Migration**:
   - Open: `docs/centcom-integration/database/groups-system-migration.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor

4. **Run the Migration**:
   - Click "Run" button (or press Ctrl/Cmd + Enter)
   - Wait for completion message
   - Should see: "✅ Groups system migration completed successfully!"

### Option 2: Using Command Line (If you have psql)

```bash
# From your project root directory
psql $DATABASE_URL -f docs/centcom-integration/database/groups-system-migration.sql
```

If you don't have `$DATABASE_URL` set, get your connection string from Supabase:
1. Go to Project Settings → Database
2. Copy the "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password

Then run:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.kffiaqsihldgqdwagook.supabase.co:5432/postgres" -f docs/centcom-integration/database/groups-system-migration.sql
```

## Verify Tables Were Created

After running the migration, verify in Supabase Dashboard:

1. Go to **Table Editor**
2. You should see 5 new tables:
   - ✅ `groups`
   - ✅ `group_members`
   - ✅ `group_invitations`
   - ✅ `group_resource_access`
   - ✅ `group_activity_log`

## Test the Groups Feature

Once tables are created:

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Navigate to Settings → Groups tab**
3. Should now work without errors!
4. Try creating a group

## Common Issues

### "Permission denied" error
- Make sure you're using the **Database password** (not API keys)
- Check that RLS policies allow your operations

### "Table already exists" error
- Tables are already created, you're good to go!
- Just refresh your browser

### Still getting 500 error after migration
- Check browser console for specific error
- Check Supabase logs: Dashboard → Logs → Postgres Logs
- Make sure you ran the ENTIRE migration file

## What the Migration Creates

The migration sets up:
- ✅ 5 database tables with proper relationships
- ✅ Row Level Security (RLS) policies
- ✅ Helper functions for permissions
- ✅ Indexes for performance
- ✅ Triggers for automatic updates
- ✅ Activity logging system

---

**After running the migration, your Groups system will be fully operational!** 🎉



