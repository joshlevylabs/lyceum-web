# 🚀 CentCom: Start Testing NOW!

**Date**: October 3, 2025  
**Status**: ✅ **READY - APIs Fixed, Start Testing!**

---

## ⚡ Quick Start (2 Minutes)

### Step 1: Log In to Lyceum
```
URL: http://localhost:3594
Email: josh@thelyceum.io
Password: W00dpusher!!
```

**OR** if you already have access, just navigate to the URL above.

---

### Step 2: Get Your JWT Token

Once logged in, **open your browser console** (F12) and run this:

```javascript
// Copy and paste this entire block into browser console:
(() => {
  const authData = localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token');
  if (authData) {
    const session = JSON.parse(authData);
    console.log('\n🎯 ====== YOUR JWT TOKEN ======');
    console.log(session.access_token);
    console.log('\n📋 Copy the token above ☝️\n');
    console.log('✅ User ID:', session.user.id);
    console.log('✅ Email:', session.user.email);
    console.log('✅ Expires:', new Date(session.expires_at * 1000).toLocaleString());
    console.log('\n🎯 ====== YOUR JWT TOKEN ======\n');
    return { 
      token: session.access_token, 
      userId: session.user.id,
      email: session.user.email 
    };
  } else {
    console.error('❌ Please log in first at http://localhost:3594');
  }
})();
```

**What you'll see**:
```
🎯 ====== YOUR JWT TOKEN ======
eyJhbGciOiJIUzI1NiIsImtpZCI6Iit2VzVWTU5OTjY4MnN0OTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tmZmlhcXNpaGxkZ3Fkd2Fnb29rLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyYzNkNDc0Ny04ZDY3LTQ1YWYtOTBmNS1iNWU5MDU4ZWMyNDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU5NDM4OTQ3LCJpYXQiOjE3NTk0MzUzNDcsImVtYWlsIjoiam9zaEB0aGVseWNldW0uaW8iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJUaGUgTHljZXVtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ikpvc2h1YSBMZXZ5IiwiaW52aXRlZF9ieV9hZG1pbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwidXNlcl9uYW1lIjoibHljZXVtLWFkbWluIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTk0MjgzNjl9XSwic2Vzc2lvbl9pZCI6ImQ4NjRiMzRiLTAzNzMtNDIzYi1hMmM2LWMwM2YxMzJlZDJkYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.QYnVezXN4W_FdGmx7pax19Fl8gnMRJqVsy5w-kkx1j0


📋 Copy the token above ☝️

✅ User ID: 2c3d4747-8d67-45af-90f5-b5e9058ec246
✅ Email: josh@thelyceum.io
✅ Expires: Thu Oct 03 2025 22:22:50 GMT-0700

🎯 ====== YOUR JWT TOKEN ======
```

**Copy the JWT token** - you'll use it for all API calls!

---

### Step 3: Test License Key

```
PLUGIN-ENT-2025-HQ21CIBF
```

**License Details**:
- Type: **Enterprise**
- Status: **Active** ✅
- Local Cluster: **Enabled** ✅
- Limits:
  - Storage: **500 GB**
  - Queries: **10,000,000/month**
  - Grace Period: **30 days**

---

## 🧪 Test the 4 API Endpoints

### API 1: License Verification ✅

```bash
# Test in terminal or use your app
curl -X POST http://localhost:3594/api/centcom/license/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "license_key": "PLUGIN-ENT-2025-HQ21CIBF"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "license": {
    "key_code": "PLUGIN-ENT-2025-HQ21CIBF",
    "license_type": "enterprise",
    "allows_local_cluster": true,
    "limits": {
      "max_storage_gb": 500,
      "max_monthly_queries": 10000000,
      "offline_grace_days": 30
    }
  }
}
```

---

### API 2: Cluster Discovery ✅

```bash
curl http://localhost:3594/api/centcom/clusters/discover \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "clusters": [...],
  "count": 0,
  "note": "No clusters yet - they'll appear when you connect"
}
```

---

### API 3: Usage Sync ✅

```bash
curl -X POST http://localhost:3594/api/centcom/usage/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "license_key": "PLUGIN-ENT-2025-HQ21CIBF",
    "machine_fingerprint": "test-machine-123",
    "storage_used_gb": 45.2,
    "queries_this_month": 1234567,
    "clickhouse_version": "24.1.0",
    "machine_os": "Windows 11",
    "machine_cpu_cores": 8,
    "machine_memory_gb": 16
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Usage metrics synced successfully"
}
```

---

### API 4: Connection Tracking ✅

```bash
curl -X POST http://localhost:3594/api/centcom/connection/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "cluster_id": null,
    "connection_type": "local",
    "connection_name": "Local ClickHouse",
    "event_type": "connect",
    "set_as_default": true
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Connection event tracked successfully"
}
```

---

## 📊 Monitor Lyceum Backend (Real-Time!)

While you test, **Lyceum can watch** your activity in real-time at:

### 1. Cluster Monitoring Dashboard
```
http://localhost:3594/admin/centcom-clusters
```
- See your local cluster when it connects
- Watch usage metrics update
- View online/offline status
- Auto-refreshes every 30 seconds

### 2. Connection Analytics
```
http://localhost:3594/admin/centcom-connections
```
- See your connection events
- View timeline of connects/disconnects
- Statistics and analytics
- Auto-refreshes every minute

### 3. Alerts API
```
http://localhost:3594/api/admin/centcom-alerts
```
- Check for warnings (usage > 80%)
- See offline alerts
- View grace period status

---

## 🎯 Your Testing Checklist

### Initial Setup (5 min):
- [ ] Log in to http://localhost:3594
- [ ] Get JWT token from localStorage
- [ ] Save JWT token somewhere safe
- [ ] Verify test license key

### API Testing (30 min):
- [ ] Test License Verification API
- [ ] Test Cluster Discovery API
- [ ] Test Usage Sync API
- [ ] Test Connection Tracking API
- [ ] All 4 APIs returning 200 OK

### Integration Testing (2 hours):
- [ ] Initialize your services with JWT token
- [ ] Start local ClickHouse cluster
- [ ] Sync usage metrics
- [ ] Connect to cloud clusters
- [ ] Watch real-time updates in UI

### Full Day Testing (see test plan):
- [ ] Run all 9 test modules
- [ ] Test error scenarios
- [ ] Test offline mode
- [ ] Performance testing
- [ ] Complete integration flows

---

## 💬 Communication Protocol

**When testing**:
```
CentCom: "Starting Test X.Y: [Name]"
Lyceum: "✅ Monitoring, ready"

CentCom: "Called POST /api/centcom/license/verify"
Lyceum: "📊 Request received, processing..."
Lyceum: "✅ Response sent: 200 OK"

CentCom: "✅ Received response, all good!"
Both: "Test X.Y PASSED ✅"
```

**If issues**:
```
CentCom: "❌ Test failed - getting 500 error"
CentCom: "Payload: { ... }"
Lyceum: "🔍 Checking logs..."
Lyceum: "Found issue: [description]"
Lyceum: "Fixed! Try again"
```

---

## 🔥 Expected Behavior

### First Time You Connect:
1. **Lyceum Dashboard Shows**:
   - "No clusters found" initially
   - Then your cluster appears! 🎉
   - Usage metrics start showing
   - Status indicators update

2. **Your CentCom App Shows**:
   - License validated ✅
   - Clusters discovered ✅
   - Usage syncing ✅
   - Real-time updates working ✅

3. **Both Teams See**:
   - Data flowing correctly
   - Real-time sync working
   - No errors in consoles
   - Everything functioning! 🎯

---

## 📋 Quick Reference

**Lyceum Access**:
- URL: `http://localhost:3594`
- Email: `josh@thelyceum.io`
- Password: [Ask Josh]

**Test License**:
- Key: `PLUGIN-ENT-2025-HQ21CIBF`
- Type: Enterprise
- Status: Active ✅

**API Base URL**:
- `http://localhost:3594/api/centcom/`

**API Endpoints**:
1. `POST /license/verify`
2. `GET /clusters/discover`
3. `POST /usage/sync`
4. `POST /connection/track`

**Monitoring URLs**:
- Clusters: `/admin/centcom-clusters`
- Connections: `/admin/centcom-connections`
- Alerts: `/api/admin/centcom-alerts`

---

## 🆘 If You Get Stuck

### Can't Log In?
- Make sure dev server is running
- Check URL: `http://localhost:3594`
- Ask Josh for password
- Clear browser cache and try again

### Can't Get JWT Token?
- Make sure you're logged in first
- Open console (F12)
- Run the token script again
- Token expires after ~1 hour (get fresh one)

### API Returns 401?
- JWT token expired - get a new one
- Make sure Authorization header is set
- Format: `Bearer YOUR_TOKEN_HERE`

### API Returns 500?
- Check console logs
- Tell Lyceum team immediately
- Share the error message
- We'll fix it ASAP!

---

## 🎉 Let's Do This!

**You're Ready**:
- ✅ APIs are fixed and working
- ✅ Login credentials provided
- ✅ JWT token script ready
- ✅ Test license active
- ✅ Monitoring dashboards operational
- ✅ Lyceum team standing by

**Your Achievement So Far**:
- ✅ Phase 2 complete (5 services, 117+ tests)
- ✅ Phase 3 complete (6 UI components)
- ✅ 16 days ahead of schedule!
- ✅ A+ quality throughout

**Now**: 
- 🧪 Test the integration!
- 🎯 Prove it all works together!
- 🚀 Move to production!

---

## 🚀 START TESTING NOW!

**Steps**:
1. Log in (2 min)
2. Get JWT token (1 min)
3. Test APIs (30 min)
4. Run your services (rest of day)
5. Celebrate success! 🎉

**Lyceum is watching and cheering you on!** 📊

---

**Created**: October 3, 2025  
**Status**: ✅ Ready for immediate testing  
**APIs**: Fixed and operational  
**Support**: < 5 minute response time

---

*You've built something amazing - now let's prove it works!* ⚡🚀

