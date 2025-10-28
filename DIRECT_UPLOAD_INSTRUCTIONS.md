# Direct Upload to Supabase (Bypass API Timeout)

The API route is timing out because of Next.js body size limits and platform timeout limits. This script uploads directly to Supabase Storage, bypassing the API completely.

---

## Step 1: Get Your Supabase Service Role Key

⚠️ **IMPORTANT**: The service_role key is very powerful and bypasses all security rules. Keep it secret!

1. Go to https://supabase.com/dashboard
2. Select your project: **kffiaqsihldgqdwagook**
3. Click **Settings** (left sidebar, bottom)
4. Click **API** tab
5. Find the **service_role** key (NOT the anon key)
6. Click **Reveal** and copy the key

It will look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...` (very long)

---

## Step 2: Update the Script

1. Open the file: `upload-centcom-direct.js`
2. Find line 13: `const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';`
3. Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service_role key
4. Save the file

---

## Step 3: Install Dependencies (if needed)

The script needs the Supabase JavaScript client. Run:

```bash
npm install @supabase/supabase-js
```

Or if you prefer yarn:
```bash
yarn add @supabase/supabase-js
```

---

## Step 4: Run the Upload Script

```bash
node upload-centcom-direct.js
```

---

## What Will Happen

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    Centcom v1.0.0 Direct Upload                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

================================================================================
Uploading: Centcom_1.0.0_x64_en-US.msi
================================================================================
📦 File size: 308.98 MB
🔐 Calculating SHA256 hash...
✅ SHA256: 420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0
📤 Reading file...
☁️  Uploading to Supabase Storage: windows/1.0.0/Centcom_1.0.0_x64_en-US.msi
⏱️  This may take 5-15 minutes...
✅ Upload successful!
💾 Creating database record...
✅ Database record created!
📋 Version ID: abc-123-def-456

================================================================================
Uploading: Centcom_1.0.0_x64-setup.exe
================================================================================
[Same process...]

================================================================================
Upload Complete: 2/2 files uploaded successfully
================================================================================

✅ All files uploaded successfully!

Next steps:
1. Test download from: https://thelyceum.io/dashboard
2. Verify SHA256 hashes match
3. Coordinate with Centcom team for end-to-end testing
```

---

## Advantages of This Method

✅ **No timeouts** - Supabase client handles long uploads
✅ **No body size limits** - Direct upload to storage
✅ **Automatic retries** - Built into Supabase client
✅ **Progress tracking** - Can see what's happening
✅ **SHA256 verification** - Calculates and stores hash

---

## Troubleshooting

### Error: "Cannot find module '@supabase/supabase-js'"
Run: `npm install @supabase/supabase-js`

### Error: "service_role key not configured"
You need to update line 13 in the script with your actual key from Supabase Dashboard

### Error: "File not found"
Check that the file paths on lines 16-27 are correct

### Error: "Row violates row-level security policy"
This means the service_role key is incorrect or not configured. Double-check you copied the **service_role** key (not the anon key)

### Upload is slow
Large files (300MB) take time. Expect 5-15 minutes per file depending on your upload speed. Don't close the terminal!

---

## Expected Upload Time

- **MSI (309 MB)**: 5-15 minutes
- **EXE (306 MB)**: 5-15 minutes
- **Total**: 10-30 minutes

The script will show progress, so you'll know it's working.

---

## Security Note

⚠️ **After uploading**, consider:
1. Removing the service_role key from the script
2. Or deleting the script entirely
3. Never commit the service_role key to git

The service_role key is like a master password for your database.

---

## Verification

After upload completes:

1. Go to Supabase Dashboard → **Storage** → **centcom-releases**
2. You should see:
   ```
   windows/
     1.0.0/
       Centcom_1.0.0_x64_en-US.msi
       Centcom_1.0.0_x64-setup.exe
   ```

3. Go to **Table Editor** → **application_versions**
4. You should see 2 new rows with version 1.0.0

---

Ready? Get your service_role key and run the script!
