# Customer Verification Issue - Fix Guide

## Issue Summary
Customer email went to spam, verification link failed, and resend emails didn't arrive.

## Root Causes
1. **Email deliverability** - Emails going to spam (DNS records may not be configured)
2. **Expired/invalid verification link** - Links expire after 24 hours or first use
3. **Resend functionality** - Had bugs before recent fixes

---

## Quick Fix Options

### Option 1: Manual Verification (RECOMMENDED - 2 minutes)

**Step 1:** Go to Supabase SQL Editor
https://supabase.com/dashboard/project/YOUR_PROJECT/sql

**Step 2:** Run this query (replace with customer's actual email):

```sql
-- Find the user
SELECT id, email, email_verified, created_at
FROM public.user_profiles
WHERE email = 'CUSTOMER_EMAIL_HERE';

-- Manually verify them
UPDATE public.user_profiles
SET email_verified = true
WHERE email = 'CUSTOMER_EMAIL_HERE';

-- Confirm success
SELECT id, email, email_verified
FROM public.user_profiles
WHERE email = 'CUSTOMER_EMAIL_HERE';
```

**Step 3:** Send customer this email:

---

**Subject:** Your Lyceum Account is Ready!

Hi [Customer Name],

I've manually verified your email address and your account is now active!

You can sign in here: https://thelyceum.io/auth/signin

Use the email address and password you created during signup. If you've forgotten your password, you can reset it on the sign-in page.

Apologies for the email verification issues - we've just deployed fixes to prevent this from happening to other users. Your feedback helped us improve!

Looking forward to hearing your thoughts on the platform.

Best regards,
Joshua

---

### Option 2: Resend Verification Email (WITH NEW FIXES)

**Use this if you want to test the new resend functionality:**

**Step 1:** Make API call to resend verification:

```bash
curl -X POST https://www.thelyceum.io/api/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "CUSTOMER_EMAIL_HERE", "userName": "Customer Name"}'
```

**Step 2:** Tell customer:
> "I've sent you a new verification email. Please check your inbox (and spam folder). The link will be valid for 24 hours. Let me know if you don't see it within 5 minutes."

---

### Option 3: Complete Account Reset

**If the account is corrupted:**

```sql
-- Delete existing profile (this will cascade delete related data)
DELETE FROM public.user_profiles
WHERE email = 'CUSTOMER_EMAIL_HERE';

-- They can now sign up again with a fresh account
```

**Then tell customer:**
> "I've reset your account. Please try signing up again at https://thelyceum.io/auth/signup"

---

## Long-term Fixes Already Deployed

1. ✅ **Fixed duplicate email prevention** - Users now get clear error if email exists
2. ✅ **Fixed resend email functionality** - Now works even without valid session
3. ✅ **Added reply-to address** - josh@thelyceum.io for better deliverability
4. ⏳ **Need DNS configuration** - Set up SPF, DKIM, DMARC to prevent spam

---

## Email Deliverability TODO

**CRITICAL:** Configure these DNS records to stop emails going to spam:

1. Go to Resend dashboard: https://resend.com/domains
2. Copy the DNS records for thelyceum.io
3. Add them to your domain registrar (Cloudflare, GoDaddy, etc.):

```
SPF:    TXT  @  v=spf1 include:resend.com ~all
DKIM:   TXT  resend._domainkey  [value from Resend]
DMARC:  TXT  _dmarc  v=DMARC1; p=quarantine; rua=mailto:josh@thelyceum.io
```

**Verification:** After adding records, check:
- Resend dashboard shows ✅ Verified
- https://mxtoolbox.com/SuperTool.aspx?action=mx%3athelyceum.io
- https://www.mail-tester.com/ (send test email)

---

## Prevention Checklist

- [ ] DNS records configured (SPF, DKIM, DMARC)
- [ ] Domain verified in Resend dashboard
- [ ] Migration applied for email check function
- [ ] Test signup flow with fresh email
- [ ] Test resend verification button
- [ ] Monitor Resend logs for delivery issues

---

## Debug: Check User Status

Run this query to see all details about a user:

```sql
SELECT
  up.id,
  up.email,
  up.email_verified,
  up.created_at as profile_created,
  au.email_confirmed_at,
  au.confirmed_at,
  au.created_at as auth_created
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE up.email = 'CUSTOMER_EMAIL_HERE';
```

This shows:
- If profile exists
- If email is verified in our DB
- If Supabase auth has confirmed the email
- When accounts were created
