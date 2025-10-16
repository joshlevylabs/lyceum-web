# Centcom API Quick Reference

## Base URL
- **Development**: `http://localhost:3594`
- **Production**: `https://www.thelyceum.io`

## Authentication
All endpoints require JWT authentication:
```
Authorization: Bearer <lyceum_jwt_token>
```

**Token Location**: `localStorage.centcom_lyceum_session.session.session_token`

---

## Endpoints

### 1. Session Update (Primary)
**POST** `/api/centcom/auth/session-update`

Updates session metadata after Centcom authentication.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "session_id": "string",        // Required
  "version": "string",           // Optional
  "instance_id": "string",       // Optional
  "user_agent": "string",        // Optional
  "platform": "string",          // Optional
  "build": "string",             // Optional
  "timestamp": "ISO8601 string"  // Optional (defaults to now)
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Session updated successfully"
}
```

**Response** (401):
```json
{
  "success": false,
  "error": "Unauthorized" | "Invalid token"
}
```

**Response** (500):
```json
{
  "success": false,
  "error": "Failed to update session" | "Internal server error"
}
```

---

### 2. Session Update (Fallback)
**POST** `/api/admin/sessions/update`

Alternative endpoint with same functionality and enhanced logging.

Same request/response format as primary endpoint.

---

### 3. Dashboard Statistics
**GET** `/api/user/dashboard/stats`

Retrieves comprehensive dashboard statistics for authenticated user.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "data_clusters": 0,           // Number of data clusters
  "test_projects": 0,           // Number of test projects
  "plugin_licenses": 3,         // Active plugin licenses
  "total_sessions": 902,        // Total session count
  "active_users": 0,            // Users active in last 15 minutes
  "measurements_today": 0,      // Measurements created today
  "measurements_this_week": 0,  // Measurements in last 7 days
  "storage_used_gb": 0          // Storage usage in GB
}
```

**Response** (401):
```json
{
  "error": "Unauthorized" | "Invalid token"
}
```

**Response** (500):
```json
{
  "error": "Failed to retrieve dashboard stats"
}
```

---

### 4. Session Sync (Existing)
**POST** `/api/centcom/sessions/sync`

Syncs session activity heartbeat (already implemented).

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "session_id": "string",
  "status": "active" | "idle",
  "last_activity": "ISO8601 string",
  "platform": "string",
  "version": "string"
}
```

---

### 5. Onboarding Sessions (Existing)
**GET** `/api/user/onboarding/sessions`

Retrieves onboarding session data (already implemented, CORS added).

**Headers**:
```
Authorization: Bearer <token>
```

---

## Error Handling

### Common Error Codes
- **401 Unauthorized**: Missing or invalid JWT token
- **500 Internal Server Error**: Database or server error

### Error Response Format
```json
{
  "error": "Error message",
  "success": false  // Only on session update endpoints
}
```

---

## CORS Configuration

### Allowed Origins
- `http://localhost:3003` (Centcom dev)
- `http://localhost:3594` (Lyceum dev)
- `tauri://localhost` (Tauri apps)
- `https://centcom.thelyceum.io` (Centcom prod)
- `https://www.thelyceum.io` (Lyceum prod)

### Allowed Methods
- `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

### Allowed Headers
- `Content-Type`, `Authorization`

### Credentials
- `Access-Control-Allow-Credentials: true`

---

## Example Usage (JavaScript)

### Get Token from LocalStorage
```javascript
const session = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
const token = session?.session?.session_token;
```

### Session Update
```javascript
async function updateSession() {
  const session = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
  const token = session?.session?.session_token;

  const response = await fetch('http://localhost:3594/api/centcom/auth/session-update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      session_id: crypto.randomUUID(),
      version: '1.0.0',
      platform: navigator.platform,
      user_agent: navigator.userAgent
    })
  });

  const result = await response.json();
  console.log(result);
}
```

### Get Dashboard Stats
```javascript
async function getDashboardStats() {
  const session = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
  const token = session?.session?.session_token;

  const response = await fetch('http://localhost:3594/api/user/dashboard/stats', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const stats = await response.json();
  console.log(stats);
}
```

---

## Database Tables

### user_sessions
Stores session metadata after authentication.

**Columns**: `id`, `session_id`, `user_id`, `version`, `instance_id`, `user_agent`, `platform`, `build`, `last_updated`, `created_at`, `updated_at`

### session_activity
Stores session heartbeat/activity status.

**Columns**: `id`, `session_id`, `user_id`, `status`, `last_activity`, `platform`, `version`, `synced_at`, `created_at`, `updated_at`

### data_clusters
Stores user's data clusters.

**Columns**: `id`, `user_id`, `name`, `description`, `cluster_type`, `status`, `created_at`, `updated_at`

### centcom_measurements
Stores measurements with optional project association.

**Columns**: `id`, `user_id`, `project_id`, `measurement_type`, `value`, `metadata`, `created_at`

### user_storage
Tracks user's storage usage.

**Columns**: `id`, `user_id`, `total_bytes`, `last_calculated`, `created_at`, `updated_at`

---

## Testing

### Test All Endpoints
```bash
# Session update
curl -X POST http://localhost:3594/api/centcom/auth/session-update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-123","version":"1.0.0"}'

# Dashboard stats
curl -X GET http://localhost:3594/api/user/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Use Test Scripts
```bash
# Bash
./scripts/test-centcom-endpoints.sh

# PowerShell
./scripts/test-centcom-endpoints.ps1
```

---

## Troubleshooting

### "Invalid token" (401)
- Check token exists in localStorage
- Verify token structure (3 parts separated by dots)
- Check token expiration (`exp` claim)
- Ensure token has correct issuer/audience

### "Failed to update session" (500)
- Check database connectivity
- Verify `user_sessions` table exists
- Check user_id exists in auth.users
- Review server logs for detailed error

### CORS errors
- Verify origin is in allowed list
- Check request includes credentials
- Ensure preflight OPTIONS request succeeds

---

## Support

For issues or questions:
1. Check server logs: `npm run dev` console output
2. Check browser console for client-side errors
3. Verify database tables exist with debug query
4. Review [CENTCOM_ENDPOINTS_COMPLETE.md](CENTCOM_ENDPOINTS_COMPLETE.md)
