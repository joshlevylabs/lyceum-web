# Responsible User Billing System

## Overview

This system implements the concept of "responsible users" for license billing, allowing licenses to be assigned to multiple users while having a single user responsible for payment.

## Key Features

### 🎯 Core Concept
- **License Assignment**: Multiple users can be assigned to use a license
- **Payment Responsibility**: Only ONE user is responsible for paying for each license
- **Billing Separation**: Users are only charged for licenses they're responsible for, not licenses they're assigned to use

### 🏗️ Database Changes

#### New Fields Added
- `responsible_user_id` added to both `licenses` and `license_keys` tables
- References `auth.users(id)` with `ON DELETE SET NULL`
- Indexed for performance

#### Automatic Triggers
- New licenses automatically set `responsible_user_id` to the assigned user if not specified
- Can be overridden during creation or changed later

### 🔧 API Endpoints

#### Set Responsible User
```
POST /api/admin/licenses/set-responsible-user
```
Transfer payment responsibility for a license to another user.

**Request Body:**
```json
{
  "license_id": "uuid",
  "responsible_user_id": "uuid", 
  "table_name": "licenses" // or "license_keys"
}
```

#### Get Responsible Licenses
```
GET /api/admin/licenses/get-responsible-licenses?user_id={uuid}
```
Get all licenses a user is responsible for paying.

**Response:**
```json
{
  "success": true,
  "licenses": [...],
  "license_counts": {
    "basic": 2,
    "professional": 1,
    "enterprise": 0
  },
  "total_licenses": 3,
  "active_licenses": 3
}
```

### 💰 Billing Changes

#### Updated Billing Logic
- `UsageTrackingService.getCurrentUsage()` now queries by `responsible_user_id`
- Users are only charged for licenses where they are the responsible user
- License assignments for usage access do not affect billing

#### Billing Calculation
```typescript
// OLD: Charges user for assigned licenses
const licenseAssignments = await supabase
  .from('user_license_assignments')
  .select('...')
  .eq('user_id', userId)

// NEW: Charges user only for licenses they're responsible for
const responsibleLicenses = await supabase
  .from('licenses')
  .select('...')
  .eq('responsible_user_id', userId)
```

## 📊 Database Views

### License Responsibility View
Two helpful views created for easy querying:

- `license_responsibility_view` - Shows responsibility and assignment for `licenses` table
- `license_keys_responsibility_view` - Shows responsibility and assignment for `license_keys` table

```sql
SELECT * FROM license_responsibility_view 
WHERE responsible_user_id = 'user-id';
```

## 🚀 Usage Examples

### Example 1: Company License Setup
```
1. Create professional license with CEO as responsible user
2. Assign license to 5 engineers for daily use
3. Only CEO gets charged $15/month for the license
4. All 5 engineers can use the license features
```

### Example 2: Department Budget Transfer
```
1. Marketing department has 3 basic licenses (responsible: Marketing Manager)
2. Transfer responsibility to Finance Manager for budget reasons
3. Billing automatically switches to Finance Manager
4. Marketing team continues using licenses normally
```

## 🔒 Security & Permissions

### Row Level Security (RLS)
- Users can see licenses they're responsible for OR assigned to
- Policies updated to include `responsible_user_id` checks

### Admin Functions
- Admins can transfer responsibility between users
- Service role has full access to all responsibility functions

## 🧪 Testing

Run the test script to verify functionality:
```powershell
./test-responsible-user-billing.ps1
```

The test verifies:
- ✅ License creation with responsible users
- ✅ Billing calculation based on responsibility  
- ✅ Responsibility transfer functionality
- ✅ Multiple user assignment with single billing

## 🎉 Benefits

### For Organizations
- **Cost Control**: Clear visibility of who's paying for what
- **Budget Management**: Easy to transfer costs between departments
- **Access Management**: Multiple users can share expensive licenses

### For Users  
- **Fair Billing**: Only pay for licenses you're responsible for
- **Flexibility**: Use licenses assigned to you without billing concerns
- **Transparency**: Clear separation between access and payment

## 🔄 Migration

### Automatic Migration
The SQL script automatically:
1. Adds new columns to existing tables
2. Sets existing licenses' responsible user to current assigned user
3. Creates indexes and views
4. Updates RLS policies

### Zero Downtime
- All changes are backwards compatible
- Existing functionality continues to work
- Gradual rollout possible

## 📈 Future Enhancements

### Potential Features
- **Approval Workflows**: Require approval for responsibility transfers
- **Budget Alerts**: Notify when responsible user costs exceed limits
- **Usage Analytics**: Track which assigned users use responsible licenses most
- **Bulk Operations**: Transfer multiple licenses at once
- **Audit Logging**: Track all responsibility changes
