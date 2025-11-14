# Centcom Test Data Application - Web Parity Sync Plan

**Document Version:** 1.0
**Created:** January 13, 2025
**Status:** Ready for Centcom Team Review
**Priority:** High

---

## Executive Summary

This document outlines the plan to achieve feature parity between the Lyceum/Centcom native desktop application's Test Data module and the Lyceum web application. The goal is to provide users with an identical experience whether they're using the desktop app or accessing test data through the web interface.

**Current Status:**
- Database schema: ✅ **100% Complete** (all tables, views, functions implemented)
- Basic UI: ✅ **40% Complete** (project listing, filtering, search implemented)
- Core Features: ⚠️ **20% Complete** (create, import, export, visualization missing)
- API Endpoints: ⚠️ **30% Complete** (basic GET/sync implemented)

**Estimated Effort:** 4-6 weeks (pending Centcom input)

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Desktop App Features Requiring Replication](#desktop-app-features-requiring-replication)
3. [Critical Questions for Centcom Team](#critical-questions-for-centcom-team)
4. [Gap Analysis & Implementation Roadmap](#gap-analysis--implementation-roadmap)
5. [Technical Architecture](#technical-architecture)
6. [API Requirements](#api-requirements)
7. [Data Flow & Integration Points](#data-flow--integration-points)
8. [Success Criteria & Testing](#success-criteria--testing)
9. [Next Steps & Timeline](#next-steps--timeline)

---

## 1. Current State Analysis

### What's Already Implemented ✅

#### Database Layer (100% Complete)
**Location:** `supabase/migrations/`

1. **Core Tables:**
   - `cluster_projects` - Base table for all test data projects
   - `test_data_measurements` - Individual measurement records with metadata
   - `test_data_files` - File attachments and storage tracking
   - `test_data_exports` - Export job tracking and history
   - `test_data_templates` - Reusable project templates

2. **Views:**
   - `test_data_projects_summary` - Optimized view with computed fields (measurement_count, file_count, latest_measurement_date)

3. **Functions:**
   - `get_cluster_project_owner()` - Ownership resolution through cluster hierarchy
   - `get_user_test_data_stats()` - Aggregated statistics for user dashboard
   - `calculate_measurement_quality_score()` - Quality scoring (placeholder)

4. **Security:**
   - Row-Level Security (RLS) policies on all tables
   - User-based access control via cluster ownership
   - Secure data isolation between organizations

#### Frontend Layer (40% Complete)
**Location:** `src/app/test-data/page.tsx`, `src/components/ProjectManagement.tsx`

**Implemented:**
- Project listing page with table view
- Stats dashboard (Total Projects, Measurements, Local/Cloud Clusters)
- Search functionality (by project name, cluster name, description)
- Filter by cluster type (local/cloud) and sync status
- Sync status indicators (synced, pending, error)
- Empty state with CTA
- Navigation integration in main menu

**UI Placeholders (Non-functional):**
- "New Project" button
- "Import Data" button
- "Advanced Filters" button
- Project detail view (eye icon)
- Analytics view (chart icon)
- Manual sync button (partially functional)

#### API Layer (30% Complete)
**Location:** `src/app/api/cluster-projects/route.ts`

**Implemented:**
- `GET /api/cluster-projects` - Fetch projects with filtering
- `POST /api/cluster-projects` (action: sync) - Trigger sync
- `GET /api/clusters/{id}/projects` - Cluster-specific projects
- `POST /api/clusters/{id}/projects` - Create project in cluster

**Missing (High Priority):**
- Measurement CRUD endpoints
- File upload/download endpoints
- Export/import endpoints
- Template management endpoints
- Analytics/reporting endpoints
- Bulk operations endpoints

### What's Missing ⚠️

#### Critical Features
1. **Project Creation** - No UI or complete workflow
2. **Data Import** - No import wizard or parsers
3. **Data Export** - No export UI or format handling
4. **Measurement Detail View** - Cannot view individual measurements
5. **File Management** - No upload, download, or preview
6. **Data Visualization** - No charts or graphs
7. **Quality Control** - No validation workflows
8. **Templates** - No template selection or usage
9. **Batch Operations** - No multi-select or bulk actions
10. **Real-time Sync** - Manual sync only

---

## 2. Desktop App Features Requiring Replication

### Core User Workflows (Need Centcom Input)

#### A. Project Management Workflow
**Status:** Need Screenshots/Demo

Expected flow:
1. User clicks "New Project"
2. → Select template or start blank
3. → Configure project settings (name, description, type, tags)
4. → Select cluster (local or cloud)
5. → Optional: Import initial data
6. → Project created, redirects to project detail view

**Questions for Centcom:**
- What templates are available? (we have Manufacturing Analytics, Quality Control, Predictive Maintenance, Production Optimization, Custom)
- What configuration options exist per template?
- Can users customize template fields?
- Are there project-level permissions/sharing?

#### B. Data Import Workflow
**Status:** ⚠️ Complete Unknown

**Questions for Centcom:**
- What file formats are supported? (CSV, Excel, JSON, XML, custom?)
- Is there a column mapping UI?
- How are measurement types auto-detected?
- Are there import templates/presets?
- How is validation handled during import?
- Can users import in bulk (multiple files)?
- What's the maximum file size supported?
- Is there a drag-and-drop interface?

#### C. Measurement Detail View
**Status:** ⚠️ Complete Unknown

**Questions for Centcom:**
- What information is displayed for a single measurement?
- Are there visualization tools (waveforms, frequency response charts)?
- Can users edit measurement metadata?
- Is there a comparison mode (compare 2+ measurements)?
- What actions are available (edit, delete, export, duplicate)?
- Are there quality indicators visible?

#### D. Data Visualization & Analytics
**Status:** ⚠️ Complete Unknown

**Questions for Centcom:**
- What chart types are used? (line, bar, scatter, heatmap, etc.)
- Can users create custom dashboards?
- What metrics are calculated automatically?
- Is there trend analysis?
- Can users export visualizations?
- Are there real-time updates?

#### E. Export Workflow
**Status:** ⚠️ Complete Unknown

**Questions for Centcom:**
- What export formats are supported? (CSV, Excel, JSON, PDF report?)
- Can users select specific measurements/columns?
- Is there a report builder UI?
- Are exports saved for later download?
- How are large exports handled?
- Can exports be scheduled/automated?

#### F. Quality Control & Validation
**Status:** Partially Known (quality_score field exists)

**Questions for Centcom:**
- How is quality score calculated? (0-100 scale exists in DB)
- What validation rules exist?
- Can users flag/reject measurements?
- Is there a review/approval workflow?
- Are there automated quality checks?
- How are validation errors displayed?

#### G. Sync Mechanism
**Status:** Partially Known (sync_status field exists)

**Questions for Centcom:**
- How does sync work between desktop app and clusters?
- Is sync bidirectional or unidirectional?
- How are conflicts handled?
- What triggers automatic sync?
- Can users manually resolve sync errors?
- Is there a sync history/log?

#### H. File Management
**Status:** Database Ready

**Questions for Centcom:**
- What file types are supported?
- Maximum file size limits?
- Is there a file viewer/preview?
- Can users annotate files?
- How are files organized (folders, tags)?
- Is there version control for files?

#### I. Search & Filtering
**Status:** Basic Search Implemented

**Questions for Centcom:**
- What advanced filters exist? (date range, tags, quality score, measurement type, etc.)
- Is there saved searches/filters?
- Full-text search capabilities?
- Can users search within measurement data?

#### J. Templates System
**Status:** Database Ready

**Questions for Centcom:**
- What predefined templates exist?
- Can users create custom templates?
- Can templates be shared between users?
- What's included in a template (fields, validation, defaults)?

---

## 3. Critical Questions for Centcom Team

### Immediate Priority (Blocking Development) 🔴

1. **UI/UX Screenshots or Demo Access**
   - Can you provide screenshots of all major screens in the test data module?
   - Or better: Can you provide a demo video walkthrough?
   - Or best: Can we schedule a screen-share session to review the app together?

2. **Data Import Format Specifications**
   - What is the exact CSV/Excel structure expected for imports?
   - Can you share sample import files?
   - What columns are required vs optional?

3. **Measurement Data Structure**
   - What does a typical measurement object look like?
   - What fields are in `test_conditions`, `analysis_results` JSONB fields?
   - Can you provide example JSON for different measurement types?

4. **Sync Protocol Details**
   - How does the desktop app communicate with clusters for sync?
   - What API endpoints does the desktop app call?
   - What's the sync algorithm (last-write-wins, conflict resolution, etc.)?

### High Priority (Needed for Phase 1) 🟡

5. **Project Creation Wizard**
   - What are all the steps in creating a new project?
   - What validation rules apply?
   - Can you share the project configuration schema?

6. **Export Specifications**
   - What's the structure of exported CSV/Excel files?
   - Can you share sample export files?
   - What metadata is included in exports?

7. **Visualization Requirements**
   - What charting library do you use? (Chart.js, D3.js, custom?)
   - Can you share chart configurations?
   - What measurement types have specific visualizations?

8. **Quality Scoring Algorithm**
   - How is the 0-100 quality score calculated?
   - What factors influence the score?
   - Can you share the formula or code?

### Medium Priority (Needed for Phase 2) 🟢

9. **Template Definitions**
   - Can you export/share the template definitions?
   - What's the template JSON structure?
   - How are templates applied to new projects?

10. **Advanced Filtering Logic**
    - What filter combinations are supported?
    - Are there filter presets?
    - Can filters be saved?

11. **Batch Operations**
    - What bulk actions are available?
    - How are multi-select operations handled?
    - Are there confirmation dialogs?

12. **Collaboration Features**
    - Can projects be shared between users?
    - Are there comments/annotations?
    - Is there an activity log?

### Documentation Requests 📄

13. **API Documentation**
    - Do you have OpenAPI/Swagger docs for cluster APIs?
    - What authentication is used for cluster communication?
    - Rate limits or throttling considerations?

14. **User Guide**
    - Is there user documentation for the test data module?
    - Training materials or guides?

15. **Business Logic Documentation**
    - Any written specifications for workflows?
    - Validation rules documentation?

---

## 4. Gap Analysis & Implementation Roadmap

### Phase 1: Core Functionality (Weeks 1-2)
**Goal:** Enable basic create, view, and sync operations

| Feature | Status | Effort | Blockers |
|---------|--------|--------|----------|
| Project creation UI & API | ❌ | 3 days | Need template specs from Centcom |
| Project detail view | ❌ | 2 days | Need UI mockup |
| Measurement list view | ❌ | 2 days | Need data structure |
| Manual sync implementation | 🟡 | 2 days | Need sync protocol |
| Basic file upload | ❌ | 2 days | None |
| View measurement details | ❌ | 2 days | Need UI mockup |

**Dependencies:**
- Centcom provides template definitions
- Centcom provides UI screenshots/mockups
- Centcom provides measurement data structure examples

**Deliverables:**
- ✅ Users can create new projects
- ✅ Users can view project details
- ✅ Users can view measurements in a project
- ✅ Users can trigger manual sync
- ✅ Users can upload files to projects

### Phase 2: Import/Export (Weeks 3-4)
**Goal:** Enable data import and export workflows

| Feature | Status | Effort | Blockers |
|---------|--------|--------|----------|
| Import wizard UI | ❌ | 3 days | Need import specs |
| CSV/Excel parser | ❌ | 3 days | Need format specs |
| Column mapping UI | ❌ | 2 days | Need import specs |
| Import validation | ❌ | 2 days | Need validation rules |
| Export UI | ❌ | 2 days | Need export specs |
| Export format generation | ❌ | 3 days | Need format specs |
| Export job tracking | ❌ | 1 day | None |

**Dependencies:**
- Centcom provides import file format specifications
- Centcom provides sample import/export files
- Centcom provides validation rules

**Deliverables:**
- ✅ Users can import CSV/Excel files
- ✅ Users can map columns during import
- ✅ Users can export data in multiple formats
- ✅ Users can track export job status

### Phase 3: Visualization & Analytics (Weeks 5-6)
**Goal:** Enable data visualization and quality control

| Feature | Status | Effort | Blockers |
|---------|--------|--------|----------|
| Measurement visualization | ❌ | 4 days | Need chart specs |
| Quality score display | ❌ | 2 days | Need algorithm |
| Quality scoring implementation | ❌ | 3 days | Need algorithm |
| Analytics dashboard | ❌ | 3 days | Need metrics specs |
| Trend analysis | ❌ | 2 days | Need metrics specs |
| Comparison tools | ❌ | 3 days | Need UI mockup |

**Dependencies:**
- Centcom provides chart specifications
- Centcom provides quality scoring algorithm
- Centcom provides analytics requirements

**Deliverables:**
- ✅ Users can visualize measurement data
- ✅ Users see quality scores
- ✅ Users can analyze trends
- ✅ Users can compare measurements

### Phase 4: Advanced Features (Weeks 7-8)
**Goal:** Complete feature parity with desktop app

| Feature | Status | Effort | Blockers |
|---------|--------|--------|----------|
| Template management UI | ❌ | 3 days | Need template specs |
| Advanced filtering | ❌ | 2 days | Need filter specs |
| Batch operations | ❌ | 3 days | None |
| Real-time sync | ❌ | 4 days | Need sync protocol |
| File preview/viewer | ❌ | 3 days | None |
| Search optimization | ❌ | 2 days | None |

**Dependencies:**
- Centcom provides template system details
- Centcom provides real-time sync requirements

**Deliverables:**
- ✅ Users can use templates
- ✅ Users can perform advanced filtering
- ✅ Users can perform batch operations
- ✅ Data syncs in real-time
- ✅ Users can preview files

---

## 5. Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Lyceum Web Application                    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Frontend (Next.js + React)                   │ │
│  │                                                          │ │
│  │  • Test Data Page (/test-data)                          │ │
│  │  • Project Management Component                         │ │
│  │  • Measurement Viewer                                   │ │
│  │  • Import/Export Wizards                                │ │
│  │  • Visualization Components                             │ │
│  └─────────────┬────────────────────────────────────────────┘ │
│                │                                               │
│                │ API Calls (fetch)                            │
│                │                                               │
│  ┌─────────────▼────────────────────────────────────────────┐ │
│  │           API Routes (Next.js)                          │ │
│  │                                                          │ │
│  │  • /api/cluster-projects                                │ │
│  │  • /api/test-data/measurements                          │ │
│  │  • /api/test-data/files                                 │ │
│  │  • /api/test-data/export                                │ │
│  │  • /api/test-data/import                                │ │
│  │  • /api/test-data/sync                                  │ │
│  └─────────────┬────────────────────────────────────────────┘ │
│                │                                               │
└────────────────┼───────────────────────────────────────────────┘
                 │
                 │ Supabase Client
                 │
┌────────────────▼───────────────────────────────────────────────┐
│                    Supabase Backend                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                         │ │
│  │                                                           │ │
│  │  • cluster_projects                                      │ │
│  │  • test_data_measurements                                │ │
│  │  • test_data_files                                       │ │
│  │  • test_data_exports                                     │ │
│  │  • test_data_templates                                   │ │
│  │  • Views, Functions, RLS Policies                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Storage (Files)                             │ │
│  │                                                           │ │
│  │  • test-data-files bucket                                │ │
│  │  • Versioning enabled                                    │ │
│  │  • RLS policies applied                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                 │
                 │ Sync Protocol (TBD)
                 │
┌────────────────▼───────────────────────────────────────────────┐
│                 Local/Cloud Clusters                           │
│                                                                 │
│  • Centcom Cluster Service                                     │
│  • Project Data Storage                                        │
│  • Measurement Processing                                      │
│  • File Storage                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Create Project

```
User Action → Frontend Component → API Route → Supabase → Cluster Sync
     │              │                  │           │            │
     ├─ Click      ├─ validate        ├─ auth    ├─ INSERT   ├─ notify
     │  "New       │  form data       │  check   │  record    │  cluster
     │  Project"   │                  │          │            │
     │             ├─ POST            ├─ RLS     ├─ RETURN   ├─ update
     │             │  /api/           │  check   │  new       │  sync
     │             │  cluster-        │          │  project   │  status
     │             │  projects        │          │            │
     │             │                  │          │            │
     └─ Show ◄────┴──────────────────┴──────────┴────────────┴─ Done
        success
        message
```

### Data Flow: Import Measurements

```
User Upload → File Parser → Validation → Batch Insert → Update Metadata
     │             │            │             │              │
     ├─ Select    ├─ detect    ├─ check     ├─ INSERT      ├─ UPDATE
     │  CSV/      │  format    │  required   │  test_data_  │  cluster_
     │  Excel     │            │  fields     │  measurements│  projects
     │  file      ├─ map       │             │  (batch)     │  .metadata
     │            │  columns   ├─ validate   │              │
     │            │            │  data types │              ├─ trigger
     │            ├─ parse     │             ├─ calculate   │  sync
     │            │  rows      ├─ quality    │  quality     │
     │            │            │  check      │  score       │
     └─ Show ◄───┴────────────┴─────────────┴──────────────┴─ Done
        import
        summary
```

### Data Flow: Sync with Cluster

```
Trigger Sync → API Route → Update Status → Cluster API → Process → Update DB
     │              │             │              │            │         │
     ├─ Manual     ├─ auth       ├─ SET         ├─ GET      ├─ fetch  ├─ UPDATE
     │  or         │  check      │  sync_status │  /cluster  │  latest  │  records
     │  automatic  │             │  'pending'   │  /projects │  data    │
     │             ├─ POST       │              │  /data     │         ├─ SET
     │             │  /api/      │              │            ├─ compare│  sync_
     │             │  cluster-   │              ├─ auth     │  hashes  │  status
     │             │  projects   │              │  with     │         │  'synced'
     │             │  ?action=   │              │  cluster  ├─ merge  │
     │             │  sync       │              │  token    │  changes │
     └─ Show ◄────┴─────────────┴──────────────┴───────────┴─────────┴─ Done
        sync
        result
```

---

## 6. API Requirements

### Existing Endpoints ✅

#### GET /api/cluster-projects
**Status:** Implemented
**Purpose:** Fetch test data projects with filtering and stats

**Request:**
```typescript
GET /api/cluster-projects?project_type=test_data&cluster_id=xyz&sync_status=synced
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Q1 Production Tests",
      "cluster_name": "Local Cluster 1",
      "cluster_type": "local",
      "measurement_count": 150,
      "file_count": 23,
      "sync_status": "synced",
      "last_synced_at": "2025-01-13T10:00:00Z"
    }
  ],
  "stats": {
    "total_projects": 45,
    "total_measurements": 2340,
    "total_files": 567,
    "by_cluster_type": { "local": 20, "cloud": 25 },
    "by_sync_status": { "synced": 40, "pending": 3, "error": 2 }
  }
}
```

#### POST /api/cluster-projects (action: sync)
**Status:** Partially Implemented
**Purpose:** Trigger sync for project(s)

**Request:**
```typescript
POST /api/cluster-projects
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "action": "sync",
  "projectId": "uuid",  // optional, if omitted syncs all
  "clusterId": "uuid"   // optional, if omitted syncs all clusters
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sync initiated for 3 projects",
  "jobs": [
    { "projectId": "uuid1", "status": "pending" },
    { "projectId": "uuid2", "status": "pending" },
    { "projectId": "uuid3", "status": "pending" }
  ]
}
```

### Required New Endpoints ❌

#### POST /api/cluster-projects (action: create)
**Purpose:** Create new test data project

**Request:**
```typescript
POST /api/cluster-projects
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "action": "create",
  "clusterId": "uuid",
  "name": "New Test Project",
  "description": "Project description",
  "project_type": "test_data",
  "template_id": "uuid",  // optional
  "configuration": {
    "measurement_types": ["frequency_response", "thd"],
    "tags": ["production", "q1-2025"],
    "default_quality_threshold": 90
  }
}
```

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "uuid",
    "name": "New Test Project",
    "cluster_id": "uuid",
    "created_at": "2025-01-13T10:00:00Z"
  }
}
```

#### GET /api/test-data/measurements
**Purpose:** Fetch measurements for a project

**Request:**
```typescript
GET /api/test-data/measurements?projectId=uuid&limit=50&offset=0&measurement_type=frequency_response
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "measurements": [
    {
      "id": "uuid",
      "measurement_name": "Test #001",
      "measurement_type": "frequency_response",
      "test_date": "2025-01-10T14:30:00Z",
      "quality_score": 95.5,
      "validation_status": "validated",
      "data_size_bytes": 1048576,
      "operator": "John Doe",
      "tags": ["production", "speaker-unit-A"]
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### GET /api/test-data/measurements/:id
**Purpose:** Get single measurement with full details

**Request:**
```typescript
GET /api/test-data/measurements/uuid
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": "uuid",
  "measurement_name": "Test #001",
  "measurement_type": "frequency_response",
  "test_date": "2025-01-10T14:30:00Z",
  "operator": "John Doe",
  "equipment": "Audio Precision APx555",
  "test_conditions": {
    "temperature": 23.5,
    "humidity": 45,
    "voltage": 230
  },
  "data_format": "json",
  "inline_data": {
    "frequencies": [20, 50, 100, 200, ...],
    "amplitude": [-3.2, -1.5, 0, 0.5, ...]
  },
  "analysis_results": {
    "peak_frequency": 1000,
    "bandwidth": 500,
    "total_harmonic_distortion": 0.05
  },
  "quality_score": 95.5,
  "validation_status": "validated",
  "tags": ["production", "speaker-unit-A"],
  "category": "quality-control",
  "files": [
    {
      "id": "uuid",
      "file_name": "waveform.wav",
      "file_size_bytes": 5242880,
      "download_url": "https://..."
    }
  ]
}
```

#### POST /api/test-data/import
**Purpose:** Import measurements from file

**Request:**
```typescript
POST /api/test-data/import
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "projectId": "uuid",
  "file": <binary>,
  "format": "csv",  // csv, excel, json
  "columnMapping": {
    "measurement_name": "Test Name",
    "measurement_type": "Type",
    "test_date": "Date",
    ...
  },
  "options": {
    "skipValidation": false,
    "autoCalculateQuality": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "import_id": "uuid",
  "status": "processing",
  "preview": {
    "total_rows": 1000,
    "valid_rows": 980,
    "errors": [
      { "row": 15, "error": "Invalid date format" },
      { "row": 43, "error": "Missing required field: measurement_type" }
    ]
  },
  "estimated_time_seconds": 30
}
```

#### GET /api/test-data/import/:id
**Purpose:** Check import job status

**Request:**
```typescript
GET /api/test-data/import/uuid
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "import_id": "uuid",
  "status": "completed",  // processing, completed, failed
  "progress": 100,
  "results": {
    "total_rows": 1000,
    "imported": 980,
    "skipped": 20,
    "errors": []
  },
  "created_at": "2025-01-13T10:00:00Z",
  "completed_at": "2025-01-13T10:02:15Z"
}
```

#### POST /api/test-data/export
**Purpose:** Create export job

**Request:**
```typescript
POST /api/test-data/export
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "projectIds": ["uuid1", "uuid2"],
  "measurementIds": ["uuid3", "uuid4"],  // optional, export specific measurements
  "format": "excel",  // csv, excel, json, pdf
  "options": {
    "includeFiles": true,
    "includeAnalysis": true,
    "dateRange": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-31T23:59:59Z"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "export_id": "uuid",
  "status": "processing",
  "estimated_time_seconds": 45
}
```

#### GET /api/test-data/export/:id
**Purpose:** Get export job status and download link

**Request:**
```typescript
GET /api/test-data/export/uuid
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "export_id": "uuid",
  "status": "completed",
  "file_url": "https://storage.../export_20250113.xlsx",
  "file_size_bytes": 5242880,
  "record_count": 1000,
  "expires_at": "2025-01-20T10:00:00Z",
  "created_at": "2025-01-13T10:00:00Z",
  "completed_at": "2025-01-13T10:01:30Z"
}
```

#### POST /api/test-data/files/upload
**Purpose:** Upload file attachment to project

**Request:**
```typescript
POST /api/test-data/files/upload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "projectId": "uuid",
  "measurementId": "uuid",  // optional, link to specific measurement
  "file": <binary>
}
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "uuid",
    "file_name": "data.csv",
    "file_size_bytes": 1048576,
    "download_url": "https://...",
    "uploaded_at": "2025-01-13T10:00:00Z"
  }
}
```

#### GET /api/test-data/templates
**Purpose:** Get available project templates

**Request:**
```typescript
GET /api/test-data/templates?category=manufacturing
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Manufacturing Analytics",
      "description": "Template for production line testing",
      "template_type": "manufacturing",
      "configuration": {
        "measurement_types": ["frequency_response", "distortion"],
        "default_tags": ["production"],
        "quality_threshold": 90
      },
      "is_system_template": true,
      "usage_count": 234
    }
  ]
}
```

#### GET /api/test-data/stats
**Purpose:** Get detailed statistics for analytics dashboard

**Request:**
```typescript
GET /api/test-data/stats?projectId=uuid&dateRange=30d
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "overview": {
    "total_measurements": 1500,
    "avg_quality_score": 92.3,
    "validation_rate": 95.5,
    "total_storage_bytes": 1073741824
  },
  "by_type": {
    "frequency_response": 800,
    "distortion": 400,
    "thd": 300
  },
  "quality_trend": [
    { "date": "2025-01-01", "avg_score": 91.2 },
    { "date": "2025-01-02", "avg_score": 92.5 },
    ...
  ],
  "top_operators": [
    { "name": "John Doe", "count": 450, "avg_quality": 94.2 },
    { "name": "Jane Smith", "count": 380, "avg_quality": 93.1 }
  ]
}
```

---

## 7. Data Flow & Integration Points

### User Authentication & Authorization

```
User Login → JWT Token → Supabase Auth → RLS Policies → Data Access
     │            │            │               │              │
     ├─ Email    ├─ stored    ├─ validates   ├─ checks     ├─ allows
     │  +        │  in        │  token       │  user owns   │  access
     │  Password │  localStorage│              │  cluster     │  to
     │           │            │               │              │  data
     │           ├─ sent in   ├─ user_id     ├─ get_       │
     │           │  Auth      │  extracted   │  cluster_    │
     │           │  header    │              │  project_    │
     │           │            │               │  owner()     │
```

**Key Points:**
- All API requests require `Authorization: Bearer <jwt_token>` header
- JWT token contains `user_id`, `role`, `org_id`
- RLS policies use `get_cluster_project_owner()` to verify ownership
- Cluster ownership determines project/measurement access

### Cluster Integration

```
Lyceum Web App ←→ Unified Clusters ←→ Local/Cloud Cluster Services
       │                  │                      │
       ├─ creates        ├─ stores              ├─ hosts
       │  cluster        │  metadata            │  actual data
       │  record         │  (name, type,        │  (measurements,
       │                 │  endpoints)          │  files)
       │                 │                      │
       ├─ reads          ├─ tracks              ├─ provides
       │  projects       │  sync status         │  sync API
       │  from           │                      │
       │  cluster        │                      │
       │                 │                      │
       ├─ triggers       ├─ queues              ├─ processes
       │  sync           │  sync jobs           │  sync requests
```

**Questions for Centcom:**
- What API endpoints do clusters expose for sync?
- What authentication method is used (JWT, API key, mTLS)?
- Are clusters publicly accessible or behind VPN/firewall?
- What's the cluster API versioning strategy?
- How are cluster connection issues handled?

### File Storage Integration

```
User Upload → API Route → Supabase Storage → Database Record
     │             │              │                │
     ├─ selects   ├─ validates   ├─ uploads      ├─ INSERT
     │  file      │  size/type   │  to bucket     │  test_data_
     │            │              │  'test-data-   │  files
     │            ├─ generates   │  files'        │  with URL
     │            │  unique      │                │
     │            │  path        ├─ returns       ├─ links to
     │            │              │  public URL    │  measurement
     │            │              │                │  or project
     │            │              ├─ calculates    │
     │            │              │  SHA256        │
```

**Storage Structure:**
```
test-data-files/
├── {user_id}/
│   ├── {project_id}/
│   │   ├── measurements/
│   │   │   ├── {measurement_id}/
│   │   │   │   ├── data.json
│   │   │   │   ├── waveform.wav
│   │   │   │   └── analysis.pdf
│   │   └── files/
│   │       ├── report_2025-01.pdf
│   │       └── calibration_data.csv
```

**Security:**
- RLS policies on storage bucket
- Signed URLs for temporary access
- File size limits (need to determine from Centcom)
- Virus scanning (optional, depends on requirements)

---

## 8. Success Criteria & Testing

### Definition of Done

A feature is considered complete when:

1. ✅ **Functionality**: Feature works as designed on desktop app
2. ✅ **UI/UX Parity**: Visual design matches desktop app
3. ✅ **API Complete**: All required endpoints implemented
4. ✅ **Database Tested**: Migrations applied, queries optimized
5. ✅ **Security**: RLS policies tested, no unauthorized access
6. ✅ **Performance**: Page loads < 2s, API responses < 500ms
7. ✅ **Mobile Responsive**: Works on tablet/mobile browsers
8. ✅ **Error Handling**: Graceful errors, user-friendly messages
9. ✅ **Documentation**: API docs and user guide updated
10. ✅ **Tested**: Unit tests, integration tests, E2E tests passing

### Testing Strategy

#### Unit Tests
- Test individual components in isolation
- Test API route handlers
- Test database functions
- Test utility functions
- Target: 80% code coverage

#### Integration Tests
- Test complete user workflows
- Test API endpoints with real database
- Test file upload/download
- Test sync process
- Target: All critical paths covered

#### E2E Tests
- Test in real browser (Playwright or Cypress)
- Test all user journeys from login to completion
- Test error scenarios
- Test on multiple browsers (Chrome, Firefox, Safari)
- Target: All major workflows covered

#### Performance Tests
- Load test with 1000+ concurrent users
- Test with large datasets (10,000+ measurements)
- Test large file uploads (100MB+)
- Measure API response times
- Target: < 2s page load, < 500ms API response

#### Security Tests
- Test RLS policies (attempt unauthorized access)
- Test SQL injection prevention
- Test XSS prevention
- Test CSRF protection
- Penetration testing
- Target: No critical vulnerabilities

### Test Data Requirements

**Need from Centcom:**
- Sample projects (5-10 projects with varying sizes)
- Sample measurements (1000+ measurements of different types)
- Sample import files (CSV, Excel formats)
- Sample export files (expected output)
- Sample visualization configurations
- Edge cases and error scenarios

---

## 9. Next Steps & Timeline

### Immediate Actions (This Week)

1. **Schedule Centcom Sync Meeting** 📅
   - **Goal:** Review this document together
   - **Attendees:** Lyceum team + Centcom developers/PMs
   - **Duration:** 2 hours
   - **Agenda:**
     - Walkthrough of current implementation (30 min)
     - Demo of desktop app test data module (30 min)
     - Q&A on critical questions (45 min)
     - Alignment on roadmap and timeline (15 min)

2. **Receive Centcom Inputs** 📥
   - UI screenshots or video walkthrough
   - Data structure examples and sample files
   - API documentation or code samples
   - Template definitions
   - Quality scoring algorithm

3. **Finalize Technical Specifications** 📝
   - Update API specifications with Centcom input
   - Define exact data structures
   - Create detailed UI mockups if needed
   - Document business logic and validation rules

### Development Phase (Weeks 1-8)

**Week 1-2: Core Functionality**
- Implement project creation
- Build project detail view
- Add measurement listing
- Complete sync implementation
- Basic file upload

**Week 3-4: Import/Export**
- Build import wizard
- Implement CSV/Excel parsers
- Add column mapping UI
- Build export functionality
- Implement export job tracking

**Week 5-6: Visualization & Analytics**
- Add measurement visualization
- Implement quality scoring
- Build analytics dashboard
- Add trend analysis
- Create comparison tools

**Week 7-8: Advanced Features**
- Template management UI
- Advanced filtering
- Batch operations
- Real-time sync
- File preview/viewer

### Testing & QA Phase (Weeks 9-10)

- Write unit tests
- Write integration tests
- Write E2E tests
- Performance testing
- Security testing
- Bug fixes

### Launch Preparation (Week 11-12)

- User acceptance testing (UAT)
- Documentation
- Training materials
- Staged rollout plan
- Monitor and hotfix

### Timeline Summary

```
Week 1-2:  Core Functionality          [████████░░░░░░░░░░░░░░]  Phase 1
Week 3-4:  Import/Export               [░░░░░░░░████████░░░░░░]  Phase 2
Week 5-6:  Visualization & Analytics   [░░░░░░░░░░░░░░░░████████]  Phase 3
Week 7-8:  Advanced Features           [████████░░░░░░░░░░░░░░]  Phase 4
Week 9-10: Testing & QA                [░░░░░░░░████████░░░░░░]  QA
Week 11-12: Launch Preparation         [░░░░░░░░░░░░░░░░████████]  Launch

Total Estimated Time: 12 weeks (3 months)
```

**Assumptions:**
- Centcom provides all required inputs within Week 1
- 2 full-time developers working on this
- No major blockers or scope changes
- Parallel work on independent features

---

## 10. Open Questions & Risks

### Open Questions

1. **User Permissions:** Can users share projects with other users? Are there project-level permissions?
2. **Data Retention:** How long is historical data kept? Are there archiving policies?
3. **Rate Limiting:** Are there API rate limits we need to consider?
4. **Offline Mode:** Does the desktop app work offline? Should the web app have any offline capabilities?
5. **Notifications:** Should users receive notifications for sync completion, errors, or quality issues?
6. **Audit Logging:** Do we need to track all user actions for compliance?
7. **Multi-tenancy:** How are organizations isolated? Can users belong to multiple orgs?
8. **Billing:** Are there storage limits based on subscription tier?

### Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Delayed Centcom input | High | Medium | Early meeting, clear communication, document unknowns |
| Scope creep | High | High | Strict scope definition, change request process |
| Complex sync logic | High | Medium | Early POC, iterative development, thorough testing |
| Performance issues with large datasets | Medium | Medium | Pagination, lazy loading, database indexing, caching |
| Security vulnerabilities | High | Low | Security reviews, penetration testing, RLS policies |
| Browser compatibility | Low | Low | Cross-browser testing, progressive enhancement |
| API breaking changes | Medium | Low | API versioning, backward compatibility |
| Resource constraints | Medium | Medium | Prioritize MVP features, phased rollout |

---

## 11. Appendix

### Glossary

- **Cluster:** A data processing environment (local or cloud) that hosts test data
- **Project:** A collection of related measurements and files
- **Measurement:** A single test data record with metadata and results
- **Sync:** Process of keeping Lyceum data in sync with cluster data
- **Quality Score:** 0-100 rating of measurement data quality
- **Template:** Pre-configured project structure with defaults
- **RLS:** Row-Level Security (PostgreSQL security policies)
- **JWT:** JSON Web Token (authentication token)

### Reference Documents

- [TEST_DATA_APP_REQUIREMENTS.md](./docs/centcom-integration/TEST_DATA_APP_REQUIREMENTS.md)
- [CENTCOM_AUTO_UPDATE_INTEGRATION.md](./CENTCOM_AUTO_UPDATE_INTEGRATION.md)
- [Database Schema Migrations](./supabase/migrations/)
- [Test Data Page](./src/app/test-data/page.tsx)
- [Project Management Component](./src/components/ProjectManagement.tsx)

### Contact Information

**Lyceum Team:**
- Project Lead: [Name]
- Backend Developer: [Name]
- Frontend Developer: [Name]
- DevOps: [Name]

**Centcom Team:**
- [To be filled in]

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-13 | Claude Code | Initial document creation |

---

## Document Status

- 🟢 **Ready for Review** - This document is complete and ready for Centcom team review
- 🔴 **Blocking Issues** - Need Centcom input on all "Critical Questions" section
- 🟡 **Next Action** - Schedule sync meeting with Centcom team

---

**End of Document**

*For questions or clarifications, please contact the Lyceum development team.*
