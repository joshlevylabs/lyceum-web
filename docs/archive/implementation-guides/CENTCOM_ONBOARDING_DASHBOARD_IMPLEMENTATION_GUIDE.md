# CentCom Onboarding Dashboard Implementation Guide

## 🎯 **Overview**

This document provides the CentCom development team with comprehensive guidance to implement onboarding session dashboard functionality in the CentCom platform. Users should be able to view, schedule, reschedule, and manage their onboarding sessions directly from the CentCom dashboard, mirroring the functionality available in the Lyceum platform.

## 📋 **Current Situation**

- **Problem**: Onboarding sessions are not visible in the CentCom platform dashboard
- **Goal**: Implement complete onboarding session management in CentCom
- **Reference**: Lyceum platform dashboard functionality serves as the implementation model

## ✨ **Required Features**

### **Core Functionality**
1. **View Onboarding Sessions**: Display all user onboarding sessions with status, scheduling, and details
2. **Session Details**: View comprehensive information about each session including objectives, materials, and notes
3. **Schedule Sessions**: Allow users to schedule unscheduled onboarding sessions
4. **Reschedule Sessions**: Enable users to change the date/time of existing scheduled sessions
5. **Real-time Status**: Show current session status (pending, scheduled, in_progress, completed, cancelled)
6. **Progress Tracking**: Display overall onboarding progress and completion rates

### **User Experience Features**
- Responsive design matching CentCom's UI/UX patterns
- Modal dialogs for session details and scheduling
- Intuitive date/time pickers for scheduling
- Visual status indicators and progress bars
- Integration with CentCom's notification system

## 🗄️ **Database Schema Understanding**

### **Onboarding Sessions Table Structure**
```sql
-- Main onboarding sessions table
CREATE TABLE onboarding_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  license_key_id UUID,
  plugin_id TEXT DEFAULT 'centcom',
  
  -- Session details
  session_type TEXT DEFAULT 'standard', -- 'initial', 'standard', 'plugin_specific', 'followup'
  session_number INTEGER DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  assigned_admin_id UUID,
  
  -- Status tracking
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'
  completion_status TEXT, -- 'passed', 'failed', 'needs_followup'
  
  -- Session outcomes
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  user_feedback TEXT,
  
  -- Tracking
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Key Data Fields**
- `status`: Current session state
- `scheduled_at`: When the session is scheduled to occur
- `duration_minutes`: Length of the session
- `session_type`: Type of onboarding session
- `plugin_id`: Which plugin/module the session covers
- `title` & `description`: Session information
- `notes`: Admin notes about the session
- `user_feedback`: User's feedback after completion

## 🔌 **API Integration**

### **Required API Endpoints**

#### **1. Get User Onboarding Sessions**
```http
GET /api/user/onboarding/sessions
Authorization: Bearer {session_token}
```

**Response:**
```json
{
  "success": true,
  "sessions": {
    "upcoming": [
      {
        "id": "session-uuid",
        "title": "CentCom Initial Setup",
        "description": "Introduction to CentCom platform features",
        "session_type": "initial",
        "session_number": 1,
        "plugin_id": "centcom",
        "duration_minutes": 60,
        "scheduled_at": "2025-09-25T10:00:00Z",
        "status": "scheduled",
        "is_mandatory": true,
        "assigned_admin": {
          "id": "admin-uuid",
          "full_name": "Admin Name",
          "email": "admin@company.com"
        },
        "license_keys": {
          "key_code": "CENTCOM-PRO-123",
          "license_type": "professional"
        }
      }
    ],
    "completed": [
      {
        "id": "session-uuid-2",
        "title": "Advanced Analytics",
        "status": "completed",
        "completed_at": "2025-09-20T11:30:00Z",
        "completion_status": "passed",
        "notes": "User successfully completed all objectives",
        "user_feedback": "Very helpful session!"
      }
    ],
    "cancelled": [],
    "all": []
  },
  "progress": {
    "total_sessions": 3,
    "completed_count": 1,
    "completion_rate": 33.33
  }
}
```

#### **2. Update Session Schedule**
```http
PUT /api/user/onboarding/sessions
Authorization: Bearer {session_token}
Content-Type: application/json
```

**Request:**
```json
{
  "session_id": "session-uuid",
  "scheduled_at": "2025-09-26T14:00:00Z",
  "duration_minutes": 60
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session-uuid",
    "scheduled_at": "2025-09-26T14:00:00Z",
    "status": "scheduled",
    "updated_at": "2025-09-18T15:30:00Z"
  }
}
```

#### **3. Get Session Details**
```http
GET /api/user/onboarding/sessions/{session_id}
Authorization: Bearer {session_token}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session-uuid",
    "title": "CentCom Initial Setup",
    "description": "Comprehensive introduction to CentCom platform features and capabilities",
    "session_type": "initial",
    "session_number": 1,
    "plugin_id": "centcom",
    "duration_minutes": 60,
    "scheduled_at": "2025-09-25T10:00:00Z",
    "status": "scheduled",
    "is_mandatory": true,
    "session_objectives": [
      "Learn CentCom interface navigation",
      "Set up first project",
      "Understand licensing system",
      "Configure basic settings"
    ],
    "session_materials": [
      "CentCom User Guide",
      "Video Tutorial: Getting Started",
      "Sample Project Templates"
    ],
    "meeting_link": "https://meet.company.com/centcom-onboarding-123",
    "assigned_admin": {
      "id": "admin-uuid",
      "full_name": "John Smith",
      "email": "john.smith@company.com"
    },
    "license_keys": {
      "key_code": "CENTCOM-PRO-123",
      "license_type": "professional",
      "expires_at": "2025-12-31T23:59:59Z"
    },
    "notes": null,
    "user_feedback": null,
    "created_at": "2025-09-18T09:00:00Z",
    "updated_at": "2025-09-18T15:30:00Z"
  }
}
```

## 🎨 **UI/UX Implementation Specifications**

### **Dashboard Section Layout**

#### **1. Onboarding Sessions Card**
```typescript
interface OnboardingDashboardSection {
  title: "Onboarding Sessions"
  sections: {
    upcomingSessions: OnboardingSession[]
    completedSessions: OnboardingSession[]
    progressIndicator: {
      completed: number
      total: number
      percentage: number
    }
  }
  actions: {
    viewAllSessions: () => void
    scheduleSession: (session: OnboardingSession) => void
    viewSessionDetails: (session: OnboardingSession) => void
  }
}
```

#### **2. Session List Item Component**
```typescript
interface SessionListItem {
  session: OnboardingSession
  showScheduleButton: boolean
  showDetailsButton: boolean
  statusIndicator: StatusBadge
  timeDisplay: string
  durationDisplay: string
  mandatoryIndicator?: boolean
}
```

### **Modal Components**

#### **1. Session Details Modal**
**Features:**
- Complete session information display
- Admin contact information
- Meeting link (if available)
- Session objectives and materials
- Status and progress indicators
- Action buttons (Schedule/Reschedule, Join Meeting)

#### **2. Schedule/Reschedule Modal**
**Features:**
- Date/time picker component
- Duration selector (15-180 minutes)
- Timezone display
- Conflict detection
- Confirmation messaging

### **Visual Design Guidelines**

#### **Status Indicators**
```css
.session-status {
  &.pending { background-color: #fbbf24; color: #92400e; }
  &.scheduled { background-color: #3b82f6; color: #1e40af; }
  &.in-progress { background-color: #10b981; color: #047857; }
  &.completed { background-color: #059669; color: #064e3b; }
  &.cancelled { background-color: #ef4444; color: #991b1b; }
  &.no-show { background-color: #f97316; color: #9a3412; }
}
```

#### **Progress Indicators**
- Circular progress for overall completion
- Linear progress for individual sessions
- Color-coded completion rates

## 💻 **Implementation Code Examples**

### **1. React/TypeScript Session Dashboard Component**

```typescript
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Video, CheckCircle } from 'lucide-react';

interface OnboardingSession {
  id: string;
  title: string;
  description?: string;
  session_type: string;
  session_number: number;
  plugin_id: string;
  duration_minutes: number;
  scheduled_at?: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  is_mandatory?: boolean;
  meeting_link?: string;
  assigned_admin?: {
    id: string;
    full_name: string;
    email: string;
  };
  license_keys?: {
    key_code: string;
    license_type: string;
  };
}

interface OnboardingData {
  sessions: {
    upcoming: OnboardingSession[];
    completed: OnboardingSession[];
    cancelled: OnboardingSession[];
    all: OnboardingSession[];
  };
  progress: {
    total_sessions: number;
    completed_count: number;
    completion_rate: number;
  };
}

export const OnboardingDashboard: React.FC = () => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at: '',
    duration_minutes: 60
  });

  // Fetch onboarding sessions from API
  const fetchOnboardingSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/onboarding/sessions', {
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOnboardingData(data);
      } else {
        console.error('Failed to fetch onboarding sessions');
      }
    } catch (error) {
      console.error('Error fetching onboarding sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Schedule or reschedule session
  const handleScheduleSession = async () => {
    if (!selectedSession) return;

    try {
      const response = await fetch('/api/user/onboarding/sessions', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getSessionToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: selectedSession.id,
          scheduled_at: scheduleForm.scheduled_at,
          duration_minutes: scheduleForm.duration_minutes
        })
      });

      if (response.ok) {
        setShowScheduleModal(false);
        setSelectedSession(null);
        setScheduleForm({ scheduled_at: '', duration_minutes: 60 });
        await fetchOnboardingSessions(); // Refresh data
      } else {
        console.error('Failed to schedule session');
      }
    } catch (error) {
      console.error('Error scheduling session:', error);
    }
  };

  // Open schedule modal
  const openScheduleModal = (session: OnboardingSession) => {
    setSelectedSession(session);
    setScheduleForm({
      scheduled_at: session.scheduled_at ? session.scheduled_at.slice(0, 16) : '',
      duration_minutes: session.duration_minutes || 60
    });
    setShowScheduleModal(true);
  };

  // Open session details modal
  const openDetailsModal = (session: OnboardingSession) => {
    setSelectedSession(session);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    fetchOnboardingSessions();
  }, []);

  if (loading) {
    return <div className="loading-spinner">Loading onboarding sessions...</div>;
  }

  return (
    <div className="onboarding-dashboard">
      <div className="dashboard-card">
        <div className="card-header">
          <h3 className="card-title">Onboarding Sessions</h3>
          {onboardingData && (
            <div className="progress-indicator">
              <span className="progress-text">
                {onboardingData.progress.completed_count} of {onboardingData.progress.total_sessions} completed
              </span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${onboardingData.progress.completion_rate}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="card-content">
          {onboardingData?.sessions.upcoming.length > 0 && (
            <div className="sessions-section">
              <h4 className="section-title">
                Upcoming Sessions ({onboardingData.sessions.upcoming.length})
              </h4>
              <div className="sessions-list">
                {onboardingData.sessions.upcoming.map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    onSchedule={() => openScheduleModal(session)}
                    onViewDetails={() => openDetailsModal(session)}
                  />
                ))}
              </div>
            </div>
          )}

          {onboardingData?.sessions.completed.length > 0 && (
            <div className="sessions-section">
              <h4 className="section-title">
                Completed Sessions ({onboardingData.sessions.completed.length})
              </h4>
              <div className="sessions-list">
                {onboardingData.sessions.completed.slice(0, 2).map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    onViewDetails={() => openDetailsModal(session)}
                  />
                ))}
              </div>
            </div>
          )}

          {onboardingData?.sessions.upcoming.length === 0 && onboardingData?.sessions.completed.length === 0 && (
            <div className="empty-state">
              <Calendar className="empty-icon" />
              <h3 className="empty-title">No sessions yet</h3>
              <p className="empty-description">
                Your onboarding sessions will appear here once they are assigned.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && selectedSession && (
        <ScheduleModal
          session={selectedSession}
          scheduleForm={scheduleForm}
          onScheduleFormChange={setScheduleForm}
          onSchedule={handleScheduleSession}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onSchedule={() => {
            setShowDetailsModal(false);
            openScheduleModal(selectedSession);
          }}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
};

// Session List Item Component
const SessionListItem: React.FC<{
  session: OnboardingSession;
  onSchedule?: () => void;
  onViewDetails: () => void;
}> = ({ session, onSchedule, onViewDetails }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'scheduled': return 'status-scheduled';
      case 'in_progress': return 'status-in-progress';
      case 'pending': return 'status-pending';
      default: return 'status-default';
    }
  };

  return (
    <div className="session-item">
      <div className="session-content">
        <div className="session-header">
          <h5 className="session-title">{session.title}</h5>
          <div className="session-badges">
            <span className={`status-badge ${getStatusColor(session.status)}`}>
              {session.status.replace('_', ' ').toUpperCase()}
            </span>
            {session.is_mandatory && (
              <span className="mandatory-badge">Required</span>
            )}
          </div>
        </div>
        
        <div className="session-meta">
          <span className="session-plugin">{session.plugin_id}</span>
          <span className="session-duration">
            <Clock className="meta-icon" />
            {session.duration_minutes} minutes
          </span>
          {session.scheduled_at && (
            <span className="session-time">
              <Calendar className="meta-icon" />
              {new Date(session.scheduled_at).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="session-actions">
        <button 
          className="action-button details"
          onClick={onViewDetails}
        >
          View Details
        </button>
        {onSchedule && session.status !== 'completed' && (
          <button 
            className="action-button schedule"
            onClick={onSchedule}
          >
            {session.scheduled_at ? 'Reschedule' : 'Schedule'}
          </button>
        )}
        {session.meeting_link && (
          <a 
            href={session.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="action-button join"
          >
            <Video className="button-icon" />
            Join
          </a>
        )}
      </div>
    </div>
  );
};

// Helper function to get session token
const getSessionToken = (): string => {
  // Implement based on your authentication system
  return localStorage.getItem('centcom_session_token') || '';
};
```

### **2. Schedule Modal Component**

```typescript
interface ScheduleModalProps {
  session: OnboardingSession;
  scheduleForm: {
    scheduled_at: string;
    duration_minutes: number;
  };
  onScheduleFormChange: (form: any) => void;
  onSchedule: () => void;
  onClose: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  session,
  scheduleForm,
  onScheduleFormChange,
  onSchedule,
  onClose
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">
            {session.scheduled_at ? 'Reschedule Session' : 'Schedule Session'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="session-info">
            <h4 className="session-title">{session.title}</h4>
            <p className="session-description">{session.description}</p>
          </div>

          <div className="form-group">
            <label className="form-label">Date & Time</label>
            <input
              type="datetime-local"
              value={scheduleForm.scheduled_at}
              onChange={(e) => onScheduleFormChange({
                ...scheduleForm,
                scheduled_at: e.target.value
              })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <input
              type="number"
              value={scheduleForm.duration_minutes}
              onChange={(e) => onScheduleFormChange({
                ...scheduleForm,
                duration_minutes: parseInt(e.target.value)
              })}
              className="form-input"
              min="15"
              max="180"
              required
            />
          </div>

          <div className="info-note">
            <p>
              <strong>Note:</strong> Meeting link and session notes management will be available in future updates.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="button primary" 
            onClick={onSchedule}
            disabled={!scheduleForm.scheduled_at}
          >
            {session.scheduled_at ? 'Reschedule' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### **3. Session Details Modal Component**

```typescript
interface SessionDetailsModalProps {
  session: OnboardingSession;
  onSchedule: () => void;
  onClose: () => void;
}

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  session,
  onSchedule,
  onClose
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3 className="modal-title">Session Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="session-details">
            <div className="detail-section">
              <h4 className="detail-title">{session.title}</h4>
              <div className="detail-badges">
                <span className={`status-badge ${getStatusColor(session.status)}`}>
                  {session.status.replace('_', ' ').toUpperCase()}
                </span>
                {session.is_mandatory && (
                  <span className="mandatory-badge">Required</span>
                )}
              </div>
              <p className="detail-meta">
                {session.plugin_id} • {session.duration_minutes} minutes
              </p>
            </div>

            {session.description && (
              <div className="detail-section">
                <h5 className="detail-subtitle">Description</h5>
                <p className="detail-text">{session.description}</p>
              </div>
            )}

            <div className="detail-grid">
              <div className="detail-item">
                <h5 className="detail-subtitle">Status</h5>
                <span className={`status-badge ${getStatusColor(session.status)}`}>
                  {session.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="detail-item">
                <h5 className="detail-subtitle">Session Type</h5>
                <p className="detail-text">{session.session_type}</p>
              </div>
            </div>

            {session.scheduled_at && (
              <div className="detail-section">
                <h5 className="detail-subtitle">Scheduled Time</h5>
                <p className="detail-text">
                  {new Date(session.scheduled_at).toLocaleString()}
                </p>
              </div>
            )}

            {session.assigned_admin && (
              <div className="detail-section">
                <h5 className="detail-subtitle">Assigned Admin</h5>
                <div className="admin-info">
                  <User className="admin-icon" />
                  <div>
                    <p className="admin-name">{session.assigned_admin.full_name}</p>
                    <p className="admin-email">{session.assigned_admin.email}</p>
                  </div>
                </div>
              </div>
            )}

            {session.license_keys && (
              <div className="detail-section">
                <h5 className="detail-subtitle">License</h5>
                <p className="detail-text">
                  {session.license_keys.key_code} ({session.license_keys.license_type})
                </p>
              </div>
            )}

            {session.meeting_link && (
              <div className="detail-section">
                <h5 className="detail-subtitle">Meeting Link</h5>
                <a
                  href={session.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="meeting-link"
                >
                  <Video className="link-icon" />
                  Join Session
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {session.status !== 'completed' && (
            <button className="button secondary" onClick={onSchedule}>
              <Calendar className="button-icon" />
              {session.scheduled_at ? 'Reschedule' : 'Schedule'}
            </button>
          )}
          {session.meeting_link && (
            <a
              href={session.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="button primary"
            >
              <Video className="button-icon" />
              Join Session
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
```

## 🎨 **CSS Styles**

```css
/* Onboarding Dashboard Styles */
.onboarding-dashboard {
  padding: 1rem;
}

.dashboard-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.progress-indicator {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.progress-text {
  font-size: 0.875rem;
  color: #6b7280;
}

.progress-bar {
  width: 120px;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #10b981;
  transition: width 0.3s ease;
}

/* Sessions Section */
.sessions-section {
  padding: 1rem 1.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Session Item */
.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fafafa;
  transition: background-color 0.2s ease;
}

.session-item:hover {
  background: #f3f4f6;
}

.session-content {
  flex: 1;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.session-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.session-badges {
  display: flex;
  gap: 0.5rem;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.meta-icon {
  width: 0.875rem;
  height: 0.875rem;
  margin-right: 0.25rem;
}

/* Status Badges */
.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-completed {
  background-color: #d1fae5;
  color: #047857;
}

.status-scheduled {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-in-progress {
  background-color: #d1fae5;
  color: #047857;
}

.status-pending {
  background-color: #fef3c7;
  color: #92400e;
}

.mandatory-badge {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Session Actions */
.session-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.action-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.action-button.details {
  background-color: #f3f4f6;
  color: #374151;
}

.action-button.details:hover {
  background-color: #e5e7eb;
}

.action-button.schedule {
  background-color: #3b82f6;
  color: white;
}

.action-button.schedule:hover {
  background-color: #2563eb;
}

.action-button.join {
  background-color: #10b981;
  color: white;
}

.action-button.join:hover {
  background-color: #059669;
}

.button-icon {
  width: 0.875rem;
  height: 0.875rem;
}

/* Empty State */
.empty-state {
  padding: 3rem;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  margin: 0 auto 1rem;
  color: #d1d5db;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.empty-description {
  font-size: 0.875rem;
  margin: 0;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 600px;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Form Styles */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: white;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.info-note {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 0.75rem;
  margin-top: 1rem;
}

.info-note p {
  font-size: 0.875rem;
  color: #1e40af;
  margin: 0;
}

/* Button Styles */
.button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  text-decoration: none;
}

.button.primary {
  background-color: #3b82f6;
  color: white;
}

.button.primary:hover {
  background-color: #2563eb;
}

.button.primary:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.button.secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.button.secondary:hover {
  background-color: #e5e7eb;
}

/* Detail Styles */
.session-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.detail-subtitle {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.detail-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.detail-meta {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-icon {
  width: 2rem;
  height: 2rem;
  color: #6b7280;
}

.admin-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  margin: 0;
}

.admin-email {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.meeting-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #3b82f6;
  text-decoration: none;
}

.meeting-link:hover {
  color: #2563eb;
}

.link-icon {
  width: 1rem;
  height: 1rem;
}

/* Loading Spinner */
.loading-spinner {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .session-item {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .session-actions {
    justify-content: flex-end;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    margin: 1rem;
    width: calc(100% - 2rem);
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .progress-indicator {
    align-items: stretch;
  }
}

/* Dark Theme Support */
@media (prefers-color-scheme: dark) {
  .dashboard-card {
    background: #1f2937;
  }
  
  .card-title {
    color: #f9fafb;
  }
  
  .section-title {
    color: #f9fafb;
  }
  
  .session-item {
    background: #374151;
    border-color: #4b5563;
  }
  
  .session-item:hover {
    background: #4b5563;
  }
  
  .session-title {
    color: #f9fafb;
  }
  
  .modal-content {
    background: #1f2937;
  }
  
  .modal-title {
    color: #f9fafb;
  }
  
  .form-input {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .detail-title,
  .detail-subtitle {
    color: #f9fafb;
  }
}
```

## 🧪 **Testing Guidelines**

### **Unit Tests**

```typescript
// OnboardingDashboard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingDashboard } from './OnboardingDashboard';

// Mock API responses
const mockOnboardingData = {
  sessions: {
    upcoming: [
      {
        id: 'test-session-1',
        title: 'CentCom Initial Setup',
        status: 'scheduled',
        scheduled_at: '2025-09-25T10:00:00Z',
        duration_minutes: 60,
        plugin_id: 'centcom',
        session_type: 'initial',
        session_number: 1,
        is_mandatory: true
      }
    ],
    completed: [],
    cancelled: [],
    all: []
  },
  progress: {
    total_sessions: 3,
    completed_count: 0,
    completion_rate: 0
  }
};

// Mock fetch
global.fetch = jest.fn();

describe('OnboardingDashboard', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders onboarding sessions', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOnboardingData
    });

    render(<OnboardingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('CentCom Initial Setup')).toBeInTheDocument();
    });
  });

  test('opens schedule modal when schedule button clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOnboardingData
    });

    render(<OnboardingDashboard />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Schedule'));
    });

    expect(screen.getByText('Schedule Session')).toBeInTheDocument();
  });

  test('submits schedule form successfully', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOnboardingData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    render(<OnboardingDashboard />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Schedule'));
    });

    const dateInput = screen.getByLabelText('Date & Time');
    fireEvent.change(dateInput, { target: { value: '2025-09-25T10:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/user/onboarding/sessions', {
        method: 'PUT',
        headers: {
          'Authorization': expect.stringContaining('Bearer'),
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('test-session-1')
      });
    });
  });

  test('displays progress indicator correctly', async () => {
    const progressData = {
      ...mockOnboardingData,
      progress: {
        total_sessions: 3,
        completed_count: 1,
        completion_rate: 33.33
      }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => progressData
    });

    render(<OnboardingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('1 of 3 completed')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<OnboardingDashboard />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching onboarding sessions:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });
});
```

### **Integration Tests**

```typescript
// integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingDashboard } from './OnboardingDashboard';

// Test complete user journey
describe('Onboarding Dashboard Integration', () => {
  test('complete schedule session flow', async () => {
    // Mock initial data fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOnboardingData
    });

    render(<OnboardingDashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('CentCom Initial Setup')).toBeInTheDocument();
    });

    // Open schedule modal
    fireEvent.click(screen.getByText('Schedule'));
    expect(screen.getByText('Schedule Session')).toBeInTheDocument();

    // Fill out form
    const dateInput = screen.getByLabelText('Date & Time');
    fireEvent.change(dateInput, { target: { value: '2025-09-25T10:00' } });

    const durationInput = screen.getByLabelText('Duration (minutes)');
    fireEvent.change(durationInput, { target: { value: '90' } });

    // Mock schedule API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    // Mock refresh data call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockOnboardingData,
        sessions: {
          ...mockOnboardingData.sessions,
          upcoming: [{
            ...mockOnboardingData.sessions.upcoming[0],
            scheduled_at: '2025-09-25T10:00:00Z',
            duration_minutes: 90,
            status: 'scheduled'
          }]
        }
      })
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));

    // Verify modal closes and data refreshes
    await waitFor(() => {
      expect(screen.queryByText('Schedule Session')).not.toBeInTheDocument();
    });
  });
});
```

## 🚀 **Implementation Steps**

### **Phase 1: Basic Dashboard (Week 1)**
1. **Setup API Integration**
   - Implement authentication token management
   - Create API client for onboarding endpoints
   - Add error handling and retry logic

2. **Basic UI Components**
   - Create onboarding dashboard section
   - Implement session list display
   - Add progress indicators

3. **Testing**
   - Unit tests for components
   - API integration tests

### **Phase 2: Session Management (Week 2)**
1. **Modal Components**
   - Implement session details modal
   - Create schedule/reschedule modal
   - Add form validation

2. **Scheduling Logic**
   - Date/time picker integration
   - Timezone handling
   - Conflict detection

3. **Testing**
   - Modal interaction tests
   - Form submission tests

### **Phase 3: Enhanced Features (Week 3)**
1. **Advanced UI**
   - Responsive design implementation
   - Dark theme support
   - Loading states and animations

2. **Performance Optimization**
   - Data caching
   - Optimistic updates
   - Error boundaries

3. **Testing**
   - Cross-browser testing
   - Accessibility testing
   - Performance testing

### **Phase 4: Integration & Polish (Week 4)**
1. **CentCom Integration**
   - Integrate with existing CentCom architecture
   - Style matching and theming
   - Navigation integration

2. **Documentation**
   - User documentation
   - Developer documentation
   - API documentation updates

3. **Testing**
   - End-to-end testing
   - User acceptance testing
   - Bug fixes and refinements

## 🔍 **Testing Checklist**

### **Functional Testing**
- [ ] Dashboard loads onboarding sessions correctly
- [ ] Session status badges display accurate information
- [ ] Progress indicators show correct completion rates
- [ ] Schedule modal opens and closes properly
- [ ] Date/time picker works correctly
- [ ] Form validation prevents invalid submissions
- [ ] API calls are made with correct authentication
- [ ] Error messages display appropriately
- [ ] Session details modal shows complete information
- [ ] Meeting links open in new tabs
- [ ] Responsive design works on mobile devices

### **API Testing**
- [ ] GET /api/user/onboarding/sessions returns expected data
- [ ] PUT /api/user/onboarding/sessions updates sessions correctly
- [ ] Authentication headers are included in all requests
- [ ] Error responses are handled gracefully
- [ ] API rate limiting is respected
- [ ] Session tokens are refreshed when needed

### **Security Testing**
- [ ] Authentication tokens are stored securely
- [ ] API calls include proper authorization
- [ ] User can only access their own sessions
- [ ] XSS prevention in rendered content
- [ ] CSRF protection for form submissions

## 📋 **Deployment Notes**

### **Environment Configuration**
```typescript
// config/centcom.config.ts
export const centcomConfig = {
  apiBaseUrl: process.env.LYCEUM_API_BASE_URL || 'https://lyceum.company.com/api',
  sessionStorageKey: 'centcom_session_token',
  refreshTokenKey: 'centcom_refresh_token',
  apiTimeout: 30000,
  retryAttempts: 3,
  cacheTimeout: 300000, // 5 minutes
};
```

### **Build Configuration**
```json
{
  "build": {
    "onboarding": {
      "enabled": true,
      "apiEndpoints": [
        "/api/user/onboarding/sessions",
        "/api/centcom/auth/validate"
      ],
      "features": {
        "scheduling": true,
        "rescheduling": true,
        "sessionDetails": true,
        "progressTracking": true
      }
    }
  }
}
```

## 🎯 **Success Metrics**

### **Key Performance Indicators**
- **User Engagement**: Session scheduling rate increases by 40%
- **Completion Rate**: Onboarding completion rate improves by 25%
- **User Satisfaction**: Dashboard usability score > 4.5/5
- **Technical Performance**: Page load time < 2 seconds
- **Error Rate**: API error rate < 1%

### **User Acceptance Criteria**
- [ ] Users can view all their onboarding sessions in one place
- [ ] Users can schedule and reschedule sessions independently
- [ ] Session status is always current and accurate
- [ ] Meeting links are easily accessible when available
- [ ] Progress tracking motivates completion
- [ ] Interface matches CentCom design standards
- [ ] Mobile experience is fully functional

---

## 📞 **Support & Questions**

For technical questions or implementation support, please contact:
- **Technical Lead**: [Your Name] - [email@company.com]
- **API Documentation**: [Lyceum API Docs URL]
- **Design System**: [CentCom Design System URL]

**Implementation Timeline**: 4 weeks
**Priority**: High
**Dependencies**: Lyceum API access, CentCom authentication system
