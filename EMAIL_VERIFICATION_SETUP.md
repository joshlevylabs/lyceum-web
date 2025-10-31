# Email Verification & Company Name Setup Guide

This document explains the changes made to implement email verification and required company name for new user registration.

## Changes Made

### 1. Database Migration
**File**: `supabase/migrations/20251031_add_company_and_email_verification.sql`

Added two new columns to the `user_profiles` table:
- `company` (TEXT, NOT NULL) - Stores the user's company name
- `email_verified` (BOOLEAN, NOT NULL, DEFAULT false) - Tracks email verification status

**Action Required**: Run this migration in your Supabase dashboard or via Supabase CLI:
```bash
supabase db push
```

### 2. Signup Form Updates
**File**: `src/app/auth/signup/page.tsx`

Changes:
- Made company field **required** (added `required` attribute)
- Added validation to ensure company name is not empty
- Updated success flow to redirect to email verification page instead of dashboard

### 3. Authentication Context Updates
**File**: `src/contexts/AuthContext.tsx`

Changes:
- Updated `signUp()` function to:
  - Store `company` in user_profiles table
  - Set `email_verified` to `false` by default
  - Configure email redirect URL for verification callbacks
- Email verification is now enforced for all new users

### 4. Email Verification Pages

#### Callback Handler
**File**: `src/app/auth/callback/route.ts`

- Handles email verification link clicks
- Exchanges verification code for session
- Updates `email_verified` to `true` in user_profiles
- Redirects to dashboard after successful verification

#### Verification Pending Page
**File**: `src/app/auth/verify-email/page.tsx`

- Shows after user signs up
- Displays instructions to check email
- Provides "Resend verification email" button
- Prevents access to dashboard until verified

### 5. Protected Routes
**Files**:
- `src/app/dashboard/page.tsx`
- `src/middleware.ts`

Changes:
- Dashboard checks `userProfile.email_verified` and redirects unverified users
- Middleware enforces email verification on protected routes:
  - `/dashboard`
  - `/profile`
  - `/settings`
  - `/onboarding`
  - `/tickets`
  - `/groups`
  - `/clusters`

## Supabase Email Configuration

### CRITICAL: Enable Email Confirmation in Supabase

To fully enable email verification, you must configure Supabase email settings:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **Providers** → **Email**
4. Enable **"Confirm email"** setting
5. Configure the email template (optional but recommended)

### Email Template Configuration (Optional)

You can customize the verification email template:

1. Go to **Authentication** → **Email Templates**
2. Select **"Confirm signup"** template
3. Customize the email content
4. Ensure the confirmation link uses: `{{ .ConfirmationURL }}`

### Site URL Configuration

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL (e.g., `https://www.thelyceum.io`)
3. Add **Redirect URLs**:
   - `https://www.thelyceum.io/auth/callback`
   - `http://localhost:3000/auth/callback` (for local development)

## Testing the Feature

### Local Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the signup page: `http://localhost:3000/auth/signup`

3. Fill out the form with all fields including company name

4. Submit the form

5. You should be redirected to `/auth/verify-email`

6. Check your email for the verification link

7. Click the verification link

8. You should be redirected to `/dashboard` with full access

### Testing Enforcement

1. Try accessing `/dashboard` before verifying email - should redirect to `/auth/verify-email`

2. Try signing up without company name - should show validation error

3. Try accessing protected routes without verification - should be blocked

## User Flow

### New User Registration Flow

```
1. User visits /auth/signup
2. User fills form (email, password, name, username, company, role)
3. User submits form
   ↓
4. Account created with email_verified = false
   ↓
5. Redirected to /auth/verify-email
   ↓
6. Verification email sent to user
   ↓
7. User clicks link in email
   ↓
8. Redirected to /auth/callback
   ↓
9. email_verified set to true
   ↓
10. Redirected to /dashboard (full access granted)
```

### Existing User Migration

The migration script automatically sets `email_verified = true` for all existing users, so they won't be locked out of their accounts.

## Security Considerations

1. **Email Verification is Server-Side Enforced**: Middleware checks verification status on every request to protected routes

2. **Company Name is Required**: Database constraint ensures company cannot be empty

3. **Session Management**: Email verification status is checked against the database, not just client-side state

4. **Grandfathering**: Existing users are automatically marked as verified to prevent disruption

## Troubleshooting

### Users Not Receiving Verification Emails

1. Check Supabase email settings are enabled
2. Verify SMTP configuration in Supabase
3. Check spam folder
4. Test with "Resend verification email" button

### Users Already Signed Up Before This Feature

Existing users are automatically grandfathered with `email_verified = true` by the migration script.

### Verification Link Not Working

1. Verify redirect URLs are configured in Supabase
2. Check that `/auth/callback` route is accessible
3. Ensure Supabase environment variables are set correctly

### Company Field Not Saving

1. Verify migration has been run successfully
2. Check that `company` column exists in `user_profiles` table
3. Check browser console for errors during signup

## Additional Notes

- Email verification links expire after 24 hours (Supabase default)
- Users can request new verification emails via the `/auth/verify-email` page
- Admin users may need special handling - consider adding admin bypass if needed
- The callback route is public and doesn't require authentication (necessary for email verification)

## Environment Variables Required

Ensure these are set in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Next Steps

1. ✅ Run the database migration
2. ✅ Enable email confirmation in Supabase dashboard
3. ✅ Configure redirect URLs in Supabase
4. ✅ Test the complete flow in development
5. ✅ Deploy to production
6. ✅ Monitor for any issues with user registrations

## Files Modified

- `supabase/migrations/20251031_add_company_and_email_verification.sql` (NEW)
- `src/app/auth/signup/page.tsx` (MODIFIED)
- `src/contexts/AuthContext.tsx` (MODIFIED)
- `src/app/auth/callback/route.ts` (NEW)
- `src/app/auth/verify-email/page.tsx` (NEW)
- `src/app/dashboard/page.tsx` (MODIFIED)
- `src/middleware.ts` (MODIFIED)
- `EMAIL_VERIFICATION_SETUP.md` (NEW - this file)
