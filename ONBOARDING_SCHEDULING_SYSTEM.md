# Onboarding Scheduling System - Implementation Complete

## Overview

A comprehensive onboarding scheduling system has been implemented that allows users to book onboarding sessions with admins, enforces trial license deadlines, and provides full management capabilities for both users and administrators.

## Features Implemented

### 1. Database Schema ✅
- **Location**: `/supabase/migrations/20250125_create_onboarding_scheduling_system.sql`
- **Tables**:
  - `admin_availability_slots` - Admin time slots for onboarding sessions
  - `onboarding_session_bookings` - User booking records
- **Triggers**:
  - Auto-increment/decrement booking counters
  - Auto-create suggested sessions on license creation
- **Functions**:
  - `create_suggested_onboarding_session()` - Creates sessions for new licenses
  - `revoke_unscheduled_trial_licenses()` - Revokes trial licenses without scheduled onboarding
- **RLS Policies**: Complete security for both users and admins

### 2. API Endpoints ✅

#### Admin Availability Management
- `GET /api/admin/availability` - List admin's availability slots
- `POST /api/admin/availability` - Create new availability slot
- `GET /api/admin/availability/[id]` - Get specific slot
- `PUT /api/admin/availability/[id]` - Update slot
- `DELETE /api/admin/availability/[id]` - Delete slot (if no bookings)

#### User Booking Management
- `GET /api/onboarding/available-slots` - View available time slots
- `POST /api/onboarding/book` - Book a session
- `GET /api/onboarding/my-bookings` - Get user's bookings
- `GET /api/onboarding/[id]` - Get booking details
- `PUT /api/onboarding/[id]` - Reschedule booking
- `DELETE /api/onboarding/[id]` - Cancel booking

#### Admin Booking View
- `GET /api/admin/onboarding/bookings` - View all bookings (admins only)

#### Trial License Revocation
- `GET /api/admin/onboarding/revoke-trials` - Preview at-risk licenses (dry run)
- `POST /api/admin/onboarding/revoke-trials` - Execute trial revocation

### 3. Admin UI ✅

#### Availability Management
- **Location**: `/admin/onboarding/availability`
- **Features**:
  - Create, edit, delete availability slots
  - Set time ranges, capacity, meeting platform
  - Support for recurring availability (daily, weekly, monthly)
  - Visual capacity tracking
  - Notes and location fields

#### Bookings Management
- **Location**: `/admin/onboarding/bookings`
- **Features**:
  - View upcoming, past, and attention-required sessions
  - Organized by date
  - Full booking details (user, time, platform, license type)
  - Trial deadline warnings
  - Tabbed interface for easy navigation

### 4. User UI ✅

#### Onboarding Scheduling Interface
- **Location**: `/onboarding/schedule`
- **Features**:
  - View suggested onboarding sessions
  - Browse available time slots (organized by date)
  - Book sessions with preferred admin
  - View upcoming scheduled sessions
  - Cancel bookings (with restrictions for mandatory trials)
  - Urgent action banners for trial deadline warnings
  - Meeting details and join links

## Business Logic

### License Generation Flow
1. When a new license is created (except paid upgrades from trials):
   - A suggested onboarding session is automatically created
   - Trial licenses: 14-day deadline (mandatory)
   - Paid licenses: 30-day deadline (recommended, not mandatory)
   - Random admin assigned or first available superadmin

### Trial Enforcement
1. Trial users must schedule onboarding within 14 days
2. If not scheduled by deadline:
   - License is revoked
   - Status set to 'revoked'
   - Revocation reason recorded
3. Manual or cron-based execution via `/api/admin/onboarding/revoke-trials`

### Booking Flow
1. User views available slots
2. Selects preferred time and admin
3. Books session (updates suggested session or creates new one)
4. Booking counter automatically increments
5. Slot marked unavailable when at capacity

### Reschedule/Cancel Flow
1. User can reschedule to a different available slot
2. Old slot counter decrements, new slot increments
3. Reschedule count tracked
4. Mandatory trial sessions cannot be cancelled, only rescheduled

## Deployment Steps

### 1. Apply Database Migration
```bash
# Run the migration file
npx supabase db push

# Or manually apply:
# Connect to your database and execute:
# supabase/migrations/20250125_create_onboarding_scheduling_system.sql
```

### 2. Set Up Cron Job for Trial Revocation
**Option A: Using pg_cron (if available)**
```sql
SELECT cron.schedule(
  'revoke-unscheduled-trials',
  '0 2 * * *', -- Run daily at 2 AM
  $$
    SELECT * FROM revoke_unscheduled_trial_licenses();
  $$
);
```

**Option B: Using External Cron Service (GitHub Actions, Vercel Cron, etc.)**
```yaml
# .github/workflows/revoke-trials.yml
name: Revoke Unscheduled Trial Licenses
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  revoke-trials:
    runs-on: ubuntu-latest
    steps:
      - name: Call Revocation API
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.ADMIN_API_KEY }}" \
            https://your-domain.com/api/admin/onboarding/revoke-trials
```

### 3. Update Navigation (Optional)
Add link to user onboarding in the main dashboard navigation:

**File**: `/src/components/DashboardLayout.tsx`

Add to navigation array:
```typescript
{ name: 'Schedule Onboarding', href: '/onboarding/schedule', icon: CalendarIcon },
```

### 4. Configure Admin Access
Ensure admins have proper role set in `user_profiles` table:
- Role must be 'admin' or 'superadmin' to access admin pages
- Existing RLS policies enforce this

## Testing Checklist

### Database
- [ ] Migration applied successfully
- [ ] Tables created with proper constraints
- [ ] Triggers working (test license creation)
- [ ] RLS policies enforced
- [ ] Revocation function executes correctly

### Admin Features
- [ ] Create availability slots
- [ ] Edit/delete availability slots
- [ ] View all bookings
- [ ] Trigger manual trial revocation
- [ ] See at-risk license counts

### User Features
- [ ] View suggested sessions
- [ ] Browse available slots
- [ ] Book a session
- [ ] View upcoming sessions
- [ ] Reschedule a booking
- [ ] Cancel a booking (non-mandatory)
- [ ] See trial deadline warnings

### Business Logic
- [ ] Suggested session created on new license
- [ ] No session created for paid upgrade from trial
- [ ] Booking counters increment/decrement correctly
- [ ] Slots become unavailable at capacity
- [ ] Trial revocation works for unscheduled licenses
- [ ] Cannot cancel mandatory trial bookings

## Files Created/Modified

### New Files
1. `/supabase/migrations/20250125_create_onboarding_scheduling_system.sql` - Database schema
2. `/src/app/api/admin/availability/route.ts` - Admin availability list/create
3. `/src/app/api/admin/availability/[id]/route.ts` - Admin availability get/update/delete
4. `/src/app/api/onboarding/available-slots/route.ts` - Public available slots
5. `/src/app/api/onboarding/book/route.ts` - Book session
6. `/src/app/api/onboarding/[id]/route.ts` - Get/reschedule/cancel booking
7. `/src/app/api/onboarding/my-bookings/route.ts` - User's bookings
8. `/src/app/api/admin/onboarding/revoke-trials/route.ts` - Trial revocation
9. `/src/app/api/admin/onboarding/bookings/route.ts` - Admin bookings view
10. `/src/app/admin/onboarding/availability/page.tsx` - Admin availability UI
11. `/src/app/admin/onboarding/bookings/page.tsx` - Admin bookings UI
12. `/src/app/onboarding/schedule/page.tsx` - User scheduling UI

### Modified Files
1. `/src/app/dashboard/page.tsx` - Removed Groups container

## Usage Examples

### Admin: Create Availability
1. Navigate to `/admin/onboarding/availability`
2. Click "Add Availability Slot"
3. Set start/end time, capacity, platform
4. Save

### User: Schedule Onboarding
1. Navigate to `/onboarding/schedule`
2. View suggested sessions (if any)
3. Browse available slots by date
4. Click "Book This Slot" on preferred time
5. Confirm booking

### Admin: View Bookings
1. Navigate to `/admin/onboarding/bookings`
2. View upcoming, past, or attention-required tabs
3. See user details, times, and trial deadlines

### Admin: Revoke Trials (Manual)
1. Navigate to `/admin/onboarding` (main page)
2. See "At-Risk Trials" count
3. Click "Revoke Trials" button
4. Confirm action

## Architecture Decisions

### Why Suggested Sessions?
- Reduces friction for users
- Pre-creates the booking record
- Allows easy conversion to scheduled session
- Tracks trial deadlines from creation

### Why Separate Availability Slots?
- Reusable time blocks
- Support for concurrent bookings
- Easier capacity management
- Supports recurring availability

### Why Database Triggers?
- Ensures consistency
- Automatic counter management
- Cannot be bypassed by API bugs
- Reduces application logic

### Why Manual/Cron Revocation?
- Gives grace period for users
- Allows admin oversight
- Can be scheduled off-peak
- Provides audit trail

## Future Enhancements (Not Implemented)

### Potential Additions
1. Email notifications for:
   - Booking confirmations
   - Reminders (24h before)
   - Trial deadline warnings
   - Cancellation notices

2. Calendar integration:
   - iCal export
   - Google Calendar sync
   - Outlook integration

3. Video conferencing:
   - Auto-generate Zoom links
   - Google Meet integration
   - Microsoft Teams support

4. Rating system:
   - User feedback after sessions
   - Admin performance metrics

5. Automated reminders:
   - Email/SMS reminders
   - Trial deadline alerts
   - Follow-up scheduling

6. Bulk operations:
   - Create recurring availability for weeks/months
   - Bulk cancel/reschedule
   - Template availability patterns

## Support & Troubleshooting

### Common Issues

**Issue**: Suggested sessions not created on license generation
- Check trigger is installed: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_onboarding_on_license_creation'`
- Check logs in Supabase dashboard
- Verify license_type is not 'gratis'

**Issue**: Trial revocation not working
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'revoke_unscheduled_trial_licenses'`
- Run dry-run GET endpoint first to see affected licenses
- Check license created_at dates

**Issue**: Users can't see availability slots
- Check RLS policies are enabled
- Verify slots have `is_available = true`
- Check slots are in the future
- Verify slots have remaining capacity

**Issue**: Booking counter not updating
- Check triggers are installed for bookings table
- Verify booking status is 'scheduled' or 'confirmed'
- Check for trigger errors in logs

## Conclusion

The onboarding scheduling system is now fully implemented and ready for deployment. All database migrations, API endpoints, and user interfaces are complete. Follow the deployment steps above to activate the system.

For questions or issues, refer to the troubleshooting section or contact the development team.

---

**Implementation Date**: January 25, 2025
**Status**: ✅ Complete and Ready for Deployment
