# Centcom Application Integration Guide - Overview

## Quick Start

The Centcom application now supports version-based licensing through the Lyceum platform. This guide covers integration steps for license validation and version compatibility checking.

## Key Features

### 🔢 Version-Based Licensing
- **Version Compatibility**: Each license type supports specific application versions
- **Automatic Validation**: Real-time checking of version access during startup
- **Upgrade Guidance**: Clear messaging when license upgrades are required

### 🔌 Plugin Support
- **Klippel QC v2.0.0-2.2.0**: Quality control testing
- **APx500 v1.4.0-2.0.0**: Audio Precision analyzer integration  
- **Analytics Pro v1.0.0-2.0.0**: Advanced analytics and reporting
- **Centcom Core v1.0.0-3.0.0**: Base functionality

### 📊 License Tiers & Version Access

| License Type | Centcom Versions | Beta Access | Plugin Support |
|--------------|------------------|-------------|----------------|
| Trial | 1.0.0 - 1.5.0 | ❌ | Basic only |
| Standard | 1.0.0 - 2.1.0 | ❌ | All plugins |
| Professional | All versions | ✅ | All features |
| Enterprise | All versions | ✅ | Priority support |

## Integration Steps

### 1. Install Dependencies
```bash
npm install axios semver jsonwebtoken
```

### 2. Environment Setup
```env
LYCEUM_API_BASE_URL=http://localhost:3594/api/centcom
CENTCOM_VERSION=2.1.0
CENTCOM_APP_ID=centcom
```

### 3. Basic Authentication
```typescript
import { LyceumClient } from './lyceumClient'

const client = new LyceumClient()
const session = await client.login(email, password)

// Validate Centcom version access
const access = await client.validatePluginAccess('centcom', '2.1.0')
if (!access.has_access) {
  throw new Error(access.version_compatibility?.notes || 'Version not supported')
}
```

### 4. Plugin Loading with Version Check
```typescript
// Load Klippel QC plugin
const klippelAccess = await client.validatePluginAccess('klippel_qc', '2.1.0', 'automated_testing')

if (klippelAccess.has_access) {
  const plugin = await loadKlippelPlugin('2.1.0')
  await plugin.runAutomatedSequence(config)
}
```

## Version Compatibility API

### Validate Plugin Version
```typescript
POST /api/centcom/licenses/validate-plugin
{
  "user_id": "uuid",
  "plugin_id": "klippel_qc", 
  "version_requested": "2.1.0",
  "feature_required": "automated_testing"
}
```

**Response:**
```json
{
  "success": true,
  "has_access": true,
  "version_access": true,
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

### Get Available Versions
```typescript
GET /api/centcom/versions/available?plugin_id=centcom&user_id=uuid
```

**Response:**
```json
{
  "success": true,
  "versions_by_application": {
    "centcom": [
      {
        "version": "2.1.0",
        "is_stable": true,
        "compatibility": {
          "is_compatible": true,
          "requires_upgrade": false
        }
      }
    ]
  },
  "latest_stable_versions": {
    "centcom": "2.1.0"
  }
}
```

## Error Handling

### License Upgrade Required
```typescript
try {
  await validatePluginAccess('centcom', '3.0.0')
} catch (error) {
  if (error.code === 'VERSION_ERROR') {
    // Show upgrade dialog
    showUpgradeDialog({
      current_license: 'standard',
      required_license: 'professional',
      version_requested: '3.0.0'
    })
  }
}
```

### Version Not Found
```typescript
{
  "success": false,
  "error": "Requested version not found",
  "available_versions": ["2.0.0", "2.1.0"],
  "recommended_version": "2.1.0"
}
```

## Best Practices

1. **Cache Version Checks**: Store compatibility results for 15 minutes
2. **Graceful Degradation**: Fall back to compatible versions when possible
3. **User Guidance**: Provide clear upgrade paths and version information
4. **Resource Tracking**: Monitor usage for license compliance

## Database Schema

The system uses these new tables:
- `application_versions`: Available software versions
- `license_version_compatibility`: Version compatibility rules  
- `license_validations`: Audit trail of access attempts

## Next Steps

1. **Setup Database**: Run `database-setup-version-licensing.sql`
2. **Implement Client**: Use the provided LyceumClient class
3. **Test Integration**: Validate with different license types
4. **Deploy**: Configure production environment variables

For detailed implementation examples, see the complete integration files provided.
