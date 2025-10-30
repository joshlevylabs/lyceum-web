# Simple Dual-Branding Deployment Guide

Using `user_profiles.company` for brand detection with multiple Centcom partner companies.

---

## How It Works

**Brand Logic:**
- If `user_profiles.company` contains **ANY** of these (case-insensitive) → User gets **Centcom** brand:
  - **Centcom**
  - **Sonance**
  - **Blaze**
  - **iPort**
  - **Danainnovations** or **Dana Innovations**
  - **James**
  - **Trufig**
- Otherwise → User gets **Lyceum** brand (default)

**Examples:**
- `company = "Sonance Audio"` → **Centcom** brand ✅
- `company = "Blaze Technologies"` → **Centcom** brand ✅
- `company = "James Manufacturing"` → **Centcom** brand ✅
- `company = "Acme Corp"` → **Lyceum** brand (default)
- `company = NULL` → **Lyceum** brand (default)

---

## 🚀 Step 1: Deploy API (2 minutes)

```bash
cd c:\Users\joshual\Documents\Cursor\lyceum

# Add updated API files
git add src/app/api/centcom/versions/latest/route.ts
git add src/app/api/centcom/download/[version]/[platform]/route.ts

# Commit
git commit -m "feat: Add company-based dual-branding for Centcom partners

- Detect Centcom brand for: Centcom, Sonance, Blaze, iPort, Dana Innovations, James, Trufig
- Use user_profiles.company for brand detection (case-insensitive)
- Otherwise default to Lyceum brand
- Updated getUserBrandType() in both API endpoints"

# Push (triggers Vercel deployment)
git push
```

**Wait 1-2 minutes** for Vercel to deploy.

---

## 📊 Step 2: Update Database (3 minutes)

### Run SIMPLE_DEPLOYMENT.sql

1. Open Supabase SQL Editor
2. Copy **all** of [SIMPLE_DEPLOYMENT.sql](SIMPLE_DEPLOYMENT.sql)
3. Paste and click "Run"

**Expected Output:**
```
version | platform | installer | brand   | size_mb | filename
--------|----------|-----------|---------|---------|---------------------------
1.0.0   | windows  | exe       | centcom | 305     | Centcom_1.0.0_x64-setup.exe
1.0.0   | windows  | msi       | centcom | 309     | Centcom_1.0.0_x64_en-US.msi
1.0.0   | windows  | exe       | lyceum  | 306     | Lyceum_1.0.0_x64-setup.exe
1.0.0   | windows  | msi       | lyceum  | 309     | Lyceum_1.0.0_x64_en-US.msi
```

✅ **4 rows = Success!**

---

## 🧪 Step 3: Check Your User's Company (2 minutes)

Run this in Supabase SQL Editor:

```sql
-- Check your test user's company and detected brand
SELECT
  id,
  email,
  company,
  CASE
    WHEN LOWER(company) LIKE '%centcom%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%sonance%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%blaze%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%iport%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%danainnovations%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%dana innovations%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%james%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%trufig%' THEN 'centcom'
    ELSE 'lyceum'
  END as detected_brand
FROM user_profiles
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
```

**Result shows:**
- `detected_brand = 'lyceum'` → Will download Lyceum version
- `detected_brand = 'centcom'` → Will download Centcom version

---

## 🧪 Step 4: Test Lyceum Download (Default) (3 minutes)

### A. Ensure User Has Non-Centcom Company

```sql
-- Set user to a non-Centcom company (or NULL)
UPDATE user_profiles
SET company = 'Test Company'  -- or NULL
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
RETURNING id, email, company;
```

### B. Go to Dashboard
Visit: `https://your-domain.vercel.app/dashboard`

### C. Download Application
1. Click **"Desktop Application"** card
2. Select installer type (EXE or MSI)
3. Click **"Download"**

### D. Check Console (F12)
Should show:
```
✅ Lyceum brand (default) for company: Test Company
✅ User brand type: lyceum
```

### E. Verify File
- Downloads: `Lyceum_1.0.0_x64-setup.exe` (or MSI)
- No errors
- File completes download

✅ **Lyceum download works!**

---

## 🧪 Step 5: Test Centcom Download - Sonance (3 minutes)

### A. Update User's Company to Sonance

```sql
UPDATE user_profiles
SET company = 'Sonance'
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
RETURNING id, email, company;
```

### B. Test Download
1. **Refresh** the dashboard page (important!)
2. Click **"Desktop Application"** card
3. Select installer type
4. Click **"Download"**

### C. Check Console
Should show:
```
✅ Centcom brand detected for company: Sonance
✅ User brand type: centcom
```

### D. Verify File
- Downloads: `Centcom_1.0.0_x64-setup.exe` (or MSI)
- **Different file than Lyceum!**

✅ **Sonance → Centcom works!**

---

## 🧪 Step 6: Test Other Centcom Companies (5 minutes)

Test each Centcom partner company to verify detection:

### Test Blaze

```sql
UPDATE user_profiles
SET company = 'Blaze Technologies'
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
```

**Refresh dashboard → Download → Should get Centcom version ✅**

### Test iPort

```sql
UPDATE user_profiles
SET company = 'iPort Surface Mount'
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
```

**Refresh dashboard → Download → Should get Centcom version ✅**

### Test Dana Innovations

```sql
UPDATE user_profiles
SET company = 'Dana Innovations LLC'
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
```

**Refresh dashboard → Download → Should get Centcom version ✅**

### Test James

```sql
UPDATE user_profiles
SET company = 'James Loudspeaker'
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
```

**Refresh dashboard → Download → Should get Centcom version ✅**

### Test Trufig

```sql
UPDATE user_profiles
SET company = 'Trufig Systems'
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
```

**Refresh dashboard → Download → Should get Centcom version ✅**

---

## 🎯 Step 7: Test GitHub URLs Directly (2 minutes)

Open **incognito browser** and paste these URLs:

**Lyceum:**
- https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64-setup.exe
- https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64_en-US.msi

**Centcom:**
- https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
- https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi

All should download immediately without login!

---

## ✅ Success Checklist

- [ ] API deployed to Vercel with multi-company detection
- [ ] Database has 4 version records (2 brands × 2 installers)
- [ ] Test user can download Lyceum version (default)
- [ ] Sonance → Downloads Centcom version
- [ ] Blaze → Downloads Centcom version
- [ ] iPort → Downloads Centcom version
- [ ] Dana Innovations → Downloads Centcom version
- [ ] James → Downloads Centcom version
- [ ] Trufig → Downloads Centcom version
- [ ] All GitHub URLs work without auth
- [ ] Both installers run correctly

---

## 📊 Managing User Brands

### View All Users and Their Detected Brands

```sql
SELECT
  email,
  company,
  CASE
    WHEN company IS NOT NULL AND (
      LOWER(company) LIKE '%centcom%' OR
      LOWER(company) LIKE '%sonance%' OR
      LOWER(company) LIKE '%blaze%' OR
      LOWER(company) LIKE '%iport%' OR
      LOWER(company) LIKE '%danainnovations%' OR
      LOWER(company) LIKE '%dana innovations%' OR
      LOWER(company) LIKE '%james%' OR
      LOWER(company) LIKE '%trufig%'
    ) THEN 'centcom'
    ELSE 'lyceum'
  END as brand
FROM user_profiles
WHERE email IS NOT NULL
ORDER BY brand, company;
```

### Assign Users to Centcom Brand

Use any of the Centcom partner company names:

```sql
-- Sonance
UPDATE user_profiles
SET company = 'Sonance'
WHERE email = 'user@example.com';

-- Blaze
UPDATE user_profiles
SET company = 'Blaze'
WHERE email IN ('user1@example.com', 'user2@example.com');

-- iPort
UPDATE user_profiles
SET company = 'iPort'
WHERE email = 'user3@example.com';

-- Dana Innovations
UPDATE user_profiles
SET company = 'Dana Innovations'
WHERE email = 'user4@example.com';

-- James
UPDATE user_profiles
SET company = 'James'
WHERE email = 'user5@example.com';

-- Trufig
UPDATE user_profiles
SET company = 'Trufig'
WHERE email = 'user6@example.com';

-- Or use Centcom directly
UPDATE user_profiles
SET company = 'Centcom'
WHERE email = 'user7@example.com';
```

### Assign Users to Lyceum Brand

Just use any non-Centcom company name:

```sql
-- Any other company name
UPDATE user_profiles
SET company = 'Acme Corp'
WHERE email = 'user@example.com';

-- Or set to NULL
UPDATE user_profiles
SET company = NULL
WHERE email = 'user@example.com';
```

### Bulk Assign by Email Domain

```sql
-- All @sonance.com emails → Sonance company
UPDATE user_profiles
SET company = 'Sonance'
WHERE email LIKE '%@sonance.com';

-- All @blaze.com emails → Blaze company
UPDATE user_profiles
SET company = 'Blaze'
WHERE email LIKE '%@blaze.com';

-- All @trufig.com emails → Trufig company
UPDATE user_profiles
SET company = 'Trufig'
WHERE email LIKE '%@trufig.com';
```

---

## 📈 Download Analytics

### Recent Downloads by Brand

```sql
SELECT
  ad.created_at,
  up.email,
  up.company,
  ad.brand_type,
  ad.installer_type,
  ad.version
FROM application_downloads ad
JOIN user_profiles up ON ad.user_id = up.id
ORDER BY ad.created_at DESC
LIMIT 20;
```

### Summary by Brand

```sql
SELECT
  brand_type,
  installer_type,
  COUNT(*) as downloads,
  COUNT(DISTINCT user_id) as unique_users
FROM application_downloads
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY brand_type, installer_type
ORDER BY brand_type, installer_type;
```

### Centcom Companies Distribution

```sql
SELECT
  CASE
    WHEN LOWER(company) LIKE '%sonance%' THEN 'Sonance'
    WHEN LOWER(company) LIKE '%blaze%' THEN 'Blaze'
    WHEN LOWER(company) LIKE '%iport%' THEN 'iPort'
    WHEN LOWER(company) LIKE '%dana%' THEN 'Dana Innovations'
    WHEN LOWER(company) LIKE '%james%' THEN 'James'
    WHEN LOWER(company) LIKE '%trufig%' THEN 'Trufig'
    WHEN LOWER(company) LIKE '%centcom%' THEN 'Centcom'
    ELSE 'Other (Lyceum)'
  END as company_group,
  COUNT(*) as user_count
FROM user_profiles
GROUP BY company_group
ORDER BY user_count DESC;
```

### Downloads by Centcom Partner

```sql
SELECT
  CASE
    WHEN LOWER(up.company) LIKE '%sonance%' THEN 'Sonance'
    WHEN LOWER(up.company) LIKE '%blaze%' THEN 'Blaze'
    WHEN LOWER(up.company) LIKE '%iport%' THEN 'iPort'
    WHEN LOWER(up.company) LIKE '%dana%' THEN 'Dana Innovations'
    WHEN LOWER(up.company) LIKE '%james%' THEN 'James'
    WHEN LOWER(up.company) LIKE '%trufig%' THEN 'Trufig'
    WHEN LOWER(up.company) LIKE '%centcom%' THEN 'Centcom'
    ELSE 'Lyceum'
  END as partner,
  COUNT(*) as downloads
FROM application_downloads ad
JOIN user_profiles up ON ad.user_id = up.id
WHERE ad.created_at > NOW() - INTERVAL '30 days'
GROUP BY partner
ORDER BY downloads DESC;
```

---

## 🆘 Troubleshooting

### "Version not found" error
**Problem:** Database doesn't have version records

**Fix:**
```sql
-- Check if versions exist
SELECT * FROM application_versions
WHERE application_name = 'centcom' AND version_number = '1.0.0';

-- Should return 4 rows. If not, re-run SIMPLE_DEPLOYMENT.sql
```

### Wrong brand downloading (Centcom user gets Lyceum)
**Problem:** User's company not detected properly

**Fix:**
```sql
-- Check user's company and what it should detect as
SELECT
  company,
  CASE
    WHEN LOWER(company) LIKE '%centcom%' THEN 'Should be: centcom'
    WHEN LOWER(company) LIKE '%sonance%' THEN 'Should be: centcom'
    WHEN LOWER(company) LIKE '%blaze%' THEN 'Should be: centcom'
    WHEN LOWER(company) LIKE '%iport%' THEN 'Should be: centcom'
    WHEN LOWER(company) LIKE '%danainnovations%' THEN 'Should be: centcom'
    WHEN LOWER(company) LIKE '%dana innovations%' THEN 'Should be: centcom'
    WHEN LOWER(company) LIKE '%james%' THEN 'Should be: centcom'
    WHEN LOWER(company) LIKE '%trufig%' THEN 'Should be: centcom'
    ELSE 'Should be: lyceum'
  END as expected_brand
FROM user_profiles
WHERE id = 'USER_ID';

-- Make sure company field actually contains one of the partner names
-- If not, update it:
UPDATE user_profiles
SET company = 'Sonance'  -- or any Centcom partner
WHERE id = 'USER_ID';
```

### Console shows wrong brand
**Problem:** API not detecting company correctly

**Check Vercel logs:**
1. Go to Vercel dashboard
2. Open your project
3. Click "Functions" tab
4. Find latest function call
5. Look for console.log output showing brand detection

**Should see:**
```
✅ Centcom brand detected for company: Sonance
```

### GitHub 404 error
**Problem:** Files don't exist on GitHub

**Fix:**
- Visit: https://github.com/joshlevylabs/datacenter-releases/releases/tag/v1.0.0
- Verify all 4 files are uploaded
- Check filenames match exactly:
  - `Centcom_1.0.0_x64-setup.exe`
  - `Centcom_1.0.0_x64_en-US.msi`
  - `Lyceum_1.0.0_x64-setup.exe`
  - `Lyceum_1.0.0_x64_en-US.msi`

---

## 🎉 You're Done!

**Time to deploy:** ~15 minutes

**What's working:**
- ✅ Automatic brand detection for 8 Centcom partner companies
- ✅ Lyceum and Centcom branded installers
- ✅ License-gated downloads
- ✅ Download tracking and analytics by partner
- ✅ Free GitHub CDN hosting
- ✅ SHA256 verification

**Centcom Partners Supported:**
1. Centcom
2. Sonance
3. Blaze
4. iPort
5. Danainnovations / Dana Innovations
6. James
7. Trufig

**Admin can change any user's brand by updating their company field!**

---

## 📝 Quick Reference

### Test Each Company Quickly

```sql
-- Copy/paste these one at a time and test download after each

-- Centcom
UPDATE user_profiles SET company = 'Centcom' WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Sonance
UPDATE user_profiles SET company = 'Sonance' WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Blaze
UPDATE user_profiles SET company = 'Blaze' WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- iPort
UPDATE user_profiles SET company = 'iPort' WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Dana Innovations
UPDATE user_profiles SET company = 'Dana Innovations' WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- James
UPDATE user_profiles SET company = 'James' WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Trufig
UPDATE user_profiles SET company = 'Trufig' WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Back to Lyceum (default)
UPDATE user_profiles SET company = 'Test Company' WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
```

After each update:
1. Refresh dashboard
2. Download application
3. Verify correct brand (check console for confirmation)

---

**Estimated Total Time:** 15 minutes + 10 minutes testing all companies
**Current Status:** Ready to deploy! 🚀
