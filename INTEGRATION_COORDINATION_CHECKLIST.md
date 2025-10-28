# Centcom/Lyceum Integration Coordination Checklist

**Integration Goal:** Enable Centcom desktop app to download and auto-update from Lyceum platform

**Status:** All Lyceum APIs implemented ✅ | Awaiting Centcom integration

---

## Quick Status Overview

### Lyceum Platform (Backend)
- [x] API endpoints implemented
- [ ] Database migration run
- [ ] Test release uploaded
- [ ] Test credentials provided
- [ ] Monitoring configured

### Centcom Team (Desktop App)
- [ ] Requirements reviewed
- [ ] API endpoints tested
- [ ] Tauri updater implemented
- [ ] Beta testing complete
- [ ] Production ready

---

## Week 1: Foundation (Nov 1-5, 2025)

### Monday - Lyceum Team
- [ ] **Run database migration** (5 min)
  - File: `SETUP_CENTCOM_DISTRIBUTION_SYSTEM.sql`
  - Location: Supabase SQL Editor
  - Verification: Check `centcom-releases` bucket exists

- [ ] **Build test release** (if not already available)
  - Version: 0.1.0
  - Platforms: Windows (.exe, .msi), macOS (.dmg), Linux (.AppImage, .deb)
  - Calculate SHA256 hashes

- [ ] **Upload test release** (10 min per platform)
  ```bash
  # Windows
  curl -X POST https://lyceum.app/api/admin/centcom/releases/upload \
    -H "Authorization: Bearer ADMIN_TOKEN" \
    -F "file=@centcom-setup-0.1.0.exe" \
    -F "version=0.1.0" \
    -F "platform=windows" \
    -F "installer_type=exe" \
    -F "is_stable=true"

  # macOS
  curl -X POST https://lyceum.app/api/admin/centcom/releases/upload \
    -H "Authorization: Bearer ADMIN_TOKEN" \
    -F "file=@centcom-0.1.0.dmg" \
    -F "version=0.1.0" \
    -F "platform=macos" \
    -F "installer_type=dmg" \
    -F "is_stable=true"

  # Linux
  curl -X POST https://lyceum.app/api/admin/centcom/releases/upload \
    -H "Authorization: Bearer ADMIN_TOKEN" \
    -F "file=@centcom-0.1.0.AppImage" \
    -F "version=0.1.0" \
    -F "platform=linux" \
    -F "installer_type=AppImage" \
    -F "is_stable=true"
  ```

- [ ] **Create test user accounts** (3 accounts)
  - Test User 1: Active trial license
  - Test User 2: Active enterprise license
  - Test User 3: Expired license (for error testing)

- [ ] **Provide credentials to Centcom team**
  - API base URL: `https://lyceum.app`
  - Test user emails + passwords
  - JWT tokens (or login credentials)
  - Admin token (for release uploads)

### Tuesday - Centcom Team
- [ ] **Review documentation**
  - Read: `RESPONSE_TO_CENTCOM_TEAM.md`
  - Read: `CENTCOM_DOWNLOAD_DISTRIBUTION_SYSTEM.md` (Section: Desktop Application Integration)
  - Understand API contracts

- [ ] **Test API endpoints manually**

  **Test 1: Check for updates (no update)**
  ```bash
  curl "https://lyceum.app/api/centcom/versions/latest?platform=windows&current_version=0.1.0&user_id=TEST_USER_ID" \
    -H "Authorization: Bearer TEST_USER_JWT"

  # Expected: update_available = false
  ```

  **Test 2: Get download URL**
  ```bash
  curl "https://lyceum.app/api/centcom/download/0.1.0/windows?user_id=TEST_USER_ID&installer_type=exe" \
    -H "Authorization: Bearer TEST_USER_JWT"

  # Expected: download_url with signed URL
  ```

  **Test 3: Download file**
  ```bash
  # Use download_url from Test 2
  curl -o centcom-setup.exe "SIGNED_URL_FROM_TEST_2"

  # Verify file size matches
  ls -lh centcom-setup.exe
  ```

  **Test 4: Track download**
  ```bash
  curl -X POST "https://lyceum.app/api/centcom/download/track" \
    -H "Authorization: Bearer TEST_USER_JWT" \
    -H "Content-Type: application/json" \
    -d '{
      "download_id": "DOWNLOAD_ID_FROM_TEST_2",
      "status": "success"
    }'

  # Expected: { "success": true }
  ```

- [ ] **Confirm API responses match spec**
  - Check all JSON fields present
  - Verify data types
  - Note any discrepancies

### Wednesday - Lyceum Team
- [ ] **Upload second test release** (version 0.2.0)
  - Repeat upload process
  - Mark as stable
  - Verify in database

- [ ] **Set up monitoring**
  - API response times
  - Error rates
  - Download success rates
  - Alert thresholds (>10% error rate)

### Wednesday - Centcom Team
- [ ] **Test update detection**
  ```bash
  curl "https://lyceum.app/api/centcom/versions/latest?platform=windows&current_version=0.1.0&user_id=TEST_USER_ID" \
    -H "Authorization: Bearer TEST_USER_JWT"

  # Expected: update_available = true
  # Expected: latest_version.version = "0.2.0"
  ```

- [ ] **Begin Tauri implementation**
  - Create `src-tauri/src/updater.rs`
  - Implement `check_for_updates()`
  - Implement `download_update()`
  - Implement `track_download()`

### Thursday - Centcom Team
- [ ] **Continue Tauri implementation**
  - Implement SHA256 verification
  - Add progress tracking
  - Handle network errors
  - Add retry logic

### Friday - Both Teams
- [ ] **Daily standup**
  - What's working?
  - What's blocked?
  - Next steps?

- [ ] **Week 1 Review**
  - API endpoints tested: ✅/❌
  - Download flow verified: ✅/❌
  - Tauri code started: ✅/❌
  - Ready for Week 2: ✅/❌

---

## Week 2: Full Integration (Nov 6-12, 2025)

### Monday-Tuesday - Centcom Team
- [ ] **Implement update checker**
  - Call API on app launch
  - Show notification if update available
  - Handle force_update flag
  - Test with mock data

### Wednesday - Centcom Team
- [ ] **Implement downloader**
  - Download with progress bar
  - Verify SHA256 hash
  - Handle download failures
  - Test resume from partial download

### Thursday - Centcom Team
- [ ] **Implement installer execution**
  - Windows: .exe with elevated privileges
  - macOS: .dmg or .pkg
  - Linux: .AppImage or .deb
  - Close app before install
  - Restart after install

### Friday - Both Teams
- [ ] **End-to-end testing**
  - Centcom: Fresh install → Check update → Download → Install → Verify new version
  - Lyceum: Monitor API calls and download success
  - Debug any issues

---

## Week 3: Error Handling & Polish (Nov 13-19, 2025)

### Monday-Tuesday - Centcom Team
- [ ] **Error scenario testing**
  - Expired JWT token
  - Invalid user ID
  - Non-existent version
  - Wrong platform
  - Network timeout
  - Corrupted download (wrong SHA256)
  - Disk space full
  - Permission denied

### Wednesday-Thursday - Both Teams
- [ ] **Bug fixes**
  - Address issues from error testing
  - Improve error messages
  - Add logging/telemetry
  - Optimize performance

### Friday - Both Teams
- [ ] **Production readiness checklist**
  - [ ] All APIs stable
  - [ ] Error handling complete
  - [ ] Monitoring configured
  - [ ] Analytics dashboard created
  - [ ] Rollback procedure tested
  - [ ] User documentation written
  - [ ] Beta user list prepared

---

## Week 4: Beta & Launch (Nov 20-26, 2025)

### Monday - Both Teams
- [ ] **Beta deployment**
  - Select 10-20 beta users
  - Provide beta builds
  - Set up feedback channel
  - Monitor analytics

### Tuesday-Wednesday - Both Teams
- [ ] **Monitor beta metrics**
  - Update check frequency
  - Download success rate
  - Install success rate
  - User feedback
  - Fix critical issues

### Thursday - Both Teams
- [ ] **Production launch**
  - Gradual rollout: 10% → 25% → 50% → 100%
  - Monitor at each stage
  - Be ready to rollback if needed

### Friday - Both Teams
- [ ] **Post-launch review**
  - What went well?
  - What could be improved?
  - Next features to add?
  - Celebrate success! 🎉

---

## Daily Standup Template

**Time:** 10:00 AM PST
**Duration:** 15 minutes
**Attendees:** Lyceum team, Centcom team

### Agenda:
1. **Yesterday's Progress** (each person, 2 min)
   - What did I complete?
   - What issues did I encounter?

2. **Today's Plan** (each person, 1 min)
   - What will I work on?
   - What help do I need?

3. **Blockers** (as needed)
   - What's stopping progress?
   - Who can help?

4. **Quick Decisions** (as needed)
   - API changes needed?
   - Timeline adjustments?

---

## Critical Success Metrics

Track these metrics daily:

### API Health
- **Target:** >99% uptime
- **Target:** <500ms response time
- **Target:** <1% error rate

### Download Success
- **Target:** >95% success rate
- **Alert:** If <90%, investigate immediately

### Version Adoption
- **Target:** 50% adoption within 7 days
- **Target:** 90% adoption within 30 days

### User Satisfaction
- **Target:** <5% users disable auto-update
- **Target:** <10 support tickets per release

---

## Emergency Contacts

### Lyceum Team
- **Josh** (Lead): josh@thelyceum.io | +1-XXX-XXX-XXXX
- **Backend**: [Name] | [Contact]
- **DevOps**: [Name] | [Contact]

### Centcom Team
- **Lead**: [Name] | [Contact]
- **Tauri Dev**: [Name] | [Contact]
- **QA**: [Name] | [Contact]

### Escalation Path
1. Try Slack first (#centcom-lyceum-integration)
2. If urgent, call team lead
3. If critical outage, call both leads + DevOps

---

## Rollback Procedure

If critical issues arise:

### Step 1: Disable Problematic Version
```sql
UPDATE application_versions
SET auto_update_enabled = false, is_stable = false
WHERE version_number = 'X.X.X';
```

### Step 2: Re-enable Previous Version
```sql
UPDATE application_versions
SET auto_update_enabled = true, is_stable = true
WHERE version_number = 'PREVIOUS_VERSION';
```

### Step 3: Notify Users
- Post in app notification
- Send email to affected users
- Update status page

### Step 4: Post-Mortem
- Document what went wrong
- How to prevent in future
- Timeline for fix

---

## Success Criteria

Integration is considered successful when:

- [x] All API endpoints implemented
- [ ] Database migration complete
- [ ] Test releases uploaded
- [ ] Centcom can check for updates
- [ ] Centcom can download updates
- [ ] Centcom can install updates
- [ ] Centcom can track downloads
- [ ] >95% download success rate
- [ ] >50% users adopt new version within 7 days
- [ ] <10 support tickets per release
- [ ] Both teams agree system is stable

---

## Notes & Action Items

### Meeting Notes
- [Date] - [Topic] - [Key Decisions]

### Action Items
- [ ] [Who] - [What] - [By When]

---

**Last Updated:** 2025-10-27
**Next Review:** After Week 1 complete
**Status:** Ready to begin Week 1
