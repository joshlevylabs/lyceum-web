# Quick Fix: Delete Duplicate Cluster (No SQL Required)

If you're having trouble with SQL queries, you can delete the duplicate cluster directly from the Supabase dashboard.

---

## ✅ Step-by-Step (2 minutes)

### 1. Open Supabase Dashboard

Go to: https://app.supabase.com/project/kffiaqsihldgqdwagook/editor

- Replace `kffiaqsihldgqdwagook` with your actual project ID if different
- Or go to https://supabase.com/dashboard/projects and click your project

### 2. Open Table Editor

1. Click **Table Editor** in the left sidebar
2. Find and click on table: `local_cluster_usage`

### 3. Find the Corrupted Cluster

Look for these columns:
- **cluster_key:** `LOCAL-0002` ❌ (this is the bad one)
- **machine_fingerprint:** `[object ` ❌ (corrupted)

You should see TWO rows for your user:
```
Row 1: LOCAL-0002, machine_fingerprint: "[object " ❌ DELETE THIS
Row 2: LOCAL-0011, machine_fingerprint: "6bb0d83e" ✅ KEEP THIS
```

### 4. Delete the Bad Row

1. Click on the row where `cluster_key = 'LOCAL-0002'`
2. Click the **Delete** button (trash icon)
3. Confirm the deletion

### 5. Verify

1. Refresh your web app at http://localhost:3594/clusters
2. You should now see only **1 local cluster** (LOCAL-0011)

---

## ⚠️ Can't Find the Table?

If you don't see `local_cluster_usage` in the Table Editor:

### Option A: Wrong Project
- Make sure you're in project: **kffiaqsihldgqdwagook**
- Check the URL - it should contain your project ID
- Check `.env.local` file to confirm the project URL

### Option B: Table Doesn't Exist Yet
- The table may not have been created
- Run the schema creation SQL from [DATABASE_TROUBLESHOOTING.md](DATABASE_TROUBLESHOOTING.md)
- Or wait for the Tauri app to connect and auto-create it

### Option C: Check Logs
Your app logs showed the data exists:
```
Found 2 local cluster records for user 2c3d4747...
```

This confirms the table exists. Double-check you're in the correct project.

---

## Alternative: Use Filters in Table Editor

If you have many rows:

1. In Table Editor, click **Filters**
2. Add filter: `user_id` equals `2c3d4747-8d67-45af-90f5-b5e9058ec246`
3. This will show only your clusters
4. Delete the row with corrupted `machine_fingerprint`

---

## After Deletion

1. ✅ Refresh `/clusters` page - should show only 1 local cluster
2. ✅ Restart Tauri app - should NOT create duplicates (backend validation now blocks it)
3. ✅ Check backend logs - should show cluster UPDATE, not new registration

---

## Next Steps

After cleaning up:
1. Fix the Tauri app bug (see [TAURI_BUG_FIX.md](TAURI_BUG_FIX.md))
2. The backend validation is already in place to prevent future duplicates

---

## Need More Help?

Share a screenshot of:
1. Your Supabase Table Editor showing the `local_cluster_usage` table
2. Or the error message you're getting

I can provide more specific guidance!
