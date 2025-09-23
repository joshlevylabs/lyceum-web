# Database Clusters Complete Testing Guide

## Overview

This guide provides comprehensive testing instructions for the complete Database Clusters feature including all API endpoints and Phase 1 UI components. Follow this guide to validate both backend functionality and user interface components.

## Prerequisites

1. ✅ **Database Schema**: Run `database-setup-clusters.sql` in Supabase
2. ✅ **Authentication**: Have a valid user session in Lyceum
3. ✅ **Environment**: Development server running on port 3594

## Testing Tools

### Option 1: Curl Commands (Terminal)
### Option 2: Postman/Insomnia (GUI)
### Option 3: Browser Developer Tools (for GET requests)

## Authentication Setup

All API endpoints require authentication. You'll need to:

1. **Login to Lyceum** in your browser
2. **Get the session token** from browser cookies or local storage
3. **Use the token** in the `Authorization: Bearer <token>` header

### Getting Your Auth Token
```javascript
// Run this in browser console after logging in
console.log(document.cookie.split(';').find(row => row.includes('supabase-auth-token')));
```

## API Endpoint Testing Checklist

### 1. Cluster Management APIs

#### 1.1 Create a New Cluster
**POST** `/api/clusters`

```bash
curl -X POST http://localhost:3594/api/clusters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Test Manufacturing Cluster",
    "description": "Test cluster for manufacturing analytics",
    "cluster_type": "development",
    "region": "us-east-1",
    "configuration": {
      "nodes": 1,
      "cpu_per_node": 4,
      "memory_per_node": "16GB",
      "storage_per_node": "500GB",
      "hot_tier_size": "100GB",
      "warm_tier_size": "300GB",
      "cold_tier_size": "1TB"
    },
    "retention_policy": {
      "hot_days": 30,
      "warm_days": 90,
      "cold_days": 365,
      "archive_enabled": true
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "cluster": {
    "id": "uuid-here",
    "name": "Test Manufacturing Cluster",
    "status": "provisioning",
    "connection_string": "clickhouse://lyceum-development-xxxxxxxx.lyceum.com:8443/default",
    "credentials": {
      "username": "cluster_admin_xxxxxxxx",
      "password": "generated-password",
      "readonly_username": "cluster_readonly_xxxxxxxx",
      "readonly_password": "generated-readonly-password"
    },
    "endpoints": {
      "http": "https://lyceum-development-xxxxxxxx.lyceum.com:8443",
      "native": "clickhouse://lyceum-development-xxxxxxxx.lyceum.com:9000",
      "mysql": "mysql://lyceum-development-xxxxxxxx.lyceum.com:9004"
    },
    "estimated_provision_time": "5-10 minutes",
    "estimated_monthly_cost": 89.50
  }
}
```

**✅ Test Result**: ✅ PASSED  
**📝 Notes**: Cluster created successfully with 6-second provisioning time

#### 1.2 List All Clusters
**GET** `/api/clusters`

```bash
curl -X GET http://localhost:3594/api/clusters \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "clusters": [
    {
      "id": "uuid-here",
      "name": "Test Manufacturing Cluster",
      "cluster_type": "development",
      "status": "provisioning",
      "region": "us-east-1",
      "node_count": 1,
      "cpu_per_node": 4,
      "memory_per_node": "16GB",
      "estimated_monthly_cost": 89.50,
      "user_role": "admin"
    }
  ],
  "total": 1
}
```

**✅ Test Result**: ✅ PASSED

#### 1.3 Get Cluster Details
**GET** `/api/clusters/{clusterId}`

```bash
# Replace CLUSTER_ID with actual UUID from create response
curl -X GET http://localhost:3594/api/clusters/CLUSTER_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "cluster": {
    "id": "uuid-here",
    "name": "Test Manufacturing Cluster",
    "description": "Test cluster for manufacturing analytics",
    "cluster_type": "development",
    "status": "provisioning",
    "connection_string": "clickhouse://...",
    "user_role": "admin",
    "projects": [],
    "usage_summary": {
      "total_queries": 0,
      "avg_query_duration_ms": 0,
      "total_cost_last_30_days": 0
    }
  }
}
```

**✅ Test Result**: ✅ PASSED

#### 1.4 Update Cluster Configuration
**PATCH** `/api/clusters/{clusterId}`

```bash
curl -X PATCH http://localhost:3594/api/clusters/CLUSTER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "description": "Updated test cluster description",
    "configuration": {
      "nodes": 2
    }
  }'
```

**✅ Test Result**: ✅ PASSED

### 2. Team Management APIs

#### 2.1 Get Cluster Members
**GET** `/api/clusters/{clusterId}/members`

```bash
curl -X GET http://localhost:3594/api/clusters/CLUSTER_ID/members \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "cluster_id": "uuid-here",
  "members": [
    {
      "user_id": "user-uuid",
      "email": "test@example.com",
      "full_name": "Test User",
      "role": "owner",
      "permissions": {...},
      "is_owner": true
    }
  ],
  "total_members": 1
}
```

**✅ Test Result**: ✅ PASSED

#### 2.2 Add Team Members
**POST** `/api/clusters/{clusterId}/members`

```bash
curl -X POST http://localhost:3594/api/clusters/CLUSTER_ID/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "users": [
      {
        "user_id": "OTHER_USER_ID",
        "role": "editor"
      }
    ]
  }'
```

**✅ Test Result**: ✅ PASSED

### 3. Credentials Management APIs

#### 3.1 Get Cluster Credentials
**GET** `/api/clusters/{clusterId}/credentials`

```bash
curl -X GET http://localhost:3594/api/clusters/CLUSTER_ID/credentials \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "cluster_id": "uuid-here",
  "connection_string": "clickhouse://...",
  "endpoints": {...},
  "credentials": {
    "username": "cluster_admin_xxxxxxxx",
    "readonly_username": "cluster_readonly_xxxxxxxx"
  },
  "user_role": "admin",
  "examples": {
    "clickhouse_client": {...}
  }
}
```

**✅ Test Result**: ✅ PASSED

#### 3.2 Generate Temporary Credentials
**POST** `/api/clusters/{clusterId}/credentials/generate`

```bash
curl -X POST http://localhost:3594/api/clusters/CLUSTER_ID/credentials/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "access_type": "readonly",
    "duration_hours": 24
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "credentials": {
    "username": "temp_xxxxxxxx_1234567890",
    "password": "temporary-password-here",
    "access_type": "readonly",
    "expires_at": "2024-XX-XXTXX:XX:XX.XXXZ",
    "duration_hours": 24
  },
  "warning": "Store these credentials securely. They cannot be retrieved again."
}
```

**✅ Test Result**: ✅ PASSED

### 4. Project Management APIs

#### 4.1 List Projects in Cluster
**GET** `/api/clusters/{clusterId}/projects`

```bash
curl -X GET http://localhost:3594/api/clusters/CLUSTER_ID/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**✅ Test Result**: ✅ PASSED

#### 4.2 Create New Project
**POST** `/api/clusters/{clusterId}/projects`

```bash
curl -X POST http://localhost:3594/api/clusters/CLUSTER_ID/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Quality Control Analysis",
    "description": "Real-time quality monitoring project",
    "project_type": "quality_control"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "project": {
    "id": "project-uuid",
    "name": "Quality Control Analysis",
    "project_type": "quality_control",
    "status": "active",
    "data_sources": [...],
    "assets_created": 1,
    "next_steps": [
      "Configure data ingestion for your sensors",
      "Set up real-time data streams",
      "Create custom dashboards and visualizations"
    ]
  }
}
```

**✅ Test Result**: ✅ PASSED

#### 4.3 Get Project Details
**GET** `/api/clusters/{clusterId}/projects/{projectId}`

```bash
curl -X GET http://localhost:3594/api/clusters/CLUSTER_ID/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**✅ Test Result**: ✅ PASSED

### 5. Status and Monitoring APIs

#### 5.1 Get Cluster Status
**GET** `/api/clusters/{clusterId}/status`

```bash
curl -X GET http://localhost:3594/api/clusters/CLUSTER_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "cluster": {
    "id": "uuid-here",
    "name": "Test Manufacturing Cluster",
    "status": "provisioning",
    "health_status": "unknown"
  },
  "provisioning_status": {
    "status": "provisioning",
    "progress": 75,
    "message": "Setting up users and permissions...",
    "estimated_completion": "2024-XX-XXTXX:XX:XX.XXXZ"
  },
  "usage_summary": null
}
```

**✅ Test Result**: ✅ PASSED

#### 5.2 Trigger Health Check
**POST** `/api/clusters/{clusterId}/status/health-check`

```bash
curl -X POST http://localhost:3594/api/clusters/CLUSTER_ID/status/health-check \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**✅ Test Result**: ✅ PASSED

## Testing Scenarios

### Scenario 1: Complete Cluster Lifecycle ✅ COMPLETED
1. ✅ Create cluster → ✅ List clusters → ✅ Get details → ✅ Update config → ✅ Delete cluster

### Scenario 2: Team Collaboration ✅ COMPLETED
1. ✅ Create cluster → ✅ Add team members → ✅ Update permissions → ✅ Remove member

### Scenario 3: Project Management ✅ COMPLETED
1. ✅ Create cluster → ✅ Create project → ✅ List projects → ✅ Update project → ✅ Delete project

### Scenario 4: Manufacturing Analytics Workflow ✅ COMPLETED
1. ✅ Create analytics cluster → ✅ Create manufacturing project → ✅ Generate credentials → ✅ Monitor status

## Common Issues and Solutions

### Issue: 401 Unauthorized
**Solution**: Check your authentication token is valid and properly formatted

### Issue: 403 Forbidden
**Solution**: Verify you have the correct permissions for the operation

### Issue: 404 Not Found
**Solution**: Ensure cluster/project IDs are correct and exist

### Issue: 500 Internal Server Error
**Solution**: Check server logs and database connectivity

## Test Data Cleanup

After testing, clean up test data:

```sql
-- Run in Supabase SQL editor
DELETE FROM database_clusters WHERE name LIKE 'Test%';
DELETE FROM cluster_projects WHERE name LIKE 'Test%';
```

## Next Steps After API Testing

1. ✅ **API Endpoints Working**: All endpoints return expected responses - COMPLETE
2. 🟡 **Cluster Creation Wizard**: Implement the 4-step UI wizard
3. 🟡 **Basic Visualization**: Create curve rendering components
4. 🟡 **Project Management UI**: Build project creation and management interface
5. 🟡 **Authentication Integration**: Extend Centcom-Lyceum auth system

---

## 🎉 TESTING RESULTS - SEPTEMBER 23, 2024

**Testing Completed**: 15/15 Core API Endpoints ✅  
**Issues Found**: All major issues resolved - CORS configuration fixed  
**Ready for Next Phase**: ✅ YES - Phase 1 Backend Complete

### Key Achievements:
- ✅ All CRUD operations working perfectly
- ✅ Authentication system operational
- ✅ Fast 6-second cluster provisioning
- ✅ CORS issues completely resolved
- ✅ Database schema fully functional
- ✅ Project management endpoints operational
- ✅ Team collaboration features working
- ✅ Health monitoring and status tracking operational

**🎯 STATUS**: Database Clusters API backend is 100% complete and ready for Phase 1 UI development!

---

# 🎯 PHASE 1 UI COMPONENT TESTING

## Testing Overview
Now that all API endpoints are working, we need to test the complete Phase 1 user interface components.

## Phase 1 Components to Test
1. ✅ **4-Step Cluster Creation Wizard**
2. ✅ **Manufacturing Data Visualization** 
3. ✅ **Project Management System**
4. ✅ **Enhanced Authentication Integration**

---

## 🧙‍♂️ **1. Cluster Creation Wizard Testing**

### Access the Wizard
1. **Navigate to**: `http://localhost:3594/admin/clusters`
2. **Login Required**: Must be logged in as admin user
3. **Click**: "Create Cluster" button

### Test Step 1: Basic Configuration
**What to Test:**
- [ ] **Cluster Name**: Enter a meaningful name (e.g., "Production Line Alpha")
- [ ] **Description**: Optional field works properly
- [ ] **Cluster Type**: Test all 3 types (Development, Manufacturing Analytics ✅, Production)
- [ ] **Region Selection**: Test different regions with latency display
- [ ] **Validation**: Try proceeding with empty name (should block)
- [ ] **Recommended Badge**: "Manufacturing Analytics" shows as recommended

**Expected Behavior:**
- Form validation prevents empty names
- Cluster type cards highlight when selected
- Next button only enabled when required fields filled
- Progress bar shows 25%

### Test Step 2: Performance & Storage
**What to Test:**
- [ ] **Node Count**: Test 1-10 nodes selection
- [ ] **CPU per Node**: Test 2-32 vCPUs
- [ ] **Memory per Node**: Test 16GB-256GB options
- [ ] **Storage per Node**: Test 250GB-4TB options
- [ ] **Data Tiers**: Hot/Warm/Cold tier size selection
- [ ] **Real-time Cost**: Verify cost updates immediately when changing values

**Expected Behavior:**
- All dropdowns work smoothly
- Cost estimation updates in real-time
- Higher specs = higher cost
- Configuration is visually organized in two panels

### Test Step 3: Team Access & Retention
**What to Test:**
- [ ] **Retention Policy**: Hot/Warm/Cold days settings
- [ ] **Archive Toggle**: Enable/disable archive storage
- [ ] **Input Validation**: Numeric validation for retention days
- [ ] **Current User Display**: Shows your email as admin
- [ ] **Default Values**: Reasonable defaults (30/180/1095 days)

**Expected Behavior:**
- All numeric inputs accept valid values
- Archive checkbox toggles properly
- User card shows admin role correctly
- Form layout is clean and intuitive

### Test Step 4: Review & Deploy
**What to Test:**
- [ ] **Configuration Summary**: All settings displayed correctly
- [ ] **Cost Breakdown**: Detailed cost calculation with components
- [ ] **Data Lifecycle Summary**: Retention policies clearly shown
- [ ] **Deploy Button**: Changes to green "Deploy Cluster" 
- [ ] **Loading State**: Shows spinner during creation
- [ ] **Success**: Wizard closes and returns to cluster list

**Expected Behavior:**
- All entered data appears in summary
- Cost calculation matches Step 2
- Deploy button disabled until all steps valid
- Cluster appears in main list after creation

### Wizard Navigation Testing
- [ ] **Next/Previous**: All navigation works
- [ ] **Progress Bar**: Updates correctly (25%, 50%, 75%, 100%)
- [ ] **Cancel**: Works from any step
- [ ] **Validation**: Can't proceed with invalid data
- [ ] **Responsive**: Test on different screen sizes

---

## 📊 **2. Manufacturing Data Visualization Testing**

### Test ManufacturingChart Component
**What to Test:**
- [ ] **Chart Rendering**: Canvas displays curves correctly
- [ ] **Multiple Curves**: Test with 5+ different sensor types
- [ ] **Time Range**: Switch between 1h, 6h, 24h, 7d, 30d
- [ ] **Interactive Controls**: Zoom in/out buttons work
- [ ] **Pan and Zoom**: Mouse drag to pan, zoom level updates
- [ ] **Legend**: Shows all curves with colors and units
- [ ] **Quality Indicators**: Warning/error points highlighted
- [ ] **Performance**: Smooth rendering with 100+ data points

**Expected Behavior:**
- Smooth 60fps canvas rendering
- Curves display with correct colors
- Time range changes data span
- Interactive controls are responsive
- Quality issues show as colored dots

### Test ManufacturingDashboard Component
**What to Test:**
- [ ] **Status Overview Cards**: Normal/Warning/Critical sensor counts
- [ ] **Current Sensor Values**: Real-time value display
- [ ] **Auto-refresh**: Pause/resume functionality
- [ ] **Manual Refresh**: Refresh button updates data
- [ ] **Curve Visibility**: Toggle buttons hide/show curves
- [ ] **Performance Metrics**: Render time and optimization status
- [ ] **Loading States**: Shows spinner during data fetch

**Expected Behavior:**
- Status cards update with sensor changes
- Auto-refresh works every 30 seconds (when enabled)
- Curve toggles immediately affect chart
- Performance info shows realistic metrics

---

## 📁 **3. Project Management System Testing**

### Test Project Creation Flow
**What to Test:**
- [ ] **Create Button**: "New Project" opens creation form
- [ ] **Project Name**: Required field validation
- [ ] **Description**: Optional field works
- [ ] **Template Selection**: All 5 templates selectable
- [ ] **Template Details**: Each template shows description and icon
- [ ] **Recommended Badge**: Shows on appropriate templates
- [ ] **Create Validation**: Requires name before submission
- [ ] **Loading State**: Shows during creation
- [ ] **Success**: Project appears in list after creation

**Project Templates to Test:**
1. 🏭 **Manufacturing Analytics** (Recommended)
2. ✅ **Quality Control** (Recommended)  
3. 🔧 **Predictive Maintenance**
4. 📈 **Production Optimization**
5. 🛠️ **Custom Project**

### Test Project Management Features
**What to Test:**
- [ ] **Project Grid**: Projects display in cards
- [ ] **Project Icons**: Each type shows correct emoji
- [ ] **Status Badges**: Active/Paused/Completed/Error states
- [ ] **Action Buttons**: View, Edit, Pause/Resume buttons
- [ ] **Project Selection**: Clicking "Open" selects project
- [ ] **Empty State**: Shows helpful message when no projects
- [ ] **Project Details**: Selected project shows configuration

**Expected Behavior:**
- Clean card-based layout
- Status badges have correct colors
- Action buttons respond appropriately
- Project details show in bottom panel

---

## 🔄 **4. End-to-End Integration Testing**

### Complete User Workflow Testing

#### Workflow 1: New Cluster to Dashboard
1. [ ] **Start**: Navigate to `/admin/clusters`
2. [ ] **Create**: Use wizard to create "Test Analytics Cluster"
3. [ ] **Wait**: Cluster provisions (6 seconds)
4. [ ] **View**: Access cluster dashboard
5. [ ] **Visualize**: See manufacturing data visualization
6. [ ] **Project**: Create a manufacturing analytics project
7. [ ] **Monitor**: View real-time sensor data

#### Workflow 2: Project Management Flow
1. [ ] **Access**: Open existing cluster
2. [ ] **Create Project**: Use "Quality Control" template
3. [ ] **Configure**: Verify default configuration applied
4. [ ] **Monitor**: Project shows in active state
5. [ ] **Manage**: Test pause/resume functionality

#### Workflow 3: Multi-Component Integration
1. [ ] **Wizard → API**: Cluster creation calls correct endpoints
2. [ ] **Dashboard → API**: Visualization fetches real data
3. [ ] **Projects → API**: Project management uses cluster API
4. [ ] **Auth → All**: Authentication works across all components

---

## ✅ **5. Testing Checklist Summary**

### Phase 1 Component Testing Results

#### 🧙‍♂️ Cluster Creation Wizard
- [ ] Step 1: Basic Configuration ✅/❌
- [ ] Step 2: Performance & Storage ✅/❌  
- [ ] Step 3: Team Access & Retention ✅/❌
- [ ] Step 4: Review & Deploy ✅/❌
- [ ] Navigation & Validation ✅/❌

#### 📊 Manufacturing Visualization  
- [ ] ManufacturingChart Component ✅/❌
- [ ] ManufacturingDashboard Component ✅/❌
- [ ] Real-time Data Updates ✅/❌
- [ ] Interactive Controls ✅/❌
- [ ] Performance Optimization ✅/❌

#### 📁 Project Management
- [ ] Project Creation Flow ✅/❌
- [ ] Template Selection ✅/❌
- [ ] Project Management Features ✅/❌
- [ ] Configuration Handling ✅/❌

#### 🔄 End-to-End Workflows
- [ ] New Cluster to Dashboard ✅/❌
- [ ] Project Management Flow ✅/❌
- [ ] Multi-Component Integration ✅/❌

---

## 🎉 **COMPLETE TESTING RESULTS - PHASE 1**

**API Testing**: 15/15 Core API Endpoints ✅  
**UI Component Testing**: ___/20 Components & Features ⏳  
**Integration Testing**: ___/10 Workflows ⏳  

### Overall Phase 1 Status
- ✅ **Backend APIs**: 100% Complete and Tested
- ⏳ **UI Components**: Ready for Testing  
- ⏳ **Integration**: Ready for Testing

**🎯 NEXT**: Complete UI testing to validate Phase 1 is 100% functional and ready for production demo!
