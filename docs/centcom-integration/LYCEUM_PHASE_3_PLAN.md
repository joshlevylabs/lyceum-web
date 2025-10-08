# 🎯 Lyceum Phase 3: Admin & Monitoring Features

**Date**: October 2, 2025 - 11:30 PM PT  
**Phase**: Lyceum Phase 3 - CentCom Integration Monitoring  
**Duration**: 3-4 days (parallel with CentCom Phase 3)  
**Status**: 🚀 **READY TO START**

---

## 📋 Overview

While CentCom builds their UI components (Phase 3), we'll build **admin monitoring and management features** on the Lyceum side to support the integration.

### What We're Building:
1. Local Cluster Monitoring Dashboard
2. Connection Tracking & Analytics
3. Usage Metrics Visualization
4. License Management Enhancements
5. Alert System for Limits & Issues

---

## 🎯 Goals

### Primary Objectives:
- ✅ Monitor all CentCom local clusters in real-time
- ✅ Track cluster connections and usage patterns
- ✅ Visualize usage metrics vs. license limits
- ✅ Manage licenses with local cluster support
- ✅ Alert when users approach limits

### Success Criteria:
- [ ] Real-time dashboard showing all local clusters
- [ ] Connection tracking with history
- [ ] Usage analytics with charts
- [ ] License management UI enhanced
- [ ] Alert system operational

---

## 📦 What We're Building

### 1. Local Cluster Monitoring Dashboard 📊
**File**: `src/app/admin/centcom-clusters/page.tsx` (NEW)

**Purpose**: Real-time monitoring of all CentCom local clusters

**Features**:
- Live status of all local clusters
- Current online/offline status
- Grace period tracking for offline clusters
- Usage metrics per cluster
- Quick actions (view details, contact user)

**Layout**:
```
┌────────────────────────────────────────────────────┐
│  CentCom Local Clusters (Live Monitoring)         │
│  ────────────────────────────────────────────────  │
│                                                    │
│  📊 Stats:                                         │
│  • Total Clusters: 42                              │
│  • Online: 38    Offline: 4                        │
│  • In Grace Period: 2                              │
│  • Approaching Limits: 5                           │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ User: josh@thelyceum.io                       │ │
│  │ Status: 🟢 Online                             │ │
│  │ Machine: laptop-win-2024                      │ │
│  │ Usage: 45GB/500GB | 1.2M/10M queries         │ │
│  │ Last Sync: 2 min ago                          │ │
│  └──────────────────────────────────────────────┘ │
│  ... more clusters ...                             │
└────────────────────────────────────────────────────┘
```

**Data Sources**:
- `local_cluster_usage` table
- `centcom_cluster_connections` table
- `license_keys` table

---

### 2. Connection Tracking & Analytics 📈
**File**: `src/app/admin/centcom-connections/page.tsx` (NEW)

**Purpose**: Track and analyze CentCom cluster connections

**Features**:
- Connection events timeline
- Connection duration tracking
- Most active users
- Connection patterns (time of day, frequency)
- Geographic distribution (if available)

**Analytics**:
```
┌────────────────────────────────────────────────────┐
│  Connection Analytics                              │
│  ────────────────────────────────────────────────  │
│                                                    │
│  📊 Last 30 Days:                                  │
│  • Total Connections: 1,247                        │
│  • Unique Users: 42                                │
│  • Avg Duration: 3.2 hours                         │
│  • Peak Hour: 2PM-3PM                              │
│                                                    │
│  📈 Connection Timeline (Chart)                    │
│  ┌──────────────────────────────────────────────┐ │
│  │         ██                                    │ │
│  │    ██   ██   ██                               │ │
│  │    ██   ██   ██   ██                          │ │
│  │ ██ ██ █ ██ █ ██ █ ██                          │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  📋 Recent Connections:                            │
│  • josh@thelyceum.io - Cluster A - 2 hrs ago      │
│  • user@company.com - Cluster B - 5 hrs ago       │
│  ... more connections ...                          │
└────────────────────────────────────────────────────┘
```

---

### 3. Usage Metrics Visualization 📉
**Component**: `src/components/admin/LocalClusterUsageCharts.tsx` (NEW)

**Purpose**: Visualize usage patterns and trends

**Charts**:
1. **Storage Usage Over Time**
   - Line chart showing GB used per day
   - Compare vs. license limits
   - Identify growth trends

2. **Query Volume**
   - Bar chart of queries per day
   - Peak usage times
   - Monthly quota consumption

3. **User Distribution**
   - Pie chart of usage by license tier
   - Enterprise vs Pro vs Basic

4. **Limit Warnings**
   - Users approaching limits (80%+)
   - Recommended actions
   - Upgrade opportunities

---

### 4. Enhanced License Management 🎫
**File**: `src/app/admin/licenses/local-clusters/page.tsx` (NEW)

**Purpose**: Manage licenses with local cluster support

**Features**:
- View all licenses with local cluster enabled
- Toggle `allows_local_cluster` flag
- Set/modify local cluster limits per license
- Bulk operations (enable/disable for multiple)
- License history and changes

**UI**:
```
┌────────────────────────────────────────────────────┐
│  License Management - Local Clusters               │
│  ────────────────────────────────────────────────  │
│                                                    │
│  Filters: [All] [Enterprise] [Pro] [Basic]        │
│  Search: [_____________________]    [+ New]        │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ License: PLUGIN-ENT-2025-HQ21CIBF             │ │
│  │ User: josh@thelyceum.io                       │ │
│  │ Type: Enterprise                              │ │
│  │ Status: ✅ Active | 🖥️ Local Cluster: Enabled │ │
│  │                                               │ │
│  │ Limits:                                       │ │
│  │ • Storage: 500 GB                             │ │
│  │ • Queries: 10,000,000/month                   │ │
│  │ • Grace Period: 30 days                       │ │
│  │                                               │ │
│  │ Current Usage:                                │ │
│  │ • Storage: 45 GB (9%)                         │ │
│  │ • Queries: 1,200,000 (12%)                    │ │
│  │                                               │ │
│  │ Actions: [Edit] [Disable] [View Usage]       │ │
│  └──────────────────────────────────────────────┘ │
│  ... more licenses ...                             │
└────────────────────────────────────────────────────┘
```

---

### 5. Alert System 🚨
**File**: `src/lib/centcom-alerts.ts` (NEW)

**Purpose**: Proactive monitoring and alerts

**Alert Types**:
1. **Usage Warnings**:
   - User at 80% of storage limit
   - User at 90% of query limit
   - Multiple users approaching limits

2. **Offline Alerts**:
   - Cluster offline > 24 hours
   - Grace period < 7 days remaining
   - Grace period expired

3. **Connection Issues**:
   - Failed connection attempts
   - Connection error rate > 10%
   - No connections in 7 days (inactive)

4. **System Health**:
   - API response time > 2s
   - High error rate
   - Database issues

**Alert Delivery**:
- In-app notifications (admin dashboard)
- Email to admin team
- Slack/Discord webhook (optional)
- Log to database for history

---

## 🗂️ File Structure

```
src/
├── app/
│   └── admin/
│       ├── centcom-clusters/
│       │   └── page.tsx                    ← Monitoring dashboard
│       ├── centcom-connections/
│       │   └── page.tsx                    ← Connection analytics
│       └── licenses/
│           └── local-clusters/
│               └── page.tsx                ← License management
│
├── components/
│   └── admin/
│       ├── LocalClusterUsageCharts.tsx     ← Usage charts
│       ├── LocalClusterCard.tsx            ← Cluster status card
│       ├── ConnectionTimelineChart.tsx     ← Connection timeline
│       └── UsageAlertsList.tsx             ← Alert display
│
└── lib/
    ├── centcom-alerts.ts                   ← Alert system
    ├── centcom-analytics.ts                ← Analytics helpers
    └── local-cluster-queries.ts            ← Database queries
```

---

## 🔌 Database Queries We'll Need

### 1. Get All Local Clusters
```sql
SELECT 
  lcu.*,
  lk.key_code,
  lk.license_type,
  lk.local_cluster_limits,
  u.email,
  u.full_name
FROM local_cluster_usage lcu
JOIN license_keys lk ON lk.id = lcu.license_id
JOIN auth.users u ON u.id = lcu.user_id
WHERE lcu.last_heartbeat_at > NOW() - INTERVAL '1 hour'
ORDER BY lcu.last_heartbeat_at DESC;
```

### 2. Get Connection History
```sql
SELECT 
  ccc.*,
  u.email,
  u.full_name,
  uc.cluster_name
FROM centcom_cluster_connections ccc
JOIN auth.users u ON u.id = ccc.user_id
LEFT JOIN unified_clusters uc ON uc.id = ccc.cluster_id
WHERE ccc.created_at > NOW() - INTERVAL '30 days'
ORDER BY ccc.created_at DESC
LIMIT 100;
```

### 3. Get Usage Warnings
```sql
SELECT 
  lcu.user_id,
  u.email,
  lk.key_code,
  lk.license_type,
  lcu.storage_used_gb,
  (lk.local_cluster_limits->>'max_storage_gb')::numeric as max_storage,
  lcu.queries_this_month,
  (lk.local_cluster_limits->>'max_monthly_queries')::numeric as max_queries,
  (lcu.storage_used_gb / (lk.local_cluster_limits->>'max_storage_gb')::numeric * 100) as storage_percent,
  (lcu.queries_this_month / (lk.local_cluster_limits->>'max_monthly_queries')::numeric * 100) as query_percent
FROM local_cluster_usage lcu
JOIN license_keys lk ON lk.id = lcu.license_id
JOIN auth.users u ON u.id = lcu.user_id
WHERE 
  (lcu.storage_used_gb / (lk.local_cluster_limits->>'max_storage_gb')::numeric * 100) >= 80
  OR (lcu.queries_this_month / (lk.local_cluster_limits->>'max_monthly_queries')::numeric * 100) >= 80
ORDER BY 
  GREATEST(
    lcu.storage_used_gb / (lk.local_cluster_limits->>'max_storage_gb')::numeric,
    lcu.queries_this_month / (lk.local_cluster_limits->>'max_monthly_queries')::numeric
  ) DESC;
```

### 4. Get Offline Clusters
```sql
SELECT 
  lcu.*,
  u.email,
  lk.license_type,
  (lk.local_cluster_limits->>'offline_grace_days')::integer as grace_days,
  EXTRACT(EPOCH FROM (NOW() - lcu.last_heartbeat_at))/86400 as days_offline
FROM local_cluster_usage lcu
JOIN auth.users u ON u.id = lcu.user_id
JOIN license_keys lk ON lk.id = lcu.license_id
WHERE lcu.last_heartbeat_at < NOW() - INTERVAL '1 hour'
ORDER BY lcu.last_heartbeat_at ASC;
```

---

## 📅 Implementation Timeline

### Day 1 (Oct 3) - Monitoring Dashboard
**Goal**: Build real-time monitoring dashboard

**Tasks**:
1. Create `src/app/admin/centcom-clusters/page.tsx`
2. Build cluster status cards component
3. Add real-time status indicators
4. Implement refresh functionality
5. Add filters (online/offline, tier, user)

**Target**: Basic monitoring working

---

### Day 2 (Oct 4) - Connection Analytics
**Goal**: Track and visualize connections

**Tasks**:
1. Create `src/app/admin/centcom-connections/page.tsx`
2. Build connection timeline chart
3. Add connection statistics
4. Implement connection history list
5. Add user filtering

**Target**: Connection tracking complete

---

### Day 3 (Oct 5) - Usage Charts & Alerts
**Goal**: Visualize usage and set up alerts

**Tasks**:
1. Create `src/components/admin/LocalClusterUsageCharts.tsx`
2. Build storage usage chart
3. Build query volume chart
4. Create alert system (`src/lib/centcom-alerts.ts`)
5. Implement alert notifications

**Target**: Usage visualization and alerts working

---

### Day 4 (Oct 6) - License Management
**Goal**: Enhanced license UI

**Tasks**:
1. Create `src/app/admin/licenses/local-clusters/page.tsx`
2. Build license list with local cluster info
3. Add edit functionality for limits
4. Implement bulk operations
5. Add usage preview per license

**Target**: License management complete

---

## 🧪 Testing

### For Each Feature:
1. Test with real data from CentCom API calls
2. Test with empty/no data scenarios
3. Test with high usage (near limits)
4. Test with offline clusters
5. Test with various license tiers

### Integration Testing:
1. Monitor while CentCom connects
2. Verify usage updates appear
3. Test alert triggers
4. Verify connection tracking

---

## 🎯 Success Metrics

### Monitoring:
- [ ] Can see all local clusters in real-time
- [ ] Status updates within 1 minute
- [ ] Offline detection working
- [ ] Grace period countdown accurate

### Analytics:
- [ ] Connection history visible
- [ ] Usage charts accurate
- [ ] Trends identifiable
- [ ] Patterns clear

### Alerts:
- [ ] Warnings trigger at 80%/90%
- [ ] Offline alerts sent
- [ ] Email delivery working
- [ ] In-app notifications visible

### License Management:
- [ ] Easy to enable/disable local cluster
- [ ] Limits editable
- [ ] Bulk operations working
- [ ] Usage visible per license

---

## 💡 Nice-to-Have Features

If we have extra time:
1. **Export Reports**: CSV/PDF export of usage data
2. **Webhooks**: Send data to external systems
3. **Custom Alerts**: Let admins configure thresholds
4. **Machine Details**: Show OS, CPU, memory info
5. **Cluster Comparison**: Compare usage across users
6. **Cost Estimation**: Estimate equivalent cloud costs

---

## 🚀 Quick Start (Tomorrow Morning)

### Step 1: Create Monitoring Dashboard (2 hours)
```bash
# Create file
touch src/app/admin/centcom-clusters/page.tsx

# Start with basic structure:
- Page layout
- Fetch data from local_cluster_usage
- Display in cards
- Add refresh button
```

### Step 2: Test with Real Data (30 min)
```bash
# Have CentCom connect and sync
# Verify data appears in dashboard
# Test refresh
```

### Step 3: Add Styling (30 min)
```bash
# Use existing admin styles
# Add status colors
# Make responsive
```

---

## 📚 Resources

**Existing Code to Reference**:
- `src/app/admin/users/page.tsx` - Admin UI patterns
- `src/app/admin/clusters/page.tsx` - Cluster management
- `src/components/billing/BillingDashboard.tsx` - Dashboard layout
- `src/lib/billing-service.ts` - Service patterns

**Database Tables**:
- `local_cluster_usage` - Usage metrics
- `centcom_cluster_connections` - Connection tracking
- `license_keys` - License info

**APIs to Use**:
- Our existing admin APIs
- Supabase direct queries
- Real-time subscriptions (optional)

---

## 🤝 Coordination with CentCom

### What They're Building (Phase 3):
- UI components for end users
- Cluster management UI
- Usage display
- Connection controls

### What We're Building (Phase 3):
- Admin monitoring
- Analytics and insights
- License management
- Alert system

### Integration Points:
- Both use same database tables ✅
- Both update `local_cluster_usage` ✅
- Both track connections ✅
- Complementary (user-facing vs admin) ✅

---

## ✅ Ready to Start!

**Tomorrow (Oct 3)**:
- Start with monitoring dashboard
- Test with CentCom's API calls
- Build incrementally
- Update team sync daily

**Expected Timeline**: 3-4 days (same as CentCom Phase 3)  
**Outcome**: Complete admin tooling for CentCom integration

---

**Let's build the admin side while CentCom builds the user side!** 🚀

**Both teams working in parallel = Maximum efficiency!** ⚡

---

**Created**: October 2, 2025, 11:30 PM PT  
**Owner**: Lyceum Team  
**Status**: Ready to start tomorrow  
**Parallel**: With CentCom Phase 3




