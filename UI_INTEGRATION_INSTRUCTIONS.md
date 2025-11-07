# UI Integration Instructions

## How to Add User Actions Menu to Admin Users Page

### Step 1: Import the Component

In [src/app/admin/users/page.tsx](src/app/admin/users/page.tsx), add this import at the top:

```typescript
import UserActionsMenu from '@/components/admin/UserActionsMenu'
```

### Step 2: Add 'Actions' Column

Find the `columnOrder` state around line 153 and add an 'actions' column:

```typescript
const [columnOrder, setColumnOrder] = useState<Column[]>([
  { id: 'view', name: 'View Profile', align: 'center' },
  { id: 'key', name: 'Key', align: 'left' },
  { id: 'username', name: 'Username', align: 'left' },
  { id: 'full_name', name: 'Full Name', align: 'left' },
  { id: 'email', name: 'Email', align: 'left' },
  { id: 'company', name: 'Company', align: 'left' },
  { id: 'role', name: 'Role', align: 'left' },
  { id: 'joined', name: 'Joined', align: 'left' },
  { id: 'last_login', name: 'Last Login', align: 'left' },
  { id: 'payment', name: 'Payment', align: 'center' },
  { id: 'subscription', name: 'Subscription', align: 'left' },
  { id: 'actions', name: 'Actions', align: 'center' }, // <-- Add this line
])
```

### Step 3: Add Case Handler for Actions Column

In the `renderCell` function (around line 487-502), add a new case before the `default` case:

```typescript
case 'edit':
  return (
    <td key="edit" className="px-6 py-4 whitespace-nowrap text-center">
      <button
        onClick={() => {
          setEditingUser(user)
          setShowEditModal(true)
        }}
        className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
        title="Edit user profile"
      >
        <PencilIcon className="h-4 w-4 mr-1" />
        Edit
      </button>
    </td>
  )
case 'actions':  // <-- Add this case
  return (
    <td key="actions" className="px-6 py-4 whitespace-nowrap text-center">
      <UserActionsMenu
        user={user}
        onActionComplete={() => fetchUsers()}
      />
    </td>
  )
default:
  return <td key={column.id} className="px-6 py-4 whitespace-nowrap">-</td>
```

### Step 4: (Optional) Add Disposable Email Badge

If you want to show a badge for throwaway emails in the email column, modify the 'email' case:

```typescript
import { validateEmail } from '@/lib/email-validator'  // Add at top

// In renderCell function, update the 'email' case:
case 'email':
  const emailValidation = validateEmail(user.email)
  return (
    <td key="email" className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
        {emailValidation.isDisposable && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
            ⚠️ Throwaway
          </span>
        )}
      </div>
    </td>
  )
```

## Alternative: Quick Integration (Minimal Changes)

If you don't want to modify the column structure, you can add the actions menu to the existing 'edit' column:

```typescript
case 'edit':
  return (
    <td key="edit" className="px-6 py-4 whitespace-nowrap text-center">
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => {
            setEditingUser(user)
            setShowEditModal(true)
          }}
          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
          title="Edit user profile"
        >
          <PencilIcon className="h-4 w-4 mr-1" />
          Edit
        </button>
        <UserActionsMenu
          user={user}
          onActionComplete={() => fetchUsers()}
        />
      </div>
    </td>
  )
```

## Testing

After integration:

1. **Check Email Detection**
   - Click the actions menu (three dots) for a user
   - Click "Check if Throwaway Email"
   - Try with: test@guerrillamail.com (should detect)
   - Try with: admin@company.com (should be legitimate)

2. **Deactivate/Activate**
   - Click "Deactivate User"
   - Confirm the action
   - User's `is_active` should become false
   - Click again to activate

3. **Ban/Unban**
   - Click "Ban User (Auth-Level)"
   - Enter a reason
   - Confirm the action
   - User should not be able to log in
   - Click "Unban User" to reverse

4. **Delete (Use with Caution!)**
   - Click "Delete Permanently"
   - Multiple confirmations required
   - Must type exact email to confirm
   - User and all data will be removed

## Visual Preview

The actions menu will look like this:

```
┌─────────────────────────────┐
│ ✓ Check if Throwaway Email  │
├─────────────────────────────┤
│ ⊘ Deactivate User           │
│ 🛡️ Ban User (Auth-Level)    │
├─────────────────────────────┤
│ 🗑️ Delete Permanently       │
└─────────────────────────────┘
```

## Troubleshooting

**Actions menu not showing:**
- Ensure component import is correct
- Check that 'actions' column is in `columnOrder`
- Verify case handler is added to `renderCell`

**API errors:**
- Check browser console for errors
- Verify you're logged in as admin
- Check API routes are deployed

**Email validation not working:**
- Ensure [src/lib/email-validator.ts](src/lib/email-validator.ts) exists
- Check import path is correct
- Try restarting dev server

## Security Notes

⚠️ **Important:**
- Only admins should have access to this functionality
- All API endpoints use `requireAdmin()` middleware
- Delete action requires multiple confirmations
- All actions are logged to audit log (if table exists)

## Next Steps

1. Test with your admin account
2. Consider adding bulk actions (select multiple users)
3. Add filtering by disposable emails
4. Set up automated email validation on signup
5. Create admin_audit_log table for tracking actions
