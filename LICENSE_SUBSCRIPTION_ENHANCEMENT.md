# License-Subscription Relationship Enhancement Guide

## Overview
This guide shows how to add visual indicators linking licenses to their associated subscriptions in the Admin Licenses page.

## Changes Required

### 1. Update License Interface (Add at line 38)

```typescript
interface LicenseKey {
  id: string
  key_code: string
  license_type: string
  status: string
  // ... existing fields ...

  // ADD THESE:
  subscription?: {
    id: string
    subscription_type: 'trial' | 'paid'
    status: 'active' | 'expired' | 'cancelled'
    stripe_customer_id?: string
    amount_paid_cents?: number
    currency?: string
    created_at: string
  }
  plugin_subscription?: {
    id: string
    plugin_type: 'klippel_qc' | 'apx500'
    subscription_type: 'trial' | 'paid'
    status: 'active' | 'expired' | 'cancelled'
    created_at: string
  }
}
```

### 2. Update loadLicenses Function (Replace lines 150-196)

```typescript
const loadLicenses = async () => {
  try {
    setLoading(true)

    // Fetch licenses
    const response = await fetch('/api/admin/licenses/list', { cache: 'no-store' })
    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to load licenses')
    }

    let data: LicenseKey[] = result.licenses || []

    // Fetch subscriptions and plugin subscriptions
    const [subsResponse, pluginSubsResponse] = await Promise.all([
      fetch('/api/admin/subscriptions'),
      fetch('/api/admin/plugin-subscriptions')
    ])

    const subscriptionsData = subsResponse.ok ? await subsResponse.json() : { subscriptions: [] }
    const pluginSubscriptionsData = pluginSubsResponse.ok ? await pluginSubsResponse.json() : { subscriptions: [] }

    const allSubscriptions = subscriptionsData.subscriptions || []
    const allPluginSubscriptions = pluginSubscriptionsData.subscriptions || []

    // Match subscriptions to licenses
    data = data.map(license => {
      if (license.assigned_to?.id || license.user_id) {
        const userId = license.assigned_to?.id || license.user_id

        // Find matching subscription
        const subscription = allSubscriptions.find(s => s.user_id === userId)
        const pluginSubscription = allPluginSubscriptions.find(s => s.user_id === userId)

        return {
          ...license,
          subscription,
          plugin_subscription: pluginSubscription
        }
      }
      return license
    })

    // Generate stable license keys
    data = await generateStableLicenseKeys(data)

    // Apply existing filters...
    // (keep existing filter logic)

    setLicenses(data)
  } catch (error) {
    console.error('Failed to load licenses:', error)
    setLicenses([])
  } finally {
    setLoading(false)
  }
}
```

### 3. Add Subscription Badge Helper Function (Add after line 228)

```typescript
const getSubscriptionBadge = (license: LicenseKey) => {
  const sub = license.subscription || license.plugin_subscription

  if (!sub) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
        <XCircleIcon className="h-3 w-3 mr-1" />
        No Subscription
      </span>
    )
  }

  const isActive = sub.status === 'active'
  const isPaid = sub.subscription_type === 'paid'

  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-800 border border-green-200'
          : sub.status === 'expired'
          ? 'bg-red-100 text-red-800 border border-red-200'
          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      }`}>
        <CheckCircleIcon className="h-3 w-3 mr-1" />
        {isPaid ? '💳 Paid' : '🆓 Trial'} • {sub.status}
      </span>
      {sub.stripe_customer_id && (
        <div className="text-xs text-gray-500 flex items-center">
          <CreditCardIcon className="h-3 w-3 mr-1" />
          {sub.stripe_customer_id.substring(0, 15)}...
        </div>
      )}
    </div>
  )
}
```

### 4. Add Subscription Column to Table Header (After line 1058)

```typescript
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Subscription
</th>
```

### 5. Add Subscription Column to Table Body (After line 1173)

```typescript
{/* Subscription Status */}
<td className="px-6 py-4 whitespace-nowrap">
  {getSubscriptionBadge(license)}
</td>
```

## Visual Result

The enhanced table will show:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Key  │ Code      │ Type    │ Status │ Assigned To      │ Subscription      │
├─────────────────────────────────────────────────────────────────────────────┤
│ LIC-1│ LYC-APP...│ Trial   │ Trial  │ user@email.com   │ 🆓 Trial • active │
│      │           │         │        │                  │ cus_123...        │
├─────────────────────────────────────────────────────────────────────────────┤
│ LIC-2│ LYC-ENT...│ Enter..│ Active │ user2@email.com  │ 💳 Paid • active  │
│      │           │         │        │                  │ cus_456...        │
├─────────────────────────────────────────────────────────────────────────────┤
│ LIC-3│ LYC-PRO...│ Pro    │ Active │ user3@email.com  │ ❌ No Subscription│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Color Coding Legend

- **Green Border** = Active paid subscription
- **Blue Background** = Trial subscription
- **Red Background** = Expired subscription
- **Yellow Background** = Cancelled subscription
- **Gray** = No subscription linked

## Benefits

1. ✅ **Clear Visual Relationship** - See which licenses are tied to which subscriptions at a glance
2. ✅ **Subscription Type Indication** - Paid vs Trial clearly marked
3. ✅ **Status at a Glance** - Active/Expired/Cancelled status visible
4. ✅ **Stripe Integration** - Shows Stripe customer ID for paid subscriptions
5. ✅ **No Subscription Warning** - Highlights licenses without subscriptions

## Testing

1. **Test with Trial License**: Should show "🆓 Trial • active"
2. **Test with Paid License**: Should show "💳 Paid • active" + Stripe ID
3. **Test with Expired**: Should show red badge
4. **Test with No Subscription**: Should show gray "No Subscription" badge

## Implementation Time

Estimated: **15-20 minutes** for experienced developer

---

**File to Modify**: `src/app/admin/licenses/page.tsx`
**Lines to Change**: ~50 lines of additions/modifications
**Breaking Changes**: None (additive only)
