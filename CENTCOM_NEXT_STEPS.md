# 📋 Centcom Integration - Next Steps Guide

## 🎯 **Overview**
The Lyceum backend is **fully implemented and ready**. This guide provides the exact steps the Centcom development team needs to take to complete the integration and begin testing.

---

## ⚡ **Quick Start Checklist**

- [ ] **Step 1**: Set up Lyceum database schema
- [ ] **Step 2**: Update Centcom environment configuration  
- [ ] **Step 3**: Test API connectivity
- [ ] **Step 4**: Validate authentication flow
- [ ] **Step 5**: Test version-based licensing
- [ ] **Step 6**: Verify plugin loading
- [ ] **Step 7**: Test all license tier scenarios
- [ ] **Step 8**: Deploy to staging environment

---

## 🔧 **Step 1: Database Schema Setup**

### **Action Required: Execute SQL Script**

1. **Open Supabase Dashboard**
   - Navigate to your Lyceum Supabase project
   - Go to **SQL Editor**

2. **Copy and Execute Schema**
   ```sql
   -- Copy the ENTIRE contents of database-setup-centcom-integration.sql
   -- Paste into Supabase SQL Editor
   -- Click "Run" to execute
   ```

3. **Verify Tables Created**
   ```sql
   -- Check that these tables exist:
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'application_versions',
     'license_version_compatibility'
   );
   
   -- Should return 2 rows
   ```

4. **Test Version Function**
   ```sql
   -- Test the compatibility function:
   SELECT check_version_compatibility('standard', 'centcom', '2.1.0');
   
   -- Should return JSON with is_compatible: true
   ```

### **Expected Results**
✅ Tables created with sample data  
✅ Version compatibility function working  
✅ License rules properly configured  

---

## 🌐 **Step 2: Environment Configuration**

### **Update Centcom .env File**

```env
# Lyceum Integration
LYCEUM_API_BASE_URL=http://localhost:3594/api/centcom
LYCEUM_API_TIMEOUT=30000
LYCEUM_RETRY_ATTEMPTS=3

# Application Info
CENTCOM_VERSION=2.1.0
CENTCOM_APP_ID=centcom

# Development Settings (update for production)
NODE_ENV=development
```

### **Update package.json Dependencies**
Ensure these are installed:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "semver": "^7.5.4",
    "jsonwebtoken": "^9.0.2"
  }
}
```

### **Install Dependencies**
```bash
npm install axios semver jsonwebtoken
```

---

## 🔗 **Step 3: API Connectivity Test**

### **Start Lyceum Server**
```bash
# In Lyceum project directory:
npm run dev
# Server should start on http://localhost:3594
```

### **Test Health Endpoint**
```bash
# Using curl (Git Bash/WSL):
curl http://localhost:3594/api/centcom/health

# Using PowerShell:
Invoke-RestMethod -Uri "http://localhost:3594/api/centcom/health" -Method GET

# Using browser:
# Navigate to http://localhost:3594/api/centcom/health
```

### **Expected Response**
```json
{
  "status": "healthy",
  "response_time_ms": 45,
  "services": {
    "database": { "status": "healthy" },
    "version_compatibility": { "status": "healthy" },
    "authentication": { "status": "healthy" }
  },
  "api_endpoints": {
    "/api/centcom/auth/login": "available",
    "/api/centcom/licenses/validate-plugin": "available"
  }
}
```

### **Troubleshooting**
❌ **503 Error**: Database schema not set up → Go back to Step 1  
❌ **Connection refused**: Lyceum server not running → Check npm run dev  
❌ **404 Error**: Wrong URL → Verify port 3594  

---

## 🔐 **Step 4: Authentication Flow Test**

### **Create Test User in Supabase**
1. Go to **Authentication > Users** in Supabase
2. Click **Add user**
3. Create test user:
   - **Email**: `centcom-test@example.com`
   - **Password**: `TestPassword123!`
   - **Email confirmed**: ✅ Yes

### **Test Login API**
```javascript
// Test authentication
const loginResponse = await fetch('http://localhost:3594/api/centcom/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'centcom-test@example.com',
    password: 'TestPassword123!'
  })
});

const loginData = await loginResponse.json();
console.log('Login result:', loginData);
```

### **Expected Response**
```json
{
  "success": true,
  "session": {
    "user": {
      "id": "uuid-here",
      "email": "centcom-test@example.com",
      "username": "centcom-test",
      "role": "user"
    },
    "session_token": "jwt-token-here",
    "expires_at": "2025-09-12T18:00:00.000Z",
    "permissions": {
      "can_access_centcom": true,
      "plugins": ["centcom"],
      "role_permissions": ["basic_access"]
    }
  }
}
```

### **Test Session Validation**
```javascript
// Test session validation
const validateResponse = await fetch('http://localhost:3594/api/centcom/auth/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_token: 'jwt-token-from-login',
    user_id: 'user-uuid-from-login'
  })
});
```

---

## 🔢 **Step 5: Version-Based Licensing Test**

### **Test Centcom Version Access**
```javascript
// Test Centcom v2.1.0 access
const versionResponse = await fetch('http://localhost:3594/api/centcom/licenses/validate-plugin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-uuid-here',
    plugin_id: 'centcom',
    version_requested: '2.1.0'
  })
});

const versionData = await versionResponse.json();
console.log('Version access:', versionData);
```

### **Expected Success Response**
```json
{
  "success": true,
  "has_access": true,
  "version_access": true,
  "plugin_id": "centcom",
  "version_requested": "2.1.0",
  "version_compatibility": {
    "is_compatible": true,
    "requires_upgrade": false,
    "notes": "Full compatibility"
  },
  "available_versions": [
    {
      "version": "2.1.0",
      "is_stable": true,
      "compatibility_status": "compatible"
    }
  ]
}
```

### **Test License Upgrade Scenario**
```javascript
// Test beta version access (should fail for standard users)
const betaResponse = await fetch('http://localhost:3594/api/centcom/licenses/validate-plugin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-uuid-here',
    plugin_id: 'centcom',
    version_requested: '3.0.0-beta'
  })
});
```

### **Expected Upgrade Required Response**
```json
{
  "success": true,
  "has_access": false,
  "version_access": false,
  "version_compatibility": {
    "is_compatible": false,
    "requires_upgrade": true,
    "notes": "Beta versions require professional license or higher"
  }
}
```

---

## 🔌 **Step 6: Plugin Loading Test**

### **Test Available Versions API**
```javascript
// Get available versions for a plugin
const versionsResponse = await fetch(
  'http://localhost:3594/api/centcom/versions/available?plugin_id=klippel_qc&user_id=user-uuid'
);

const versionsData = await versionsResponse.json();
console.log('Available versions:', versionsData);
```

### **Test Plugin Validation**
```javascript
// Test Klippel QC plugin access
const klippelResponse = await fetch('http://localhost:3594/api/centcom/licenses/validate-plugin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-uuid-here',
    plugin_id: 'klippel_qc',
    version_requested: '2.1.0',
    feature_required: 'automated_testing'
  })
});
```

---

## 🧪 **Step 7: Complete License Tier Testing**

### **Create Test Users for Each License Type**

#### **Create in Supabase Auth + Licenses**
1. **Trial User**
   - Email: `trial@centcom.test`
   - Create license with `license_type: 'trial'`

2. **Standard User**
   - Email: `standard@centcom.test`
   - Create license with `license_type: 'standard'`

3. **Professional User**
   - Email: `professional@centcom.test`
   - Create license with `license_type: 'professional'`

4. **Enterprise User**
   - Email: `enterprise@centcom.test`
   - Create license with `license_type: 'enterprise'`

### **Test Matrix**
| User Type | Centcom v1.5.0 | Centcom v2.1.0 | Centcom v3.0.0-beta | Klippel QC v2.2.0 |
|-----------|----------------|-----------------|---------------------|-------------------|
| Trial | ✅ Should pass | ❌ Should fail | ❌ Should fail | ❌ Should fail |
| Standard | ✅ Should pass | ✅ Should pass | ❌ Should fail | ❌ Should fail |
| Professional | ✅ Should pass | ✅ Should pass | ✅ Should pass | ✅ Should pass |
| Enterprise | ✅ Should pass | ✅ Should pass | ✅ Should pass | ✅ Should pass |

### **Automated Test Script**
```javascript
// Create this test in your Centcom project
async function testAllLicenseTiers() {
  const testCases = [
    { user: 'trial@centcom.test', plugin: 'centcom', version: '1.5.0', expected: true },
    { user: 'trial@centcom.test', plugin: 'centcom', version: '2.1.0', expected: false },
    { user: 'standard@centcom.test', plugin: 'centcom', version: '2.1.0', expected: true },
    { user: 'standard@centcom.test', plugin: 'centcom', version: '3.0.0-beta', expected: false },
    { user: 'professional@centcom.test', plugin: 'centcom', version: '3.0.0-beta', expected: true },
  ];

  for (const test of testCases) {
    // Login as user
    const session = await login(test.user, 'password');
    
    // Test version access
    const access = await validatePluginAccess(test.plugin, test.version);
    
    const result = access.has_access === test.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${result} ${test.user} → ${test.plugin}@${test.version}`);
  }
}
```

---

## 🚀 **Step 8: Integration with Centcom Client**

### **Update LyceumClient Configuration**
```typescript
// In your src/services/lyceumClient.ts
export class LyceumClient {
  constructor() {
    this.baseUrl = 'http://localhost:3594/api/centcom'; // ← Update this
    // ... rest of implementation
  }
}
```

### **Test Full Integration Flow**
```typescript
// Complete integration test
async function testCentcomIntegration() {
  const app = new CentcomApp();
  
  try {
    // 1. Initialize with authentication
    await app.initialize('professional@centcom.test', 'password');
    console.log('✅ Authentication successful');
    
    // 2. Validate Centcom version access
    const centcomAccess = await app.validatePluginAccess('centcom', '2.1.0');
    console.log('✅ Centcom version access:', centcomAccess);
    
    // 3. Load Klippel QC plugin
    const klippelPlugin = await app.loadPlugin('klippel_qc', '2.1.0');
    console.log('✅ Klippel QC plugin loaded');
    
    // 4. Test feature access
    const hasAutomation = await app.validateFeature('klippel_qc', 'automated_testing');
    console.log('✅ Automation feature access:', hasAutomation);
    
    console.log('🎉 Full integration test passed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}
```

---

## 📊 **Step 9: Staging Deployment**

### **Production Environment Setup**
```env
# Production .env
LYCEUM_API_BASE_URL=https://your-lyceum-staging.com/api/centcom
LYCEUM_API_TIMEOUT=30000
CENTCOM_VERSION=2.1.0
NODE_ENV=production

# Security (replace with real values)
CENTCOM_SIGNING_KEY=your-production-signing-key
```

### **SSL/HTTPS Considerations**
- Ensure HTTPS for production API calls
- Update CORS settings if needed
- Test cross-origin requests

---

## ✅ **Success Criteria**

### **Integration is Complete When:**
- [ ] All API endpoints return expected responses
- [ ] Authentication flow works with real users
- [ ] Version compatibility is properly enforced
- [ ] License upgrade prompts appear correctly
- [ ] All plugin loading scenarios work
- [ ] Error handling provides clear guidance
- [ ] Performance is acceptable (< 2s for validation)

### **Ready for Production When:**
- [ ] All test scenarios pass
- [ ] Staging environment deployed and tested
- [ ] Error monitoring in place
- [ ] Performance testing completed
- [ ] Security review passed

---

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Database Connection Errors**
```
Error: Could not connect to database
```
**Solution**: Check Supabase credentials in `.env.local`

#### **Version Function Not Found**
```
Error: function check_version_compatibility does not exist
```
**Solution**: Re-run `database-setup-centcom-integration.sql`

#### **Authentication Failures**
```
Error: Invalid email or password
```
**Solution**: Check user exists in Supabase Auth

#### **License Not Found**
```
Error: No valid license found
```
**Solution**: Create license record in `licenses` table

#### **Version Not Compatible**
```
Error: License upgrade required
```
**Solution**: This is expected behavior - test upgrade prompts

### **Debug Tools**

#### **Enable Debug Logging**
```typescript
// In lyceumClient.ts
this.debug = true; // Enable verbose logging
```

#### **Check API Response**
```javascript
// Log full API responses
console.log('API Response:', await response.json());
```

#### **Verify Database State**
```sql
-- Check user licenses
SELECT * FROM licenses WHERE user_id = 'uuid-here';

-- Check version compatibility
SELECT * FROM license_version_compatibility WHERE license_type = 'standard';
```

---

## 📞 **Support & Contact**

### **For Technical Issues**
1. Check this troubleshooting guide first
2. Verify all steps have been completed
3. Check server logs for detailed errors
4. Test with different user accounts/license types

### **Integration Health Check**
Always available: `http://localhost:3594/api/centcom/health`

### **Key Files Reference**
- **API Documentation**: `CENTCOM_API_DOCUMENTATION.md`
- **Client Example**: `centcom-client-example.ts`
- **Database Setup**: `database-setup-centcom-integration.sql`
- **Integration Status**: `LYCEUM_CENTCOM_INTEGRATION_STATUS.md`

---

## 🎯 **Summary**

The Lyceum backend is **100% ready**. Follow these steps in order, test each one thoroughly, and you'll have a fully functional version-based licensing integration between Centcom and Lyceum.

**Estimated Time to Complete**: 2-4 hours for experienced developers

**Most Important Steps**: 
1. Database setup (Step 1) 
2. API connectivity (Step 3)
3. License tier testing (Step 7)

**🎉 Good luck with the integration!**







