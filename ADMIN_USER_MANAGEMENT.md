# Admin User Management - DELETE & BAN Features

## Overview
Added comprehensive DELETE and BAN capabilities to the admin user profile page (**Account tab**).

---

## 🚨 DELETE User Account

**Location:** Admin → Users → [User Profile] → Account Tab → Danger Zone

### What It Does
Permanently deletes a user account and **ALL** associated data:

1. ✅ **Onboarding sessions** - Deleted
2. ✅ **Clusters** - Deleted
3. ✅ **Plugin subscriptions** - Deleted
4. ✅ **Native app subscriptions** - Deleted
5. ✅ **Licenses** - Deleted
6. ✅ **Payment methods** - Deleted
7. ✅ **Payment transactions** - Deleted
8. ✅ **User profile** - Deleted
9. ✅ **Auth account** - Deleted

### Safety Features
- **Double confirmation required:**
  1. Initial confirm dialog
  2. Must type user's exact email to proceed
- Email mismatch cancels deletion
- Irreversible action - user data cannot be recovered
- Redirects to users list after successful deletion

### API Endpoint
```
POST /api/admin/users/delete
Body: { user_id: string, confirm: true }
```

**Enhanced from previous version:**
- Now explicitly deletes all associated data
- Doesn't rely solely on CASCADE
- Detailed logging for each deletion step

---

## ⚠️ BAN User Account

**Location:** Admin → Users → [User Profile] → Account Tab → Danger Zone

### What It Does
Freezes user account and revokes access:

1. ✅ **Auth account** - Banned for 100 years (effectively permanent)
2. ✅ **Profile status** - Set to 'banned' and `is_active: false`
3. ✅ **Email blacklist** - Added to `banned_emails` table
4. ✅ **Licenses** - All set to 'revoked' status
5. ✅ **Plugin subscriptions** - Cancelled
6. ✅ **Native app subscriptions** - Cancelled
7. ✅ **Onboarding sessions** - Deleted
8. ✅ **Clusters** - Deleted (responsible for payment)

### Safety Features
- **Double confirmation required:**
  1. Initial confirm dialog with actions list
  2. Must type user's exact email to proceed
- Optional ban reason (can be entered after confirmation)
- Email mismatch cancels ban
- User cannot log in after ban
- User cannot create new account with same email

### API Endpoint
```
POST /api/admin/users/ban
Body: { user_id: string, reason?: string }
```

**Enhanced from previous version:**
- Revokes licenses (not just delete)
- Cancels subscriptions (with proper status)
- Adds to banned emails list
- Deletes clusters and onboarding sessions
- More comprehensive logging

---

## 🗄️ New Database Table: `banned_emails`

**Migration:** `supabase/migrations/20250128_create_banned_emails_table.sql`

### Schema
```sql
CREATE TABLE public.banned_emails (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  reason TEXT,
  banned_at TIMESTAMPTZ NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### Features
- Case-insensitive email lookup (indexed)
- Tracks who banned the email and when
- RLS enabled - only admins can access
- Prevents banned users from creating new accounts

### To Deploy
```bash
npx supabase db push
```

---

## 📍 File Changes

### API Endpoints (Enhanced)
1. **`src/app/api/admin/users/delete/route.ts`**
   - Added explicit deletion for all user data
   - Comprehensive logging for each step
   - Better error handling

2. **`src/app/api/admin/users/ban/route.ts`**
   - Revokes licenses instead of deleting
   - Cancels subscriptions properly
   - Adds to banned emails table
   - Deletes clusters and onboarding sessions

### UI Components
3. **`src/app/admin/users/[userId]/profile/page.tsx`**
   - Added "Danger Zone" section to Account tab
   - BAN button (orange) with confirmation
   - DELETE button (red) with confirmation
   - Handler functions: `handleBanUser()` and `handleDeleteUser()`

### Database
4. **`supabase/migrations/20250128_create_banned_emails_table.sql`**
   - New table for tracking banned emails
   - Indexes for performance
   - RLS policies for admin-only access

---

## 🎨 UI Design

### Danger Zone Section
- **Red border** around the section
- **Two action cards:**
  1. **BAN** (Orange) - Freeze account
  2. **DELETE** (Red) - Permanently remove

### Confirmation Flow

**For BAN:**
```
1. Click "Ban User" button
2. Confirm dialog shows:
   - User email
   - Actions that will be taken
3. Prompt to type exact email
4. Optional: Enter ban reason
5. Execute ban
6. Success message
7. Page refreshes with updated data
```

**For DELETE:**
```
1. Click "Delete User" button
2. Confirm dialog shows:
   - User email
   - All data that will be deleted
   - "CANNOT BE UNDONE" warning
3. Prompt to type exact email
4. Execute deletion
5. Success message
6. Redirect to users list
```

---

## 🧪 Testing Checklist

### DELETE User
- [ ] Can delete user with no data
- [ ] Deletes user with licenses
- [ ] Deletes user with subscriptions
- [ ] Deletes user with clusters
- [ ] Deletes user with onboarding sessions
- [ ] Deletes user with payment data
- [ ] Confirmation email mismatch prevents deletion
- [ ] Redirects to users list after deletion
- [ ] User cannot log in after deletion

### BAN User
- [ ] Can ban user successfully
- [ ] User cannot log in after ban
- [ ] Profile shows 'banned' status
- [ ] Licenses are revoked (not deleted)
- [ ] Subscriptions are cancelled
- [ ] Clusters are deleted
- [ ] Onboarding sessions deleted
- [ ] Email added to banned list
- [ ] Banned email cannot create new account
- [ ] Page refreshes with updated status
- [ ] Ban reason is recorded

### Edge Cases
- [ ] Cannot delete own admin account
- [ ] Cannot ban own admin account
- [ ] Handles users with no email
- [ ] Handles users with no data
- [ ] Proper error messages on failure
- [ ] Audit log records actions

---

## 🔒 Security

### Access Control
- ✅ Only admins can access delete/ban endpoints
- ✅ Requires authentication
- ✅ Double confirmation prevents accidents
- ✅ Audit logging for all actions

### Data Protection
- ✅ RLS policies on banned_emails table
- ✅ Admin audit log records all actions
- ✅ User must type exact email to confirm

---

## 📊 Admin Audit Log

Both DELETE and BAN actions are logged to `admin_audit_log`:

```typescript
{
  admin_id: string,      // Who performed the action
  action: 'user_deleted' | 'user_banned',
  target_user_id: string, // User who was affected
  details: {
    email: string,
    reason?: string
  }
}
```

---

## 🚀 Deployment Steps

1. **Deploy database migration:**
   ```bash
   npx supabase db push
   ```

2. **Verify migration:**
   ```sql
   SELECT * FROM banned_emails LIMIT 1;
   ```

3. **Test on staging:**
   - Create test user
   - Try banning
   - Try deleting
   - Verify all data removed

4. **Deploy to production:**
   - Push code changes
   - Run migration
   - Test with non-critical account

---

## 📝 Usage Examples

### Ban a User
```bash
# Via UI: Admin → Users → [User] → Account Tab → Ban User

# Via API:
curl -X POST https://thelyceum.io/api/admin/users/ban \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "reason": "Violating terms of service"
  }'
```

### Delete a User
```bash
# Via UI: Admin → Users → [User] → Account Tab → Delete User

# Via API:
curl -X POST https://thelyceum.io/api/admin/users/delete \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "confirm": true
  }'
```

---

## ⚖️ DELETE vs BAN Comparison

| Feature | DELETE | BAN |
|---------|--------|-----|
| **User profile** | ❌ Deleted | ⚠️ Marked as banned |
| **Auth account** | ❌ Deleted | 🚫 Banned (cannot login) |
| **Licenses** | ❌ Deleted | ⚠️ Revoked |
| **Subscriptions** | ❌ Deleted | ⚠️ Cancelled |
| **Clusters** | ❌ Deleted | ❌ Deleted |
| **Onboarding sessions** | ❌ Deleted | ❌ Deleted |
| **Payment data** | ❌ Deleted | ✅ Kept |
| **Email blacklisted** | ❌ No | ✅ Yes |
| **Can create new account** | ✅ Yes | ❌ No |
| **Reversible** | ❌ No | ⚠️ Yes (with manual DB updates) |
| **Use case** | Remove spam/test accounts | Suspend problematic users |

---

## 🤝 Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify admin permissions
3. Check database migration status
4. Review audit logs for action history

For questions, contact: josh@thelyceum.io
