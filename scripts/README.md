# 🔧 Scripts Directory
**Test scripts, setup scripts, and utilities for the Lyceum platform**

---

## 📂 Folder Structure

```
scripts/
│
├── tests/          (22 files)
│   └── Test scripts for APIs, billing, sessions, and integrations
│
├── setup/          (5 files)
│   └── Setup and configuration scripts
│
└── utilities/      (5 files)
    └── Example code, utilities, and tools
```

---

## 🧪 Tests (22 files)

### Billing & Payment Tests:
- `test-billing-simple.ps1`
- `test-billing-system.js` / `.ps1`
- `test-gratis-license.ps1`
- `test-invoice-payment.js` / `.ps1` / `-fixed.ps1`
- `test-payment-flow.ps1`
- `test-payment-status.ps1`
- `test-responsible-user-billing.ps1`
- `test-status-options.ps1`
- `test-stripe-integration.ps1`

### CentCom Integration Tests:
- `test-centcom-api.js`
- `test-centcom-cluster-apis.js` / `.ps1`
- `test-centcom-real-session-sync.js`
- `test-centcom-session-sync.js`
- `test-enhanced-centcom-login.js`

### Other Tests:
- `test-optimized-heartbeat.js`
- `test-unban-admin.js`
- `test-webhook-url.ps1`
- `verify-integration.js`

### Usage:
```bash
# Node.js tests
node scripts/tests/test-billing-system.js
node scripts/tests/test-centcom-cluster-apis.js

# PowerShell tests
.\scripts\tests\test-billing-simple.ps1
.\scripts\tests\test-stripe-integration.ps1
```

---

## ⚙️ Setup (5 files)

### Setup Scripts:
- `execute-cluster-overhaul.ps1` - Execute cluster system migration
- `setup-centcom-integration.js` - Configure CentCom integration
- `setup-ngrok-webhook.ps1` - Setup ngrok for webhook testing
- `simple-billing-test.ps1` - Quick billing test setup
- `simple-test-payment.ps1` - Simple payment flow test

### Usage:
```bash
# JavaScript setup
node scripts/setup/setup-centcom-integration.js

# PowerShell setup
.\scripts\setup\setup-ngrok-webhook.ps1
.\scripts\setup\execute-cluster-overhaul.ps1
```

---

## 🛠️ Utilities (5 files)

### Example Code:
- `centcom-client-example.ts` - Example CentCom client implementation
- `centcom-session-sync-example.ts` - Example session sync code

### Utility Scripts:
- `fix-email-issues.js` - Email debugging utility
- `get-stripe-price-ids.js` - Retrieve Stripe price IDs
- `ngrok.exe` - ngrok executable for local tunneling

### Usage:
```bash
# Run utilities
node scripts/utilities/fix-email-issues.js
node scripts/utilities/get-stripe-price-ids.js

# Use ngrok
.\scripts\utilities\ngrok.exe http 3594
```

---

## 🎯 Quick Reference

### Running Tests:

**CentCom Integration**:
```bash
# Comprehensive API tests (Node.js)
node scripts/tests/test-centcom-cluster-apis.js

# PowerShell version
.\scripts\tests\test-centcom-cluster-apis.ps1
```

**Billing System**:
```bash
# Full billing test
node scripts/tests/test-billing-system.js

# Quick PowerShell test
.\scripts\tests\test-billing-simple.ps1
```

**Payment Flow**:
```bash
# Invoice payment test
node scripts/tests/test-invoice-payment.js

# Payment flow
.\scripts\tests\test-payment-flow.ps1
```

---

### Setup & Configuration:

**ngrok Setup (for webhooks)**:
```powershell
# Setup ngrok tunnel
.\scripts\setup\setup-ngrok-webhook.ps1

# Or run ngrok directly
.\scripts\utilities\ngrok.exe http 3594
```

**CentCom Integration**:
```bash
# Configure CentCom integration
node scripts/setup/setup-centcom-integration.js
```

---

## 📝 Script Types

| Type | Extension | How to Run |
|------|-----------|------------|
| **Node.js** | `.js` | `node scripts/<folder>/<file>.js` |
| **PowerShell** | `.ps1` | `.\scripts\<folder>\<file>.ps1` |
| **TypeScript** | `.ts` | Examples only - import into your code |
| **Executable** | `.exe` | `.\scripts\utilities\<file>.exe` |

---

## ✅ Best Practices

### Before Running Tests:
1. ✅ Ensure development server is running (`npm run dev`)
2. ✅ Check database connection (Supabase)
3. ✅ Verify environment variables are set
4. ✅ For payment tests: Ensure Stripe keys are configured

### For Setup Scripts:
1. ✅ Read script comments for requirements
2. ✅ Backup database before running migrations
3. ✅ Test in development first
4. ✅ Check logs for errors

### For Utilities:
1. ✅ Review example code before implementing
2. ✅ Update credentials/keys as needed
3. ✅ Test thoroughly before production use

---

## 🔍 Finding the Right Script

### Testing Billing?
→ `tests/test-billing-system.js` or `tests/test-billing-simple.ps1`

### Testing CentCom APIs?
→ `tests/test-centcom-cluster-apis.js`

### Setting up Webhooks?
→ `setup/setup-ngrok-webhook.ps1`

### Need Examples?
→ `utilities/centcom-*-example.ts`

### Debugging Email?
→ `utilities/fix-email-issues.js`

---

## 🚀 Active Test Scripts

### For Current CentCom Integration:
📍 **Primary**: `tests/test-centcom-cluster-apis.js`  
📍 **Location**: Also available in `docs/centcom-integration/testing/`

**These are the same file** - use whichever location you prefer!

---

## 📊 Script Statistics

| Category | Count | Purpose |
|----------|-------|---------|
| **Tests** | 22 | API and integration testing |
| **Setup** | 5 | Configuration and setup |
| **Utilities** | 5 | Tools and examples |
| **Total** | **32** | Development productivity |

---

## 🔄 Maintenance

### Adding New Scripts:
1. Add to appropriate folder (`tests/`, `setup/`, or `utilities/`)
2. Include comments explaining purpose and usage
3. Update this README with the new script
4. Document any environment variables needed

### Deprecating Scripts:
1. Move to `docs/archive/` if still useful for reference
2. Update this README
3. Add deprecation notice in script comments

---

**Need to run a test?** Check the `tests/` folder!  
**Need to set something up?** Check the `setup/` folder!  
**Need an example?** Check the `utilities/` folder!

