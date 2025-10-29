# Deploy Dual-Branding System - Do This Now!

You have all 4 installers on GitHub. Now let's make them downloadable for users.

---

## 🚀 Step 1: Deploy API Updates (2 minutes)

The API code is already updated with brand detection. Just deploy it:

```bash
cd c:\Users\joshual\Documents\Cursor\lyceum

# Add the updated API files
git add src/app/api/centcom/versions/latest/route.ts
git add src/app/api/centcom/download/[version]/[platform]/route.ts

# Commit with clear message
git commit -m "feat: Add dual-branding support (Lyceum/Centcom) via organization-based detection

- Add getUserBrandType() to detect user's organization brand
- Filter version queries by brand_type
- Track brand in download analytics
- Support lyceum-platform/centcom-releases repository
- Default to 'lyceum' brand for users without organizations"

# Push to trigger Vercel deployment
git push
```

**Wait 1-2 minutes** for Vercel to deploy. You'll see the deployment complete in your Vercel dashboard.

---

## 📊 Step 2: Update Database (3 minutes)

### A. Open Supabase SQL Editor
Go to: `https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new`

### B. Run FINAL_DEPLOYMENT.sql
1. Open the file: [FINAL_DEPLOYMENT.sql](FINAL_DEPLOYMENT.sql)
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **"Run"**

### C. Verify Output
You should see a table with 4 rows:

```
version | platform | installer | brand   | size_mb | filename
--------|----------|-----------|---------|---------|---------------------------
1.0.0   | windows  | exe       | centcom | 305     | Centcom_1.0.0_x64-setup.exe
1.0.0   | windows  | msi       | centcom | 309     | Centcom_1.0.0_x64_en-US.msi
1.0.0   | windows  | exe       | lyceum  | 306     | Lyceum_1.0.0_x64-setup.exe
1.0.0   | windows  | msi       | lyceum  | 309     | Lyceum_1.0.0_x64_en-US.msi
```

✅ **Success!** All 4 branded versions are now in the database.

---

## 🧪 Step 3: Test Lyceum Download (5 minutes)

### A. Check User's Current Brand
Run this in Supabase SQL Editor:

```sql
SELECT
  u.email,
  o.name as organization_name,
  o.brand_type
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id AND om.status = 'active'
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
```

**Result:**
- If `brand_type` is `NULL` or `lyceum` → User will download Lyceum version ✅
- If `brand_type` is `centcom` → User will download Centcom version

### B. Test the Download
1. Go to your production dashboard: `https://your-domain.vercel.app/dashboard`
2. Click **"Desktop Application"** card
3. Select **"EXE Installer"** (or MSI)
4. Click **"Download"**

### C. Check Browser Console
Open DevTools (F12) and look for:
```
✅ User brand type: lyceum
```

### D. Verify Download
- File should start downloading: `Lyceum_1.0.0_x64-setup.exe`
- No 404 errors
- No GitHub login prompts
- Download completes successfully

✅ **Lyceum download working!**

---

## 🧪 Step 4: Test Centcom Download (5 minutes)

### A. Switch Organization to Centcom Brand

Run this in Supabase SQL Editor:

```sql
-- Get your organization ID first
SELECT
  o.id,
  o.name,
  o.brand_type,
  COUNT(om.user_id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, o.brand_type;

-- Change your organization to Centcom
UPDATE organizations
SET brand_type = 'centcom'
WHERE id = (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
    AND status = 'active'
  LIMIT 1
)
RETURNING id, name, brand_type;
```

**Expected output:**
```
id   | name          | brand_type
-----|---------------|------------
UUID | Your Org Name | centcom
```

### B. Test the Download Again
1. **Refresh** the dashboard page
2. Click **"Desktop Application"** card
3. Select installer type
4. Click **"Download"**

### C. Check Browser Console
Should now show:
```
✅ User brand type: centcom
```

### D. Verify Download
- File should download: `Centcom_1.0.0_x64-setup.exe` (not Lyceum!)
- Download completes successfully

✅ **Centcom download working!**

### E. Switch Back to Lyceum (Optional)

```sql
UPDATE organizations
SET brand_type = 'lyceum'
WHERE id = (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
    AND status = 'active'
  LIMIT 1
)
RETURNING id, name, brand_type;
```

---

## 🎯 Step 5: Test GitHub URLs Directly (2 minutes)

Open an **incognito/private browser window** (to test without GitHub login) and paste these URLs:

**Lyceum:**
- https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64-setup.exe
- https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64_en-US.msi

**Centcom:**
- https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
- https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi

**All 4 should:**
- ✅ Start downloading immediately
- ✅ No login prompts
- ✅ No 404 errors

---

## 🎨 Step 6: Test Installed Applications (10 minutes)

### Test Lyceum Application
1. Install `Lyceum_1.0.0_x64-setup.exe`
2. Launch the application
3. Verify:
   - ✅ Window title shows "Lyceum"
   - ✅ Login screen says "Sign in to Lyceum Native"
   - ✅ Sidebar shows Lyceum logo
   - ✅ Application functions correctly

### Test Centcom Application
1. Uninstall Lyceum version
2. Install `Centcom_1.0.0_x64-setup.exe`
3. Launch the application
4. Verify:
   - ✅ Window title shows "Centcom"
   - ✅ Branding is Centcom-themed
   - ✅ Application functions correctly

---

## ✅ Success Checklist

After completing all steps, verify:

- [x] API deployed with brand detection
- [x] Database has 4 version records (2 brands × 2 installers)
- [x] Lyceum users download Lyceum branded installers
- [x] Centcom users download Centcom branded installers
- [x] All GitHub URLs work without authentication
- [x] Both applications install and run correctly
- [x] Downloads are tracked in database

---

## 📊 Monitor Downloads

After deployment, check download analytics:

```sql
-- See recent downloads
SELECT
  ad.created_at,
  u.email,
  ad.brand_type,
  ad.installer_type,
  ad.version
FROM application_downloads ad
JOIN auth.users u ON ad.user_id = u.id
ORDER BY ad.created_at DESC
LIMIT 20;

-- Summary by brand
SELECT
  brand_type,
  installer_type,
  COUNT(*) as downloads
FROM application_downloads
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY brand_type, installer_type
ORDER BY brand_type, installer_type;
```

---

## 🆘 Troubleshooting

### "Version not found" error
- Run TEST 1 in [TEST_DOWNLOADS.sql](TEST_DOWNLOADS.sql)
- Verify 4 records exist in database

### Wrong brand downloading
- Run TEST 2 in [TEST_DOWNLOADS.sql](TEST_DOWNLOADS.sql)
- Check organization's brand_type
- Verify user is member of organization with `status='active'`

### GitHub 404 error
- Test URLs directly in incognito browser
- Verify files exist at: https://github.com/lyceum-platform/centcom-releases/releases/tag/v1.0.0
- Check filenames match exactly

### API not detecting brand
- Check Vercel deployment completed
- Look at Vercel function logs
- Verify `getUserBrandType()` function exists in deployed code

---

## 🎉 You're Done!

Your dual-branding download system is now live! Users will automatically get the correct branded version based on their organization.

**Key Features Working:**
- ✅ Automatic brand detection via organization membership
- ✅ Separate installers for Lyceum and Centcom brands
- ✅ License-gated downloads
- ✅ Download analytics and tracking
- ✅ Free GitHub hosting with fast CDN
- ✅ SHA256 verification for security

**What's Next:**
- Monitor download analytics
- Gather user feedback
- Build admin UI for brand management (optional)
- Plan next version release

---

**Estimated Time:** 15-20 minutes total
**Current Status:** Ready to deploy! 🚀
