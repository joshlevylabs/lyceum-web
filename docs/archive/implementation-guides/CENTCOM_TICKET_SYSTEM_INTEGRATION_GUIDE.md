# Centcom Ticket System Integration Guide

## Overview

The Centcom-Lyceum ticket management system allows Centcom users to submit bug reports, feature requests, and support tickets directly from their Centcom platform, which then appear in the Lyceum admin panel for management by the support team.

### Key Features
- ✅ Submit tickets with rich metadata (bug reports, feature requests, improvements, support)
- ✅ Attach screenshots, videos, documents, and log files (up to 500MB each)
- ✅ Drag & drop file upload with real-time progress tracking
- ✅ View and download files uploaded by Lyceum support team
- ✅ Track ticket status and receive updates in real-time
- ✅ Two-way communication with support team via comments
- ✅ Attach files to comments for better communication
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

**POST** `/api/tickets/by-key/{ticketKey}/comments`

Add a comment to an existing ticket for communication with the support team. You can optionally attach files to your comment.

#### Request Body
```json
{
  "content": "I tried the suggested solution but I'm still experiencing the same issue. Here are the additional logs from my latest attempt.",
  "attachment_ids": ["attachment-uuid-1", "attachment-uuid-2"],
  "is_internal": false
}
```

**Note**: To attach files to a comment:
1. First upload files using the `/api/tickets/attachments/upload` endpoint
2. Use the returned attachment IDs in the `attachment_ids` array when creating the comment
3. Files will be automatically associated with the comment and appear inline

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

### 6. Edit Comment

**PATCH** `/api/tickets/by-key/{ticketKey}/comments`

Edit an existing comment that you previously submitted. Only the comment author can edit their own comments.

#### Request Body
```json
{
  "commentId": "comment-uuid-to-edit",
  "content": "Updated comment content here. I've found additional information about this issue.",
  "edit_reason": "Added more details"
}
```

#### Response
```json
{
  "success": true,
  "comment": {
    "id": "comment-uuid-to-edit",
    "content": "Updated comment content here. I've found additional information about this issue.",
    "author_name": "User Name",
    "author_type": "user",
    "created_at": "2024-01-16T09:15:00Z",
    "updated_at": "2024-01-16T14:30:00Z",
    "edited_by": "user-uuid",
    "edit_reason": "Added more details"
  },
  "message": "Comment updated successfully"
}
```

### 7. Delete Comment

**DELETE** `/api/tickets/by-key/{ticketKey}/comments`

Delete a comment that you previously submitted. Only the comment author can delete their own comments. **Warning**: This will also delete any file attachments associated with the comment.

#### Request Body
```json
{
  "commentId": "comment-uuid-to-delete"
}
```

#### Response
```json
{
  "success": true,
  "message": "Comment and associated attachments deleted successfully"
}
```

### 8. Upload File Attachment to Ticket

**POST** `/api/tickets/{ticketId}/attachments`

Upload a file attachment directly to a ticket (screenshots, logs, videos, etc.). These files will appear in the main ticket attachments section.

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
- **Maximum file size: 500MB per file**
- **Allowed file types:**
  - **Images**: JPEG, PNG, GIF, WebP, SVG
  - **Videos**: MP4, WebM, AVI, MOV, OGG
  - **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, JSON, XML
  - **Archives**: ZIP, RAR, 7Z
- **Features:**
  - Files are automatically scanned for security threats
  - Drag & drop upload support with visual feedback
  - Real-time upload progress indicators
  - Image preview thumbnails
  - Automatic file type detection and validation
  - Secure cloud storage with public access URLs

### 9. Upload File Attachment for Comments

**POST** `/api/tickets/attachments/upload`

Upload a file attachment that can be associated with comments. Use this endpoint when you want to attach files to comments rather than directly to the ticket.

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
ticketId: "ticket-uuid"
commentId: "comment-uuid" (optional - if provided, file is immediately associated with comment)
attachment_type: "screenshot" | "video" | "log_file" | "document" | "other"
description: "Optional description of the attachment"
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
    "description": "Additional error logs",
    "uploaded_at": "2024-01-15T10:35:00Z",
    "public_url": "https://storage.example.com/ticket-attachments/file.png",
    "scan_status": "clean"
  },
  "message": "File uploaded successfully"
}
```

#### Workflow for Comment Attachments
1. Upload files using this endpoint without `commentId`
2. Collect the attachment IDs from the responses
3. Create your comment with the `attachment_ids` array
4. Files will be automatically moved from ticket-level to comment-level association

### 10. Get Ticket Attachments

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

## Enhanced File Upload Integration

### File Upload Component (React)

Here's a complete React component that integrates the enhanced file upload functionality:

```typescript
import React, { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  ticketId?: string;
  onFileUploaded?: (attachment: any) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  compactMode?: boolean;
}

const CentcomFileUpload: React.FC<FileUploadProps> = ({
  ticketId,
  onFileUploaded,
  onError,
  maxFiles = 10,
  compactMode = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    const uploadId = Math.random().toString(36).substring(2);
    
    // Add to uploading files
    setUploadingFiles(prev => [...prev, {
      id: uploadId,
      file,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (ticketId) {
        formData.append('ticketId', ticketId);
      }

      const response = await fetch('/api/tickets/attachments/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update uploading status
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === uploadId 
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        );

        // Add to completed attachments
        setAttachments(prev => [...prev, result.attachment]);
        onFileUploaded?.(result.attachment);

        // Remove from uploading after delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        }, 2000);
      }

    } catch (error: any) {
      // Update error status
      setUploadingFiles(prev => 
        prev.map(f => 
          f.id === uploadId 
            ? { ...f, status: 'error', error: error.message }
            : f
        )
      );

      onError?.(error.message);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(uploadFile);
      e.target.value = ''; // Reset input
    }
  }, []);

  // Compact mode for comments
  if (compactMode) {
    return (
      <div className="relative">
        {/* Drag overlay */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
          onDrop={handleDrop}
          className={`
            absolute inset-0 border-2 border-dashed rounded-lg transition-all z-20
            ${isDragOver ? 'border-blue-500 bg-blue-50 opacity-95 flex items-center justify-center' : 'border-transparent pointer-events-none'}
          `}
        >
          {isDragOver && (
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-blue-600 mt-2">Drop files to attach</p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Attach files"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar,.7z"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {attachments.length > 0 && (
            <span className="text-xs text-gray-500">
              {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
            </span>
          )}
        </div>

        {/* Upload progress in compact mode */}
        {uploadingFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {uploadingFiles.map((uploadingFile) => (
              <div key={uploadingFile.id} className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600 truncate max-w-32">{uploadingFile.file.name}</span>
                {uploadingFile.status === 'error' && <span className="text-red-500">✗</span>}
                {uploadingFile.status === 'success' && <span className="text-green-500">✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full upload interface
  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <svg className={`mx-auto h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900">
            {isDragOver ? 'Drop files here' : 'Upload files'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Click to browse or drag and drop files here
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Images, videos, documents up to 500MB • {attachments.length + uploadingFiles.length}/{maxFiles} files
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar,.7z"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploading...</h4>
          {uploadingFiles.map((uploadingFile) => (
            <div key={uploadingFile.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                {uploadingFile.status === 'uploading' && (
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {uploadingFile.status === 'success' && (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {uploadingFile.status === 'error' && (
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadingFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {uploadingFile.status === 'error' && (
                  <p className="text-xs text-red-600">{uploadingFile.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Attached Files</h4>
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
              {/* File icon based on type */}
              <div className="flex-shrink-0">
                {attachment.file_category === 'image' ? (
                  <img src={attachment.public_url} alt={attachment.original_filename} className="w-10 h-10 object-cover rounded" />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.original_filename}
                </p>
                <p className="text-xs text-gray-500">
                  {attachment.size_formatted} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => window.open(attachment.public_url, '_blank')}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                  title="View file"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CentcomFileUpload;
```

### Usage Examples

#### 1. Ticket Creation with File Upload

```typescript
const TicketCreationForm = () => {
  const [attachments, setAttachments] = useState([]);

  const handleFileUploaded = (attachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const handleSubmit = async (ticketData) => {
    // Include attachment IDs in ticket submission
    const ticketPayload = {
      ...ticketData,
      attachment_ids: attachments.map(a => a.id)
    };

    // Submit ticket
    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(ticketPayload)
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Other form fields */}
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attach Files
        </label>
        <CentcomFileUpload
          onFileUploaded={handleFileUploaded}
          onError={(error) => console.error('Upload error:', error)}
          maxFiles={10}
        />
      </div>
      
      <button type="submit">Create Ticket</button>
    </form>
  );
};
```

#### 2. Comment with File Attachment

```typescript
const CommentForm = ({ ticketId }) => {
  const [comment, setComment] = useState('');
  const [attachments, setAttachments] = useState([]);

  const handleAddComment = async () => {
    const commentPayload = {
      content: comment,
      attachment_ids: attachments.map(a => a.id)
    };

    await fetch(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(commentPayload)
    });

    setComment('');
    setAttachments([]);
  };

  return (
    <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Add a comment..."
        className="w-full border-0 resize-none px-3 py-2 focus:outline-none"
      />
      
      <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
        <div className="flex items-center justify-between">
          <CentcomFileUpload
            ticketId={ticketId}
            onFileUploaded={(attachment) => setAttachments(prev => [...prev, attachment])}
            compactMode={true}
            maxFiles={5}
          />
          
          <button
            onClick={handleAddComment}
            disabled={!comment.trim()}
            className="ml-3 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Add Comment
          </button>
        </div>
      </div>
    </div>
  );
};
```

#### 3. View Ticket Files (Including Lyceum Uploads)

```typescript
const TicketAttachments = ({ ticketId }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttachments = async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/attachments`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        
        const data = await response.json();
        setAttachments(data.attachments || []);
      } catch (error) {
        console.error('Failed to load attachments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAttachments();
  }, [ticketId]);

  if (loading) {
    return <div>Loading attachments...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">All Attachments ({attachments.length})</h3>
      
      {attachments.length === 0 ? (
        <p className="text-gray-500">No files attached to this ticket.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="border border-gray-200 rounded-lg p-4">
              {/* File preview */}
              {attachment.file_category === 'image' ? (
                <img
                  src={attachment.public_url}
                  alt={attachment.original_filename}
                  className="w-full h-32 object-cover rounded mb-3"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded mb-3 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              
              {/* File info */}
              <h4 className="font-medium text-sm truncate mb-1">
                {attachment.original_filename}
              </h4>
              <p className="text-xs text-gray-500 mb-2">
                {attachment.size_formatted} • {new Date(attachment.uploaded_at).toLocaleDateString()}
              </p>
              
              {/* Upload source */}
              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-1 rounded bg-gray-100">
                  {attachment.uploaded_by ? 'User Upload' : 'Lyceum Team'}
                </span>
                
                <button
                  onClick={() => window.open(attachment.public_url, '_blank')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
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
5. **Enhanced File Upload System**: Comprehensive file management (up to 500MB each)
   - **Drag & Drop Interface**: Modern file upload with visual feedback
   - **Multiple File Types**: Images, videos, documents, archives supported
   - **Real-time Progress**: Live upload progress with cancel functionality
   - **Image Previews**: Thumbnail previews for uploaded images
   - **File Management**: View, download, and delete uploaded files
   - **Comment Attachments**: Add files directly to comments
   - **Bi-directional Sharing**: View files uploaded by Lyceum support team
   - **Secure Storage**: Files stored in encrypted cloud storage
   - **Client-side Validation**: Immediate feedback on file type and size
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

### Comment Management Component Example

Here's a complete React component that demonstrates comment display, editing, and deletion with file attachments:

```typescript
import React, { useState, useEffect } from 'react';

interface Comment {
  id: string;
  content: string;
  author_name: string;
  author_type: 'user' | 'admin';
  created_at: string;
  updated_at?: string;
  edited_by?: string;
  edit_reason?: string;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  public_url: string;
  uploaded_at: string;
}

const TicketComments = ({ ticketKey, userToken }: { ticketKey: string; userToken: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [ticketKey]);

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}/timeline`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'X-Client-App': 'CentCom'
        }
      });
      const data = await response.json();
      if (data.success) {
        // Filter only comment events
        const commentEvents = data.timeline.filter((event: any) => event.type === 'comment');
        setComments(commentEvents);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  // Upload files for comment attachments
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const attachmentIds: string[] = [];
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ticketId', ticketKey);
      formData.append('attachment_type', getAttachmentType(file.type));

      try {
        const response = await fetch('/api/tickets/attachments/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'X-Client-App': 'CentCom'
          },
          body: formData
        });

        const data = await response.json();
        if (data.success) {
          attachmentIds.push(data.attachment.id);
          setUploadedAttachments(prev => [...prev, data.attachment]);
        }
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
    
    return attachmentIds;
  };

  // Add new comment
  const addComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      // Upload files first if any
      const attachmentIds = attachmentFiles.length > 0 
        ? await uploadFiles(attachmentFiles) 
        : [];

      const response = await fetch(`/api/tickets/by-key/${ticketKey}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
          'X-Client-App': 'CentCom'
        },
        body: JSON.stringify({
          content: newComment,
          attachment_ids: attachmentIds,
          is_internal: false
        })
      });

      if (response.ok) {
        setNewComment('');
        setAttachmentFiles([]);
        setUploadedAttachments([]);
        loadComments(); // Reload to show new comment
      } else {
        const error = await response.json();
        alert(`Failed to add comment: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  // Edit comment
  const startEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const saveEdit = async () => {
    if (!editingText.trim()) return;

    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}/comments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
          'X-Client-App': 'CentCom'
        },
        body: JSON.stringify({
          commentId: editingCommentId,
          content: editingText,
          edit_reason: 'Content updated'
        })
      });

      if (response.ok) {
        setEditingCommentId(null);
        setEditingText('');
        loadComments(); // Reload to show updated comment
      } else {
        const error = await response.json();
        alert(`Failed to update comment: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update comment:', error);
      alert('Failed to update comment');
    }
  };

  // Delete comment
  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This will also delete any attached files.')) {
      return;
    }

    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}/comments`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
          'X-Client-App': 'CentCom'
        },
        body: JSON.stringify({
          commentId: commentId
        })
      });

      if (response.ok) {
        loadComments(); // Reload to remove deleted comment
      } else {
        const error = await response.json();
        alert(`Failed to delete comment: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment');
    }
  };

  const getAttachmentType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'screenshot';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('log') || mimeType === 'text/plain') return 'log_file';
    return 'document';
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comments</h3>
      
      {/* Add new comment */}
      <div className="border rounded-lg p-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full border rounded p-2"
        />
        
        {/* File upload for comment attachments */}
        <div className="mt-2">
          <input
            type="file"
            multiple
            onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))}
            className="mb-2"
          />
          {attachmentFiles.length > 0 && (
            <div className="text-sm text-gray-600">
              {attachmentFiles.length} file(s) selected: {attachmentFiles.map(f => f.name).join(', ')}
            </div>
          )}
        </div>
        
        <button
          onClick={addComment}
          disabled={!newComment.trim() || loading}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Comment'}
        </button>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{comment.author_name}</span>
                <span className="text-xs text-gray-500">
                  {comment.author_type === 'admin' ? 'Admin' : 'User'}
                </span>
                {comment.updated_at && comment.updated_at !== comment.created_at && (
                  <span className="text-xs text-gray-400 italic">(edited)</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
                
                {/* Edit/Delete buttons - only show for user's own comments */}
                {comment.author_type === 'user' && (
                  <div className="flex space-x-1">
                    {editingCommentId === comment.id ? (
                      <>
                        <button
                          onClick={cancelEdit}
                          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={!editingText.trim()}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(comment)}
                          className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Comment content - editable if in edit mode */}
            {editingCommentId === comment.id ? (
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                rows={3}
                className="w-full border rounded p-2"
              />
            ) : (
              <div className="text-gray-900 whitespace-pre-wrap mb-3">
                {comment.content}
              </div>
            )}
            
            {/* Comment attachments */}
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <h4 className="text-xs font-medium text-gray-700 mb-2">
                  Attachments ({comment.attachments.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {comment.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {attachment.original_filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.file_size)}
                        </p>
                      </div>
                      <a
                        href={attachment.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketComments;
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

## Comment Edit and Delete Operations

### Important Note about Comment IDs

When working with comment operations (edit/delete), there's an important distinction between **display IDs** and **actual comment IDs**:

- **Timeline API** returns comments with prefixed IDs like `"comment-12345-uuid"` for React key uniqueness
- **Edit/Delete APIs** require the actual comment UUID like `"12345-uuid"`

The timeline API now includes a `commentId` field with the actual UUID:

```typescript
interface TimelineEvent {
  id: string          // Display ID: "comment-12345-uuid"
  commentId?: string  // Actual ID: "12345-uuid" (use this for edit/delete)
  type: string
  // ... other fields
}
```

### Edit Comment API

**Endpoint**: `PATCH /api/tickets/by-key/{ticketKey}/comments`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {centcom_api_token}
X-Centcom-User-ID: {user_id}
```

**Request Body**:
```json
{
  "commentId": "actual-comment-uuid-here",  // Use commentId from timeline, not id
  "content": "Updated comment content",
  "edit_reason": "Fixed typo"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "comment": {
    "id": "comment-uuid",
    "content": "Updated comment content",
    "updated_at": "2024-01-01T12:00:00Z",
    "edited_by": "user-uuid"
  },
  "message": "Comment updated successfully"
}
```

### Delete Comment API

**Endpoint**: `DELETE /api/tickets/by-key/{ticketKey}/comments`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {centcom_api_token}
X-Centcom-User-ID: {user_id}
```

**Request Body**:
```json
{
  "commentId": "actual-comment-uuid-here"  // Use commentId from timeline, not id
}
```

**Response**:
```json
{
  "success": true,
  "message": "Comment and associated attachments deleted successfully"
}
```

### Frontend Integration for Comment Management

Here's a React component example showing how to handle comment editing and deletion:

```typescript
interface CommentActionsProps {
  comment: TimelineEvent
  ticketKey: string
  onCommentUpdated: () => void
  onCommentDeleted: () => void
}

const CommentActions: React.FC<CommentActionsProps> = ({
  comment,
  ticketKey,
  onCommentUpdated,
  onCommentDeleted
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.description || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleEdit = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}/comments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getCentcomApiToken()}`,
          'X-Centcom-User-ID': getUserId()
        },
        body: JSON.stringify({
          commentId: comment.commentId || comment.id, // Use commentId preferentially
          content: editContent,
          edit_reason: 'Content updated'
        })
      })

      if (response.ok) {
        setIsEditing(false)
        onCommentUpdated()
      } else {
        const error = await response.json()
        console.error('Failed to edit comment:', error)
      }
    } catch (error) {
      console.error('Edit comment error:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}/comments`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getCentcomApiToken()}`,
          'X-Centcom-User-ID': getUserId()
        },
        body: JSON.stringify({
          commentId: comment.commentId || comment.id // Use commentId preferentially
        })
      })

      if (response.ok) {
        setShowDeleteModal(false)
        onCommentDeleted()
      } else {
        const error = await response.json()
        console.error('Failed to delete comment:', error)
      }
    } catch (error) {
      console.error('Delete comment error:', error)
    }
  }

  return (
    <div className="comment-actions">
      {isEditing ? (
        <div>
          <textarea 
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <div className="flex gap-2 mt-2">
            <button 
              onClick={handleEdit}
              disabled={isUpdating}
              className="px-3 py-1 bg-blue-500 text-white rounded"
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button 
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
          >
            Edit
          </button>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="px-2 py-1 text-red-600 hover:bg-red-100 rounded"
          >
            Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Comment</h3>
            <p className="mb-4">
              Are you sure you want to delete this comment? This action cannot be undone.
              {comment.attachments?.length > 0 && (
                <span className="block mt-2 text-orange-600">
                  ⚠️ This will also delete {comment.attachments.length} attached file(s).
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-white bg-red-600 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Timeline Events Integration

The system now automatically creates timeline events when comments are edited or deleted. These appear in the ticket timeline with appropriate icons:

- **Comment Edit**: 🖊️ Orange pencil icon - "Comment edited"
- **Comment Delete**: 🗑️ Red trash icon - "Comment deleted"

These events help track all activities on a ticket for audit and history purposes.

### Permission Considerations

- Users can only edit/delete their own comments
- The system validates ownership based on the `author_id` field
- Admins can edit/delete any comment
- All edit/delete actions are logged in the ticket timeline

### Planned Features
- Email notifications for status changes
- Webhook support for external integrations
- Advanced search and filtering
- Ticket templates and automation
- SLA tracking and reporting
