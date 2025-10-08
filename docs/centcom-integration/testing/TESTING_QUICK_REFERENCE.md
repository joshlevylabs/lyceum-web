# 🧪 Quick Testing Reference
**CentCom Cluster APIs - Lyceum Backend**

---

## 🚀 Quick Test (30 seconds)

### 1. Get JWT Token
Open browser console at `http://localhost:3594` (while logged in):
```javascript
(() => {
  const authData = localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token');
  const session = JSON.parse(authData);
  console.log('TOKEN:', session.access_token);
  console.log('USER:', session.user.id);
})();
```

### 2. Run Tests
```bash
node test-centcom-cluster-apis.js
```

---

## 📋 Test Checklist

| Test | Expected | Status |
|------|----------|--------|
| License Verification | 200 OK | ✅ PASS |
| Cluster Discovery | 200 OK | ✅ PASS |
| Usage Sync | 200 OK | ✅ PASS |
| Connection Tracking | 200 OK | ✅ PASS |

**Current Success Rate**: 100% ✅

---

## 🔑 Test Configuration

**License Key**: `PLUGIN-ENT-2025-HQ21CIBF`  
**User ID**: `2c3d4747-8d67-45af-90f5-b5e9058ec246`  
**Email**: `josh@thelyceum.io`  
**License Type**: Enterprise  
**Local Cluster**: ✅ Enabled

---

## 📊 API Endpoints

### Base URL
```
http://localhost:3594/api/centcom
```

### 1. License Verification (Public)
```bash
POST /license/verify
Content-Type: application/json

{
  "license_key": "PLUGIN-ENT-2025-HQ21CIBF",
  "machine_fingerprint": "unique-machine-id"
}
```

### 2. Cluster Discovery (Authenticated)
```bash
GET /clusters/discover
Authorization: Bearer <JWT_TOKEN>
```

### 3. Usage Sync (Authenticated)
```bash
POST /usage/sync
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "machine_fingerprint": "unique-machine-id",
  "storage_used_gb": 2.5,
  "queries_this_month": 15000,
  "clickhouse_version": "24.1.0",
  "machine_info": {
    "os": "Windows 11",
    "memory_gb": 16,
    "cpu_cores": 8
  }
}
```

### 4. Connection Tracking (Authenticated)
```bash
POST /connection/track
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "cluster_id": "uuid-from-discovery",
  "connection_type": "cloud",
  "connection_name": "My Connection",
  "event_type": "connect",
  "set_as_default": false
}
```

---

## 🔍 Troubleshooting

### Token Expired (401)
**Problem**: JWT token has expired  
**Solution**: Get fresh token from browser (see Step 1)

### License Not Found (404)
**Problem**: Invalid license key  
**Solution**: Verify license key in database:
```sql
SELECT key_code, status, allows_local_cluster 
FROM license_keys 
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';
```

### License Not Allowed (403)
**Problem**: `allows_local_cluster` is false  
**Solution**: Enable it:
```sql
UPDATE license_keys 
SET allows_local_cluster = true 
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';
```

### No Clusters Found
**Problem**: No clusters assigned to user  
**Solution**: Assign a cluster in Lyceum admin panel or create one

---

## 📁 Important Files

### Testing:
- `test-centcom-cluster-apis.js` - Main test script
- `test-centcom-cluster-apis.ps1` - PowerShell version

### Documentation:
- `CENTCOM_LOCAL_CLUSTER_IMPLEMENTATION_GUIDE.md` - Full guide
- `PHASE_1_COMPLETION_REPORT.md` - Status report
- `CENTCOM_IMPLEMENTATION_PROMPT.md` - CentCom instructions

### Database:
- `centcom-local-cluster-schema.sql` - Schema migration
- `enable-local-cluster-for-license.sql` - Test setup
- `check-license-status.sql` - Verification queries

---

## ✅ Success Criteria

When all tests pass, you should see:
```
🎉 ALL TESTS PASSING - 100% SUCCESS RATE

Total Tests: 4
Passed: 4
Failed: 0
Warnings: 0
Success Rate: 100%
```

---

## 🎯 Next Steps

1. ✅ **Lyceum Backend** - COMPLETE
2. 🔄 **CentCom Frontend** - Ready to start
3. ⏳ **End-to-End Testing** - After CentCom implementation
4. ⏳ **Production Deployment** - Final phase

---

**Current Status**: Phase 0 & 1 Complete ✅  
**Ready for**: Phase 2 (CentCom Implementation) 🚀

