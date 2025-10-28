# Centcom v1.0.0 Upload Instructions

## Quick Start

Follow these steps to upload the Centcom installers to your Lyceum platform:

---

## Step 1: Get Your Admin JWT Token

You need an admin JWT token to authenticate the upload.

### Option A: Get Token from Browser (Easiest)
See the detailed guide in **GET_TOKEN.md** for multiple methods to find your token.

Quick method:
1. Go to https://thelyceum.io and log in with your admin account
2. Open browser DevTools (press F12)
3. Go to the **Console** tab
4. Run this command to find all auth-related keys:
   ```javascript
   Object.keys(localStorage).filter(key => key.includes('auth')).forEach(key => {
       console.log('Key:', key);
   });
   ```
5. Once you find the correct key, get the token (see GET_TOKEN.md for details)

### Option B: Use Supabase Dashboard
1. Go to your Supabase dashboard
2. Navigate to: **Authentication** → **Users**
3. Find your admin user
4. Click the three dots → **Generate new access token**
5. Copy the token

---

## Step 2: Update the Upload Script

1. Open the file: `upload_centcom_installers.ps1`
2. Find line 9: `$ADMIN_TOKEN = "YOUR_ADMIN_JWT_TOKEN_HERE"`
3. Replace `YOUR_ADMIN_JWT_TOKEN_HERE` with your actual JWT token
4. **Update file paths if needed:**
   - The script assumes the Centcom repo is in the same parent directory
   - If files are elsewhere, update lines 12-13 with the correct paths

Example:
```powershell
# If Centcom repo is at: C:\Users\joshual\Documents\Cursor\centcom
$MSI_FILE = "..\centcom\src-tauri\target\release\bundle\msi\Centcom_1.0.0_x64_en-US.msi"
$EXE_FILE = "..\centcom\src-tauri\target\release\bundle\nsis\Centcom_1.0.0_x64-setup.exe"
```

---

## Step 3: Run the Upload Script

Open PowerShell and run:

```powershell
cd C:\Users\joshual\Documents\Cursor\lyceum
.\upload_centcom_installers.ps1
```

### Expected Output:
```
============================================================================
  Centcom v1.0.0 Installer Upload
============================================================================

Uploading MSI installer...
  File: src-tauri\target\release\bundle\msi\Centcom_1.0.0_x64_en-US.msi
  Size: 309 MB
  SUCCESS: MSI uploaded!
  Version ID: abc-123-def-456

Uploading NSIS installer...
  File: src-tauri\target\release\bundle\nsis\Centcom_1.0.0_x64-setup.exe
  Size: 306 MB
  SUCCESS: NSIS installer uploaded!
  Version ID: xyz-789-ghi-012

============================================================================
  Upload Complete!
============================================================================
```

---

## Step 4: Verify Upload in Supabase

1. Go to your Supabase dashboard
2. Navigate to: **Storage** → **centcom-releases**
3. You should see:
   ```
   windows/
     1.0.0/
       Centcom_1.0.0_x64_en-US.msi
       Centcom_1.0.0_x64-setup.exe
   ```

4. Check database records:
   - Go to **Table Editor** → **application_versions**
   - You should see 2 rows:
     - Version 1.0.0, platform: windows, installer_type: msi
     - Version 1.0.0, platform: windows, installer_type: exe

---

## Step 5: Test Download from Dashboard

1. Go to https://thelyceum.io/dashboard
2. You should see a new **"Desktop Application"** card with a purple/indigo gradient
3. Click **"Download Centcom"** or **"Download Update"**
4. Select either:
   - **MSI** (for enterprise/IT deployments)
   - **EXE** (for end users)
5. Click **Download**
6. The installer should download to your computer

---

## Troubleshooting

### Error: "Authentication failed"
- Your JWT token may be expired
- Get a fresh token following Step 1 again

### Error: "File not found"
- Check the file paths in the script (lines 12-13)
- Make sure the Centcom installers exist at those locations
- Use absolute paths if needed

### Error: "Forbidden" or "Not authorized"
- Make sure your user account has admin or superadmin role
- Check in Supabase: **Table Editor** → **user_profiles** → find your user → verify `role` column

### Upload is very slow
- These are large files (~300MB each)
- Upload may take 5-15 minutes depending on your internet speed
- Don't close PowerShell until you see "SUCCESS"

---

## Expected SHA256 Hashes

After upload, verify these match:

- **MSI**: `420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0`
- **EXE**: `AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287`

The API will automatically calculate and store these during upload.

---

## Next Steps

After successful upload:

1. ✅ Test download from dashboard
2. ✅ Verify downloaded file SHA256 matches
3. ✅ Share dashboard URL with Centcom team for testing
4. ✅ Centcom team tests auto-update from their desktop app
5. ✅ Coordinate beta testing with 5-10 users

---

## Alternative: Manual curl Upload

If PowerShell script doesn't work, use curl:

```bash
# Upload MSI
curl -X POST https://thelyceum.io/api/admin/centcom/releases/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@src-tauri/target/release/bundle/msi/Centcom_1.0.0_x64_en-US.msi" \
  -F "version=1.0.0" \
  -F "platform=windows" \
  -F "architecture=x64" \
  -F "installer_type=msi" \
  -F "is_stable=true" \
  -F "auto_update_enabled=true"

# Upload EXE
curl -X POST https://thelyceum.io/api/admin/centcom/releases/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@src-tauri/target/release/bundle/nsis/Centcom_1.0.0_x64-setup.exe" \
  -F "version=1.0.0" \
  -F "platform=windows" \
  -F "architecture=x64" \
  -F "installer_type=exe" \
  -F "is_stable=true" \
  -F "auto_update_enabled=true"
```

---

**Need help?** Review the logs in PowerShell or check the API response for specific error messages.
