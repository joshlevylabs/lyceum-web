# Implementation Guide: Clusters, Plugins Store & Test Data Integration

This guide provides step-by-step instructions for implementing the new features using your existing database infrastructure.

## Overview of Changes

✅ **Completed:**
- Removed "Groups" from sidebar
- Added "Clusters" and "Plugins Store" to sidebar
- Created database schemas for Plugins Store and Test Data
- Created UI pages for Clusters, Plugins Store, and enhanced Test Data
- Created requirements document for centcom team

## Database Migrations

### Step 1: Run Migrations in Order

Execute these migrations in your Supabase SQL Editor:

#### 1. Extend Existing Cluster Projects (Safe)
```bash
File: supabase/migrations/20250104_extend_cluster_projects.sql
```
This safely adds columns to your existing `cluster_projects` table only if they don't exist.

#### 2. Create Plugins Store System (New)
```bash
File: supabase/migrations/20250104_plugins_store_system.sql
```
Creates:
- `plugins` - Plugin catalog
- `plugin_licenses` - User licenses
- `plugin_purchases` - Purchase history
- `plugin_reviews` - Ratings and reviews
- `user_payment_methods` - Tokenized payment info

#### 3. Create Test Data Integration (New)
```bash
File: supabase/migrations/20250104_test_data_integration.sql
```
Creates:
- `test_data_measurements` - Measurement data
- `test_data_files` - File attachments
- `test_data_exports` - Export tracking
- `test_data_templates` - Reusable templates

### ⚠️ Do NOT Run:
- `20250104_clusters_system.sql` - You already have a comprehensive cluster system

## API Routes to Implement

### 1. Clusters API

Your existing cluster system already has `/api/admin/clusters`. The user-facing Clusters page now uses this endpoint.

**File:** `src/app/clusters/page.tsx`
**API Used:** `/api/admin/clusters` (existing)

No new API routes needed for clusters - we're using your existing infrastructure!

### 2. Plugins Store API

Create these new API routes:

#### `/api/plugins` (GET)
```typescript
// Get all published plugins
// Returns: { success: true, plugins: Plugin[] }
```

#### `/api/plugins/licenses` (GET)
```typescript
// Get user's active licenses
// Returns: { success: true, licenses: PluginLicense[] }
```

#### `/api/plugins/trial` (POST)
```typescript
// Activate free trial
// Body: { plugin_id: string }
// Validation:
// 1. Check if plugin requires payment method
// 2. Check if user has payment method (if required)
// 3. Check if user already had a license for this plugin
// 4. Create new license record with is_trial=true
// Returns: { success: true, license: PluginLicense }
```

#### `/api/payment-methods` (GET, POST)
```typescript
// GET: Get user's payment methods
// POST: Add new payment method (tokenized via Stripe)
// Returns: { success: true, payment_methods: PaymentMethod[] }
```

### 3. Test Data API

#### `/api/cluster-projects` (GET)
```typescript
// Get projects from user's clusters
// Query existing cluster_projects table
// Join with unified_clusters to get cluster info
// Returns: { success: true, projects: ClusterProject[] }
```

Example query:
```sql
SELECT
  cp.*,
  uc.name as cluster_name,
  uc.cluster_type,
  uc.architecture
FROM cluster_projects cp
JOIN unified_clusters uc ON cp.cluster_id = uc.id
WHERE cp.owner_id = auth.uid()
AND cp.project_type = 'test_data'
ORDER BY cp.updated_at DESC;
```

## Frontend Integration

### 1. Clusters Page
**File:** `src/app/clusters/page.tsx`

✅ **Already integrated** with your existing `/api/admin/clusters` endpoint.

The page transforms your `unified_clusters` data to display:
- Cluster cards showing local/cloud status
- Health status and storage usage
- Project counts
- Configuration options

### 2. Plugins Store Page
**File:** `src/app/plugins/page.tsx`

**Features implemented:**
- Browse plugins with search and filters
- View plugin details, ratings, and features
- Purchase flow (requires payment method)
- Free trial activation with payment validation
- Warning banner if no payment method

**Needs:**
- API routes listed above
- Payment processor integration (Stripe recommended)

### 3. Test Data Page
**File:** `src/app/test-data/page.tsx`

**Interfaces added:**
- `ClusterProject` - For projects from clusters
- Icons: `CloudIcon`, `ComputerDesktopIcon`, `ArrowPathIcon`

**To complete integration:**

Add this code to load cluster projects:

```typescript
const [clusterProjects, setClusterProjects] = useState<ClusterProject[]>([])

const loadClusterProjects = async () => {
  try {
    const response = await fetch('/api/cluster-projects')
    const data = await response.json()

    if (data.success) {
      setClusterProjects(data.projects || [])
    }
  } catch (error) {
    console.error('Error loading cluster projects:', error)
    setClusterProjects([])
  }
}

// Call in useEffect
useEffect(() => {
  loadProjects()
  loadClusterProjects() // Add this
}, [filterType, searchTerm])
```

Then display cluster projects in a separate section with sync status badges.

## Payment Integration (Stripe)

### 1. Install Stripe SDK
```bash
npm install @stripe/stripe-js stripe
```

### 2. Environment Variables
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Create Stripe Payment Method Flow

**File:** `src/app/settings/page.tsx` (add Billing tab)

```typescript
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement } from '@stripe/react-stripe-js'

// Add payment method form
// Tokenize card with Stripe
// Save token to user_payment_methods table
```

### 4. Implement Purchase Flow

**File:** `src/app/plugins/page.tsx`

```typescript
const handlePurchase = async (plugin: Plugin) => {
  // 1. Create Stripe PaymentIntent
  // 2. Confirm payment
  // 3. Create plugin_licenses record
  // 4. Create plugin_purchases record
  // 5. Show success message
}
```

## Test Data Integration with CentCom

### 1. Wait for CentCom Team Response

**Document sent:** `docs/centcom-integration/TEST_DATA_APP_REQUIREMENTS.md`

This document requests:
- Data model and schema details
- API endpoints and formats
- UI/UX patterns and screenshots
- Sync mechanisms and frequencies

### 2. Implement Data Sync

Once you receive the requirements:

```typescript
// Create sync service
const syncClusterProjects = async (clusterId: string) => {
  // 1. Fetch projects from cluster API
  // 2. Compare with existing cluster_projects
  // 3. Insert/update records
  // 4. Update sync_status and last_synced_at
  // 5. Log to cluster_activity_log
}
```

### 3. Add Sync Button

The Test Data page already has a "Sync Clusters" button that calls `loadData()`. Update it to trigger sync:

```typescript
const handleSyncClusters = async () => {
  // Trigger sync for all user clusters
  // Show progress indicator
  // Reload data when complete
}
```

## Summary

### What's Working Now:
✅ Sidebar navigation updated
✅ Database schemas created (Plugins, Test Data)
✅ Clusters page using existing unified_clusters
✅ Plugins Store page UI complete
✅ Test Data page enhanced with cluster support

### What Needs Implementation:
1. **API Routes:** Plugins and cluster-projects endpoints
2. **Payment Integration:** Stripe setup and payment methods
3. **CentCom Integration:** Wait for requirements, then implement sync
4. **Webhooks:** Stripe webhooks for subscription management
5. **Testing:** End-to-end testing of all flows

### Next Steps:
1. Run the 3 safe database migrations
2. Implement `/api/plugins` and related routes
3. Implement `/api/cluster-projects` route
4. Set up Stripe account and add SDK
5. Add billing tab to Settings page
6. Wait for CentCom team response
7. Implement cluster sync when requirements arrive

---

## Files Created/Modified

### Database Migrations:
- ✅ `supabase/migrations/20250104_extend_cluster_projects.sql`
- ✅ `supabase/migrations/20250104_plugins_store_system.sql`
- ✅ `supabase/migrations/20250104_test_data_integration.sql`
- ❌ ~~`supabase/migrations/20250104_clusters_system.sql`~~ (Skip - you have existing system)

### Frontend Pages:
- ✅ `src/app/clusters/page.tsx` - Uses existing API
- ✅ `src/app/plugins/page.tsx` - Complete UI, needs API
- ✅ `src/app/test-data/page.tsx` - Enhanced with cluster support
- ✅ `src/components/DashboardLayout.tsx` - Updated navigation

### Documentation:
- ✅ `docs/centcom-integration/TEST_DATA_APP_REQUIREMENTS.md`
- ✅ `IMPLEMENTATION_GUIDE.md` (this file)

## Questions?

If you need clarification on any of these steps, or encounter issues during implementation, refer back to this guide or the individual migration files for detailed comments and examples.
