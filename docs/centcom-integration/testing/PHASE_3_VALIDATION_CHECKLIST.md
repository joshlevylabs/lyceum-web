# Phase 3: E2E Testing Validation Checklist

**Purpose**: Systematic validation of all integration points  
**Date**: October 2, 2025 (Prepared)  
**Execution**: October 4-11, 2025  
**Owner**: Both Teams

---

## 📋 Pre-Test Setup Checklist

### Environment Setup:
- [ ] Lyceum backend running (`http://localhost:3594`)
- [ ] All 4 APIs responding (run `test-centcom-cluster-apis.js`)
- [ ] Database populated with test data (run `phase3-test-data-setup.sql`)
- [ ] CentCom app built and installed (latest version)
- [ ] Debug logging enabled in CentCom
- [ ] Network simulation tools ready
- [ ] Performance monitoring tools ready

### Test Data Verification:
- [ ] 5 test licenses created (ENT, PRO, BASIC, TRIAL, EXPIRED)
- [ ] 10 test clusters created (mixed types)
- [ ] Test user has clusters assigned
- [ ] Initial usage data present
- [ ] All test data verified via SQL queries

### Documentation Ready:
- [ ] PHASE_3_E2E_TEST_PLAN.md reviewed
- [ ] Test scenarios understood
- [ ] Expected results documented
- [ ] Bug tracking system ready (GitHub Issues)

---

## ✅ Scenario 1: First-Time User Journey

### License Validation:
- [ ] License key input field visible
- [ ] Can enter license key: `PLUGIN-ENT-2025-HQ21CIBF`
- [ ] "Verify" button clickable
- [ ] Loading indicator shows during validation
- [ ] Success message appears
- [ ] License limits displayed correctly:
  - [ ] Storage: 500 GB
  - [ ] Queries: 10,000,000/month
  - [ ] Offline Grace: 30 days
  - [ ] License Type: Enterprise

### API Integration:
- [ ] POST request sent to `/api/centcom/license/verify`
- [ ] Response status: 200 OK
- [ ] Response contains license details
- [ ] Machine fingerprint generated correctly
- [ ] Usage record created in database

### Cluster Discovery:
- [ ] Polling starts automatically after license verification
- [ ] First poll happens within 5 seconds
- [ ] GET request sent to `/api/centcom/clusters/discover`
- [ ] At least 1 cluster returned
- [ ] Cluster appears in UI within 30 seconds
- [ ] Cluster details correct:
  - [ ] Name displayed
  - [ ] Type shown (dev/prod)
  - [ ] Status indicator (online/offline)
  - [ ] Connection button available

### Connection:
- [ ] Can click "Connect" button
- [ ] Loading state during connection
- [ ] Connection successful
- [ ] POST request sent to `/api/centcom/connection/track`
- [ ] Status changes to "Connected"
- [ ] Connection recorded in database

---

## ✅ Scenario 2: Cluster Discovery & Updates

### New Cluster Discovery:
- [ ] Admin can add new cluster to user
- [ ] CentCom discovers new cluster within 5 minutes
- [ ] New cluster appears in list automatically
- [ ] No manual refresh needed
- [ ] Correct cluster details shown

### Cluster Updates:
- [ ] Admin can update cluster name
- [ ] Updated name appears in CentCom within 5 minutes
- [ ] No duplicate clusters in list
- [ ] Other cluster details update correctly

### Cluster Removal:
- [ ] Admin can remove cluster
- [ ] CentCom detects removal within 5 minutes
- [ ] Removal notification shown to user
- [ ] Cluster removed from list
- [ ] If connected, disconnection happens gracefully
- [ ] No crashes or errors

### Change Detection:
- [ ] Only actual changes trigger UI updates
- [ ] No flicker from identical polling results
- [ ] Event system working correctly
- [ ] Logs show change detection working

---

## ✅ Scenario 3: Usage Sync & Warnings

### Basic Usage Sync:
- [ ] Local cluster generates usage (queries run)
- [ ] CentCom collects usage metrics
- [ ] POST request sent to `/api/centcom/usage/sync` every 1 minute
- [ ] Response status: 200 OK
- [ ] Usage recorded in database
- [ ] UI shows current usage:
  - [ ] Storage used (GB)
  - [ ] Queries this month
  - [ ] Percentage of limits

### Warning Thresholds:
- [ ] **80% Warning**:
  - [ ] Warning appears at 80% of query limit
  - [ ] Icon/indicator changes color
  - [ ] User-friendly message shown
  - [ ] Can dismiss warning

- [ ] **90% Urgent Warning**:
  - [ ] Urgent warning appears at 90%
  - [ ] More prominent notification
  - [ ] Suggests action (upgrade/reduce usage)
  - [ ] Cannot easily dismiss

- [ ] **95% Critical Warning**:
  - [ ] Critical warning shown
  - [ ] Very prominent (red/alert style)
  - [ ] Clear message about consequences
  - [ ] Action required

### Throttling:
- [ ] At 100% limit, throttling enforced
- [ ] API returns `should_throttle: true`
- [ ] CentCom slows down queries
- [ ] User sees throttled indicator
- [ ] Clear message about limit reached

---

## ✅ Scenario 4: Offline Mode & Grace Period

### Offline Detection:
- [ ] Disconnect network
- [ ] CentCom detects offline within 1 minute
- [ ] Offline indicator appears in UI
- [ ] Grace period countdown starts
- [ ] Countdown displays correctly (e.g., "29 days, 23 hours remaining")

### Offline Functionality:
- [ ] Local cluster still accessible
- [ ] Can read data
- [ ] Can write data
- [ ] No sync errors shown (queued)
- [ ] User experience smooth

### Grace Period Warning (80%):
- [ ] Warning appears at 80% of grace period (24 days for Enterprise)
- [ ] Clear message about upcoming read-only mode
- [ ] Suggests reconnecting
- [ ] Warning persists until reconnected

### Grace Period Expiration:
- [ ] At 100% of grace period (30 days), read-only mode activates
- [ ] Can still read data
- [ ] Cannot write data (blocked)
- [ ] Clear message about read-only mode
- [ ] Instructs user to reconnect

### Reconnection:
- [ ] Reconnect network
- [ ] CentCom detects online within 1 minute
- [ ] Queued syncs process automatically
- [ ] Grace period resets
- [ ] Full access restored
- [ ] No data loss

---

## ✅ Scenario 5: Multiple Cluster Management

### Multiple Cluster Display:
- [ ] User has 3+ clusters assigned
- [ ] All clusters appear in list
- [ ] Each cluster has:
  - [ ] Name
  - [ ] Type (local/cloud)
  - [ ] Status (connected/disconnected)
  - [ ] Connection button/link
  - [ ] Details/info button

### Cluster Switching:
- [ ] Can connect to cluster A
- [ ] Status changes to "Connected"
- [ ] Can switch to cluster B
- [ ] Cluster A disconnects
- [ ] Cluster B connects
- [ ] No data loss during switch
- [ ] Smooth transition

### Default Cluster:
- [ ] Can set cluster as default
- [ ] "Set as Default" option available
- [ ] Default indicator appears (star/badge)
- [ ] On app restart, default cluster loads first
- [ ] Can change default cluster

### Connection Tracking:
- [ ] Each connection tracked via API
- [ ] Connection count increments
- [ ] Last connected timestamp updates
- [ ] Connection history visible
- [ ] Database records accurate

---

## ✅ Scenario 6: License Expiration

### Expiration Warnings:
- [ ] **7 Days Before**:
  - [ ] Warning notification appears
  - [ ] Clear expiration date shown
  - [ ] Suggests renewal

- [ ] **1 Day Before**:
  - [ ] Urgent warning shown
  - [ ] Very prominent
  - [ ] Action required

### Expiration Handling:
- [ ] At expiration, license becomes inactive
- [ ] CentCom detects expiration
- [ ] Access blocked gracefully
- [ ] Clear message about expiration
- [ ] Option to enter new license

### License Renewal:
- [ ] User enters new license key
- [ ] New license validated
- [ ] Full access restored immediately
- [ ] No data loss
- [ ] Smooth transition

---

## ✅ Scenario 7: Error Handling & Recovery

### API Unavailable:
- [ ] Stop Lyceum API
- [ ] CentCom shows connection error
- [ ] Error message clear and actionable
- [ ] Exponential backoff prevents API hammering
- [ ] Restart API
- [ ] CentCom reconnects automatically
- [ ] No manual intervention needed

### Invalid License:
- [ ] Enter invalid license key: `INVALID-KEY-12345`
- [ ] Validation fails
- [ ] Clear error message shown
- [ ] Specific error (invalid format/not found/expired)
- [ ] Can retry with correct key
- [ ] No crash or hang

### Network Timeout:
- [ ] Simulate slow network (5+ second delay)
- [ ] Loading indicator shows
- [ ] Request completes or times out gracefully
- [ ] Timeout message clear
- [ ] Can retry
- [ ] No app freeze

### Cluster Removed Mid-Connection:
- [ ] User connected to cluster
- [ ] Admin removes cluster
- [ ] CentCom detects removal (within 5 min)
- [ ] User disconnected gracefully
- [ ] Clear notification shown
- [ ] Can connect to other clusters
- [ ] No crash

---

## ✅ Scenario 8: Performance & Load

### Discovery Performance:
- [ ] Assign 10 clusters to user
- [ ] Measure discovery time: _____ seconds
- [ ] Target: < 10 seconds for all clusters
- [ ] All clusters appear correctly
- [ ] UI remains responsive

### Connection Performance:
- [ ] Connect to 10 clusters sequentially
- [ ] Measure average time: _____ seconds per cluster
- [ ] Target: < 2 seconds per cluster
- [ ] All connections successful
- [ ] No timeouts or errors

### Sync Performance:
- [ ] Generate high usage (1000 queries)
- [ ] Measure sync time: _____ ms per sync
- [ ] Target: < 500ms per sync
- [ ] All syncs successful
- [ ] No data loss

### Resource Usage:
- [ ] Run CentCom for 1 hour with polling
- [ ] Measure idle CPU: _____%
- [ ] Target: < 5% idle
- [ ] Measure active CPU: _____%
- [ ] Target: < 20% active
- [ ] Measure memory: _____ MB
- [ ] Check for memory leaks: None
- [ ] App remains stable

---

## ✅ Scenario 9: Data Integrity

### Usage Accuracy:
- [ ] Perform 100 test operations
- [ ] CentCom records all operations
- [ ] Sync to Lyceum
- [ ] Verify count matches in database
- [ ] No duplicate records
- [ ] Timestamps accurate

### State Persistence:
- [ ] User performs operations
- [ ] Force quit CentCom (crash simulation)
- [ ] Restart CentCom
- [ ] State recovered correctly
- [ ] Clusters still available
- [ ] Usage data preserved
- [ ] No data loss

### Sync Reliability:
- [ ] Queue 10 sync operations
- [ ] Disconnect network mid-sync
- [ ] Operations queued
- [ ] Reconnect network
- [ ] All queued syncs process
- [ ] No duplicates
- [ ] No missing syncs

---

## ✅ Scenario 10: Upgrade & Migration

### Upgrade Process:
- [ ] Running CentCom v1 with data
- [ ] User has active clusters
- [ ] Usage data present
- [ ] Upgrade to v2
- [ ] App restarts successfully
- [ ] Migration runs automatically

### Data Preservation:
- [ ] All clusters still visible
- [ ] Cluster connections work
- [ ] Usage data preserved
- [ ] Settings maintained
- [ ] License still valid
- [ ] No data loss

### Backward Compatibility:
- [ ] Old API calls still work
- [ ] Old data formats read correctly
- [ ] No breaking changes
- [ ] Smooth transition

---

## 📊 Final Validation

### Overall System:
- [ ] All 10 scenarios passed
- [ ] Zero critical bugs
- [ ] Zero data loss incidents
- [ ] Performance within targets
- [ ] Error handling graceful throughout

### Code Quality:
- [ ] No crashes during testing
- [ ] No memory leaks
- [ ] No UI freezes
- [ ] Logs clean (no errors)
- [ ] User experience smooth

### Documentation:
- [ ] All bugs documented
- [ ] Test results recorded
- [ ] Performance metrics logged
- [ ] Issues prioritized

---

## 🚨 Issue Tracking

### Bug Template:
```markdown
**Title**: [Brief description]

**Scenario**: [Which test scenario]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected**: [What should happen]

**Actual**: [What actually happened]

**Severity**: Critical / High / Medium / Low

**Screenshots/Logs**: [Attach if available]

**Environment**:
- CentCom Version: 
- Lyceum Version:
- OS:
```

### Priority Levels:
- **🔴 Critical**: Blocks testing, data loss, crashes
- **🟡 High**: Major functionality broken, poor UX
- **🟢 Medium**: Minor issues, workarounds available
- **⚪ Low**: Cosmetic, edge cases

---

## ✅ Sign-Off

### Test Lead Sign-Off:
- [ ] All critical scenarios passed
- [ ] All high-priority scenarios passed
- [ ] All bugs documented and prioritized
- [ ] Test report complete

**Signed**: ________________  
**Date**: ________________

### Technical Lead Sign-Off:
- [ ] Code quality acceptable
- [ ] Architecture validated
- [ ] Performance acceptable
- [ ] Security reviewed

**Signed**: ________________  
**Date**: ________________

### Product Sign-Off:
- [ ] User experience acceptable
- [ ] All features working
- [ ] Ready for production

**Signed**: ________________  
**Date**: ________________

---

## 🎯 Ready for Production?

**YES** ✅ if:
- All checklists complete
- Zero critical bugs
- All sign-offs obtained

**NO** ❌ if:
- Critical bugs remain
- Data integrity issues
- Performance below targets

---

**Prepared by**: Lyceum Team  
**Date**: October 2, 2025  
**Status**: Ready for Phase 3 execution




