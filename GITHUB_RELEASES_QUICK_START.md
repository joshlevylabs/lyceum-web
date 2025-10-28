# GitHub Releases Quick Start Guide

Use GitHub Releases instead of Supabase Storage to host the 300MB Centcom installers (free, supports up to 2GB per file).

---

## ✅ What's Already Done

1. ✅ Database migration completed
2. ✅ API endpoints updated to support GitHub URLs
3. ✅ Dashboard UI ready to display downloads
4. ✅ SHA256 hashes calculated:
   - MSI: `420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0`
   - EXE: `AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287`

---

## 📋 Quick Steps (15-20 minutes)

### Step 1: Create GitHub Release (10-15 min)

Go to your GitHub repository (or create new repo called "centcom-releases"):

1. Click **Releases** → **Draft a new release**
2. Set **Tag**: `v1.0.0`
3. Set **Title**: `Centcom v1.0.0`
4. Add description:
   ```markdown
   # Centcom v1.0.0 - Windows Installers

   **MSI** (309 MB): Enterprise/IT deployments
   SHA256: `420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0`

   **EXE** (306 MB): End users/standard installation
   SHA256: `AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287`
   ```

5. **Attach files**:
   - Drag/drop: `C:\Users\joshual\Documents\Cursor\datacenter\src-tauri\target\release\bundle\msi\Centcom_1.0.0_x64_en-US.msi`
   - Drag/drop: `C:\Users\joshual\Documents\Cursor\datacenter\src-tauri\target\release\bundle\nsis\Centcom_1.0.0_x64-setup.exe`
   - Upload will take 5-10 minutes per file

6. Click **Publish release**

### Step 2: Copy GitHub URLs (1 min)

After publishing, copy the download URLs. They'll be like:
```
https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi
https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
```

To get them:
- Right-click each file in the release → **Copy link address**

### Step 3: Update Database (2 min)

1. Open `INSERT_GITHUB_RELEASE_RECORDS.sql`
2. Replace `YOUR_USERNAME/REPO_NAME` with your actual GitHub path (2 places)
3. Go to Supabase Dashboard → SQL Editor
4. Paste and run the SQL

**Verify**: You should see 2 rows returned with your GitHub URLs

### Step 4: Test Download (2 min)

1. Go to https://thelyceum.io/dashboard
2. You should see **"Desktop Application"** card
3. Click **"Download Centcom"**
4. Select **MSI** or **EXE**
5. Click **Download**
6. File should download from GitHub

---

## 🎯 File Locations

**Installers**:
- MSI: `C:\Users\joshual\Documents\Cursor\datacenter\src-tauri\target\release\bundle\msi\Centcom_1.0.0_x64_en-US.msi`
- EXE: `C:\Users\joshual\Documents\Cursor\datacenter\src-tauri\target\release\bundle\nsis\Centcom_1.0.0_x64-setup.exe`

**SQL Scripts**:
- Database records: [INSERT_GITHUB_RELEASE_RECORDS.sql](INSERT_GITHUB_RELEASE_RECORDS.sql)

**Documentation**:
- Detailed guide: [GITHUB_RELEASES_SETUP.md](GITHUB_RELEASES_SETUP.md)

---

## 📝 Example GitHub URLs

If your GitHub username is `thelyceum` and repo is `centcom-releases`:

```
https://github.com/thelyceum/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi
https://github.com/thelyceum/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
```

**Then in the SQL**, replace:
```sql
'https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi'
```

With:
```sql
'https://github.com/thelyceum/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi'
```

---

## ✅ Verification Checklist

After completing all steps:

- [ ] GitHub release v1.0.0 created
- [ ] Both installers uploaded to GitHub (MSI + EXE)
- [ ] GitHub URLs copied
- [ ] SQL script updated with your GitHub URLs
- [ ] SQL script executed in Supabase
- [ ] 2 database records created (verify query shows them)
- [ ] Download button visible on dashboard
- [ ] Test download works from dashboard
- [ ] Downloaded file SHA256 hash matches

---

## 🚀 Next Steps After Upload

Once everything works:

1. Share dashboard URL with Centcom team: https://thelyceum.io/dashboard
2. Centcom team tests auto-update from their desktop app
3. Both teams coordinate end-to-end testing
4. Beta test with 5-10 users
5. Monitor download analytics in database

---

## ⚠️ Important Notes

- **Public vs Private**: If using a public repo, anyone can download the installers (but they still need a license to activate Centcom)
- **File Size**: GitHub allows up to 2GB per file, you're well under that
- **CDN**: GitHub uses a global CDN, so downloads will be fast worldwide
- **Cost**: Free for both public and private repos

---

## 🆘 Need Help?

- Can't find GitHub URLs? Click on the release, right-click files → "Copy link address"
- SQL error? Make sure you replaced `YOUR_USERNAME/REPO_NAME` in both places
- Download not working? Check browser console for error messages
- API errors? Verify the `download_url` column in `application_versions` table

---

**Ready?** Start with Step 1: Create your GitHub release!
