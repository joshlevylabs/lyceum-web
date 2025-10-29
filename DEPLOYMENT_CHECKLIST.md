# Dual-Branding Deployment - Quick Checklist

**You have all 4 installers built!** Now follow these steps in order:

---

## ✅ Step 1: Upload Installers to GitHub (5 min)

### A. Go to your release
Visit: `https://github.com/joshlevylabs/datacenter-releases/releases/tag/v1.0.0`

### B. Click "Edit release"

### C. Upload all 4 branded installers

Upload these files from your datacenter build directory:

**Lyceum Brand:**
- `c:\Users\joshual\Documents\Cursor\datacenter\src-tauri\target\release\bundle\msi\Lyceum_1.0.0_x64_en-US.msi`
- `c:\Users\joshual\Documents\Cursor\datacenter\src-tauri\target\release\bundle\nsis\Lyceum_1.0.0_x64-setup.exe`

**Centcom Brand (rename for consistency):**
- Upload `Centcom_1.0.0_x64_en-US.msi` as `Datacenter_Centcom_1.0.0_x64_en-US.msi`
- Upload `Centcom_1.0.0_x64-setup.exe` as `Datacenter_Centcom_1.0.0_x64-setup.exe`

### D. Click "Update release"

**Verify:** All 4 files should be visible in the release assets.

---

## ✅ Step 2: Deploy API Updates (2 min)

### Commit and push your changes

```bash
cd c:\Users\joshual\Documents\Cursor\lyceum

# Add updated API files
git add src/app/api/centcom/versions/latest/route.ts
git add src/app/api/centcom/download/[version]/[platform]/route.ts

# Commit
git commit -m "feat: Add dual-branding support with organization-based brand detection"

# Push to trigger Vercel deployment
git push
```

**Wait for Vercel deployment** to complete (usually 1-2 minutes)

---

## ✅ Step 3: Update Database (5 min)

### Run the deployment SQL script

1. Open Supabase SQL Editor: `https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new`

2. Copy the entire contents of `DEPLOY_DUAL_BRANDING.sql`

3. Click "Run"

**This script will:**
- ✅ Add `brand_type` column to `organizations` table
- ✅ Add `brand_type` column to `application_versions` table
- ✅ Update existing Centcom records with new URLs
- ✅ Insert new Lyceum version records
- ✅ Verify all 4 versions exist

**Expected output:** You should see 4 rows returned:
- `centcom | exe | Datacenter_Centcom_1.0.0_x64-setup.exe`
- `centcom | msi | Datacenter_Centcom_1.0.0_x64_en-US.msi`
- `lyceum | exe | Lyceum_1.0.0_x64-setup.exe`
- `lyceum | msi | Lyceum_1.0.0_x64_en-US.msi`

---

## ✅ Step 4: Test the System (10 min)

### Test Scenario 1: Lyceum User (Default)

Your test user (the one with professional license) should currently have no organization or a Lyceum organization.

1. Go to production dashboard: `https://your-domain.com/dashboard`
2. Click "Desktop Application" card
3. Select installer type (MSI or EXE)
4. Click "Download"

**Expected Result:**
- ✅ Console shows: `User brand type: lyceum`
- ✅ Downloads file: `Lyceum_1.0.0_x64-setup.exe` (or MSI)
- ✅ File downloads successfully from GitHub

---

### Test Scenario 2: Centcom User

To test Centcom branding, you need to:

**Option A: Create a Centcom organization**

```sql
-- In Supabase SQL Editor

-- Create a Centcom test organization
INSERT INTO organizations (name, brand_type)
VALUES ('Test Centcom Org', 'centcom')
RETURNING *;

-- Note the organization ID, then add your user to it
INSERT INTO organization_members (organization_id, user_id, status, role)
VALUES (
  'PASTE_ORG_ID_HERE',
  '2c3d4747-8d67-45af-90f5-b5e9058ec246', -- Your test user ID
  'active',
  'member'
)
RETURNING *;
```

**Option B: Change an existing organization to Centcom**

```sql
-- Find your organization
SELECT id, name, brand_type FROM organizations;

-- Change it to centcom
UPDATE organizations
SET brand_type = 'centcom'
WHERE id = 'YOUR_ORG_ID'
RETURNING *;
```

**Then test the download:**

1. Refresh dashboard
2. Click "Desktop Application" card
3. Select installer type
4. Click "Download"

**Expected Result:**
- ✅ Console shows: `User brand type: centcom`
- ✅ Downloads file: `Datacenter_Centcom_1.0.0_x64-setup.exe` (or MSI)
- ✅ File downloads successfully from GitHub

---

## ✅ Step 5: Verify Installers Work

### Test Lyceum Installer
1. Run `Lyceum_1.0.0_x64-setup.exe`
2. Install the application
3. Launch it
4. Verify:
   - ✅ Shows "Lyceum" branding
   - ✅ Login screen says "Sign in to Lyceum Native"
   - ✅ Sidebar shows Lyceum logo

### Test Centcom Installer
1. Uninstall Lyceum version (if installed)
2. Run `Datacenter_Centcom_1.0.0_x64-setup.exe`
3. Install the application
4. Launch it
5. Verify:
   - ✅ Shows "Centcom" branding
   - ✅ Application works correctly

---

## 🎉 Success Criteria

The deployment is successful when:

- ✅ All 4 installers uploaded to GitHub releases
- ✅ API deployed with brand detection code
- ✅ Database has 4 version records (2 per brand)
- ✅ Lyceum users download Lyceum installers
- ✅ Centcom users download Centcom installers
- ✅ Both installers work correctly when run
- ✅ No 404 or authentication errors

---

## 🔧 Troubleshooting

### "Version not found" error
- Check SQL output from Step 3 - all 4 versions should exist
- Verify brand_type column was added successfully
- Check console logs for user's detected brand

### "No organization" or always defaults to Lyceum
- User needs to be a member of an organization
- Check: `SELECT * FROM organization_members WHERE user_id = 'USER_ID'`
- Organization must have `status = 'active'`

### GitHub 404 on download
- Verify all 4 files were uploaded in Step 1
- Check filenames match exactly in database
- Try downloading directly from GitHub release page

### Wrong brand downloading
- Check user's organization: `SELECT o.brand_type FROM organizations o JOIN organization_members om ON o.id = om.organization_id WHERE om.user_id = 'USER_ID'`
- Verify organization has correct brand_type
- Check console logs for detected brand

---

## 📊 Monitoring

After deployment, monitor:

### Download Analytics
```sql
SELECT
  brand_type,
  installer_type,
  COUNT(*) as downloads,
  DATE_TRUNC('day', created_at) as download_date
FROM application_downloads
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY brand_type, installer_type, DATE_TRUNC('day', created_at)
ORDER BY download_date DESC, brand_type, installer_type;
```

### Organization Distribution
```sql
SELECT
  brand_type,
  COUNT(*) as org_count,
  SUM((SELECT COUNT(*) FROM organization_members WHERE organization_id = organizations.id AND status = 'active')) as total_members
FROM organizations
GROUP BY brand_type;
```

---

## 📝 Next Steps (Optional)

After successful deployment, you can:

1. **Build Admin UI** - Create organization brand management interface
2. **Add Analytics Dashboard** - Visualize downloads by brand
3. **Implement Brand Switching** - Allow users to switch brands
4. **Add macOS/Linux Support** - Extend to other platforms

---

## 🆘 Need Help?

- **API errors:** Check Vercel logs
- **Database errors:** Check Supabase logs
- **Download issues:** Verify GitHub release URLs
- **Build issues:** Check datacenter repo build process

---

**Estimated Total Time:** 20-25 minutes

**Current Status:** Ready to deploy!
