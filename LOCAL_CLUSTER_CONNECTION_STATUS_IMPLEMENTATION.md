# Local Cluster Connection Status Implementation

## 🎯 Overview

Implemented real-time connection status indicators for local clusters in Lyceum that show whether the CentCom/native application is running and connected.

---

## ✅ Changes Made

### 1. Backend API Updates

#### [src/app/api/clusters/route.ts](src/app/api/clusters/route.ts) (Lines 484-500)
**Added:**
- Improved connection detection logic
- Uses 15-minute window instead of 24 hours (1.5x the 10-minute heartbeat interval)
- Added `is_connected` boolean flag to API response
- Enhanced health status based on connection state

```typescript
// CentCom sends heartbeats every 10 minutes
// Consider connected if heartbeat is within 15 minutes
const fifteenMinutesAgo = new Date().getTime() - (15 * 60 * 1000)
const isConnected = cluster.last_heartbeat_at &&
  new Date(cluster.last_heartbeat_at).getTime() > fifteenMinutesAgo
```

#### [src/app/api/clusters/by-key/[clusterKey]/route.ts](src/app/api/clusters/by-key/[clusterKey]/route.ts) (Lines 91-109)
**Added:**
- Same 15-minute connection detection logic
- Added `is_connected` flag for cluster details endpoint
- Consistent connection status across all endpoints

---

### 2. Frontend UI Updates

#### [src/app/clusters/page.tsx](src/app/clusters/page.tsx) - Clusters List

**Interface Update (Lines 20-42):**
```typescript
interface Cluster {
  // ... existing fields
  is_connected?: boolean
  last_heartbeat_at?: string
  // ... rest of fields
}
```

**Auto-Refresh (Lines 58-67):**
```typescript
// Auto-refresh clusters every 30 seconds to keep connection status current
useEffect(() => {
  if (!user) return

  const interval = setInterval(() => {
    loadClusters()
  }, 30000) // 30 seconds

  return () => clearInterval(interval)
}, [user])
```

**Visual Indicators (Lines 368-413):**
- **Pulsing green dot** on cluster icon when connected
- **Gray dot** when offline
- **Connection badge** next to cluster name:
  - Green "Connected" badge when online
  - Gray "Offline" badge when disconnected

```tsx
{/* Connection indicator dot for local clusters */}
{cluster.cluster_type === 'local' && (
  <span
    className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white dark:border-gray-800 ${
      cluster.is_connected
        ? 'bg-green-500 animate-pulse'
        : 'bg-gray-400'
    }`}
    title={cluster.is_connected ? 'Connected' : 'Offline'}
  />
)}

{/* Connection status badge */}
{cluster.cluster_type === 'local' && (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      cluster.is_connected
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    }`}
  >
    {cluster.is_connected ? 'Connected' : 'Offline'}
  </span>
)}
```

#### [src/app/clusters/[clusterKey]/page.tsx](src/app/clusters/[clusterKey]/page.tsx) - Cluster Details

**Interface Update (Lines 22-51):**
```typescript
interface ClusterDetails {
  // ... existing fields
  is_connected?: boolean
  // ... rest of fields
}
```

**Auto-Refresh (Lines 68-77):**
```typescript
// Auto-refresh cluster details every 30 seconds
useEffect(() => {
  if (!user || !params.clusterKey) return

  const interval = setInterval(() => {
    loadClusterDetails()
  }, 30000) // 30 seconds

  return () => clearInterval(interval)
}, [user, params.clusterKey])
```

**Header Visual Indicators (Lines 222-276):**
- **Pulsing green dot** on cluster icon
- **Large connection badge** next to cluster name
- **"Last seen" timestamp** showing when the last heartbeat was received

```tsx
{/* Connection status badge */}
{cluster.cluster_type === 'local' && (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
    cluster.is_connected
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${cluster.is_connected ? 'bg-green-500' : 'bg-gray-400'}`} />
    {cluster.is_connected ? 'Connected' : 'Offline'}
  </span>
)}

{/* Last seen timestamp */}
{cluster.cluster_type === 'local' && cluster.last_heartbeat_at && (
  <p className="text-xs text-gray-500 dark:text-gray-400">
    Last seen: {new Date(cluster.last_heartbeat_at).toLocaleString()}
  </p>
)}
```

---

## 🔄 How It Works

### Heartbeat System
1. **CentCom sends heartbeats** every 10 minutes to `/api/centcom/clusters/local/heartbeat`
2. **Heartbeat endpoint updates** `last_heartbeat_at` timestamp in database
3. **Lyceum checks** if heartbeat is within last 15 minutes (1.5x interval)
4. **Connection status updated** based on heartbeat freshness

### Connection Detection Logic
```typescript
const fifteenMinutesAgo = new Date().getTime() - (15 * 60 * 1000)
const isConnected = cluster.last_heartbeat_at &&
  new Date(cluster.last_heartbeat_at).getTime() > fifteenMinutesAgo
```

**Why 15 minutes?**
- CentCom heartbeat interval: 10 minutes
- Grace period: 1.5x = 15 minutes
- Accounts for network delays and ensures accurate status

### Auto-Refresh System
- **Frontend refreshes** every 30 seconds
- **Automatically fetches** latest cluster data
- **Updates connection status** without page reload
- **Silent background refresh** - no loading spinner after initial load

---

## 📊 Visual Indicators

### Clusters Table (`/clusters`)
| Element | Connected | Offline |
|---------|-----------|---------|
| Dot on icon | 🟢 Green (pulsing) | ⚪ Gray |
| Status badge | 🟢 "Connected" | ⚪ "Offline" |
| Badge color | Green background | Gray background |

### Cluster Details (`/clusters/[key]`)
| Element | Connected | Offline |
|---------|-----------|---------|
| Dot on icon | 🟢 Green (pulsing) | ⚪ Gray |
| Status badge | 🟢 "Connected" | ⚪ "Offline" |
| Last seen | Shows timestamp | Shows last heartbeat |

---

## 🧪 Testing

### Test 1: Connected State
1. **Start CentCom** application
2. **Sign in** to CentCom with your account
3. **Go to Lyceum** → `/clusters` page
4. **Expected:**
   - Green pulsing dot on cluster icon
   - Green "Connected" badge next to cluster name
   - Status shows as "active"

### Test 2: Disconnected State
1. **Close CentCom** application completely
2. **Wait 15 minutes** (or adjust system time for faster testing)
3. **Refresh Lyceum** `/clusters` page
4. **Expected:**
   - Gray dot on cluster icon (no pulsing)
   - Gray "Offline" badge
   - Status shows as "offline"

### Test 3: Real-Time Updates
1. **Open Lyceum** `/clusters` page with CentCom running
2. **Wait 30 seconds** (auto-refresh interval)
3. **Observe:** Connection status automatically updates without page reload
4. **Close CentCom**
5. **Wait 15 minutes + 30 seconds** for disconnect detection + refresh
6. **Expected:** Status automatically changes to "Offline"

### Test 4: Cluster Details Page
1. **Go to** `/clusters/LOCAL-0011` (or your cluster key)
2. **Verify:**
   - Header shows connection status badge
   - "Last seen" timestamp displayed
   - Auto-refreshes every 30 seconds
3. **Check logs:** Should see periodic refresh in browser console

---

## 🎨 UI Components

### Pulsing Green Dot (Connected)
```tsx
<span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white dark:border-gray-800 bg-green-500 animate-pulse" />
```

### Gray Dot (Offline)
```tsx
<span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white dark:border-gray-800 bg-gray-400" />
```

### Connection Badge (Connected)
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
  Connected
</span>
```

### Offline Badge
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
  Offline
</span>
```

---

## 📝 Notes

### Performance
- Auto-refresh uses efficient background fetches
- Only local clusters check for connection status
- Cloud clusters unaffected by connection logic

### Database Fields Used
- `local_cluster_usage.last_heartbeat_at` - Timestamp of last heartbeat
- `local_cluster_usage.cluster_status` - Overall cluster health ('online', 'offline', 'critical')
- `local_cluster_usage.is_running` - Boolean flag from CentCom heartbeat

### User Experience
- **Green = Good**: Cluster is connected and sending data
- **Gray = Offline**: Cluster hasn't sent heartbeat in 15+ minutes
- **Auto-updates**: No manual refresh needed
- **Clear indicators**: Multiple visual cues (dot, badge, timestamp)

---

## 🚀 Future Enhancements

Potential improvements:
1. **WebSocket real-time updates** instead of polling
2. **Notification** when cluster goes offline
3. **Connection quality indicator** (ping/latency)
4. **History graph** showing uptime over time
5. **Alert settings** for offline duration thresholds

---

## 📚 Related Files

### Backend
- [src/app/api/clusters/route.ts](src/app/api/clusters/route.ts)
- [src/app/api/clusters/by-key/[clusterKey]/route.ts](src/app/api/clusters/by-key/[clusterKey]/route.ts)
- [src/app/api/centcom/clusters/local/heartbeat/route.ts](src/app/api/centcom/clusters/local/heartbeat/route.ts)

### Frontend
- [src/app/clusters/page.tsx](src/app/clusters/page.tsx)
- [src/app/clusters/[clusterKey]/page.tsx](src/app/clusters/[clusterKey]/page.tsx)

### Database
- `local_cluster_usage` table
- `local_cluster_usage_history` table

---

## ✅ Summary

**What was implemented:**
- ✅ Real-time connection status detection (15-minute window)
- ✅ Visual indicators (pulsing dots, badges, timestamps)
- ✅ Auto-refresh every 30 seconds
- ✅ Consistent status across clusters list and details pages
- ✅ "Last seen" timestamp display
- ✅ Dark mode support for all indicators

**User can now see:**
- Whether their local cluster is connected to Lyceum
- When the cluster last sent a heartbeat
- Real-time status updates without page refresh
- Clear visual differentiation between connected/offline states

**Technical improvements:**
- More accurate connection detection (15 min vs 24 hours)
- Explicit `is_connected` flag in API responses
- Consistent connection logic across all endpoints
- Efficient auto-refresh with minimal performance impact
