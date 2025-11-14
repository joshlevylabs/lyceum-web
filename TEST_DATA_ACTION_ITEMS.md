# Test Data Application - Action Items

**Document Version:** 1.0
**Created:** January 13, 2025
**Purpose:** Tasks that can be completed without Centcom input

---

## Overview

This document lists all tasks that can be started and completed immediately without waiting for Centcom team input. These are foundational improvements, infrastructure setup, and preparatory work that will accelerate development once Centcom provides the required specifications.

---

## Immediate Action Items (Can Start Today)

### 🟢 Category 1: Database & Backend Foundation

#### 1.1 Add Missing Database Indexes
**Status:** Not Started
**Priority:** High
**Effort:** 2 hours
**Description:** Add performance indexes to support common queries

**Tasks:**
- [ ] Add index on `cluster_projects.sync_status` for filtering
- [ ] Add index on `test_data_measurements.measurement_type` for filtering
- [ ] Add index on `test_data_measurements.test_date` for date range queries
- [ ] Add index on `test_data_measurements.validation_status` for quality filtering
- [ ] Add composite index on `test_data_measurements(cluster_project_id, test_date DESC)` for project measurement listing
- [ ] Add full-text search index on `cluster_projects.name, description` using pg_trgm

**Files to Modify:**
- Create new migration: `supabase/migrations/YYYYMMDD_add_test_data_indexes.sql`

**Implementation:**
```sql
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cluster_projects_sync_status
  ON cluster_projects(sync_status);

CREATE INDEX IF NOT EXISTS idx_test_data_measurements_type
  ON test_data_measurements(measurement_type);

CREATE INDEX IF NOT EXISTS idx_test_data_measurements_test_date
  ON test_data_measurements(test_date DESC);

CREATE INDEX IF NOT EXISTS idx_test_data_measurements_validation_status
  ON test_data_measurements(validation_status);

CREATE INDEX IF NOT EXISTS idx_test_data_measurements_project_date
  ON test_data_measurements(cluster_project_id, test_date DESC);

-- Full-text search support
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_cluster_projects_name_trgm
  ON cluster_projects USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cluster_projects_description_trgm
  ON cluster_projects USING gin(description gin_trgm_ops);
```

#### 1.2 Create Database Views for Common Queries
**Status:** Partially Complete (test_data_projects_summary exists)
**Priority:** Medium
**Effort:** 3 hours
**Description:** Create optimized views for frequently accessed data

**Tasks:**
- [ ] Create `test_data_measurements_with_project` view joining measurements with project info
- [ ] Create `test_data_quality_summary` view with quality score aggregations
- [ ] Create `test_data_recent_activity` view for dashboard activity feed
- [ ] Create `test_data_storage_summary` view for storage usage stats

**Files to Modify:**
- Create new migration: `supabase/migrations/YYYYMMDD_add_test_data_views.sql`

#### 1.3 Implement API Route: GET /api/test-data/measurements
**Status:** Not Started
**Priority:** High
**Effort:** 4 hours
**Description:** Basic endpoint to fetch measurements for a project

**Tasks:**
- [ ] Create route file: `src/app/api/test-data/measurements/route.ts`
- [ ] Implement GET handler with pagination (limit, offset)
- [ ] Add filtering by measurement_type, validation_status, date range
- [ ] Add sorting options (test_date, quality_score, measurement_name)
- [ ] Add RLS/authentication checks
- [ ] Return formatted response with pagination metadata
- [ ] Add error handling
- [ ] Test with existing test data

**File to Create:**
- `src/app/api/test-data/measurements/route.ts`

#### 1.4 Implement API Route: GET /api/test-data/measurements/[id]
**Status:** Not Started
**Priority:** High
**Effort:** 2 hours
**Description:** Get single measurement with full details

**Tasks:**
- [ ] Create route file: `src/app/api/test-data/measurements/[id]/route.ts`
- [ ] Implement GET handler
- [ ] Join with files table to include attachments
- [ ] Add RLS/authentication checks
- [ ] Return full measurement object
- [ ] Add error handling for not found

**File to Create:**
- `src/app/api/test-data/measurements/[id]/route.ts`

#### 1.5 Implement API Route: POST /api/test-data/files/upload
**Status:** Not Started
**Priority:** High
**Effort:** 4 hours
**Description:** File upload to Supabase Storage

**Tasks:**
- [ ] Create route file: `src/app/api/test-data/files/upload/route.ts`
- [ ] Setup Supabase Storage bucket `test-data-files` if not exists
- [ ] Implement multipart form-data parsing
- [ ] Validate file size and type
- [ ] Generate unique file path: `{user_id}/{project_id}/{filename}`
- [ ] Upload to Supabase Storage
- [ ] Calculate SHA256 hash
- [ ] Insert record into `test_data_files` table
- [ ] Return file metadata
- [ ] Add error handling

**Files to Create:**
- `src/app/api/test-data/files/upload/route.ts`
- Update: `supabase/storage/policies.sql` (if needed)

#### 1.6 Implement API Route: GET /api/test-data/stats
**Status:** Not Started
**Priority:** Medium
**Effort:** 3 hours
**Description:** Get statistics for analytics dashboard

**Tasks:**
- [ ] Create route file: `src/app/api/test-data/stats/route.ts`
- [ ] Use existing `get_user_test_data_stats()` function
- [ ] Add additional computed stats (avg quality, validation rate)
- [ ] Add time-based filtering (last 7 days, 30 days, etc.)
- [ ] Return formatted stats object
- [ ] Cache results (consider Redis or in-memory cache)

**File to Create:**
- `src/app/api/test-data/stats/route.ts`

---

### 🟢 Category 2: Frontend Infrastructure

#### 2.1 Create Measurement List Component
**Status:** Not Started
**Priority:** High
**Effort:** 4 hours
**Description:** Reusable component to display measurements table

**Tasks:**
- [ ] Create component: `src/components/test-data/MeasurementList.tsx`
- [ ] Add table with columns: Name, Type, Date, Quality Score, Status, Actions
- [ ] Add sorting functionality
- [ ] Add filtering UI
- [ ] Add pagination controls
- [ ] Add loading states
- [ ] Add empty state
- [ ] Add error handling
- [ ] Make responsive for mobile

**File to Create:**
- `src/components/test-data/MeasurementList.tsx`

#### 2.2 Create Measurement Detail Modal/Page
**Status:** Not Started
**Priority:** High
**Effort:** 4 hours
**Description:** View for displaying single measurement details

**Tasks:**
- [ ] Create component: `src/components/test-data/MeasurementDetail.tsx`
- [ ] Display all measurement metadata
- [ ] Display test conditions (from JSONB field)
- [ ] Display analysis results (from JSONB field)
- [ ] Show quality score with visual indicator
- [ ] List attached files with download links
- [ ] Add "Edit" and "Delete" action buttons (placeholders)
- [ ] Add loading and error states

**File to Create:**
- `src/components/test-data/MeasurementDetail.tsx`

#### 2.3 Create File Upload Component
**Status:** Not Started
**Priority:** Medium
**Effort:** 3 hours
**Description:** Reusable file upload component with drag-and-drop

**Tasks:**
- [ ] Create component: `src/components/test-data/FileUpload.tsx`
- [ ] Add drag-and-drop zone
- [ ] Add file picker button
- [ ] Show upload progress bar
- [ ] Display file preview/thumbnail
- [ ] Add file size validation
- [ ] Add file type validation
- [ ] Support multiple file upload
- [ ] Show upload success/error messages

**File to Create:**
- `src/components/test-data/FileUpload.tsx`

#### 2.4 Create Stats Dashboard Component
**Status:** Partially Complete (basic stats cards exist)
**Priority:** Medium
**Effort:** 4 hours
**Description:** Enhanced analytics dashboard with charts

**Tasks:**
- [ ] Create component: `src/components/test-data/StatsDashboard.tsx`
- [ ] Add overview cards (existing functionality)
- [ ] Add quality trend line chart
- [ ] Add measurement type distribution pie chart
- [ ] Add recent activity timeline
- [ ] Add storage usage bar chart
- [ ] Add date range selector
- [ ] Add export stats button
- [ ] Make responsive for mobile

**File to Create:**
- `src/components/test-data/StatsDashboard.tsx`

**Dependencies:**
- Install charting library: `npm install recharts` or `chart.js`

#### 2.5 Create Advanced Filter Component
**Status:** Not Started
**Priority:** Medium
**Effort:** 4 hours
**Description:** Advanced filtering UI for measurements and projects

**Tasks:**
- [ ] Create component: `src/components/test-data/AdvancedFilters.tsx`
- [ ] Add date range picker
- [ ] Add measurement type multi-select
- [ ] Add quality score range slider
- [ ] Add validation status checkboxes
- [ ] Add tags/category filters
- [ ] Add "Save Filter" functionality (localStorage)
- [ ] Add "Clear All" button
- [ ] Add "Apply Filters" button with loading state

**File to Create:**
- `src/components/test-data/AdvancedFilters.tsx`

**Dependencies:**
- Consider: `react-datepicker` or `date-fns`

#### 2.6 Update Test Data Page to Use New Components
**Status:** Not Started
**Priority:** High
**Effort:** 3 hours
**Description:** Integrate new components into main page

**Tasks:**
- [ ] Import MeasurementList component
- [ ] Import StatsDashboard component
- [ ] Import AdvancedFilters component
- [ ] Add tab navigation (Projects / Measurements)
- [ ] Connect components to API endpoints
- [ ] Add state management (consider Zustand or Context)
- [ ] Add loading skeletons
- [ ] Add error boundaries
- [ ] Test all interactions

**File to Modify:**
- `src/app/test-data/page.tsx`

---

### 🟢 Category 3: UI/UX Improvements

#### 3.1 Improve Table Styling and Interactions
**Status:** Not Started
**Priority:** Medium
**Effort:** 3 hours
**Description:** Enhance table component with better UX

**Tasks:**
- [ ] Add hover effects on rows
- [ ] Add row selection (checkboxes)
- [ ] Add "Select All" functionality
- [ ] Add bulk action toolbar (when rows selected)
- [ ] Add column resize functionality
- [ ] Add column reordering (drag-and-drop)
- [ ] Add column visibility toggle
- [ ] Persist user preferences (localStorage)
- [ ] Add keyboard navigation support

**Files to Modify:**
- `src/app/test-data/page.tsx`
- Create: `src/components/test-data/EnhancedTable.tsx`

#### 3.2 Add Loading Skeletons
**Status:** Not Started
**Priority:** Low
**Effort:** 2 hours
**Description:** Better loading states throughout the app

**Tasks:**
- [ ] Create skeleton component: `src/components/ui/Skeleton.tsx`
- [ ] Add skeleton for project cards
- [ ] Add skeleton for measurement table
- [ ] Add skeleton for stats dashboard
- [ ] Add skeleton for detail views
- [ ] Replace generic spinners with skeletons

**File to Create:**
- `src/components/ui/Skeleton.tsx`

#### 3.3 Implement Toast Notifications
**Status:** Not Started (check if already exists)
**Priority:** Medium
**Effort:** 2 hours
**Description:** User feedback for actions

**Tasks:**
- [ ] Check if toast library exists (Sonner, React-Hot-Toast, etc.)
- [ ] If not, install: `npm install sonner` (recommended)
- [ ] Create toast utility: `src/lib/toast.ts`
- [ ] Add success toasts (upload complete, sync complete, etc.)
- [ ] Add error toasts (upload failed, API errors, etc.)
- [ ] Add loading toasts (syncing, exporting, etc.)
- [ ] Add custom toast positions and durations

**Files to Create/Modify:**
- `src/lib/toast.ts`
- Update root layout to include toast provider

#### 3.4 Improve Mobile Responsiveness
**Status:** Partially Complete
**Priority:** Medium
**Effort:** 4 hours
**Description:** Optimize for tablet and mobile views

**Tasks:**
- [ ] Test page on mobile devices
- [ ] Switch table to card view on mobile
- [ ] Make filters collapsible/drawer on mobile
- [ ] Optimize touch targets (44px minimum)
- [ ] Add mobile-specific navigation patterns
- [ ] Test all interactions on touch devices
- [ ] Add swipe gestures where appropriate

**Files to Modify:**
- `src/app/test-data/page.tsx`
- All test-data components

---

### 🟢 Category 4: Testing Infrastructure

#### 4.1 Create Mock Data Generator
**Status:** Not Started
**Priority:** High
**Effort:** 3 hours
**Description:** Generate realistic test data for development

**Tasks:**
- [ ] Create script: `scripts/generate-test-data.ts`
- [ ] Generate mock projects (50 projects)
- [ ] Generate mock measurements (1000+ measurements)
- [ ] Generate mock files
- [ ] Vary measurement types
- [ ] Vary quality scores (distribution: 70% good, 20% medium, 10% poor)
- [ ] Vary sync statuses
- [ ] Insert into database via Supabase client
- [ ] Add CLI arguments (count, user_id, etc.)

**File to Create:**
- `scripts/generate-test-data.ts`
- Add to package.json scripts: `"generate-test-data": "tsx scripts/generate-test-data.ts"`

**Example Usage:**
```bash
npm run generate-test-data -- --projects=50 --measurements=1000 --user-id=abc-123
```

#### 4.2 Setup E2E Testing Framework
**Status:** Unknown
**Priority:** Medium
**Effort:** 4 hours
**Description:** Setup Playwright or Cypress for E2E tests

**Tasks:**
- [ ] Choose framework: Playwright (recommended) or Cypress
- [ ] Install: `npm install -D @playwright/test`
- [ ] Initialize: `npx playwright install`
- [ ] Create test directory: `e2e/test-data/`
- [ ] Create first test: `e2e/test-data/project-list.spec.ts`
- [ ] Add GitHub Actions workflow for E2E tests
- [ ] Document how to run tests

**Files to Create:**
- `playwright.config.ts` (if Playwright)
- `e2e/test-data/project-list.spec.ts`
- `.github/workflows/e2e-tests.yml`

#### 4.3 Write Unit Tests for API Routes
**Status:** Not Started
**Priority:** Medium
**Effort:** 4 hours per route
**Description:** Test API endpoints in isolation

**Tasks:**
- [ ] Choose testing framework (Vitest recommended for Next.js)
- [ ] Setup test database (separate from dev)
- [ ] Write tests for GET /api/cluster-projects
- [ ] Write tests for GET /api/test-data/measurements
- [ ] Write tests for file upload endpoint
- [ ] Write tests for authentication/authorization
- [ ] Add to CI/CD pipeline

**Files to Create:**
- `src/app/api/cluster-projects/__tests__/route.test.ts`
- `src/app/api/test-data/measurements/__tests__/route.test.ts`
- Update: `vitest.config.ts` or `jest.config.js`

#### 4.4 Create Test Data Fixtures
**Status:** Not Started
**Priority:** Medium
**Effort:** 2 hours
**Description:** Reusable test data for unit/integration tests

**Tasks:**
- [ ] Create fixtures directory: `tests/fixtures/test-data/`
- [ ] Create project fixtures (JSON)
- [ ] Create measurement fixtures (JSON)
- [ ] Create file fixtures (mock files)
- [ ] Create helper functions to load fixtures
- [ ] Document fixture structure

**Files to Create:**
- `tests/fixtures/test-data/projects.json`
- `tests/fixtures/test-data/measurements.json`
- `tests/fixtures/test-data/helpers.ts`

---

### 🟢 Category 5: Developer Experience

#### 5.1 Add TypeScript Types/Interfaces
**Status:** Partially Complete
**Priority:** High
**Effort:** 3 hours
**Description:** Comprehensive type definitions

**Tasks:**
- [ ] Create types file: `src/types/test-data.ts`
- [ ] Define `Project` interface (complete)
- [ ] Define `Measurement` interface (complete)
- [ ] Define `MeasurementFile` interface
- [ ] Define `Template` interface
- [ ] Define `ExportJob` interface
- [ ] Define `TestConditions` interface (for JSONB field)
- [ ] Define `AnalysisResults` interface (for JSONB field)
- [ ] Define API response types
- [ ] Export all types

**File to Create:**
- `src/types/test-data.ts`

**Example:**
```typescript
export interface Measurement {
  id: string
  cluster_project_id: string
  measurement_id: string
  measurement_name: string
  measurement_type: MeasurementType
  test_date: string
  operator?: string
  equipment?: string
  test_conditions?: TestConditions
  data_format: 'json' | 'csv' | 'binary'
  data_location?: string
  data_size_bytes?: number
  inline_data?: Record<string, any>
  analysis_results?: AnalysisResults
  quality_score?: number
  validation_status: 'pending' | 'validated' | 'failed' | 'flagged'
  tags?: string[]
  category?: string
  created_at: string
  updated_at: string
}

export type MeasurementType =
  | 'frequency_response'
  | 'distortion'
  | 'thd'
  | 'impedance'
  | 'other'

export interface TestConditions {
  temperature?: number
  humidity?: number
  voltage?: number
  [key: string]: any
}

export interface AnalysisResults {
  peak_frequency?: number
  bandwidth?: number
  total_harmonic_distortion?: number
  [key: string]: any
}
```

#### 5.2 Create API Client Utility
**Status:** Not Started
**Priority:** High
**Effort:** 3 hours
**Description:** Centralized API client with error handling

**Tasks:**
- [ ] Create utility: `src/lib/api/test-data-client.ts`
- [ ] Implement type-safe API methods
- [ ] Add automatic authentication (JWT from localStorage)
- [ ] Add error handling and retries
- [ ] Add request/response interceptors
- [ ] Add loading state management
- [ ] Add TypeScript generics for type safety

**File to Create:**
- `src/lib/api/test-data-client.ts`

**Example:**
```typescript
export class TestDataClient {
  async getProjects(filters?: ProjectFilters): Promise<ProjectsResponse> {
    // Implementation
  }

  async getMeasurements(projectId: string, options?: ListOptions): Promise<MeasurementsResponse> {
    // Implementation
  }

  async uploadFile(projectId: string, file: File): Promise<FileUploadResponse> {
    // Implementation
  }
}

export const testDataClient = new TestDataClient()
```

#### 5.3 Add Environment Variables Documentation
**Status:** Not Started
**Priority:** Low
**Effort:** 1 hour
**Description:** Document required env vars

**Tasks:**
- [ ] Create/update: `.env.example`
- [ ] Document all test-data related env vars
- [ ] Add comments explaining each variable
- [ ] Document default values
- [ ] Update README with env setup instructions

**File to Update:**
- `.env.example`
- `README.md`

#### 5.4 Create Development Setup Script
**Status:** Not Started
**Priority:** Low
**Effort:** 2 hours
**Description:** Automate local development setup

**Tasks:**
- [ ] Create script: `scripts/setup-test-data-dev.sh`
- [ ] Check Supabase is running
- [ ] Run migrations
- [ ] Seed test data
- [ ] Create storage buckets
- [ ] Setup RLS policies
- [ ] Verify setup with test query
- [ ] Make script idempotent (safe to run multiple times)

**File to Create:**
- `scripts/setup-test-data-dev.sh`
- Add to package.json: `"setup:test-data": "bash scripts/setup-test-data-dev.sh"`

---

### 🟢 Category 6: Performance Optimization

#### 6.1 Implement Query Result Caching
**Status:** Not Started
**Priority:** Medium
**Effort:** 3 hours
**Description:** Cache frequently accessed data

**Tasks:**
- [ ] Choose caching strategy (Redis or in-memory)
- [ ] If Redis: Setup Redis connection
- [ ] If in-memory: Use Node.js Map with TTL
- [ ] Cache project list results (5 min TTL)
- [ ] Cache stats results (10 min TTL)
- [ ] Add cache invalidation on data changes
- [ ] Add cache hit/miss metrics

**File to Create:**
- `src/lib/cache/test-data-cache.ts`

#### 6.2 Add Request Debouncing on Search
**Status:** Not Started
**Priority:** Medium
**Effort:** 1 hour
**Description:** Reduce API calls during typing

**Tasks:**
- [ ] Install lodash or use custom debounce
- [ ] Add debounce to search input (300ms delay)
- [ ] Add visual indicator (loading state)
- [ ] Cancel in-flight requests on new input

**Files to Modify:**
- `src/app/test-data/page.tsx`

#### 6.3 Implement Virtualized Lists for Large Datasets
**Status:** Not Started
**Priority:** Low
**Effort:** 4 hours
**Description:** Optimize rendering of long lists

**Tasks:**
- [ ] Install: `npm install @tanstack/react-virtual`
- [ ] Replace standard list/table with virtualized version
- [ ] Test with 10,000+ items
- [ ] Maintain scroll position on updates
- [ ] Ensure keyboard navigation works

**Files to Modify:**
- `src/components/test-data/MeasurementList.tsx`

---

### 🟢 Category 7: Documentation

#### 7.1 Add JSDoc Comments to Components
**Status:** Not Started
**Priority:** Low
**Effort:** 3 hours
**Description:** Improve code documentation

**Tasks:**
- [ ] Add JSDoc to all component props
- [ ] Add JSDoc to all utility functions
- [ ] Add JSDoc to API routes
- [ ] Add usage examples in comments
- [ ] Generate docs with TypeDoc (optional)

**Files to Modify:**
- All component files
- All utility files
- All API route files

#### 7.2 Create Component Storybook (Optional)
**Status:** Not Started
**Priority:** Low
**Effort:** 6 hours
**Description:** Visual component documentation

**Tasks:**
- [ ] Install Storybook: `npx storybook@latest init`
- [ ] Create stories for MeasurementList
- [ ] Create stories for MeasurementDetail
- [ ] Create stories for FileUpload
- [ ] Create stories for AdvancedFilters
- [ ] Add interactive controls
- [ ] Add documentation tabs

**Files to Create:**
- `.storybook/main.ts`
- `src/components/test-data/*.stories.tsx`

#### 7.3 Create API Documentation Page
**Status:** Not Started
**Priority:** Medium
**Effort:** 3 hours
**Description:** Internal API reference

**Tasks:**
- [ ] Create markdown file: `docs/api/TEST_DATA_API.md`
- [ ] Document all endpoints
- [ ] Add request/response examples
- [ ] Add error codes reference
- [ ] Add authentication guide
- [ ] Consider generating from OpenAPI spec

**File to Create:**
- `docs/api/TEST_DATA_API.md`

---

## Priority Matrix

### Must Have (Before Phase 1)
1. ✅ Database indexes (1.1)
2. ✅ GET /api/test-data/measurements (1.3)
3. ✅ GET /api/test-data/measurements/[id] (1.4)
4. ✅ MeasurementList component (2.1)
5. ✅ MeasurementDetail component (2.2)
6. ✅ TypeScript types (5.1)
7. ✅ API client utility (5.2)
8. ✅ Mock data generator (4.1)

### Should Have (Before Phase 2)
1. ✅ File upload API (1.5)
2. ✅ Stats API (1.6)
3. ✅ FileUpload component (2.3)
4. ✅ StatsDashboard component (2.4)
5. ✅ AdvancedFilters component (2.5)
6. ✅ Toast notifications (3.3)
7. ✅ E2E testing setup (4.2)
8. ✅ Query caching (6.1)

### Nice to Have (Future)
1. Enhanced table interactions (3.1)
2. Loading skeletons (3.2)
3. Unit tests (4.3)
4. Virtualized lists (6.3)
5. Storybook (7.2)
6. Component documentation (7.1)

---

## Estimated Timeline

If working **full-time** (8 hours/day):

- **Must Have items:** 3-4 days
- **Should Have items:** 4-5 days
- **Nice to Have items:** 3-4 days

**Total:** 10-13 days of focused work

If working **part-time** (4 hours/day):

- **Must Have items:** 1 week
- **Should Have items:** 1-2 weeks
- **Nice to Have items:** 1 week

**Total:** 3-4 weeks

---

## How to Use This Document

1. **Start with "Must Have" items** - These are blocking for Phase 1 implementation
2. **Work in parallel** - Backend and frontend tasks can be done simultaneously by different developers
3. **Test as you go** - Use mock data generator to test each component/API as it's built
4. **Check off completed items** - Update this document as tasks are completed
5. **Revisit after Centcom sync** - Some tasks may need adjustment based on Centcom input

---

## Dependencies Check

Before starting, verify you have:
- ✅ Node.js 18+ installed
- ✅ Supabase CLI installed and configured
- ✅ Local Supabase instance running
- ✅ Database migrations applied
- ✅ Package dependencies installed (`npm install`)
- ✅ `.env.local` configured with Supabase credentials

---

## Questions or Blockers?

If you encounter issues with any of these tasks:

1. **Database issues**: Check Supabase connection, verify migrations applied
2. **Type errors**: Ensure `src/types/test-data.ts` is created first
3. **API errors**: Check authentication, verify RLS policies
4. **Component errors**: Check imports, verify dependencies installed

---

**Document Status:** ✅ Ready for Development

**Last Updated:** January 13, 2025

**Next Review:** After completing "Must Have" items or after Centcom sync meeting
