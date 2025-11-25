# Lyceum Onboarding System - API Documentation for Centcom Integration

**Date:** January 25, 2025
**Status:** ✅ Complete and Ready for Integration
**Base URL:** `https://lyceum-sable.vercel.app` (production) or your `VITE_LYCEUM_API_BASE_URL`

---

## 1. API Endpoints

### Authentication
**All endpoints require JWT authentication** using the same pattern as the ticket system:
- Header: `Authorization: Bearer {accessToken}`
- Token obtained from `/api/centcom/auth/login` endpoint

### User-Facing Endpoints (Native App)

#### 📋 Get User's Bookings
```
GET /api/onboarding/my-bookings
```

**Query Parameters:**
- `status` (optional): Filter by status (`scheduled`, `confirmed`, `completed`, `cancelled`)
- `include_completed` (optional): `true` to include completed sessions
- `include_cancelled` (optional): `true` to include cancelled sessions

**Response:**
```json
{
  "bookings": [],
  "upcoming": [],
  "past": [],
  "suggested": [],
  "cancelled": [],
  "requiresAction": [],
  "counts": {
    "total": 0,
    "upcoming": 0,
    "past": 0,
    "suggested": 0,
    "cancelled": 0,
    "requiresAction": 0
  }
}
```

#### 📅 Get Available Time Slots
```
GET /api/onboarding/available-slots
```

**Query Parameters:**
- `start_date` (optional): ISO 8601 format, defaults to today
- `end_date` (optional): ISO 8601 format
- `admin_id` (optional): Filter by specific admin

**Response:**
```json
{
  "slots": [...],
  "slotsByDate": {
    "2025-01-26": [...],
    "2025-01-27": [...]
  },
  "totalSlots": 15
}
```

#### 📝 Book a Session
```
POST /api/onboarding/book
```

**Request Body:**
```json
{
  "availability_slot_id": "uuid",
  "license_id": "uuid",              // optional
  "license_key_id": "uuid",          // optional
  "scheduled_start_time": "ISO8601", // optional (custom segment)
  "scheduled_end_time": "ISO8601",   // optional (custom segment)
  "session_type": "initial_onboarding",
  "title": "Custom title",           // optional
  "notes": "Preparation notes"       // optional
}
```

**Response:**
```json
{
  "booking": {...},
  "message": "Session booked successfully"
}
```

#### 🔍 Get Booking Details
```
GET /api/onboarding/{id}
```

**Response:**
```json
{
  "booking": {
    "id": "uuid",
    "admin": {...},
    "availability_slot": {...},
    // ...full booking details
  }
}
```

#### 🔄 Reschedule Booking
```
PUT /api/onboarding/{id}
```

**Request Body:**
```json
{
  "new_availability_slot_id": "uuid"
}
```

**Response:**
```json
{
  "booking": {...},
  "message": "Booking rescheduled successfully"
}
```

#### ❌ Cancel Booking
```
DELETE /api/onboarding/{id}
```

**Request Body:**
```json
{
  "cancellation_reason": "User reason"  // optional
}
```

**Response:**
```json
{
  "booking": {...},
  "message": "Booking cancelled successfully"
}
```

**Important:** Mandatory trial bookings cannot be cancelled, only rescheduled.

---

## 2. Data Models / TypeScript Interfaces

### Core Interfaces

#### OnboardingSessionBooking
```typescript
interface OnboardingSessionBooking {
  // IDs
  id: string;
  availability_slot_id: string | null;
  admin_user_id: string;
  user_id: string;
  license_key_id: string | null;

  // Scheduling
  scheduled_start_time: string; // ISO 8601 (TIMESTAMPTZ)
  scheduled_end_time: string;   // ISO 8601 (TIMESTAMPTZ)
  actual_start_time: string | null;
  actual_end_time: string | null;
  duration_minutes: number;

  // Session Type & Status
  session_type: 'initial_onboarding' | 'follow_up' | 'technical_support' | 'training' | 'other';
  status: 'suggested' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  is_mandatory: boolean;

  // Meeting Details
  meeting_link: string | null;
  meeting_platform: string | null; // 'zoom' | 'teams' | 'google-meet'
  meeting_id: string | null;
  meeting_password: string | null;

  // Content
  title: string;
  description: string | null;
  agenda: any | null; // JSONB - array of agenda items
  preparation_notes: string | null;

  // Communication
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  confirmation_sent: boolean;
  confirmation_sent_at: string | null;

  // Completion
  completion_notes: string | null;
  admin_notes: string | null;
  user_feedback: string | null;
  user_rating: number | null; // 1-5

  // Cancellation/Rescheduling
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  reschedule_count: number;
  previous_booking_id: string | null;

  // Trial Enforcement
  is_trial_required: boolean;
  trial_deadline: string | null;  // ISO 8601 (TIMESTAMPTZ)
  trial_deadline_warning_sent: boolean;

  // Timestamps
  created_at: string; // ISO 8601
  updated_at: string;
  booked_at: string;

  // Relationships (populated by API)
  admin?: AdminUser;
  availability_slot?: AvailabilitySlot;
  license_key?: LicenseKey;
}
```

#### AvailabilitySlot
```typescript
interface AvailabilitySlot {
  // IDs
  id: string;
  admin_user_id: string;

  // Time
  start_time: string;  // ISO 8601 (TIMESTAMPTZ)
  end_time: string;    // ISO 8601 (TIMESTAMPTZ)

  // Slot Configuration
  slot_type: 'onboarding' | 'support' | 'training';
  max_concurrent_sessions: number;
  current_bookings: number;
  is_available: boolean;

  // Recurrence
  is_recurring: boolean;
  recurrence_pattern: string | null; // 'daily' | 'weekly' | 'monthly'
  recurrence_end_date: string | null;

  // Meeting Info
  notes: string | null;
  location: string | null;  // 'online' | 'office' | etc.
  meeting_platform: string; // 'zoom' | 'teams' | 'google-meet'

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relationships
  admin?: AdminUser;
}
```

#### AdminUser (Partial)
```typescript
interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'superadmin' | 'user';
}
```

#### BookingRequest
```typescript
interface BookingRequest {
  availability_slot_id: string;
  license_id?: string;        // For linking to suggested session
  license_key_id?: string;    // For linking to license
  scheduled_start_time?: string; // ISO 8601 - For custom time segment within slot
  scheduled_end_time?: string;   // ISO 8601
  session_type?: 'initial_onboarding' | 'follow_up' | 'technical_support' | 'training' | 'other';
  title?: string;
  notes?: string;
}
```

#### RescheduleRequest
```typescript
interface RescheduleRequest {
  new_availability_slot_id: string;
}
```

#### CancelRequest
```typescript
interface CancelRequest {
  cancellation_reason?: string;
}
```

---

## 3. Calendar Integration

### Date/Time Format
- **Format:** ISO 8601 with timezone (TIMESTAMPTZ)
- **Example:** `"2025-01-26T14:00:00.000Z"`
- **Storage:** All times stored in UTC in database
- **Display:** Convert to user's local timezone in UI

### Time Zones
- **Server:** All times stored as UTC (TIMESTAMPTZ in PostgreSQL)
- **API:** All timestamps sent/received in ISO 8601 format
- **Client Responsibility:** Convert to/from user's local timezone for display
- **Recommendation:** Use `date-fns` or `dayjs` with timezone plugin

### Calendar Structure
- **Slot-Based System:** Admins create availability slots (time blocks)
- **Concurrent Bookings:** Multiple users can book the same slot (up to `max_concurrent_sessions`)
- **No Recurring Sessions:** Each booking is one-time only
- **Recurrence:** Only availability slots can be recurring (admin creates recurring availability)

### Booking Window
- **Advance Booking:** No hard limit, but slots must be in the future
- **Trial Deadline:** Trial users must schedule within 14 days
- **Paid Users:** 30-day suggested deadline (not enforced)
- **Maximum Session Length:** 1 hour per session

### Available Slots Logic
```typescript
// Slot is available if:
availableSlot =
  is_available === true &&
  current_bookings < max_concurrent_sessions &&
  start_time > NOW()
```

---

## 4. Session Logic

### Session Types

#### "Suggested" Sessions
- Automatically created when new license is generated
- Status: `'suggested'`
- User must convert to `'scheduled'` by booking a slot
- Trial licenses: **Mandatory** (must schedule within 14 days)
- Paid licenses: **Optional/Recommended** (30-day deadline, not enforced)

#### "Scheduled" Sessions
- User has booked a specific time slot
- Status: `'scheduled'` → `'confirmed'` → `'in_progress'` → `'completed'`
- Can be rescheduled or cancelled (except mandatory trial sessions)

### Required vs. Optional Sessions

| Feature                  | Required (Trial)           | Optional (Paid)            |
|-------------------------|----------------------------|----------------------------|
| `is_mandatory`          | `true`                     | `false`                    |
| `is_trial_required`     | `true`                     | `false`                    |
| `trial_deadline`        | 14 days from creation      | 30 days (suggested only)   |
| Can Cancel              | ❌ No (only reschedule)    | ✅ Yes                     |
| License Revocation      | ✅ If not scheduled        | ❌ No                      |

### Booking Rules
1. **One booking per slot per user:** Users cannot book the same slot twice
2. **Must be future:** Cannot book past time slots
3. **Capacity check:** Slot must have available capacity
4. **Validation:** Custom times must fall within slot boundaries
5. **Max length:** 1 hour maximum per session

### Prerequisites
- No prerequisites currently implemented
- Sessions are independent (can book any session)
- Future enhancement could add sequence requirements

### Missed Session
- No automatic handling currently
- Status would remain `'scheduled'` past the time
- Admin can manually mark as `'no_show'` or `'completed'`

### Reminders/Notifications
- **Database Fields Exist:**
  - `reminder_sent` / `reminder_sent_at`
  - `confirmation_sent` / `confirmation_sent_at`
- **Not Currently Implemented** in automated way
- **Future Enhancement:** Email/SMS reminders via cron job or service

---

## 5. Real-Time Sync

### Polling Strategy (Recommended)
```typescript
// Suggested polling intervals:
const POLLING_INTERVALS = {
  myBookings: 60000,      // 60 seconds - Check for booking updates
  availableSlots: 30000,  // 30 seconds - When viewing available slots
  upcomingSession: 300000 // 5 minutes - When session is within 24 hours
};

// Example implementation:
useEffect(() => {
  const interval = setInterval(() => {
    fetchMyBookings();
  }, POLLING_INTERVALS.myBookings);

  return () => clearInterval(interval);
}, []);
```

### Webhooks
- **Not currently implemented**
- API is purely request/response
- **Future Enhancement:** Could add webhook support

### Conflict Handling
**Scenario:** User books from web and native app simultaneously

**Current Behavior:**
1. Both requests hit API at same time
2. Database constraints enforce uniqueness:
   - Cannot book same slot twice
   - Capacity checks via database triggers
3. Second request gets error: `"You already have a booking in this time slot"`

**Best Practice:**
- Refresh booking list after successful booking
- Handle 400 errors gracefully (slot may have been taken)
- Show user-friendly message: "This slot was just booked by someone else"

### Calendar Refresh
**Recommendation:**
- **Automatic:** Refresh on app focus/resume
- **On User Action:** Refresh after booking/rescheduling/cancelling
- **Periodic:** Use polling intervals above
- **Manual:** Provide pull-to-refresh gesture

---

## 6. UI/UX Reference

### Primary Workflow
```
1. Dashboard → Onboarding Tab
2. View Upcoming Sessions (if any)
3. View Suggested Sessions (trial required)
4. Browse Available Slots
   - Organized by date
   - Show admin name, time, platform
5. Select & Book Slot
6. Confirmation
7. View in "Upcoming Sessions"
```

### Key UI Components

#### Suggested Sessions Card
```typescript
// Show for trial users with urgent action needed
if (is_mandatory && is_trial_required && trial_deadline) {
  const daysLeft = getDaysUntil(trial_deadline);
  if (daysLeft <= 7) {
    // Show urgent banner
    <UrgentBanner>
      Action Required: Schedule your onboarding within {daysLeft} days
    </UrgentBanner>
  }
}
```

#### Available Slots List
```typescript
// Group by date
slotsByDate = {
  "2025-01-26": [
    { time: "14:00 - 15:00", admin: "John Doe", platform: "Zoom" },
    { time: "16:00 - 17:00", admin: "Jane Smith", platform: "Teams" }
  ],
  "2025-01-27": [...]
}
```

#### Upcoming Sessions
```typescript
// Show scheduled sessions with join link
<SessionCard>
  <Title>{title}</Title>
  <DateTime>{formatted_time}</DateTime>
  <Admin>{admin.full_name}</Admin>
  <Platform>{meeting_platform}</Platform>
  {meeting_link && <JoinButton href={meeting_link}>Join Session</JoinButton>}
  <Actions>
    <RescheduleButton />
    {!is_mandatory && <CancelButton />}
  </Actions>
</SessionCard>
```

### Design Patterns
- **Tabs:** Upcoming / Suggested / Past
- **Date Grouping:** Organize slots by date
- **Status Badges:** Color-coded status indicators
- **Urgent Actions:** Prominent banners for trial deadlines
- **Meeting Platform Icons:** Visual indicators (Zoom, Teams, Meet)

---

## 7. Permissions & Access Control

### License Dependency
**Suggested Sessions:**
- Created automatically on license generation
- Exceptions:
  - Gratis licenses (no session)
  - Paid upgrades from trials (no new session)

**Booking Access:**
- Any authenticated user can view available slots
- Users can only book for themselves
- RLS (Row Level Security) enforces user data isolation

### User Roles
| Role        | Suggested Sessions | Can Book | Can View Own | Can View All |
|-------------|-------------------|----------|--------------|--------------|
| Trial User  | ✅ Auto-created   | ✅ Yes   | ✅ Yes       | ❌ No        |
| Paid User   | ✅ Auto-created   | ✅ Yes   | ✅ Yes       | ❌ No        |
| Admin       | ❌ No             | ✅ Yes   | ✅ Yes       | ✅ Yes       |
| Superadmin  | ❌ No             | ✅ Yes   | ✅ Yes       | ✅ Yes       |

### Admin/Instructor Capabilities
(Not exposed via user-facing API, but for context)
- Create/manage availability slots
- View all bookings
- Update booking status
- Add admin notes
- Trigger trial revocations

---

## 8. Error Handling

### HTTP Status Codes

| Status | Meaning | When |
|--------|---------|------|
| 200 | Success | GET/PUT successful |
| 201 | Created | POST booking successful |
| 400 | Bad Request | Invalid parameters, validation errors |
| 401 | Unauthorized | Missing/invalid auth token |
| 404 | Not Found | Booking or slot not found |
| 500 | Server Error | Database or unexpected error |

### Common Error Responses

#### Time Slot No Longer Available
```json
{
  "error": "This time slot is no longer available"
}
```
**Cause:** Slot's `is_available` set to false

#### Slot Fully Booked
```json
{
  "error": "This time slot is fully booked"
}
```
**Cause:** `current_bookings >= max_concurrent_sessions`

#### Already Have Booking
```json
{
  "error": "You already have a booking in this time slot"
}
```
**Cause:** User tried to book same slot twice

#### Cannot Book Past Slot
```json
{
  "error": "Cannot book a past time slot"
}
```
**Cause:** Slot start time is in the past

#### Cannot Cancel Mandatory
```json
{
  "error": "Cannot cancel mandatory trial onboarding. Please reschedule instead."
}
```
**Cause:** Tried to cancel `is_mandatory` && `is_trial_required` booking

#### Session Length Too Long
```json
{
  "error": "Session length cannot exceed 1 hour"
}
```
**Cause:** Custom scheduled times exceed 60 minutes

#### Not Eligible (Future)
```json
{
  "error": "You must have an active license to book onboarding sessions"
}
```
**Potential future error for eligibility checks**

### Error Handling Best Practices
```typescript
try {
  const response = await fetch('/api/onboarding/book', { ... });

  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 400:
        // Show user-friendly message
        showToast(error.error || "Invalid request");
        break;
      case 401:
        // Redirect to login
        redirectToLogin();
        break;
      case 404:
        // Refresh available slots
        showToast("This slot is no longer available");
        refreshSlots();
        break;
      default:
        showToast("Something went wrong. Please try again.");
    }
  }
} catch (err) {
  showToast("Network error. Please check your connection.");
}
```

---

## 9. Testing

### Staging/Test Environment
- **Production:** `https://lyceum-sable.vercel.app`
- **Test Accounts:** Contact Lyceum team for test user credentials
- **Local Development:** Can use `http://localhost:3003` if running locally

### Test User Scenarios

#### Test User 1: Trial User (Urgent)
- License Type: `trial`
- `is_mandatory`: `true`
- `trial_deadline`: 2 days from now
- Should see urgent banner in UI

#### Test User 2: Trial User (Normal)
- License Type: `trial`
- `is_mandatory`: `true`
- `trial_deadline`: 10 days from now
- Should see suggested session

#### Test User 3: Paid User
- License Type: `paid`
- `is_mandatory`: `false`
- Should see optional suggested session

#### Test User 4: No Suggested Sessions
- No active licenses or upgraded from trial
- Should be able to book new sessions

### Testing Checklist

#### Booking Flow
- [ ] View available slots
- [ ] Filter slots by date/admin
- [ ] Book a session successfully
- [ ] View booking in "Upcoming"
- [ ] Receive confirmation (if implemented)

#### Reschedule Flow
- [ ] Reschedule to different slot
- [ ] Old slot capacity decrements
- [ ] New slot capacity increments
- [ ] `reschedule_count` increments

#### Cancel Flow
- [ ] Cancel non-mandatory booking
- [ ] Slot capacity decrements
- [ ] Booking status changes to `'cancelled'`
- [ ] Cannot cancel mandatory trial booking (error)

#### Error Scenarios
- [ ] Try booking fully booked slot
- [ ] Try booking past slot
- [ ] Try booking same slot twice
- [ ] Try cancelling mandatory session
- [ ] Handle network errors gracefully

#### Edge Cases
- [ ] Booking near slot capacity limit
- [ ] Booking with custom time segment
- [ ] Rescheduling multiple times
- [ ] Slot becomes unavailable during booking process

### Testing Without Affecting Production
1. **Use Test Accounts:** Lyceum team provides isolated test users
2. **Create Far-Future Slots:** Book slots 30+ days out
3. **Use Development Environment:** Point to staging URL if available
4. **Clean Up:** Cancel test bookings after testing

---

## Implementation Example (React + TypeScript)

```typescript
// src/services/onboardingService.ts

interface OnboardingService {
  getMyBookings: (filters?: BookingFilters) => Promise<BookingsResponse>;
  getAvailableSlots: (filters?: SlotFilters) => Promise<SlotsResponse>;
  bookSession: (request: BookingRequest) => Promise<BookingResponse>;
  getBookingDetails: (id: string) => Promise<BookingResponse>;
  rescheduleSession: (id: string, newSlotId: string) => Promise<BookingResponse>;
  cancelSession: (id: string, reason?: string) => Promise<BookingResponse>;
}

class LyceumOnboardingService implements OnboardingService {
  private baseUrl: string;
  private getAuthToken: () => Promise<string>;

  constructor(baseUrl: string, getAuthToken: () => Promise<string>) {
    this.baseUrl = baseUrl;
    this.getAuthToken = getAuthToken;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAuthToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async getMyBookings(filters?: BookingFilters) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.includeCompleted) params.append('include_completed', 'true');
    if (filters?.includeCancelled) params.append('include_cancelled', 'true');

    return this.request(`/api/onboarding/my-bookings?${params}`);
  }

  async getAvailableSlots(filters?: SlotFilters) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('start_date', filters.startDate);
    if (filters?.endDate) params.append('end_date', filters.endDate);
    if (filters?.adminId) params.append('admin_id', filters.adminId);

    return this.request(`/api/onboarding/available-slots?${params}`);
  }

  async bookSession(request: BookingRequest) {
    return this.request('/api/onboarding/book', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getBookingDetails(id: string) {
    return this.request(`/api/onboarding/${id}`);
  }

  async rescheduleSession(id: string, newSlotId: string) {
    return this.request(`/api/onboarding/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ new_availability_slot_id: newSlotId }),
    });
  }

  async cancelSession(id: string, reason?: string) {
    return this.request(`/api/onboarding/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ cancellation_reason: reason }),
    });
  }
}

// Usage in component:
const onboardingService = new LyceumOnboardingService(
  process.env.VITE_LYCEUM_API_BASE_URL,
  getAccessToken
);

// Get upcoming bookings
const { upcoming, suggested, requiresAction } = await onboardingService.getMyBookings();

// Get available slots for next 7 days
const { slots, slotsByDate } = await onboardingService.getAvailableSlots({
  startDate: new Date().toISOString(),
  endDate: addDays(new Date(), 7).toISOString(),
});

// Book a session
const { booking } = await onboardingService.bookSession({
  availability_slot_id: selectedSlot.id,
  session_type: 'initial_onboarding',
});
```

---

## Timeline & Next Steps

### Ready for Integration ✅
- All API endpoints are live in production
- Database schema is deployed
- Row Level Security (RLS) is enforced
- Authentication matches ticket system pattern

### Immediate Actions
1. **Review this documentation** - Confirm it meets your needs
2. **Request test credentials** - Get test user accounts with different scenarios
3. **Begin implementation** - Start with service layer (API wrapper)
4. **Build UI components** - Follow design patterns from web dashboard

### Support
- **Questions:** Contact Lyceum team
- **Issues:** Report via support tickets
- **Documentation:** This document + `ONBOARDING_SCHEDULING_SYSTEM.md`

---

## Additional Resources

### Files to Reference
- `/supabase/migrations/20250125_create_onboarding_scheduling_system.sql` - Database schema
- `/src/app/onboarding/schedule/page.tsx` - Web UI reference implementation
- `/src/app/api/onboarding/*` - API endpoint implementations
- `ONBOARDING_SCHEDULING_SYSTEM.md` - Complete implementation overview

### Example cURL Commands

#### Get My Bookings
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://lyceum-sable.vercel.app/api/onboarding/my-bookings
```

#### Get Available Slots
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://lyceum-sable.vercel.app/api/onboarding/available-slots?start_date=2025-01-26T00:00:00.000Z"
```

#### Book a Session
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "availability_slot_id": "SLOT_UUID",
    "session_type": "initial_onboarding"
  }' \
  https://lyceum-sable.vercel.app/api/onboarding/book
```

---

**End of Documentation**

*Generated: January 25, 2025*
*Lyceum Backend Team*
