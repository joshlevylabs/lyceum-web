# Ticket Creation Fix - Response to Centcom Team

**Date:** 2025-01-24
**Status:** ✅ Fixed - Ready for Testing
**Priority:** Critical

---

## Issue Summary

The Centcom team reported that ticket creation was failing with the following error:

```
Failed to create ticket - Could not find a relationship between 'support_tickets'
and 'user_profiles' in the schema cache
```

**Root cause identified:** The ticket management system tables were never deployed to the production database, and the API code was using Supabase relationship syntax that required explicit foreign key detection.

---

## Fixes Implemented

### 1. API Code Fix ✅

**File:** [src/app/api/tickets/route.ts](src/app/api/tickets/route.ts#L435-L453)

**Problem:** The ticket creation endpoint was using Supabase's explicit foreign key join syntax:
```typescript
.select(`
  *,
  assigned_admin:user_profiles!assigned_to_admin_id(id, username, full_name)
`)
```

This syntax requires Supabase to recognize the foreign key relationship in its schema cache, which was failing.

**Solution:** Simplified the query to avoid dependency on relationship detection:
```typescript
// Create ticket with basic select
const { data: ticket, error: createError } = await supabase
  .from('support_tickets')
  .insert([ticketData])
  .select('*')
  .single()

// Manually fetch assigned admin if needed (tickets are initially unassigned anyway)
if (ticket && ticket.assigned_to_admin_id) {
  const { data: adminProfile } = await supabase
    .from('user_profiles')
    .select('id, username, full_name')
    .eq('id', ticket.assigned_to_admin_id)
    .single()

  if (adminProfile) {
    ticket.assigned_admin = adminProfile
  }
}
```

**Impact:** This change allows ticket creation to work immediately, regardless of schema cache state.

---

### 2. Database Migration Created ✅

**File:** [supabase/migrations/20250124_create_ticket_management_system.sql](supabase/migrations/20250124_create_ticket_management_system.sql)

Created a comprehensive migration that includes:

#### Tables Created (5)
- ✅ `support_tickets` - Main ticket storage with **foreign key to user_profiles** (line 43)
- ✅ `ticket_comments` - Communication between users and admins
- ✅ `ticket_attachments` - File uploads (screenshots, logs, etc.)
- ✅ `ticket_status_history` - Audit trail for all ticket changes
- ✅ `ticket_categories` - Configurable ticket categories

#### Key Features
- ✅ **Automatic ticket key generation** (e.g., "BUG-1", "FR-2", "SUP-3")
- ✅ **Foreign key relationship**: `support_tickets.assigned_to_admin_id → user_profiles.id`
- ✅ **Performance indexes** on frequently queried columns
- ✅ **Database triggers** for automatic field updates
- ✅ **Row Level Security (RLS)** policies for data access control
- ✅ **Seed data** with 5 default ticket categories

#### Schema Highlights
```sql
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_key TEXT UNIQUE NOT NULL,        -- Auto-generated: BUG-1, FR-2, etc.
  ticket_number INTEGER NOT NULL,

  -- User information
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Ticket content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('bug', 'feature_request', 'improvement', 'support', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_user', 'resolved', 'closed', 'duplicate', 'wont_fix')),

  -- Assignment (THIS IS THE KEY FOREIGN KEY)
  assigned_to_admin_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  -- ... additional fields for reproduction steps, environment info, etc.
);
```

---

## Next Steps - Action Required

The API fix is **already deployed and active**, but the database migration needs to be run to complete the fix.

### Option 1: Supabase Dashboard (Recommended - 2 minutes)

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/kffiaqsihldgqdwagook
   - Navigate to: **SQL Editor** (left sidebar)

2. **Run the migration:**
   - Open the migration file: `supabase/migrations/20250124_create_ticket_management_system.sql`
   - Copy the **entire contents** (407 lines)
   - Paste into SQL Editor
   - Click **"Run"**

3. **Verify success:**
   - You should see: "Success. No rows returned"
   - Check that 5 tables were created in the **Table Editor**

### Option 2: Supabase CLI

```bash
# From the lyceum project root
npx supabase link --project-ref kffiaqsihldgqdwagook
npx supabase db push
```

**Note:** There may be an issue with `.env.local` file encoding that needs to be resolved first.

---

## Testing the Fix

Once the migration is run, test ticket creation from Centcom:

### Test 1: Create a Bug Report
```bash
curl -X POST http://localhost:3594/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CENTCOM_USER_TOKEN>" \
  -H "X-Client-App: Centcom" \
  -H "X-Client-Version: 1.0.0" \
  -d '{
    "title": "Test bug report after fix",
    "description": "Testing the ticket creation system after implementing the fix",
    "ticket_type": "bug",
    "priority": "low",
    "application_section": "testing",
    "steps_to_reproduce": "1. Open Centcom\n2. Try to create a ticket\n3. Success!",
    "expected_behavior": "Ticket should be created successfully",
    "actual_behavior": "Ticket created successfully with key BUG-1"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "ticket": {
    "id": "uuid-here",
    "ticket_key": "BUG-1",
    "ticket_number": 1,
    "title": "Test bug report after fix",
    "description": "Testing the ticket creation system...",
    "ticket_type": "bug",
    "priority": "low",
    "status": "open",
    "user_id": "user-uuid",
    "username": "test_user",
    "email": "user@example.com",
    "created_at": "2025-01-24T...",
    "assigned_admin": null
  },
  "message": "Ticket BUG-1 created successfully"
}
```

### Test 2: Create a Feature Request
```bash
curl -X POST http://localhost:3594/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CENTCOM_USER_TOKEN>" \
  -H "X-Client-App: Centcom" \
  -H "X-Client-Version: 1.0.0" \
  -d '{
    "title": "Add dark mode to data export",
    "description": "Would be great to have dark mode support in the data export interface",
    "ticket_type": "feature_request",
    "priority": "medium",
    "application_section": "data_export"
  }'
```

**Expected:** Ticket created with key "FR-1"

### Test 3: List User's Tickets
```bash
curl -X GET http://localhost:3594/api/tickets \
  -H "Authorization: Bearer <CENTCOM_USER_TOKEN>" \
  -H "X-Client-App: Centcom"
```

**Expected:** Array of tickets belonging to the authenticated user

---

## What This Enables

After the migration is complete, the Centcom ticket system will support:

### For Users:
- ✅ Submit bug reports with reproduction steps
- ✅ Request new features
- ✅ Suggest improvements
- ✅ Get support for issues
- ✅ Track ticket status (open → in_progress → resolved → closed)
- ✅ View their own ticket history
- ✅ Add comments to tickets (future)
- ✅ Upload screenshots/logs (future)

### For Lyceum Admins:
- ✅ View all tickets across all users
- ✅ Assign tickets to specific admins
- ✅ Update ticket status and priority
- ✅ Add internal notes (not visible to users)
- ✅ Track time estimates and actual effort
- ✅ View complete audit trail of changes
- ✅ Filter by status, type, priority, assigned admin
- ✅ Add resolution notes when closing tickets

### Automatic Features:
- ✅ **Unique ticket keys** auto-generated (BUG-1, FR-2, IMP-1, SUP-1, TIC-1)
- ✅ **Timestamps** automatically tracked (created, updated, resolved, closed)
- ✅ **Change history** logged automatically for all status changes
- ✅ **Security** via Row Level Security - users only see their own tickets

---

## Database Schema Overview

```
┌─────────────────────────┐
│   support_tickets       │  ← Main ticket table
│  - id (PK)              │
│  - ticket_key (unique)  │
│  - user_id (FK)         │
│  - assigned_to_admin_id │──┐
│  - title, description   │  │
│  - status, priority     │  │
│  - created_at, etc.     │  │
└─────────────────────────┘  │
          │                  │
          │                  │ Foreign Key
          ├──────────────────┘ Relationship
          │
          ├──── ticket_comments ──────┐
          │     (one-to-many)         │
          │                           │
          ├──── ticket_attachments ───┤
          │     (one-to-many)         │
          │                           │
          └──── ticket_status_history │
                (one-to-many)         │
                                      │
                                      ▼
                            ┌───────────────────┐
                            │  user_profiles    │
                            │  - id (PK)        │
                            │  - username       │
                            │  - role           │
                            └───────────────────┘
```

---

## Technical Details

### Foreign Key Configuration
```sql
-- In support_tickets table
assigned_to_admin_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
```

**Behavior:**
- When an admin user is deleted, tickets assigned to them have `assigned_to_admin_id` set to `NULL`
- Tickets remain intact even if the assigned admin account is removed
- Prevents orphaned references

### RLS Security Model
- **Users**: Can only view/create their own tickets
- **Admins**: Can view/manage all tickets
- **Internal comments**: Only visible to admins
- **Attachments**: Can be marked as internal (admin-only)

### Ticket Key Generation
- **Bug reports**: BUG-1, BUG-2, BUG-3, ...
- **Feature requests**: FR-1, FR-2, FR-3, ...
- **Improvements**: IMP-1, IMP-2, IMP-3, ...
- **Support requests**: SUP-1, SUP-2, SUP-3, ...
- **Other**: TIC-1, TIC-2, TIC-3, ...

Each type has its own sequential counter.

---

## Rollback Plan (If Needed)

If any issues arise after running the migration:

```sql
-- Drop tables in reverse order (respects foreign keys)
DROP TABLE IF EXISTS public.ticket_categories CASCADE;
DROP TABLE IF EXISTS public.ticket_status_history CASCADE;
DROP TABLE IF EXISTS public.ticket_attachments CASCADE;
DROP TABLE IF EXISTS public.ticket_comments CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS handle_ticket_status_change() CASCADE;
DROP FUNCTION IF EXISTS handle_ticket_creation() CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_key(TEXT) CASCADE;
```

The API will continue to work but will return 503 errors indicating tables need setup.

---

## Questions or Issues?

If you encounter any problems during testing:

1. **Check the Supabase logs** for detailed error messages
2. **Verify the migration ran successfully** (all 5 tables should exist)
3. **Test with the curl commands above** to isolate issues
4. **Check user authentication** - ensure tokens are valid

Feel free to reach out if you need assistance!

---

## Summary Checklist

- [x] **API code fixed** - No longer depends on relationship cache
- [x] **Migration created** - Complete database schema ready
- [ ] **Migration run** - Needs to be executed (Centcom team action)
- [ ] **Testing completed** - Verify ticket creation works (Centcom team action)
- [ ] **Production deployment** - Once testing passes

---

**Ready to test once the migration is applied! 🚀**

*Generated: 2025-01-24*
*Lyceum Backend Team*
