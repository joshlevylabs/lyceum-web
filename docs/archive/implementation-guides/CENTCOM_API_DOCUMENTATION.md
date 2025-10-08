# Centcom Integration API Documentation

This document describes the API endpoints that the Centcom application can use to authenticate users, validate licenses, and manage resources through the Lyceum platform.

## Base URL
```
http://localhost:3594/api/centcom
```

## Authentication Flow

### 1. User Login
**Endpoint:** `POST /api/centcom/auth/login`

Authenticates a user and returns a session with all necessary information for Centcom.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "user_password"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "full_name": "Full Name",
      "company": "Company Name",
      "role": "engineer",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "last_sign_in": "2025-01-01T00:00:00Z"
    },
    "licenses": [
      {
        "id": "license_id",
        "type": "centcom",
        "plugin_id": "klippel_qc",
        "license_type": "professional",
        "status": "active",
        "expires_at": "2025-12-31T23:59:59Z",
        "features": ["qc_testing", "klippel_hardware", "automated_testing"],
        "limits": {
          "max_users": 5,
          "max_projects": 50,
          "max_storage_gb": 100
        }
      }
    ],
    "clusters": [
      {
        "id": "cluster_id",
        "cluster_name": "Production DB",
        "cluster_type": "postgresql",
        "status": "active",
        "region": "us-east-1",
        "storage_size_mb": 10240
      }
    ],
    "resources": {
      "storage_used_mb": 1024,
      "storage_limit_mb": 10240,
      "bandwidth_used_mb": 512,
      "bandwidth_limit_mb": 51200,
      "api_calls_count": 1500,
      "api_calls_limit": 10000,
      "compute_hours_used": 25,
      "compute_hours_limit": 100
    },
    "onboarding": {
      "status": "completed",
      "completed_steps": ["welcome", "profile", "license"],
      "current_step": null
    },
    "permissions": {
      "can_access_centcom": true,
      "can_create_projects": true,
      "can_manage_clusters": true,
      "can_access_analytics": true,
      "plugins": ["general", "klippel_qc"],
      "role_permissions": ["project_create", "data_analysis", "export_data"]
    },
    "session_token": "base64_encoded_token",
    "expires_at": "2025-01-02T00:00:00Z"
  }
}
```

### 2. Session Validation
**Endpoint:** `POST /api/centcom/auth/validate`

Validates an existing session token and returns current user status.

**Request Body:**
```json
{
  "session_token": "base64_encoded_token",
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "full_name": "Full Name",
    "role": "engineer",
    "is_active": true
  },
  "licenses": [...],
  "permissions": {...}
}
```

## License Validation

### 3. Plugin License Validation
**Endpoint:** `POST /api/centcom/licenses/validate-plugin`

Validates if a user has access to a specific plugin and optional feature.

**Request Body:**
```json
{
  "user_id": "uuid",
  "plugin_id": "klippel_qc",
  "feature_required": "automated_testing"
}
```

**Response:**
```json
{
  "success": true,
  "has_access": true,
  "plugin_id": "klippel_qc",
  "license": {
    "id": "license_id",
    "type": "professional",
    "expires_at": "2025-12-31T23:59:59Z",
    "features": ["qc_testing", "klippel_hardware", "automated_testing"],
    "limits": {
      "max_users": 5,
      "max_projects": 50,
      "max_storage_gb": 100
    }
  },
  "feature_access": "automated_testing",
  "validation_timestamp": "2025-01-01T12:00:00Z"
}
```

## Plugin Information

### 4. Available Plugins
**Endpoint:** `GET /api/centcom/plugins/list`

Returns all available Centcom plugins and their licensing requirements.

**Query Parameters:**
- `license_type` (optional): Filter by license type (trial, standard, professional, enterprise)
- `include_features` (optional): Include detailed feature information (default: false)

**Response:**
```json
{
  "success": true,
  "plugins": [
    {
      "id": "klippel_qc",
      "name": "Klippel QC",
      "description": "Quality control and testing with Klippel hardware integration",
      "version": "2.1.0",
      "required_license_type": "standard",
      "features": [
        {
          "id": "qc_testing",
          "name": "QC Testing",
          "description": "Run quality control tests",
          "required": true
        }
      ],
      "license_tiers": {
        "standard": {
          "max_concurrent_tests": 1,
          "max_storage_gb": 20,
          "features": ["qc_testing", "klippel_hardware"]
        }
      }
    }
  ],
  "total_count": 4,
  "available_license_types": ["trial", "standard", "professional", "enterprise"]
}
```

## Resource Management

### 5. User Resources
**Endpoint:** `GET /api/centcom/user/resources?user_id=uuid`

Gets current resource usage and cluster information for a user.

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "resources": {
    "storage": {
      "used_mb": 1024,
      "limit_mb": 10240,
      "percentage": 10
    },
    "bandwidth": {
      "used_mb": 512,
      "limit_mb": 51200,
      "percentage": 1
    },
    "api_calls": {
      "used": 1500,
      "limit": 10000,
      "percentage": 15
    },
    "compute_hours": {
      "used": 25,
      "limit": 100,
      "percentage": 25
    }
  },
  "clusters": {
    "statistics": {
      "total_clusters": 2,
      "active_clusters": 2,
      "total_storage_mb": 20480,
      "cluster_types": {
        "postgresql": 1,
        "mongodb": 1
      }
    },
    "details": [
      {
        "id": "cluster_id",
        "name": "Production DB",
        "type": "postgresql",
        "status": "active",
        "region": "us-east-1",
        "storage_size_mb": 10240,
        "created_at": "2025-01-01T00:00:00Z",
        "last_accessed": "2025-01-01T12:00:00Z",
        "connection_string": "postgresql://..."
      }
    ]
  },
  "projects": {
    "total_count": 15,
    "recent_sessions": 5
  },
  "last_updated": "2025-01-01T12:00:00Z"
}
```

### 6. Update Resource Usage
**Endpoint:** `POST /api/centcom/user/resources`

Updates resource usage for a user (called by Centcom during operations).

**Request Body:**
```json
{
  "user_id": "uuid",
  "resource_type": "storage",
  "amount_used": 100,
  "operation": "add"
}
```

**Parameters:**
- `resource_type`: "storage", "bandwidth", "api_calls", or "compute_hours"
- `operation`: "add" (default), "subtract", or "set"

**Response:**
```json
{
  "success": true,
  "updated_usage": {...},
  "resource_type": "storage",
  "previous_value": 1024,
  "new_value": 1124
}
```

## Available Plugins

### Core Plugins

1. **Centcom Core** (`general`)
   - Basic Centcom functionality
   - License tiers: trial, standard, professional, enterprise

2. **Klippel QC** (`klippel_qc`)
   - Quality control testing with Klippel hardware
   - License tiers: standard, professional, enterprise
   - Features: QC testing, hardware integration, automated testing

3. **APx500 Integration** (`apx500`)
   - Audio Precision APx500 analyzer integration
   - License tiers: standard, professional, enterprise
   - Features: APx control, measurement automation, custom sequences

4. **Analytics Pro** (`analytics_pro`)
   - Advanced analytics and reporting
   - License tiers: professional, enterprise
   - Features: Advanced analytics, custom reports, data mining

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (missing parameters)
- `401`: Unauthorized (invalid credentials/token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (user/resource not found)
- `500`: Internal Server Error

## Integration Example

```javascript
// Centcom login flow
async function loginToCentcom(email, password) {
  const response = await fetch('/api/centcom/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store session data
    localStorage.setItem('centcom_session', JSON.stringify(data.session));
    
    // Check plugin access
    const pluginAccess = await validatePluginAccess(
      data.session.user.id, 
      'klippel_qc', 
      'automated_testing'
    );
    
    if (pluginAccess.has_access) {
      // User can access Klippel QC with automated testing
      initializeKlippelQC();
    }
  }
}

async function validatePluginAccess(userId, pluginId, feature) {
  const response = await fetch('/api/centcom/licenses/validate-plugin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      plugin_id: pluginId, 
      feature_required: feature 
    })
  });
  
  return await response.json();
}
```

## Security Notes

1. **Session Tokens**: Current implementation uses basic Base64 encoding. For production, implement proper JWT tokens with signing and expiration.

2. **Rate Limiting**: Consider implementing rate limiting on authentication endpoints.

3. **HTTPS**: Always use HTTPS in production for secure credential transmission.

4. **API Keys**: Consider requiring API keys for Centcom application authentication.

5. **Audit Logging**: All license validations are logged in the `license_validations` table for audit purposes.
