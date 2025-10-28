# Final Testing Guide - Centcom v1.0.0 Download System

✅ **Setup Complete!** Now it's time to test the entire download flow.

---

## ✅ What's Been Completed

1. ✅ Database migration completed
2. ✅ API endpoints updated to support GitHub URLs
3. ✅ Dashboard UI ready with download button
4. ✅ GitHub Release v1.0.0 created with both installers
5. ✅ Database records created with correct GitHub URLs
6. ✅ SHA256 hashes verified

---

## 🧪 Step 1: Test Download from Dashboard (You)

### 1.1 Navigate to Dashboard

Go to: **https://thelyceum.io/dashboard**

### 1.2 Look for Desktop Application Card

You should see a card with:
- Title: **"Desktop Application"**
- Purple/indigo gradient background
- Download icon (cloud with down arrow)
- Status: "Not Installed" or version number if previously installed
- Button: **"Download Centcom"** or **"Download Update"**

### 1.3 Click Download Button

1. Click **"Download Centcom"** button
2. A modal should appear with installer options:
   - **MSI** (Recommended for Enterprise) - 309 MB
   - **EXE** (Recommended for End Users) - 306 MB
3. System requirements should be displayed
4. Select either MSI or EXE

### 1.4 Download the Installer

1. Click **"Download"** button
2. Your browser should start downloading from GitHub
3. File should be named:
   - `Centcom_1.0.0_x64_en-US.msi` (if MSI selected)
   - `Centcom_1.0.0_x64-setup.exe` (if EXE selected)

### 1.5 Verify Download (Optional but Recommended)

Open PowerShell and verify the SHA256 hash:

```powershell
# For MSI
Get-FileHash -Algorithm SHA256 "C:\Users\YourName\Downloads\Centcom_1.0.0_x64_en-US.msi"

# Expected: 420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0

# For EXE
Get-FileHash -Algorithm SHA256 "C:\Users\YourName\Downloads\Centcom_1.0.0_x64-setup.exe"

# Expected: AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287
```

### ✅ Expected Results

- ✅ Download starts immediately
- ✅ File downloads from `github.com/joshlevylabs/datacenter/releases/...`
- ✅ File size matches (306-309 MB)
- ✅ SHA256 hash matches (if verified)
- ✅ No errors in browser console

### ❌ Troubleshooting

**If you don't see the Desktop Application card:**
- Check browser console (F12) for errors
- Verify you're logged in with a valid license
- Refresh the page

**If download button doesn't work:**
- Open browser console (F12)
- Look for error messages
- Check Network tab for failed API calls

**If download fails:**
- Verify the GitHub URLs are accessible (try opening in a new tab)
- Check if you can download directly from: https://github.com/joshlevylabs/datacenter/releases/tag/v1.0.0

---

## 🧪 Step 2: Test API Endpoints Directly (Optional)

### Test 1: Check Latest Version

```bash
curl "https://thelyceum.io/api/centcom/versions/latest?platform=windows&user_id=YOUR_USER_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "update_available": true,
  "latest_version": {
    "version": "1.0.0",
    "download_url": "https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe",
    "sha256_hash": "AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287",
    "file_size_bytes": 320586752
  }
}
```

### Test 2: Get Download URL

```bash
curl "https://thelyceum.io/api/centcom/download/1.0.0/windows?user_id=YOUR_USER_ID&installer_type=exe" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "download_url": "https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe",
  "sha256_hash": "AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287",
  "file_size_bytes": 320586752,
  "expires_in": null
}
```

---

## 🤝 Step 3: Coordinate with Centcom Team

### 3.1 Share Information with Centcom Team

Send them:

1. **Dashboard URL**: https://thelyceum.io/dashboard
2. **Test User Credentials** (create a test account with active license)
3. **API Base URL**: https://thelyceum.io
4. **Available Installers**:
   - MSI: 309 MB, SHA256: `420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0`
   - EXE: 306 MB, SHA256: `AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287`

### 3.2 Centcom Team Testing Checklist

Ask them to test:

- [ ] Auto-update check from their desktop app
- [ ] Download new version via API
- [ ] SHA256 hash verification
- [ ] Silent install (if supported)
- [ ] App launches correctly after installation
- [ ] License activation works
- [ ] App can check for updates again

### 3.3 End-to-End Testing Scenarios

**Scenario 1: Fresh Install**
1. User logs into https://thelyceum.io/dashboard
2. User clicks "Download Centcom"
3. User selects installer format
4. Download completes
5. User runs installer
6. App installs successfully
7. User launches Centcom
8. User enters license key
9. License activates

**Scenario 2: Auto-Update**
1. User has Centcom v0.9.0 installed
2. Centcom checks for updates (via API)
3. Centcom detects v1.0.0 is available
4. User clicks "Update Now"
5. Centcom downloads v1.0.0
6. Centcom verifies SHA256 hash
7. Centcom installs update
8. Centcom relaunches with v1.0.0

**Scenario 3: Expired License**
1. User with expired license tries to download
2. API returns 403 Forbidden
3. Dashboard shows "License Required" message
4. User cannot download installer

---

## 📊 Step 4: Monitor Analytics

Check download analytics in Supabase:

```sql
-- View download attempts
SELECT
  user_id,
  version,
  platform,
  installer_type,
  download_started_at,
  was_successful,
  error_message
FROM application_downloads
ORDER BY download_started_at DESC
LIMIT 20;

-- View update checks
SELECT
  user_id,
  current_version,
  latest_version_available,
  update_available,
  checked_at
FROM application_update_checks
ORDER BY checked_at DESC
LIMIT 20;

-- Download success rate
SELECT
  version,
  platform,
  COUNT(*) as total_downloads,
  COUNT(*) FILTER (WHERE was_successful = true) as successful,
  COUNT(*) FILTER (WHERE was_successful = false) as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE was_successful = true) / COUNT(*), 2) as success_rate
FROM application_downloads
GROUP BY version, platform;
```

---

## ✅ Success Criteria

### For Lyceum Platform (You):
- [x] Database records created correctly
- [x] GitHub Release published
- [ ] Download button visible on dashboard
- [ ] Download initiates from GitHub
- [ ] File downloads successfully
- [ ] SHA256 hash matches
- [ ] No console errors

### For Centcom Team:
- [ ] API endpoints return correct data
- [ ] Auto-update checker works
- [ ] Download and install succeeds
- [ ] App launches correctly
- [ ] License activation works
- [ ] Update notifications appear

---

## 🐛 Common Issues and Solutions

### Issue: "Desktop Application" card not showing
**Solution**: Check if `desktopAppInfo` is being fetched in dashboard. Verify API endpoint is accessible.

### Issue: Download button does nothing
**Solution**: Open browser console, check for JavaScript errors. Verify user has valid license.

### Issue: 404 on GitHub URLs
**Solution**: Verify release is published (not draft). Check URLs are exactly correct.

### Issue: Download tracking not working
**Solution**: Check `application_downloads` table for entries. Verify service_role key is set correctly.

### Issue: Centcom app can't check for updates
**Solution**: Verify API endpoint returns valid JSON. Check authentication headers are correct.

---

## 🎉 Next Steps After Testing

Once all tests pass:

1. **Beta Testing**: Invite 5-10 users to test
2. **Monitor Metrics**: Watch download success rates
3. **Gather Feedback**: Collect user feedback on installation experience
4. **Plan v1.0.1**: Based on feedback, plan next release
5. **Documentation**: Update user documentation with installation instructions

---

## 📞 Support

If you encounter issues:
- Check browser console for errors
- Review Supabase logs for API errors
- Test API endpoints with curl
- Verify GitHub release is accessible
- Check database records are correct

---

**Ready to test?** Go to https://thelyceum.io/dashboard and try downloading Centcom!
