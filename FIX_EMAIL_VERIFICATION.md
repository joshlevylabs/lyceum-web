# Fix Email Verification PKCE Issue

## Problem
Email verification is failing with: "invalid request: both auth code and code verifier should be non-empty"

This happens because Supabase is using PKCE flow, but the code verifier is missing from localStorage when the user clicks the verification link.

## Solution Options

### Option 1: Configure Supabase to Use Implicit Flow for Email (Recommended)

Go to Supabase Dashboard → Authentication → URL Configuration:

1. Set "Redirect URLs" to include:
   - `http://localhost:3594/auth/callback`
   - `https://yourdomain.com/auth/callback` (for production)

2. In Supabase Dashboard → Authentication → Email Templates:
   - Edit "Confirm signup" template
   - Change the link to use `{{ .ConfirmationURL }}` which automatically creates a session
   - Or use this format: `{{ .SiteURL }}/auth/callback#access_token={{ .Token }}&refresh_token={{ .TokenHash }}&type=signup`

### Option 2: Enable Automatic Session Creation (Easiest)

In Supabase Dashboard → Authentication → Settings:

1. Scroll to "Email Auth"
2. Enable "Enable email confirmations"
3. **Enable "Confirm email" > "Automatically sign in after confirming email"**

This will automatically sign the user in when they click the verification link, bypassing the PKCE issue.

### Option 3: Update Code to Handle PKCE Failure Gracefully

The callback page should fallback to sign-in if PKCE fails. This is already partially implemented but needs testing.

## Recommended Implementation

**Best approach**: Enable "Automatically sign in after confirming email" in Supabase settings. This will:
- Sign the user in automatically when they click the verification link
- Provide tokens in the URL hash
- Bypass PKCE verifier requirement
- Work across different browsers/devices

Then the callback page can extract tokens from the URL hash (lines 251-293 in callback page).

## Testing

After making changes:
1. Sign up with a new account
2. Click verification link in email
3. Should redirect to `/auth/callback`
4. Should show "Email verified successfully"
5. Should redirect to dashboard with active session
