# User Management Enhancement - Implementation Guide

## Overview
This guide explains the new user management features added to help admins block/deactivate/remove users, especially those using throwaway email addresses.

## New API Endpoints

### 1. Ban User
**POST** `/api/admin/users/ban`

Bans a user at the Supabase auth level (prevents login entirely).

```typescript
// Request
{
  user_id: string,
  duration?: string,    // Default: "876000h" (100 years - permanent)
  reason?: string
}

// Response
{
  success: true,
  message: "User banned successfully",
  user: {
    id: string,
    email: string,
    banned_until: string
  }
}
```

### 2. Delete User
**DELETE** `/api/admin/users/delete` or **POST** `/api/admin/users/delete`

Permanently deletes a user and all their data (cascades to all related tables).

```typescript
// Request
{
  user_id: string,
  confirm: true  // Must be true to proceed
}

// Response
{
  success: true,
  message: "User permanently deleted",
  deleted_user: {
    id: string,
    email: string
  }
}
```

### 3. Check Email
**GET** `/api/admin/users/check-email?email=test@example.com`
**POST** `/api/admin/users/check-email`

Checks if an email is disposable/throwaway.

```typescript
// POST Request (single)
{
  email: "test@guerrillamail.com"
}

// POST Request (bulk)
{
  emails: ["email1@test.com", "email2@tempmail.com"]
}

// Response (single)
{
  success: true,
  email: "test@guerrillamail.com",
  valid: true,
  isDisposable: true,
  domain: "guerrillamail.com",
  reason: "Known disposable email domain"
}

// Response (bulk)
{
  success: true,
  results: [...],
  total: 10,
  disposable_count: 3
}
```

### 4. Existing: Deactivate User
**POST** `/api/admin/users/update`

Already exists - sets `is_active` to false (soft deactivation).

```typescript
{
  user_id: string,
  is_active: false
}
```

### 5. Existing: Unban User
**POST** `/api/admin/users/unban`

Already exists - removes auth-level ban.

```typescript
{
  user_id: string
}
```

## Email Validator Utility

New file: [src/lib/email-validator.ts](src/lib/email-validator.ts)

### Functions

```typescript
// Check if email is valid and disposable
validateEmail(email: string): EmailValidationResult

// Quick check for disposable
isDisposableEmail(email: string): boolean

// Get list of known disposable domains
getDisposableDomains(): string[]

// Add custom domain to blocklist
addDisposableDomain(domain: string): void

// Bulk validation
validateEmails(emails: string[]): Map<string, EmailValidationResult>
```

### Disposable Domains Detected
- guerrillamail.com and variants
- mailinator.com
- 10minutemail.com
- tempmail.com
- yopmail.com
- And 40+ more common services

### Pattern Detection
- temp/trash/disposable in domain
- burner/fake/spam in domain
- Emails with 10+ consecutive digits

## UI Implementation (Recommended)

### Option 1: Dropdown Menu in User Row

Add an "Actions" dropdown button for each user:

```tsx
import { EllipsisVerticalIcon, NoSymbolIcon, TrashIcon, ShieldExclamationIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'

// In the table cell
<td className="px-6 py-4 whitespace-nowrap text-center">
  <div className="relative inline-block text-left">
    <button
      onClick={() => setActionMenuOpen(user.id)}
      className="p-2 rounded-full hover:bg-gray-100"
    >
      <EllipsisVerticalIcon className="h-5 w-5" />
    </button>

    {actionMenuOpen === user.id && (
      <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
        <div className="py-1">
          <button onClick={() => handleCheckEmail(user.email)} className="...">
            <CheckBadgeIcon className="h-4 w-4" />
            Check if Throwaway
          </button>

          <button onClick={() => handleDeactivate(user.id)} className="...">
            <NoSymbolIcon className="h-4 w-4" />
            Deactivate
          </button>

          <button onClick={() => handleBan(user.id)} className="...">
            <ShieldExclamationIcon className="h-4 w-4" />
            Ban User
          </button>

          <button onClick={() => handleDelete(user.id)} className="..." >
            <TrashIcon className="h-4 w-4 text-red-600" />
            Delete Permanently
          </button>
        </div>
      </div>
    )}
  </div>
</td>
```

### Option 2: Badge for Disposable Emails

Auto-check emails and show a badge:

```tsx
{isDisposableEmail(user.email) && (
  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
    Throwaway
  </span>
)}
```

### Option 3: Bulk Actions

Add a bulk selection with actions:

```tsx
<div className="mb-4 flex gap-2">
  <button onClick={handleBulkCheckEmails} className="...">
    Check Selected for Throwaway Emails
  </button>
  <button onClick={handleBulkDeactivate} className="...">
    Deactivate Selected
  </button>
</div>
```

## Handler Functions (Client-Side)

```typescript
// Check if email is throwaway
const handleCheckEmail = async (email: string) => {
  const response = await fetch(`/api/admin/users/check-email?email=${encodeURIComponent(email)}`)
  const data = await response.json()

  if (data.isDisposable) {
    alert(`⚠️ ${email} is a throwaway email (${data.reason})`)
  } else {
    alert(`✓ ${email} appears to be legitimate`)
  }
}

// Deactivate user (soft)
const handleDeactivate = async (userId: string) => {
  if (!confirm('Deactivate this user?')) return

  await fetch('/api/admin/users/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, is_active: false })
  })

  await fetchUsers() // Refresh
}

// Ban user (auth-level)
const handleBan = async (userId: string, reason?: string) => {
  if (!confirm('Ban this user? They will not be able to log in.')) return

  await fetch('/api/admin/users/ban', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, reason })
  })

  await fetchUsers()
}

// Delete user permanently
const handleDelete = async (userId: string) => {
  if (!confirm('⚠️ PERMANENTLY DELETE this user and all their data? This cannot be undone!')) return
  if (!confirm('Are you absolutely sure? This will delete all licenses, clusters, invoices, etc.')) return

  await fetch('/api/admin/users/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, confirm: true })
  })

  await fetchUsers()
}

// Unban user
const handleUnban = async (userId: string) => {
  await fetch('/api/admin/users/unban', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  })

  await fetchUsers()
}
```

## User Actions Matrix

| Action | API Endpoint | Effect | Reversible |
|--------|-------------|--------|------------|
| **Deactivate** | `/api/admin/users/update` | Sets `is_active=false`, user can still log in but features limited | ✅ Yes (set `is_active=true`) |
| **Ban** | `/api/admin/users/ban` | Auth-level ban, prevents login entirely | ✅ Yes (use `/unban`) |
| **Delete** | `/api/admin/users/delete` | Permanently removes user and all data | ❌ No - permanent |
| **Check Email** | `/api/admin/users/check-email` | Checks if email is disposable | N/A - read-only |

## Recommended Workflow

1. **Suspicious User Signup**
   - Check if email is throwaway: `/check-email`
   - If yes, consider immediate deactivation or ban

2. **Problematic Behavior**
   - First: Deactivate (soft - reversible)
   - If continues: Ban (auth-level block)
   - Last resort: Delete (permanent)

3. **Automated Protection** (Future)
   - Add webhook/trigger on user signup
   - Auto-check email against disposable list
   - Auto-deactivate or require additional verification

## Database Impact

### Cascading Deletes
When deleting a user, these tables are automatically cleaned up (via `ON DELETE CASCADE`):
- `user_profiles`
- `plugin_licenses`
- `plugin_reviews`
- `invoices`
- `invoice_line_items`
- `billing_periods`
- `user_onboarding`
- Any other tables with `REFERENCES auth.users(id) ON DELETE CASCADE`

### Audit Logging
All ban and delete actions are logged to `admin_audit_log` table (if it exists):
```sql
{
  admin_id: uuid,
  action: 'user_banned' | 'user_deleted',
  target_user_id: uuid,
  details: jsonb
}
```

## Files Created

1. [src/app/api/admin/users/ban/route.ts](src/app/api/admin/users/ban/route.ts) - Ban users
2. [src/app/api/admin/users/delete/route.ts](src/app/api/admin/users/delete/route.ts) - Delete users
3. [src/app/api/admin/users/check-email/route.ts](src/app/api/admin/users/check-email/route.ts) - Check disposable emails
4. [src/lib/email-validator.ts](src/lib/email-validator.ts) - Email validation utility

## Files to Modify

- [src/app/admin/users/page.tsx](src/app/admin/users/page.tsx) - Add UI controls

## Testing

```bash
# Check if email is disposable
curl http://localhost:3000/api/admin/users/check-email?email=test@guerrillamail.com

# Ban a user
curl -X POST http://localhost:3000/api/admin/users/ban \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid-here", "reason": "spam"}'

# Delete a user
curl -X POST http://localhost:3000/api/admin/users/delete \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid-here", "confirm": true}'
```

## Security Considerations

1. **Admin-Only**: All endpoints require admin role via `requireAdmin()` middleware
2. **Confirmation Required**: Delete requires `confirm: true` to prevent accidents
3. **Audit Trail**: Actions are logged for accountability
4. **Soft Before Hard**: Encourage deactivate → ban → delete progression
5. **Double Confirmation**: UI should show multiple confirms for delete

## Next Steps

1. Update [src/app/admin/users/page.tsx](src/app/admin/users/page.tsx) with UI controls
2. Test all endpoints with your admin account
3. Consider adding email validation on signup (prevent throwaway emails)
4. Set up automated monitoring for suspicious email patterns
5. Create admin_audit_log table if it doesn't exist
