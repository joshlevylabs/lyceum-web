# Lyceum Ticket Display Implementation Guide

## Overview

This document outlines how to implement comprehensive ticket viewing in the Lyceum web portal, including all ticket metadata, comments, timeline events, and activity tracking.

## Current State Analysis

### Data Available in Database

The ticket system stores rich metadata in the following tables:

**`support_tickets` table contains:**
- Basic info: `title`, `description`, `ticket_key`, `ticket_number`
- User data: `user_id`, `username`, `email`
- Classification: `ticket_type`, `priority`, `severity`, `application_section`, `plugin_name`
- Status tracking: `status`, `resolution`, `assigned_to_admin_id`, `assigned_at`
- Timestamps: `created_at`, `updated_at`, `resolved_at`, `closed_at`
- Bug report details: `steps_to_reproduce`, `expected_behavior`, `actual_behavior`, `reproduction_rate`
- System info: `centcom_version`, `environment_info` (JSONB)
- Organization: `tags` (array), `internal_notes`
- Effort tracking: `estimated_effort_hours`, `actual_effort_hours`
- User feedback: `user_satisfaction_rating`, `user_satisfaction_feedback`

**`ticket_comments` table contains:**
- Comment data: `content`, `author_name`, `author_type`, `is_internal`
- Authorship: `author_id`, `edited_by`, `edit_reason`
- Timestamps: `created_at`, `updated_at`

**`ticket_status_history` table contains:**
- Change tracking: `from_status`, `to_status`, `changed_by`, `reason`
- Timestamp: `changed_at`

**`ticket_attachments` table contains:**
- File info: `filename`, `file_size`, `mime_type`, `file_url`
- Upload data: `uploaded_by`, `uploaded_at`

### What Lyceum Currently Shows vs. Available Data

**Current Lyceum Display (Limited):**
- Type
- Status  
- Description
- Priority
- Submitter

**Additional Data Available (Not Displayed):**
- Bug Details: Steps to reproduce, expected/actual behavior, reproduction rate
- System Information: Centcom version, environment details, application section, plugin
- Effort Tracking: Estimated/actual hours, assignments
- User Feedback: Satisfaction rating and feedback
- Timeline: Creation, updates, resolution, comments, status changes
- Organization: Tags, internal notes
- File Attachments: Screenshots, logs, videos

## Implementation Recommendations

### 1. Enhanced Ticket Detail View

Create a comprehensive ticket detail component that displays all available information:

```typescript
interface EnhancedTicketView {
  // Basic Information
  basicInfo: {
    ticketKey: string;
    title: string;
    description: string;
    type: 'bug' | 'feature_request' | 'improvement' | 'support' | 'other';
    status: string;
    priority: string;
    severity?: string;
  };
  
  // Bug Report Details (for bug type tickets)
  bugDetails?: {
    stepsToReproduce: string;
    expectedBehavior: string;
    actualBehavior: string;
    reproductionRate: 'always' | 'sometimes' | 'rarely' | 'once';
  };
  
  // System Information
  systemInfo: {
    centcomVersion: string;
    applicationSection: string;
    pluginName?: string;
    environmentInfo: Record<string, any>;
  };
  
  // People & Assignment
  assignment: {
    submitter: string;
    submitterEmail: string;
    assignedAdmin?: string;
    assignedAt?: string;
  };
  
  // Timeline & Activity
  timeline: TimelineEvent[];
  comments: Comment[];
  attachments: Attachment[];
  
  // Organization & Internal
  organization: {
    tags: string[];
    internalNotes?: string;
  };
  
  // Effort & Feedback
  tracking: {
    estimatedHours?: number;
    actualHours?: number;
    userSatisfactionRating?: number;
    userSatisfactionFeedback?: string;
  };
}
```

### 2. Timeline Implementation

Create a unified timeline that combines all ticket events:

```typescript
interface TimelineEvent {
  id: string;
  type: 'created' | 'comment' | 'status_change' | 'assignment' | 'resolution' | 'attachment' | 'update';
  timestamp: string;
  author: string;
  authorType: 'user' | 'admin' | 'system';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

// Example timeline generation query
const generateTimeline = async (ticketId: string) => {
  const events: TimelineEvent[] = [];
  
  // Add ticket creation
  events.push({
    type: 'created',
    timestamp: ticket.created_at,
    title: 'Ticket Created',
    author: ticket.username
  });
  
  // Add comments
  const comments = await getTicketComments(ticketId);
  comments.forEach(comment => {
    events.push({
      type: 'comment',
      timestamp: comment.created_at,
      title: 'Comment Added',
      description: comment.content,
      author: comment.author_name,
      authorType: comment.author_type
    });
  });
  
  // Add status changes
  const statusHistory = await getStatusHistory(ticketId);
  statusHistory.forEach(change => {
    events.push({
      type: 'status_change',
      timestamp: change.changed_at,
      title: `Status changed from ${change.from_status} to ${change.to_status}`,
      author: change.changed_by,
      metadata: { reason: change.reason }
    });
  });
  
  // Add attachments
  const attachments = await getTicketAttachments(ticketId);
  attachments.forEach(attachment => {
    events.push({
      type: 'attachment',
      timestamp: attachment.uploaded_at,
      title: `File uploaded: ${attachment.filename}`,
      author: attachment.uploaded_by
    });
  });
  
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
```

### 3. API Endpoints to Implement

Add these endpoints to your Lyceum backend:

```typescript
// Get enhanced ticket details
GET /api/admin/tickets/{id}/details
// Returns: Complete ticket information with all metadata

// Get ticket timeline
GET /api/admin/tickets/{id}/timeline  
// Returns: Chronological list of all ticket events

// Get ticket statistics
GET /api/admin/tickets/{id}/stats
// Returns: Effort tracking, satisfaction, activity metrics

// Get ticket attachments
GET /api/admin/tickets/{id}/attachments
// Returns: List of uploaded files with download URLs

// Update ticket fields
PATCH /api/admin/tickets/{id}
// Allows: Status, priority, assignment, tags, internal notes changes
```

### 4. Database Queries for Complete Data

```sql
-- Get complete ticket with all details
SELECT 
  t.*,
  assigned_admin.username as assigned_admin_name,
  (SELECT COUNT(*) FROM ticket_comments WHERE ticket_id = t.id) as comment_count,
  (SELECT COUNT(*) FROM ticket_attachments WHERE ticket_id = t.id) as attachment_count
FROM support_tickets t
LEFT JOIN user_profiles assigned_admin ON t.assigned_to_admin_id = assigned_admin.id
WHERE t.id = $1;

-- Get ticket timeline events
SELECT 
  'comment' as event_type,
  created_at as timestamp,
  author_name as author,
  author_type,
  content as description,
  NULL as metadata
FROM ticket_comments 
WHERE ticket_id = $1

UNION ALL

SELECT 
  'status_change' as event_type,
  changed_at as timestamp,
  changed_by as author,
  'admin' as author_type,
  CONCAT('Status changed from ', from_status, ' to ', to_status) as description,
  json_build_object('reason', reason) as metadata
FROM ticket_status_history 
WHERE ticket_id = $1

UNION ALL

SELECT 
  'attachment' as event_type,
  uploaded_at as timestamp,
  uploaded_by as author,
  'user' as author_type,
  CONCAT('Uploaded file: ', filename) as description,
  json_build_object('filename', filename, 'size', file_size) as metadata
FROM ticket_attachments 
WHERE ticket_id = $1

ORDER BY timestamp DESC;
```

### 5. UI Components to Create

**Ticket Detail Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Ticket Key, Title, Status Badge                    │
├─────────────────────────────────────────────────────────────┤
│ Main Content (2/3 width)    │ Sidebar (1/3 width)         │
│                              │                              │
│ • Description                │ • Basic Info                 │
│ • Bug Details (if bug)       │ • System Information        │
│ • Comments Section           │ • Assignment                 │
│ • Attachments               │ • Timeline                   │
│                              │ • Tags & Internal Notes      │
│                              │ • Effort Tracking           │
│                              │ • User Feedback             │
└─────────────────────────────────────────────────────────────┘
```

**Environment Information Display:**
```typescript
const EnvironmentInfoCard = ({ environmentInfo }: { environmentInfo: any }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <h4 className="font-medium mb-2">Environment Details</h4>
    <dl className="grid grid-cols-2 gap-2 text-sm">
      <dt>OS:</dt>
      <dd>{environmentInfo.os || 'Unknown'}</dd>
      <dt>Browser:</dt>
      <dd>{environmentInfo.browser || 'Unknown'}</dd>
      <dt>Screen Resolution:</dt>
      <dd>{environmentInfo.screenResolution || 'Unknown'}</dd>
      <dt>User Agent:</dt>
      <dd className="col-span-2 text-xs break-all">{environmentInfo.userAgent || 'Unknown'}</dd>
    </dl>
  </div>
);
```

### 6. Admin Panel Enhancements

**Ticket Management Actions:**
- Update status with reason
- Assign/reassign tickets
- Add internal notes
- Set effort estimates
- Bulk tag management
- Export ticket data

**Analytics Dashboard:**
- Ticket volume by type/priority
- Average resolution time
- User satisfaction metrics
- Most reported bugs/features
- Admin workload distribution

### 7. Search and Filtering

Enhanced search capabilities:
- Full-text search across title, description, comments
- Filter by: type, status, priority, assigned admin, tags, date range
- Sort by: creation date, last activity, priority, effort

### 8. Mobile Responsiveness

Ensure the enhanced ticket view works well on mobile devices:
- Collapsible sidebar on mobile
- Touch-friendly timeline interface
- Responsive attachment gallery
- Mobile-optimized comment interface

## Implementation Priority

1. **Phase 1 (Critical):**
   - Enhanced ticket detail API endpoint
   - Complete ticket information display
   - Timeline integration

2. **Phase 2 (Important):**
   - Comment management interface
   - File attachment viewing
   - Status change tracking

3. **Phase 3 (Nice to Have):**
   - Analytics dashboard
   - Advanced search/filtering
   - Mobile optimization

## Technical Considerations

- **Performance:** Implement pagination for comments and timeline events
- **Security:** Ensure proper admin authentication for sensitive data
- **Caching:** Cache ticket data to reduce database load
- **Real-time:** Consider WebSocket updates for live ticket changes
- **Backup:** Regular database backups for ticket data integrity

## Testing Strategy

- Unit tests for API endpoints
- Integration tests for timeline generation
- UI tests for ticket detail components
- Performance tests with large datasets
- Accessibility testing for admin interface

---

This implementation will transform the Lyceum ticket viewing experience from a basic summary to a comprehensive support management interface, matching the rich data already being collected from Centcom submissions.
