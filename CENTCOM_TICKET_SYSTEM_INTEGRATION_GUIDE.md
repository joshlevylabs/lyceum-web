# Centcom Ticket System Integration Guide

## Overview

The Centcom-Lyceum ticket management system allows Centcom users to submit bug reports, feature requests, and support tickets directly from their Centcom platform, which then appear in the Lyceum admin panel for management by the support team.

### Key Features
- ✅ Submit tickets with rich metadata (bug reports, feature requests, improvements, support)
- ✅ Attach screenshots, videos, and log files (up to 10MB each)
- ✅ Track ticket status and receive updates in real-time
- ✅ Two-way communication with support team via comments
- ✅ Automatic ticket categorization and unique IDs (e.g., BUG-1, FR-1)
- ✅ Integration with existing Centcom authentication
- ✅ Complete React component library for easy integration
- ✅ TypeScript client library with full type safety
- ✅ Comprehensive admin panel for support team management
- ✅ Automatic file scanning for security threats
- ✅ Row-level security with proper access controls

### Ticket Types Supported
- **Bug Report**: Issues and problems with the software
- **Feature Request**: Requests for new features or enhancements  
- **Improvement**: Suggestions for improving existing features
- **Support**: General support and help requests
- **Other**: Miscellaneous tickets

## Authentication

All API requests must include the user's authentication token in the `Authorization` header:

```
Authorization: Bearer <user_access_token>
```

The token should be the same one used for other Centcom-Lyceum API calls.

## API Endpoints

### Base URL
```
https://your-lyceum-instance.com/api/tickets
```

### 1. Submit a New Ticket

**POST** `/api/tickets`

Submit a new support ticket from Centcom.

#### Headers
```
Content-Type: application/json
Authorization: Bearer <user_access_token>
X-Client-App: CentCom
X-Client-Version: <your_centcom_version>
```

#### Request Body
```json
{
  "title": "Unable to connect to database cluster",
  "description": "When trying to connect to the production database cluster, I get a timeout error after 30 seconds. This started happening after the latest update.",
  "ticket_type": "bug",
  "priority": "high",
  "severity": "major",
  "application_section": "database_connectivity",
  "plugin_name": "PostgreSQL Connector",
  "centcom_version": "2.1.4",
  "steps_to_reproduce": "1. Open Centcom\n2. Navigate to Database tab\n3. Click 'Connect to Production'\n4. Wait for timeout",
  "expected_behavior": "Should connect to database within 5 seconds",
  "actual_behavior": "Connection times out after 30 seconds with error 'Connection refused'",
  "reproduction_rate": "always",
  "environment_info": {
    "os": "Windows 11",
    "browser": "Chrome 120.0.6099.62",
    "screen_resolution": "1920x1080",
    "memory": "16GB",
    "network": "Corporate VPN"
  },
  "tags": ["database", "connectivity", "timeout", "production"]
}
```

#### Required Fields
- `title` (string): Brief summary of the issue
- `description` (string): Detailed description of the issue or request
- `ticket_type` (enum): One of `"bug"`, `"feature_request"`, `"improvement"`, `"support"`, `"other"`
- `application_section` (string): Which part of Centcom this relates to

#### Optional Fields
- `priority` (enum): `"critical"`, `"high"`, `"medium"`, `"low"` (default: `"medium"`)
- `severity` (enum): `"critical"`, `"major"`, `"minor"`, `"cosmetic"` (default: `"minor"`)
- `plugin_name` (string): Specific plugin name if applicable
- `centcom_version` (string): Version of Centcom when issue occurred
- `steps_to_reproduce` (string): Step-by-step reproduction instructions (for bugs)
- `expected_behavior` (string): What should happen (for bugs)
- `actual_behavior` (string): What actually happens (for bugs)
- `reproduction_rate` (enum): `"always"`, `"sometimes"`, `"rarely"`, `"once"`
- `environment_info` (object): System information, browser details, etc.
- `tags` (array): Array of strings for categorization

#### Response
```json
{
  "success": true,
  "ticket": {
    "id": "uuid-here",
    "ticket_key": "BUG-15",
    "title": "Unable to connect to database cluster",
    "status": "open",
    "priority": "high",
    "ticket_type": "bug",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "message": "Ticket BUG-15 created successfully"
}
```

### 2. Get User's Tickets

**GET** `/api/tickets`

Retrieve all tickets submitted by the authenticated user.

#### Headers
```
Authorization: Bearer <user_access_token>
X-Client-App: CentCom
```

#### Query Parameters
- `status` (optional): Filter by status (`open`, `in_progress`, `resolved`, etc.)
- `ticket_type` (optional): Filter by type (`bug`, `feature_request`, etc.)
- `limit` (optional): Number of tickets to return (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

#### Example Request
```
GET /api/tickets?status=open&limit=25&offset=0
```

#### Response
```json
{
  "success": true,
  "tickets": [
    {
      "id": "uuid-here",
      "ticket_key": "BUG-15",
      "title": "Unable to connect to database cluster",
      "description": "When trying to connect to...",
      "ticket_type": "bug",
      "status": "in_progress",
      "priority": "high",
      "severity": "major",
      "application_section": "database_connectivity",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-16T14:20:00Z",
      "assigned_admin": {
        "id": "admin-uuid",
        "username": "support_admin",
        "full_name": "Support Administrator"
      },
      "comments_count": [{"count": 3}],
      "attachments_count": [{"count": 2}],
      "tags": ["database", "connectivity", "timeout", "production"]
    }
  ],
  "pagination": {
    "limit": 25,
    "offset": 0,
    "has_more": false
  }
}
```

### 3. Get Ticket Details

**GET** `/api/tickets/{ticketId}`

Get full details of a specific ticket, including comments and attachments.

#### Response
```json
{
  "success": true,
  "ticket": {
    "id": "uuid-here",
    "ticket_key": "BUG-15",
    "title": "Unable to connect to database cluster",
    "description": "Detailed description...",
    "status": "in_progress",
    "priority": "high",
    "comments": [
      {
        "id": "comment-uuid",
        "content": "Thank you for submitting this bug report. We're investigating the issue.",
        "author_name": "Support Team",
        "author_type": "admin",
        "created_at": "2024-01-15T11:00:00Z"
      },
      {
        "id": "comment-uuid-2",
        "content": "I've tried the suggested workaround but it didn't help.",
        "author_name": "User Name",
        "author_type": "user",
        "created_at": "2024-01-15T15:30:00Z"
      }
    ],
    "attachments": [
      {
        "id": "attachment-uuid",
        "filename": "error-screenshot.png",
        "attachment_type": "screenshot",
        "file_size": 156780,
        "uploaded_at": "2024-01-15T10:35:00Z"
      }
    ],
    "status_history": [
      {
        "old_status": null,
        "new_status": "open",
        "created_at": "2024-01-15T10:30:00Z"
      },
      {
        "old_status": "open",
        "new_status": "in_progress",
        "created_at": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

### 4. Add Comment to Ticket

**POST** `/api/tickets/{ticketId}/comments`

Add a comment to an existing ticket for communication with the support team.

#### Request Body
```json
{
  "content": "I tried the suggested solution but I'm still experiencing the same issue. Here are the additional logs from my latest attempt."
}
```

#### Response
```json
{
  "success": true,
  "comment": {
    "id": "comment-uuid",
    "content": "I tried the suggested solution...",
    "author_name": "User Name",
    "author_type": "user",
    "created_at": "2024-01-16T09:15:00Z"
  },
  "message": "Comment added successfully"
}
```

### 5. Get Comments for Ticket

**GET** `/api/tickets/{ticketId}/comments`

Retrieve all comments for a specific ticket.

#### Response
```json
{
  "success": true,
  "comments": [
    {
      "id": "comment-uuid",
      "content": "Thank you for submitting this bug report...",
      "author_name": "Support Team",
      "author_type": "admin",
      "created_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

### 6. Upload File Attachment

**POST** `/api/tickets/{ticketId}/attachments`

Upload a file attachment to a ticket (screenshots, logs, videos, etc.).

#### Headers
```
Content-Type: multipart/form-data
Authorization: Bearer <user_access_token>
X-Client-App: CentCom
X-Client-Version: <your_centcom_version>
```

#### Request Body (Form Data)
```
file: <File object>
attachment_type: "screenshot" | "video" | "log_file" | "document" | "other"
description: "Optional description of the attachment"
is_public: "true" | "false" (default: false)
```

#### Response
```json
{
  "success": true,
  "attachment": {
    "id": "attachment-uuid",
    "filename": "1640123456_abc123.png",
    "original_filename": "screenshot.png",
    "file_size": 156780,
    "mime_type": "image/png",
    "attachment_type": "screenshot",
    "description": "Error dialog screenshot",
    "uploaded_at": "2024-01-15T10:35:00Z",
    "is_public": false,
    "scan_status": "clean"
  },
  "message": "File uploaded successfully"
}
```

#### File Upload Limits
- Maximum file size: 10MB
- Allowed file types:
  - Images: JPEG, PNG, GIF, WebP
  - Videos: MP4, WebM
  - Documents: PDF, TXT, CSV, JSON, ZIP
- Files are automatically scanned for security threats

### 7. Get Ticket Attachments

**GET** `/api/tickets/{ticketId}/attachments`

Retrieve all attachments for a specific ticket.

#### Response
```json
{
  "success": true,
  "attachments": [
    {
      "id": "attachment-uuid",
      "filename": "1640123456_abc123.png",
      "original_filename": "screenshot.png",
      "file_size": 156780,
      "mime_type": "image/png",
      "attachment_type": "screenshot",
      "description": "Error dialog screenshot",
      "uploaded_at": "2024-01-15T10:35:00Z",
      "is_public": false,
      "scan_status": "clean",
      "uploader": {
        "id": "user-uuid",
        "username": "john_doe",
        "full_name": "John Doe"
      }
    }
  ]
}
```

## Status Values

Tickets can have the following status values:

- **open**: Newly submitted, awaiting triage
- **in_progress**: Being actively worked on by support team
- **pending_user**: Waiting for additional information from user
- **resolved**: Issue has been fixed or request completed
- **closed**: Ticket is closed and archived
- **duplicate**: Marked as duplicate of another ticket
- **wont_fix**: Determined that issue won't be addressed

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200**: Success
- **400**: Bad request (validation error)
- **401**: Unauthorized (invalid or missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not found (ticket doesn't exist)
- **500**: Internal server error

Error responses have this format:
```json
{
  "success": false,
  "error": "Detailed error message",
  "details": "Additional technical details (optional)"
}
```

## Implementation Examples

### JavaScript/TypeScript Example

```typescript
class CentcomTicketClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/api/tickets${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        'X-Client-App': 'CentCom',
        'X-Client-Version': '2.1.4',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  async submitTicket(ticketData: {
    title: string;
    description: string;
    ticket_type: 'bug' | 'feature_request' | 'improvement' | 'support' | 'other';
    priority?: 'critical' | 'high' | 'medium' | 'low';
    application_section: string;
    plugin_name?: string;
    steps_to_reproduce?: string;
    expected_behavior?: string;
    actual_behavior?: string;
    environment_info?: any;
    tags?: string[];
  }) {
    return this.makeRequest('', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  }

  async getMyTickets(filters?: {
    status?: string;
    ticket_type?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.makeRequest(query);
  }

  async getTicketDetails(ticketId: string) {
    return this.makeRequest(`/${ticketId}`);
  }

  async addComment(ticketId: string, content: string) {
    return this.makeRequest(`/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getComments(ticketId: string) {
    return this.makeRequest(`/${ticketId}/comments`);
  }

  async uploadAttachment(ticketId: string, file: File, options?: {
    description?: string;
    attachment_type?: 'screenshot' | 'video' | 'log_file' | 'document' | 'other';
    is_public?: boolean;
  }) {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.description) {
      formData.append('description', options.description);
    }
    
    formData.append('attachment_type', options?.attachment_type || 'other');
    formData.append('is_public', (options?.is_public || false).toString());

    const url = `${this.baseUrl}/api/tickets/${ticketId}/attachments`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'X-Client-App': 'CentCom',
        'X-Client-Version': this.centcomVersion,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  async getAttachments(ticketId: string) {
    return this.makeRequest(`/${ticketId}/attachments`);
  }
}

// Usage example
const ticketClient = new CentcomTicketClient(
  'https://your-lyceum-instance.com',
  userAccessToken
);

// Submit a bug report
try {
  const result = await ticketClient.submitTicket({
    title: 'Database connection timeout',
    description: 'Unable to connect to production database',
    ticket_type: 'bug',
    priority: 'high',
    application_section: 'database_connectivity',
    plugin_name: 'PostgreSQL Connector',
    steps_to_reproduce: '1. Open Centcom\n2. Click connect\n3. Timeout occurs',
    expected_behavior: 'Should connect within 5 seconds',
    actual_behavior: 'Times out after 30 seconds',
    environment_info: {
      os: 'Windows 11',
      browser: 'Chrome 120',
      centcom_version: '2.1.4'
    },
    tags: ['database', 'timeout', 'production']
  });

  console.log('Ticket created:', result.ticket.ticket_key);
} catch (error) {
  console.error('Failed to create ticket:', error.message);
}

// Get user's tickets
try {
  const tickets = await ticketClient.getMyTickets({
    status: 'open',
    limit: 10
  });
  
  console.log(`Found ${tickets.tickets.length} open tickets`);
} catch (error) {
  console.error('Failed to load tickets:', error.message);
}

// Upload a screenshot to a ticket
try {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const file = fileInput.files?.[0];
  
  if (file) {
    const result = await ticketClient.uploadAttachment('ticket-uuid', file, {
      description: 'Screenshot showing the error dialog',
      attachment_type: 'screenshot',
      is_public: false
    });
    
    console.log('File uploaded:', result.attachment.filename);
  }
} catch (error) {
  console.error('Failed to upload file:', error.message);
}

// Get all attachments for a ticket
try {
  const attachments = await ticketClient.getAttachments('ticket-uuid');
  console.log(`Found ${attachments.attachments.length} attachments`);
} catch (error) {
  console.error('Failed to load attachments:', error.message);
}
```

### Python Example

```python
import requests
import json
from typing import Optional, Dict, List, Any

class CentcomTicketClient:
    def __init__(self, base_url: str, access_token: str, centcom_version: str = "2.1.4"):
        self.base_url = base_url
        self.access_token = access_token
        self.centcom_version = centcom_version

    def _make_request(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/api/tickets{endpoint}"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
            "X-Client-App": "CentCom",
            "X-Client-Version": self.centcom_version,
        }

        kwargs = {"headers": headers}
        if data:
            kwargs["data"] = json.dumps(data)

        response = requests.request(method, url, **kwargs)
        
        if not response.ok:
            error_data = response.json() if response.headers.get("content-type") == "application/json" else {}
            raise Exception(f"API Error {response.status_code}: {error_data.get('error', response.text)}")
        
        return response.json()

    def submit_ticket(self, **ticket_data) -> Dict[str, Any]:
        """Submit a new support ticket"""
        return self._make_request("", "POST", ticket_data)

    def get_my_tickets(self, **filters) -> Dict[str, Any]:
        """Get user's tickets with optional filters"""
        params = "&".join([f"{k}={v}" for k, v in filters.items() if v is not None])
        endpoint = f"?{params}" if params else ""
        return self._make_request(endpoint)

    def get_ticket_details(self, ticket_id: str) -> Dict[str, Any]:
        """Get full details of a specific ticket"""
        return self._make_request(f"/{ticket_id}")

    def add_comment(self, ticket_id: str, content: str) -> Dict[str, Any]:
        """Add a comment to a ticket"""
        return self._make_request(f"/{ticket_id}/comments", "POST", {"content": content})

    def get_comments(self, ticket_id: str) -> Dict[str, Any]:
        """Get all comments for a ticket"""
        return self._make_request(f"/{ticket_id}/comments")
    
    def upload_attachment(self, ticket_id: str, file_path: str, **options) -> Dict[str, Any]:
        """Upload an attachment to a ticket"""
        url = f"{self.base_url}/api/tickets/{ticket_id}/attachments"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "X-Client-App": "CentCom",
            "X-Client-Version": self.centcom_version,
        }
        
        with open(file_path, 'rb') as file:
            files = {'file': file}
            data = {
                'attachment_type': options.get('attachment_type', 'other'),
                'is_public': str(options.get('is_public', False)).lower()
            }
            
            if 'description' in options:
                data['description'] = options['description']
            
            response = requests.post(url, headers=headers, files=files, data=data)
            
            if not response.ok:
                error_data = response.json() if response.headers.get("content-type") == "application/json" else {}
                raise Exception(f"API Error {response.status_code}: {error_data.get('error', response.text)}")
            
            return response.json()
    
    def get_attachments(self, ticket_id: str) -> Dict[str, Any]:
        """Get all attachments for a ticket"""
        return self._make_request(f"/{ticket_id}/attachments")

# Usage example
client = CentcomTicketClient(
    base_url="https://your-lyceum-instance.com",
    access_token="user_access_token"
)

# Submit a feature request
try:
    result = client.submit_ticket(
        title="Add dark mode support",
        description="Please add a dark mode theme option to reduce eye strain during long analysis sessions.",
        ticket_type="feature_request",
        priority="medium",
        application_section="user_interface",
        tags=["ui", "accessibility", "theme"]
    )
    print(f"Ticket created: {result['ticket']['ticket_key']}")
except Exception as e:
    print(f"Failed to create ticket: {e}")

# Upload a log file to a ticket
try:
    result = client.upload_attachment(
        ticket_id="ticket-uuid",
        file_path="./error.log",
        description="Application error log from crash",
        attachment_type="log_file",
        is_public=False
    )
    print(f"File uploaded: {result['attachment']['filename']}")
except Exception as e:
    print(f"Failed to upload file: {e}")

# Get all attachments for a ticket
try:
    attachments = client.get_attachments("ticket-uuid")
    print(f"Found {len(attachments['attachments'])} attachments")
except Exception as e:
    print(f"Failed to load attachments: {e}")
```

## UI Integration Guidelines

### Ticket Submission Form

When building a ticket submission form in your Centcom UI, consider including:

1. **Ticket Type Selection**: Radio buttons or dropdown for bug/feature/improvement/support
2. **Priority Selection**: Dropdown with clear descriptions of each priority level
3. **Application Section**: Dropdown of Centcom modules/sections
4. **Rich Text Description**: Support for formatted text, code blocks, etc.
5. **File Upload**: Allow screenshots, videos, log files (up to 10MB each)
   - Support drag-and-drop functionality
   - Preview images before upload
   - Show upload progress
   - Validate file types and sizes client-side
6. **Environment Info**: Auto-populate system information where possible
7. **Tags**: Auto-suggest common tags based on ticket type and section
8. **Real-time Validation**: Validate form fields as user types
9. **Save Draft**: Allow users to save incomplete tickets as drafts

### Ticket Management Interface

For viewing and managing submitted tickets:

1. **Dashboard Widget**: Show count of open/pending tickets
2. **Ticket List**: Sortable table with key information
3. **Filtering**: By status, type, priority, date range
4. **Search**: Full-text search across ticket content
5. **Ticket Details**: Expandable view with comments and history
6. **Real-time Updates**: Polling or WebSocket updates for status changes

### Example UI Components

```typescript
// React component example for ticket submission
const TicketSubmissionForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticket_type: 'bug',
    priority: 'medium',
    application_section: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    tags: []
  });

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await ticketClient.submitTicket(formData);
      // Show success message
      alert(`Ticket ${result.ticket.ticket_key} created successfully!`);
      // Reset form
      setFormData(/* reset to initial state */);
    } catch (error) {
      // Show error message
      alert(`Failed to create ticket: ${error.message}`);
    }
  };

  return (
    <form onSubmit={submitTicket} className="space-y-4">
      <div>
        <label>Ticket Type</label>
        <select 
          value={formData.ticket_type}
          onChange={(e) => setFormData({...formData, ticket_type: e.target.value})}
        >
          <option value="bug">Bug Report</option>
          <option value="feature_request">Feature Request</option>
          <option value="improvement">Improvement</option>
          <option value="support">Support</option>
        </select>
      </div>
      
      <div>
        <label>Title</label>
        <input 
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          required
        />
      </div>
      
      <div>
        <label>Description</label>
        <textarea 
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={6}
          required
        />
      </div>
      
      {formData.ticket_type === 'bug' && (
        <>
          <div>
            <label>Steps to Reproduce</label>
            <textarea 
              value={formData.steps_to_reproduce}
              onChange={(e) => setFormData({...formData, steps_to_reproduce: e.target.value})}
              rows={4}
            />
          </div>
          
          <div>
            <label>Expected Behavior</label>
            <textarea 
              value={formData.expected_behavior}
              onChange={(e) => setFormData({...formData, expected_behavior: e.target.value})}
              rows={2}
            />
          </div>
          
          <div>
            <label>Actual Behavior</label>
            <textarea 
              value={formData.actual_behavior}
              onChange={(e) => setFormData({...formData, actual_behavior: e.target.value})}
              rows={2}
            />
          </div>
        </>
      )}
      
      <button type="submit">Submit Ticket</button>
    </form>
  );
};
```

## Best Practices

### For Centcom Developers

1. **Auto-populate Environment Info**: Collect system information automatically
2. **Validate Before Submit**: Check required fields and formats client-side
3. **Provide Clear Feedback**: Show success/error messages with ticket numbers
4. **Cache for Offline**: Store draft tickets locally if connection fails
5. **Rate Limiting**: Prevent spam by limiting submissions per user/time period

### For Users

1. **Be Specific**: Provide detailed, actionable descriptions
2. **Include Context**: Add environment info, versions, configurations
3. **Use Appropriate Priority**: Reserve "Critical" for service-down issues
4. **Add Screenshots**: Visual evidence helps diagnose issues faster
5. **Follow Up**: Respond promptly to admin requests for more information

### Security Considerations

1. **Sanitize Inputs**: Clean user input to prevent XSS/injection
2. **File Upload Security**: Scan uploaded files for malware
3. **Access Control**: Users can only see their own tickets
4. **Rate Limiting**: Implement per-user submission limits
5. **Data Privacy**: Don't include sensitive data in ticket descriptions

## Testing Your Integration

### 1. Setup Test Database

First, ensure the ticket management schema is installed:

```bash
# Run the setup API endpoint
curl -X POST "https://your-lyceum-instance.com/api/admin/setup-ticket-management" \
  -H "Authorization: Bearer <admin_token>"
```

### 2. Test Ticket Submission

```bash
# Test creating a ticket
curl -X POST "https://your-lyceum-instance.com/api/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -H "X-Client-App: CentCom" \
  -H "X-Client-Version: 2.1.4" \
  -d '{
    "title": "Test ticket from API",
    "description": "This is a test ticket to verify the integration",
    "ticket_type": "support",
    "application_section": "api_testing",
    "tags": ["test", "integration"]
  }'
```

### 3. Test Ticket Retrieval

```bash
# Get user's tickets
curl -X GET "https://your-lyceum-instance.com/api/tickets" \
  -H "Authorization: Bearer <user_token>"
```

### 4. Verify Admin Panel

1. Log into Lyceum admin panel
2. Navigate to Tickets section
3. Verify the test ticket appears
4. Test status updates and comments

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check that the access token is valid and not expired
   - Ensure the token is included in the Authorization header

2. **403 Forbidden**
   - User may not have permission to access tickets
   - Check user profile role in database

3. **400 Bad Request**
   - Validation error in request data
   - Check that all required fields are provided
   - Verify enum values match expected options

4. **500 Internal Server Error**
   - Database connection issue
   - Check Lyceum server logs
   - Verify ticket management schema is installed

### Debug Mode

Enable detailed error logging by setting environment variables:

```bash
# In your Lyceum .env file
TICKET_DEBUG=true
LOG_LEVEL=debug
```

## Support

For questions about the ticket system integration:

1. Check this documentation first
2. Review the API endpoint responses for detailed error messages  
3. Submit a support ticket through the system (dogfooding!)
4. Contact the Lyceum development team

## Changelog

### Version 1.0.0 (Current)
- Initial ticket system implementation
- Support for bugs, features, improvements, and support requests
- File attachment support
- Two-way commenting system
- Admin panel integration
- Full CRUD API endpoints

### Planned Features
- Email notifications for status changes
- Webhook support for external integrations
- Advanced search and filtering
- Ticket templates and automation
- SLA tracking and reporting
