# Centcom Response Analysis & Implementation Plan

**Document Version:** 1.0
**Created:** January 13, 2025
**Status:** Ready for Implementation
**Priority:** High

---

## Executive Summary

🎉 **Excellent News!** The Centcom team has provided **comprehensive and detailed specifications** that address all of our critical, high-priority, and medium-priority requests. This is everything we need to proceed with implementation.

### What We Received

✅ **Complete UI/UX specifications** with ASCII mockups and component descriptions
✅ **Detailed data structure examples** with full JSON schemas for all measurement types
✅ **Quality scoring algorithm** with complete Python and Rust implementations
✅ **Sync protocol documentation** with registration and heartbeat specifications
✅ **Import/export specifications** with file format examples
✅ **Database schema details** with ClickHouse and PostgreSQL structures
✅ **API endpoint specifications** with request/response examples
✅ **Visualization specifications** using Plotly.js

### Key Findings

**Critical Discovery:** The sync model is different than we initially assumed:

- ✅ **Test data stays in local ClickHouse** on the desktop app
- ✅ **Heartbeat sends project metadata** only (not full measurement data)
- ✅ **Lyceum displays project summaries** from heartbeat metadata
- ⚠️ **Full measurement access** requires querying the local cluster directly (future feature)

This means our current Phase 1 can focus on:
1. Displaying project metadata from heartbeats (already partially working)
2. Building the UI/UX to match the desktop app
3. Implementing export/import for manual data transfer
4. Adding visualization capabilities

---

## Document Overview

The Centcom response document is **~31,500 tokens** (approximately 60 pages) and includes:

### 🔴 Critical Specifications (Provided)

1. **UI Screenshots & Component Architecture** ✅
   - Main Test Data page layout
   - Project detail modal with tabs
   - Measurement hierarchy tree view
   - Chart modal with zoom/pan controls
   - Data Visualizer page with flagging system
   - Advanced filter panel (Jira-style cascading filters)

2. **Data Import/Export Specifications** ✅
   - JSON export format (primary)
   - PNG/PDF export for charts
   - CSV export for raw data
   - JSON import with validation
   - Klippel KDBX import (custom parser)
   - CSV import (planned, not yet implemented)

3. **Measurement Data Structure** ✅
   - Complete JSON examples for all measurement types
   - XY data measurements (frequency response, THD+N, impedance)
   - Scalar measurements (level meters, single values)
   - Field-by-field documentation
   - Test conditions structure
   - Analysis results structure
   - Limits and pass/fail criteria

4. **Sync Protocol & Cluster Integration** ✅
   - Cluster registration endpoint
   - Heartbeat endpoint (300-second intervals)
   - Project metadata structure
   - JWT authentication with sync tokens
   - Error handling and duplicate detection
   - License validation integration

### 🟡 High Priority Specifications (Provided)

5. **Project Creation Workflow** ✅
   - Projects are created in desktop app (local ClickHouse)
   - Synced to Lyceum via heartbeat metadata
   - Web app will support manual JSON import
   - No direct project creation API (desktop-first model)

6. **Quality Scoring Algorithm** ✅
   - Complete algorithm with 4 components:
     - Linearity Score (30% weight)
     - Consistency Score (30% weight)
     - Noise Floor Score (20% weight)
     - Limits Compliance Score (20% weight)
   - Python and Rust implementations provided
   - Handles both XY data and scalar measurements

7. **Project & Measurement Management** ✅
   - Actions: View, Edit, Delete, Pin, Download, Flag
   - Bulk operations: Delete, Export, Tag, Move
   - Inline editing for names and tags
   - Multi-select with checkboxes
   - Column customization (hide/show, reorder, resize)

### 🟢 Medium Priority Specifications (Provided)

8. **Data Visualization** ✅
   - Uses Plotly.js for interactive charts
   - Supports linear and log scales
   - Zoom, pan, and reset controls
   - Export charts as PNG, PDF, or CSV
   - Measurement hierarchy tree view
   - Flagging system with color-coded flags

9. **Advanced Filtering & Search** ✅
   - Cascading filter dropdown (Jira-style)
   - Filter types: Data Type, Summary, Test Configurations, Key, Name, Groups, Categories, Database, Source, Created, Tags, Details
   - Operators: `=`, `!=`, `contains`, `not_contains`, `in`, `not_in`, `before`, `after`, `between`, `>`, `<`, `>=`, `<=`, `contains_all`, `contains_any`
   - Save/load filter presets
   - Real-time search with 300ms debounce

10. **Templates System** ⚠️
    - Not explicitly covered in response
    - Desktop app creates projects directly (no templates in web)

11. **File Management** ⚠️
    - Files are attachments to measurements
    - Stored in ClickHouse or file system
    - Not synced to Lyceum (local only)

12. **Validation & Quality Control** ✅
    - Validation status: `validated`, `pending`, `rejected`
    - Pass/fail status: `PASS`, `FAIL`, `UNKNOWN`
    - Flagging system with color codes
    - Auto-flagger based on limits
    - Manual flags with notes

### Additional Topics Covered

- **User Roles & Permissions** - RLS in Lyceum database
- **Batch Operations** - Multi-select and bulk actions
- **Analytics & Reporting** - Data Visualizer page with stats
- **Performance Considerations** - Pagination, lazy loading, caching
- **Database Schemas** - ClickHouse and PostgreSQL structures
- **API Endpoints** - Complete specifications with examples

---

## Key Insights & Architectural Implications

### 1. Desktop-First Data Model

**Discovery:** Test data is **NOT replicated** to Lyceum's database in full.

**How It Works:**
```
┌─────────────────────────┐
│ Centcom Desktop App     │
│                         │
│  ┌──────────────────┐  │
│  │ ClickHouse       │  │ ← Full measurement data stored here
│  │ (Local Database) │  │
│  └──────────────────┘  │
│          │              │
│          │ Heartbeat    │
│          │ (metadata)   │
│          ▼              │
│  ┌──────────────────┐  │
│  │ Tauri Backend    │  │
│  └──────┬───────────┘  │
└─────────┼──────────────┘
          │
          │ POST /api/centcom/clusters/local/heartbeat
          │ { project_metadata: [...] }
          ▼
┌──────────────────────────┐
│ Lyceum Platform          │
│                          │
│  ┌────────────────────┐ │
│  │ PostgreSQL         │ │ ← Project metadata only
│  │ - cluster_projects │ │
│  │ - project metadata │ │
│  └────────────────────┘ │
│                          │
│  Web UI shows:           │
│  • Project list          │
│  • Project metadata      │
│  • Summary statistics    │
│  • Sync status           │
└──────────────────────────┘
```

**Implications:**
- ✅ **Phase 1:** Display project metadata from heartbeats (already working)
- ✅ **Phase 2:** Import/export JSON for manual data transfer
- ⚠️ **Phase 3 (Future):** Direct cluster querying for full measurement access
  - Would require exposing ClickHouse endpoint from desktop app
  - Security considerations (firewall, VPN, authentication)
  - Not in current scope

### 2. Quality Scoring Algorithm

**Complete Algorithm Provided:**

```python
# High-level formula
Quality Score = (Linearity × 0.3) + (Consistency × 0.3) + (Noise × 0.2) + (Limits × 0.2)

# Components:
1. Linearity (30%) - Smoothness of data (second derivative)
2. Consistency (30%) - Coefficient of variation (std_dev / mean)
3. Noise Floor (20%) - Signal-to-noise ratio
4. Limits Compliance (20%) - Percentage of points within limits
```

**Action Item:** We can implement this in TypeScript/JavaScript for web app quality scoring.

### 3. Data Structure

**Complete measurement object structure provided with examples for:**

- **XY Data Measurements:**
  - Frequency Response
  - THD+N (Total Harmonic Distortion + Noise)
  - Impedance Curve
  - Any measurement with X-Y data arrays

- **Scalar Measurements:**
  - RMS Level
  - Peak Amplitude
  - Single-value meters

**All measurements include:**
- `id`, `measurement_name`, `measurement_type`
- `signal_path`, `analyzer_name`, `result_name`
- `test_date`, `operator`, `equipment`
- `test_conditions` (object with environmental data)
- `data` (XY arrays or scalar value)
- `analysis_results` (calculated metrics)
- `limits` (pass/fail criteria)
- `quality_score` (0-100)
- `validation_status`, `pass_fail_status`
- `notes`, `flags`, `metadata`

### 4. UI/UX Specifications

**Main Features:**

1. **Project Table:**
   - Resizable, reorderable columns
   - Multi-select with checkboxes
   - Inline editing
   - Pin/unpin projects
   - Bulk actions toolbar
   - 25/50/100 rows per page

2. **Advanced Filters:**
   - Cascading dropdown (Jira-style)
   - Multiple filter types and operators
   - Visual chips showing active filters
   - Save/load filter presets

3. **Project Detail Modal:**
   - Tabs: Overview, Measurements, Settings, History
   - Measurement hierarchy tree view
   - Chart modal with Plotly.js
   - Zoom, pan, reset controls
   - Export as PNG/PDF/CSV

4. **Data Visualizer Page:**
   - Flagged measurements view
   - Color-coded flags (🔴 Critical, 🟡 Review, 🟢 Passed, 🔵 Baseline)
   - Auto-flagger configuration
   - Bulk unflag operations

### 5. Export/Import Formats

**Export (Fully Specified):**

- **JSON Export:** Complete project with all measurements
  - File naming: `{project_key}_{project_name}.json`
  - Structure: Full object with categories, test configurations, limits, settings, summary data
  - Max size: 100 MB

- **Chart Exports:**
  - PNG: Plotly `toImage()` at 1920×1080
  - PDF: Plotly chart to PDF
  - CSV: Raw X-Y data points

**Import (Partially Specified):**

- **JSON Import:** Same structure as export
  - Validation: Required fields check
  - Duplicate handling: Auto-rename or cancel
  - Target database selection (ClickHouse/PostgreSQL)

- **Klippel KDBX Import:** Custom parser (desktop only)
  - XML-based format
  - Max size: 250 MB

- **CSV Import:** Planned but not implemented

---

## Updated Implementation Roadmap

### Phase 1: Core UI & Metadata Display (Weeks 1-2)

**Status:** Partially Complete → Needs Enhancement

**Tasks:**

1. **Update Project List Page** ✅ Started, needs enhancement
   - [ ] Implement resizable/reorderable columns
   - [ ] Add multi-select with checkboxes
   - [ ] Add inline editing for names/tags
   - [ ] Add pin/unpin functionality
   - [ ] Add bulk actions toolbar
   - [ ] Implement column customization (hide/show)
   - [ ] Add pagination with 25/50/100 options

2. **Build Advanced Filter Component** ❌ Not Started
   - [ ] Create cascading filter dropdown UI
   - [ ] Implement all filter types and operators
   - [ ] Add filter chips with remove buttons
   - [ ] Implement save/load filter presets (localStorage)
   - [ ] Add "Clear All Filters" button

3. **Create Project Detail Modal** ❌ Not Started
   - [ ] Build tabbed modal component
   - [ ] Implement Overview tab with metadata
   - [ ] Implement Measurements tab with hierarchy tree
   - [ ] Implement Settings tab (placeholder)
   - [ ] Implement History tab (placeholder)
   - [ ] Add action buttons (Edit, Delete, Clone, Export)

4. **Implement Measurement Hierarchy Component** ❌ Not Started
   - [ ] Build tree view component
   - [ ] Collapsible signal paths
   - [ ] Measurement icons (📁 📊 📈 📏)
   - [ ] "View Chart" buttons
   - [ ] "View Data" buttons

**Estimated Effort:** 1.5-2 weeks (1 developer)

---

### Phase 2: Export/Import Functionality (Weeks 3-4)

**Status:** Not Started

**Tasks:**

1. **Implement JSON Export** ❌ Not Started
   - [ ] Create API endpoint: `POST /api/test-data/export`
   - [ ] Build export service to generate JSON
   - [ ] Format according to Centcom specification
   - [ ] Add download button on project rows
   - [ ] Add bulk export for multiple projects
   - [ ] Handle large exports (progress indicator)
   - [ ] Generate filename: `{project_key}_{project_name}.json`

2. **Implement JSON Import** ❌ Not Started
   - [ ] Create API endpoint: `POST /api/test-data/import`
   - [ ] Build import validation service
   - [ ] Parse and validate JSON structure
   - [ ] Check required fields
   - [ ] Handle duplicate keys (auto-rename or cancel)
   - [ ] Save to `cluster_projects` table
   - [ ] Create related `test_data_measurements` records
   - [ ] Build import wizard UI:
     - Step 1: Upload file
     - Step 2: Validate data
     - Step 3: Configure import options
     - Step 4: Confirm and import

3. **Implement Chart Export** ❌ Not Started
   - [ ] Export PNG (Plotly `toImage()`)
   - [ ] Export PDF (Plotly to PDF)
   - [ ] Export CSV (raw X-Y data)
   - [ ] Add export buttons to chart modal

**Estimated Effort:** 2 weeks (1 developer)

---

### Phase 3: Visualization & Quality Scoring (Weeks 5-6)

**Status:** Not Started

**Tasks:**

1. **Install Plotly.js** ❌ Not Started
   - [ ] `npm install plotly.js-dist-min react-plotly.js`
   - [ ] Configure TypeScript types

2. **Build Chart Modal Component** ❌ Not Started
   - [ ] Create modal with Plotly chart
   - [ ] Implement linear/log scale toggle
   - [ ] Add zoom controls (click and drag)
   - [ ] Add pan controls (shift + drag)
   - [ ] Add reset control (double-click)
   - [ ] Display measurement metadata below chart
   - [ ] Add export buttons (PNG, PDF, CSV)
   - [ ] Add fullscreen mode
   - [ ] Add flag measurement button

3. **Implement Quality Scoring Algorithm** ❌ Not Started
   - [ ] Create utility: `src/lib/quality-scoring.ts`
   - [ ] Implement `calculateLinearityScore()`
   - [ ] Implement `calculateConsistencyScore()`
   - [ ] Implement `calculateNoiseScore()`
   - [ ] Implement `calculateLimitsScore()`
   - [ ] Implement main `calculateQualityScore()`
   - [ ] Add unit tests for each function
   - [ ] Display quality score in UI (with color coding)

4. **Build Data Visualizer Page** ❌ Not Started
   - [ ] Create page: `src/app/data-visualizer/page.tsx`
   - [ ] Implement tabs: Overview, Flagged Measurements, Analytics, Auto-Flagger, Flagged Limits, Pinboard
   - [ ] Build flagged measurements table
   - [ ] Add flag legend with counts
   - [ ] Implement flag filtering
   - [ ] Add bulk unflag operations
   - [ ] Implement auto-flagger configuration (future)

**Estimated Effort:** 2 weeks (1 developer)

---

### Phase 4: Advanced Features (Weeks 7-8)

**Status:** Not Started

**Tasks:**

1. **Implement Flagging System** ❌ Not Started
   - [ ] Add `flags` column to `test_data_measurements` table
   - [ ] Create API endpoint: `POST /api/test-data/measurements/:id/flag`
   - [ ] Create API endpoint: `DELETE /api/test-data/measurements/:id/flag`
   - [ ] Add flag types: `critical`, `review`, `passed`, `baseline`
   - [ ] Add flag colors: 🔴 🟡 🟢 🔵
   - [ ] Store flag author and timestamp
   - [ ] Display flags in measurement hierarchy
   - [ ] Add bulk flag/unflag operations

2. **Implement Batch Operations** ❌ Not Started
   - [ ] Add multi-select state management
   - [ ] Show bulk actions toolbar when rows selected
   - [ ] Implement bulk delete (with confirmation)
   - [ ] Implement bulk export (as JSON bundle)
   - [ ] Implement bulk tag (add/remove tags)
   - [ ] Implement bulk move (change database routing)
   - [ ] Add progress indicators for bulk operations

3. **Optimize Performance** ❌ Not Started
   - [ ] Add database indexes (from ACTION_ITEMS.md)
   - [ ] Implement query result caching (Redis or in-memory)
   - [ ] Add request debouncing on search (300ms)
   - [ ] Implement virtualized lists for large datasets
   - [ ] Optimize API responses (pagination, field selection)

4. **Add Column Customization** ❌ Not Started
   - [ ] Build column selector dropdown (⚙️ Columns button)
   - [ ] Add show/hide toggle for each column
   - [ ] Implement drag-and-drop column reordering
   - [ ] Implement drag-to-resize column borders
   - [ ] Save preferences per-user (localStorage or DB)
   - [ ] Add "Reset to Default" button

**Estimated Effort:** 2 weeks (1 developer)

---

## API Endpoints to Implement

Based on Centcom specs, here are the new endpoints needed:

### Project APIs

```typescript
// Already exists (needs enhancement)
GET /api/cluster-projects
  Query: ?project_type=test_data&cluster_id=uuid&sync_status=synced
  Response: { projects: [...], stats: {...} }

// New endpoints needed
POST /api/test-data/projects/export
  Body: { projectIds: string[] }
  Response: { export_id: string, status: 'processing' }

GET /api/test-data/projects/export/:id
  Response: { file_url: string, status: 'completed' }

POST /api/test-data/projects/import
  Body: FormData (JSON file)
  Response: { success: boolean, project_id: string }

PATCH /api/test-data/projects/:id
  Body: { name?, tags?, pinned? }
  Response: { success: boolean, project: {...} }

DELETE /api/test-data/projects/:id
  Response: { success: boolean }

POST /api/test-data/projects/bulk-delete
  Body: { projectIds: string[] }
  Response: { success: boolean, deleted_count: number }

POST /api/test-data/projects/bulk-export
  Body: { projectIds: string[] }
  Response: { export_id: string }
```

### Measurement APIs

```typescript
GET /api/test-data/measurements
  Query: ?projectId=uuid&limit=50&offset=0&measurement_type=xy_data
  Response: { measurements: [...], pagination: {...} }

GET /api/test-data/measurements/:id
  Response: { measurement: {...} }

POST /api/test-data/measurements/:id/flag
  Body: { flag_type: 'critical', notes: string }
  Response: { success: boolean }

DELETE /api/test-data/measurements/:id/flag
  Response: { success: boolean }

POST /api/test-data/measurements/bulk-flag
  Body: { measurementIds: string[], flag_type: string }
  Response: { success: boolean, flagged_count: number }

GET /api/test-data/measurements/:id/chart-data
  Response: { data: { x: [...], y: [...] }, config: {...} }
```

### Quality Scoring APIs

```typescript
POST /api/test-data/measurements/:id/calculate-quality
  Response: { quality_score: number, components: {...} }
```

---

## Database Schema Updates

Based on Centcom specs, we need to add these fields:

### Updates to `cluster_projects` table

```sql
ALTER TABLE cluster_projects
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'Manual',
ADD COLUMN IF NOT EXISTS measurement_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS table_names TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS storage_bytes BIGINT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cluster_projects_pinned
  ON cluster_projects(is_pinned DESC, created_at DESC);
```

### Updates to `test_data_measurements` table

```sql
ALTER TABLE test_data_measurements
ADD COLUMN IF NOT EXISTS signal_path VARCHAR(255),
ADD COLUMN IF NOT EXISTS analyzer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS result_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS measurement_index INTEGER,
ADD COLUMN IF NOT EXISTS pass_fail_status VARCHAR(20) DEFAULT 'UNKNOWN',
ADD COLUMN IF NOT EXISTS flags JSONB DEFAULT '[]'::jsonb;

-- Add check constraint
ALTER TABLE test_data_measurements
ADD CONSTRAINT check_pass_fail_status
  CHECK (pass_fail_status IN ('PASS', 'FAIL', 'UNKNOWN'));

ALTER TABLE test_data_measurements
ADD CONSTRAINT check_validation_status
  CHECK (validation_status IN ('validated', 'pending', 'rejected'));
```

### New table: `test_data_flags`

```sql
CREATE TABLE IF NOT EXISTS test_data_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL REFERENCES test_data_measurements(id) ON DELETE CASCADE,
  flag_type VARCHAR(50) NOT NULL CHECK (flag_type IN ('critical', 'review', 'passed', 'baseline', 'custom')),
  flag_color VARCHAR(20) NOT NULL,
  flag_label VARCHAR(100),
  notes TEXT,
  flagged_by UUID REFERENCES auth.users(id),
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_data_flags_measurement ON test_data_flags(measurement_id);
CREATE INDEX idx_test_data_flags_type ON test_data_flags(flag_type);
```

---

## TypeScript Type Definitions

Create `src/types/centcom-test-data.ts`:

```typescript
// Based on Centcom specifications

export interface MeasurementXYData {
  id: string
  measurement_name: string
  measurement_type: 'xy_data'
  signal_path: string
  analyzer_name: string
  result_name: string
  test_date: string
  operator?: string
  equipment?: string
  test_conditions?: TestConditions
  data: XYDataPoints
  analysis_results?: AnalysisResults
  limits?: Limits
  quality_score?: number
  validation_status: 'validated' | 'pending' | 'rejected'
  pass_fail_status: 'PASS' | 'FAIL' | 'UNKNOWN'
  notes?: string
  flags?: Flag[]
  metadata: MeasurementMetadata
}

export interface MeasurementScalar {
  id: string
  measurement_name: string
  measurement_type: 'scalar'
  signal_path: string
  analyzer_name: string
  result_name: string
  test_date: string
  operator?: string
  equipment?: string
  test_conditions?: TestConditions
  data: ScalarValue
  limits?: ScalarLimits
  quality_score?: number
  validation_status: 'validated' | 'pending' | 'rejected'
  pass_fail_status: 'PASS' | 'FAIL' | 'UNKNOWN'
  notes?: string
  metadata: MeasurementMetadata
}

export type Measurement = MeasurementXYData | MeasurementScalar

export interface TestConditions {
  temperature?: number
  temperature_unit?: string
  humidity?: number
  humidity_unit?: string
  voltage?: number
  voltage_unit?: string
  test_location?: string
  acoustic_environment?: string
  mic_distance?: number
  mic_distance_unit?: string
  generator_frequency?: number
  generator_frequency_unit?: string
  generator_level?: number
  generator_level_unit?: string
  analyzer_range?: string
  bandwidth?: number
  bandwidth_unit?: string
  fft_size?: number
  window_type?: string
  averaging?: number
  averaging_type?: string
  [key: string]: any  // Allow additional custom fields
}

export interface XYDataPoints {
  x: number[]
  y: number[]
  x_unit: string
  y_unit: string
  x_scale: 'linear' | 'log'
  y_scale: 'linear' | 'log'
  data_points: number
}

export interface ScalarValue {
  value: number
  units: string
  type?: 'scalar' | 'rms' | 'peak'
  meter_type?: string
}

export interface AnalysisResults {
  bandwidth_3db?: {
    lower_frequency: number
    upper_frequency: number
    bandwidth: number
    unit: string
  }
  flatness?: {
    frequency_range: string
    deviation: number
    unit: string
  }
  peak_frequency?: number
  peak_amplitude?: number
  resonance_frequencies?: number[]
  quality_metrics?: {
    smoothness_score: number
    linearity_score: number
    consistency_score: number
  }
  [key: string]: any  // Allow additional custom metrics
}

export interface Limits {
  frequency_range?: {
    min: number
    max: number
    unit: string
  }
  amplitude_tolerance?: {
    min: number
    max: number
    unit: string
  }
  [key: string]: any
}

export interface ScalarLimits {
  min?: number
  max?: number
  target?: number
  unit: string
}

export interface Flag {
  id: string
  flag_type: 'critical' | 'review' | 'passed' | 'baseline' | 'custom'
  flag_color: string
  flag_label?: string
  notes?: string
  flagged_by?: string
  flagged_at: string
}

export interface MeasurementMetadata {
  project_key: string
  category_id: string
  measurement_index: number
  total_measurements: number
  file_attachments?: FileAttachment[]
  created_by?: string
  created_at: string
  updated_at: string
}

export interface FileAttachment {
  id: string
  file_name: string
  file_path: string
  file_size_bytes: number
  mime_type: string
}

export interface ProjectExport {
  key: string
  name: string
  groups: string[]
  dataTypes: string[]
  categories: MeasurementCategory[]
  testConfigurations: Record<string, string>
  limits: Record<string, any>
  settings: Record<string, any>
  summaryData: {
    overall_result: 'PASS' | 'FAIL' | 'UNKNOWN'
    statistics: Record<string, number>
  }
  details: {
    test_duration_seconds?: number
    data_acquisition_rate?: number
    notes?: string
  }
  tags: string[]
  isPinned: boolean
  createdAt: string
  updatedAt: string
  sourceType: 'APx500' | 'Klippel QC' | 'Manual' | 'Import' | 'Report'
  originalResultsCount: number
}

export interface MeasurementCategory {
  id: string
  signalPath: string
  measurementName: string
  resultName: string
  categoryString: string
  data: XYDataPoints | ScalarValue
  details: Record<string, any>
}

export interface QualityScoreComponents {
  linearity: number
  consistency: number
  noise: number
  limits: number
  overall: number
}
```

---

## Next Steps - Immediate Actions

### This Week (Week 0)

**1. Review & Confirm Understanding** ✅
- [x] Read Centcom response document
- [ ] Clarify any remaining questions with Centcom team
- [ ] Confirm sync model understanding (metadata-only heartbeat)
- [ ] Schedule 2-hour working session with Centcom team

**2. Update Database Schema** 🔴 High Priority
- [ ] Create migration: `supabase/migrations/YYYYMMDD_update_test_data_for_centcom_specs.sql`
- [ ] Add fields to `cluster_projects` (is_pinned, source_type, etc.)
- [ ] Add fields to `test_data_measurements` (signal_path, analyzer_name, etc.)
- [ ] Create `test_data_flags` table
- [ ] Add indexes for performance
- [ ] Test migrations locally

**3. Create Type Definitions** 🔴 High Priority
- [ ] Create `src/types/centcom-test-data.ts` with all Centcom types
- [ ] Update existing code to use new types
- [ ] Fix TypeScript errors

**4. Implement Quality Scoring** 🟡 Medium Priority
- [ ] Create `src/lib/quality-scoring.ts`
- [ ] Implement all 4 scoring functions
- [ ] Add unit tests
- [ ] Create API endpoint: `POST /api/test-data/measurements/:id/calculate-quality`

**5. Start UI Enhancements** 🟢 Low Priority (can parallelize)
- [ ] Install Plotly.js: `npm install plotly.js-dist-min react-plotly.js`
- [ ] Create component stubs for new features
- [ ] Update project list page layout

### Week 1-2: Phase 1 Implementation

Follow the Phase 1 roadmap above.

### Week 3-4: Phase 2 Implementation

Follow the Phase 2 roadmap above.

---

## Questions for Centcom Team

While the response was comprehensive, we have a few follow-up questions:

### Clarifications Needed

1. **Direct Cluster Access (Future):**
   - Is there a plan to allow Lyceum Web to query ClickHouse directly for full measurement data?
   - Would the desktop app expose a secure API endpoint?
   - Or should we focus on import/export for now?

2. **Templates:**
   - Are project templates stored anywhere, or are they just UI presets?
   - Can templates be shared between users?

3. **File Attachments:**
   - Are file attachments synced to Lyceum, or do they stay local?
   - If local, how should the web app handle `file_attachments` in metadata?

4. **User Permissions:**
   - What RLS policies should we implement in Lyceum?
   - Can projects be shared between users?
   - Are there organization-level projects?

5. **Measurement Hierarchy:**
   - The hierarchy structure (Signal Path → Analyzer → Result) is clear from examples
   - Are there any edge cases or special handling needed?

### Optional Enhancements

6. **CSV Import:**
   - Centcom noted this is "planned but not implemented"
   - Should we implement it in Lyceum Web first?
   - What column structure would you prefer?

7. **Auto-Flagger:**
   - Any specs for auto-flagger configuration?
   - How are flagging rules defined?

8. **Real-Time Updates:**
   - Should the web app poll for heartbeat updates?
   - Or is manual refresh acceptable?

---

## Risk Assessment

### Low Risk ✅

- **UI Implementation:** Clear specifications provided
- **Data Types:** Complete examples and schemas
- **Quality Scoring:** Algorithm fully documented
- **Export/Import:** Formats clearly specified

### Medium Risk ⚠️

- **Performance with Large Datasets:** Need to test with 10,000+ measurements
  - Mitigation: Pagination, lazy loading, virtualized lists
- **Chart Rendering:** Plotly.js performance with large data
  - Mitigation: Downsample data for display, full data for export
- **Import Validation:** Complex validation logic
  - Mitigation: Comprehensive unit tests, user-friendly error messages

### High Risk 🔴

- **Direct Cluster Access (Future Feature):** Technical complexity unknown
  - Mitigation: Not in current scope, defer to later phase
- **Scope Creep:** Temptation to add features beyond Centcom specs
  - Mitigation: Strict adherence to provided specifications

---

## Success Metrics

We'll know we've succeeded when:

### Phase 1 (Weeks 1-2)
- ✅ Project list UI matches Centcom desktop app
- ✅ Advanced filters work like Jira
- ✅ Multi-select and bulk operations functional
- ✅ Column customization works (hide/show, resize, reorder)
- ✅ Project detail modal displays all metadata
- ✅ Measurement hierarchy tree view functional

### Phase 2 (Weeks 3-4)
- ✅ Can export projects as JSON matching Centcom format exactly
- ✅ Can import JSON files exported from desktop app
- ✅ Import validation catches all errors
- ✅ Large exports (100 MB) complete without issues

### Phase 3 (Weeks 5-6)
- ✅ Plotly charts render correctly for all measurement types
- ✅ Zoom, pan, reset controls work smoothly
- ✅ Quality scores calculate correctly (matches Centcom algorithm)
- ✅ Can export charts as PNG, PDF, CSV
- ✅ Data Visualizer page shows flagged measurements

### Phase 4 (Weeks 7-8)
- ✅ Flagging system works (add/remove flags)
- ✅ Bulk operations handle 100+ projects without lag
- ✅ Performance is acceptable with 1,000+ projects
- ✅ All features tested and bug-free

### Overall Success
- ✅ **Feature Parity:** Matches desktop app functionality
- ✅ **Data Compatibility:** Import/export works seamlessly
- ✅ **UX Quality:** Users feel at home switching between desktop and web
- ✅ **Performance:** Snappy and responsive even with large datasets
- ✅ **Reliability:** No crashes, graceful error handling

---

## Appendix: Centcom Response Document Structure

For reference, the Centcom response document includes:

1. **Executive Summary** - Confirmation of timeline and deliverables
2. **Critical Specifications:**
   - UI Screenshots & Component Architecture (detailed ASCII mockups)
   - Data Import/Export Specifications (formats and examples)
   - Measurement Data Structure (complete JSON examples)
   - Sync Protocol & Cluster Integration (API endpoints and auth)
3. **High Priority Specifications:**
   - Project Creation Workflow
   - Quality Scoring Algorithm (with code)
   - Project & Measurement Management Features
4. **Medium Priority Specifications:**
   - Data Visualization (Plotly.js specs)
   - Advanced Filtering & Search
   - Templates System
   - File Management
   - Validation & Quality Control
   - User Roles & Permissions
   - Batch Operations
   - Analytics & Reporting
   - Settings & Preferences
   - Edge Cases & Error Handling
   - Performance Considerations
5. **Database Schemas:**
   - ClickHouse table structures
   - PostgreSQL table structures
   - Indexes and constraints
6. **API Endpoint Specifications:**
   - Complete request/response examples
   - Authentication details
   - Error handling

**Total Length:** ~31,500 tokens (~60 pages)
**Location:** `C:/Users/joshual/Documents/Cursor/datacenter/CENTCOM_TEST_DATA_SPECS_RESPONSE.md`

---

## Conclusion

🎉 **We have everything we need to proceed with implementation!**

The Centcom team provided exceptional documentation that addresses all our requirements. The specifications are clear, complete, and implementable.

**Key Takeaway:** Focus on **metadata display and UI/UX parity** first, then add **import/export** for manual data transfer. Direct cluster access is a future enhancement outside current scope.

**Recommended Next Step:** Begin Phase 1 implementation this week, starting with database schema updates and TypeScript type definitions.

---

**Document Status:** ✅ Analysis Complete - Ready for Implementation

**Last Updated:** January 13, 2025

**Next Review:** After Phase 1 completion (Week 2)
