# Disable Supabase Automatic Confirmation Emails

## Why?

We're now using **Resend** to send all verification emails with custom branded templates. This gives us:
- ✅ Consistent email branding
- ✅ No PKCE code verifier issues
- ✅ Magic link authentication (auto sign-in)
- ✅ Better email deliverability
- ✅ Full control over email content

## Steps to Disable Supabase Emails

### 1. Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### 2. Disable Confirmation Email

1. Find the **"Confirm signup"** template
2. Click on it to open the editor
3. **Option A (Recommended)**: Delete all content and replace with:
   ```html
   <!-- Emails are sent via Resend - this template is disabled -->
   ```

4. **Option B**: In the template, you can also disable it by unchecking "Enable" if that option exists

### 3. Verify Settings

Go to **Authentication** → **Providers** → **Email**:

1. **Confirm email** should be **ENABLED**
   (This is required for Supabase to track email confirmation status)

2. **"Secure email change"** - Keep enabled (optional)

3. **"Enable email confirmations"** - Keep **ENABLED**
   (This doesn't send emails, it just requires email verification)

## What We Changed in the Code

### 1. Updated AuthContext ([src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx:155-223))

- Sign up still uses Supabase Auth
- After successful signup, we call our custom `/api/send-verification-email` endpoint
- This endpoint generates a magic link and sends it via Resend

### 2. Created New API Endpoint ([src/app/api/send-verification-email/route.ts](src/app/api/send-verification-email/route.ts))

- Generates magic link using `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })`
- Sends beautiful branded email via Resend
- Uses existing `emailVerificationTemplate` from email-templates.ts

### 3. Existing Resend Verification Still Works ([src/app/api/resend-verification/route.ts](src/app/api/resend-verification/route.ts))

- Both signup and resend now use the same Resend-based flow
- Consistent experience for users

## How It Works Now

### Signup Flow:
1. User fills out signup form
2. AuthContext creates user in Supabase Auth
3. AuthContext calls `/api/send-verification-email`
4. API generates magic link via Supabase Admin API
5. API sends beautiful email via Resend
6. User clicks link → automatically signed in → email marked as verified

### Benefits:
- ✅ No PKCE errors
- ✅ Works across devices/browsers
- ✅ Beautiful branded emails
- ✅ Automatic sign-in on verification
- ✅ Same flow as "resend verification"

## Testing

1. Sign up with a new email address
2. Check your inbox for verification email from "Lyceum <noreply@thelyceum.io>"
3. Click "Verify Email Address" button
4. Should auto-sign you in and redirect to dashboard
5. Check that `email_verified` is true in user_profiles table

## Rollback (If Needed)

If you need to re-enable Supabase emails:
1. Go to Authentication → Email Templates → Confirm signup
2. Restore the original template
3. Remove the `/api/send-verification-email` call from AuthContext.tsx (lines 197-219)
