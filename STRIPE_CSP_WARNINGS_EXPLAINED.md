# Stripe CSP Warnings Explained

## What You're Seeing

When you click "Add Payment Method" and get redirected to Stripe's checkout page, you may see console warnings like:

```
Loading the font '<URL>' violates the following Content Security Policy directive: "font-src 'none'"
```

or

```
<link rel=preload> uses an unsupported `as` value
```

or

```
Uncaught (in promise) Error: Cannot find module './en'
```

## Why This Happens

These warnings are coming from **Stripe's hosted checkout page** (URLs starting with `cs_test_...`), NOT from your application.

### Key Points:

1. **Stripe Controls Their Own CSP**: When you redirect to Stripe's checkout page, you're on Stripe's domain. Stripe sets their own Content Security Policy headers for their pages.

2. **Your CSP Doesn't Apply**: The CSP headers you configure in your `next.config.ts` only apply to pages served from your domain. They have no effect on Stripe's pages.

3. **These Are Stripe's Internal Issues**: Some of these warnings are from Stripe's own code:
   - The `font-src 'none'` warnings are from Stripe's internal CSP configuration
   - The `Cannot find module './en'` error is a localization loading issue in Stripe's code
   - The preload warnings are from Stripe's resource loading strategy

## Is This a Problem?

**No, these warnings are NOT a problem:**

- ✅ They don't prevent payment methods from being added
- ✅ They don't affect the security of your application
- ✅ They don't affect the user experience (except for seeing warnings in console)
- ✅ They're on Stripe's side to fix, not yours

## What About CSP on Your Pages?

The CSP configuration in your [next.config.ts](next.config.ts#L36-L51) is set to **"Report-Only"** mode, which means:

- Violations are logged but not blocked
- Stripe resources (scripts, styles, fonts) are explicitly allowed via wildcards
- This gives you visibility into potential issues without breaking functionality

## Production Considerations

For production, you can:

1. **Keep Report-Only Mode**: Good for monitoring and debugging
   ```typescript
   key: 'Content-Security-Policy-Report-Only'
   ```

2. **Switch to Enforce Mode**: Once you're confident everything works
   ```typescript
   key: 'Content-Security-Policy'
   ```

3. **Ignore Stripe Checkout Warnings**: Since they're on Stripe's domain, you can safely ignore them

## Testing Payment Methods

When testing "Add Payment Method":

1. Click the button
2. You'll be redirected to Stripe's checkout page (cs_test_... URL)
3. **Ignore console warnings** - they're from Stripe's page
4. Enter test card: `4242 4242 4242 4242`
5. Complete the form
6. You'll be redirected back to your app
7. The payment method should appear in your Settings > Payment tab

## Summary

| Warning Source | Your Responsibility | Action Needed |
|---------------|-------------------|---------------|
| Your app pages | ✅ Yes | Configure CSP in next.config.ts |
| Stripe checkout page | ❌ No | Ignore - Stripe's responsibility |
| Stripe embedded elements | ⚠️ Partial | Allow in your CSP config (already done) |

## Need Help?

If payment methods aren't being saved (not just console warnings), check:

1. Stripe API keys are set correctly (production)
2. Stripe webhooks are configured
3. Network tab for failed API calls (not CSP warnings)
4. Server logs for actual errors (not CSP warnings)
