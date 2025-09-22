# 📎 Centcom File Upload Integration Guide

## Overview

This guide provides comprehensive documentation for integrating file upload functionality into the Centcom platform, allowing users to attach documents, images, and videos to support tickets and comments.

## 🎯 Features Implemented

### **File Upload Capabilities**
- **Multi-format Support**: Images (JPEG, PNG, GIF, WebP, SVG), Videos (MP4, WebM, AVI, MOV), Documents (PDF, DOC, TXT, CSV), Archives (ZIP, RAR, 7Z)
- **Drag & Drop Interface**: Modern file upload with visual feedback
- **File Validation**: Automatic type and size validation before upload
- **Progress Tracking**: Real-time upload progress indicators
- **Preview Support**: Image thumbnails and file information display
- **File Management**: View, download, and delete uploaded files

### **Integration Points**
- **Ticket Creation**: Attach files when creating new tickets
- **Ticket Editing**: Add additional files to existing tickets
- **Comments**: Attach files to comments for better communication
- **Admin Panel**: Full file management and viewing capabilities

---

## 🔧 Backend API Endpoints

### **File Upload Endpoint**

#### **POST** `/api/tickets/attachments/upload`

Upload files for tickets or comments.

**Request Format:**
```typescript
// Multipart form data
const formData = new FormData()
formData.append('file', fileObject)
formData.append('ticketId', ticketId)
formData.append('commentId', commentId) // Optional: for comment attachments
formData.append('description', 'File description') // Optional
```

**Authentication:**
```typescript
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'multipart/form-data' // Browser sets this automatically
}
```

**Response:**
```typescript
{
  "success": true,
  "attachment": {
    "id": "uuid",
    "filename": "stored_filename.jpg",
    "original_filename": "user_file.jpg",
    "file_size": 1024768,
    "mime_type": "image/jpeg",
    "file_extension": "jpg",
    "attachment_type": "screenshot",
    "public_url": "https://storage.url/path/to/file",
    "file_category": "image",
    "uploaded_at": "2024-01-15T10:30:00Z"
  },
  "message": "File uploaded successfully"
}
```

**Error Response:**
```typescript
{
  "error": "File type image/bmp is not allowed",
  "allowedTypes": ["image/jpeg", "image/png", ...],
  "maxSize": 10485760
}
```

### **File Listing Endpoint**

#### **GET** `/api/tickets/{ticketId}/attachments`

Retrieve all attachments for a specific ticket.

**Authentication:**
```typescript
headers: {
  'Authorization': `Bearer ${userToken}`
}
```

**Response:**
```typescript
{
  "success": true,
  "attachments": [
    {
      "id": "uuid",
      "filename": "stored_filename.jpg",
      "original_filename": "user_file.jpg",
      "file_size": 1024768,
      "mime_type": "image/jpeg",
      "attachment_type": "screenshot",
      "public_url": "https://storage.url/path/to/file",
      "file_category": "image",
      "size_formatted": "1.02 MB",
      "uploaded_at": "2024-01-15T10:30:00Z",
      "uploaded_by": "user_id"
    }
  ],
  "count": 3,
  "ticket_id": "ticket_uuid",
  "ticket_key": "BUG-123"
}
```

### **File Deletion Endpoint**

#### **DELETE** `/api/tickets/{ticketId}/attachments`

Delete a specific attachment.

**Request:**
```typescript
{
  "attachmentId": "attachment_uuid"
}
```

**Authentication:**
```typescript
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

**Response:**
```typescript
{
  "success": true,
  "message": "Attachment deleted successfully",
  "attachment_id": "attachment_uuid"
}
```

---

## 📱 Frontend Integration

### **React/TypeScript Component Example**

```typescript
import React, { useState, useCallback } from 'react'

interface FileUploadProps {
  ticketId: string
  commentId?: string
  onUploadComplete?: (attachments: any[]) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
}

const CentcomFileUpload: React.FC<FileUploadProps> = ({
  ticketId,
  commentId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('ticketId', ticketId)
    if (commentId) {
      formData.append('commentId', commentId)
    }

    try {
      const response = await fetch('/api/tickets/attachments/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      if (result.success) {
        setAttachments(prev => [...prev, result.attachment])
        onUploadComplete?.([result.attachment])
      } else {
        throw new Error(result.error || 'Upload failed')
      }

    } catch (error: any) {
      console.error('Upload error:', error)
      onUploadError?.(error.message)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    files.forEach(uploadFile)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      files.forEach(uploadFile)
    }
  }, [])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
        isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <input
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <p className="text-gray-600">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Images, videos, documents up to 100MB
        </p>
      </label>
      
      {/* Display uploaded files */}
      {attachments.map(attachment => (
        <div key={attachment.id} className="flex items-center space-x-2 mt-2 p-2 bg-gray-50 rounded">
          <span className="text-sm">{attachment.original_filename}</span>
          <span className="text-xs text-gray-500">({attachment.size_formatted})</span>
          <button 
            onClick={() => window.open(attachment.public_url, '_blank')}
            className="text-blue-600 text-xs"
          >
            View
          </button>
        </div>
      ))}
    </div>
  )
}

export default CentcomFileUpload
```

### **Vue.js Component Example**

```vue
<template>
  <div
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="handleDrop"
    :class="[
      'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
      isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
    ]"
  >
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
      @change="handleFileSelect"
      class="hidden"
    />
    
    <div @click="$refs.fileInput.click()" class="cursor-pointer">
      <p class="text-gray-600">Drop files here or click to browse</p>
      <p class="text-xs text-gray-500 mt-1">Images, videos, documents up to 100MB</p>
    </div>

    <!-- Display uploaded files -->
    <div v-for="attachment in attachments" :key="attachment.id" 
         class="flex items-center space-x-2 mt-2 p-2 bg-gray-50 rounded">
      <span class="text-sm">{{ attachment.original_filename }}</span>
      <span class="text-xs text-gray-500">({{ attachment.size_formatted }})</span>
      <button @click="viewFile(attachment)" class="text-blue-600 text-xs">
        View
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CentcomFileUpload',
  props: {
    ticketId: { type: String, required: true },
    commentId: { type: String, default: null },
    maxFiles: { type: Number, default: 10 }
  },
  data() {
    return {
      isDragOver: false,
      attachments: [],
      uploading: false
    }
  },
  methods: {
    async uploadFile(file) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ticketId', this.ticketId)
      if (this.commentId) {
        formData.append('commentId', this.commentId)
      }

      try {
        const response = await fetch('/api/tickets/attachments/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.userToken}`
          },
          body: formData
        })

        const result = await response.json()
        
        if (result.success) {
          this.attachments.push(result.attachment)
          this.$emit('upload-complete', [result.attachment])
        } else {
          throw new Error(result.error || 'Upload failed')
        }

      } catch (error) {
        console.error('Upload error:', error)
        this.$emit('upload-error', error.message)
      }
    },

    handleDrop(e) {
      this.isDragOver = false
      const files = Array.from(e.dataTransfer.files)
      files.forEach(this.uploadFile)
    },

    handleFileSelect(e) {
      if (e.target.files) {
        const files = Array.from(e.target.files)
        files.forEach(this.uploadFile)
      }
    },

    viewFile(attachment) {
      window.open(attachment.public_url, '_blank')
    }
  }
}
</script>
```

### **JavaScript (Vanilla) Integration**

```javascript
class CentcomFileUpload {
  constructor(container, options = {}) {
    this.container = container
    this.ticketId = options.ticketId
    this.commentId = options.commentId
    this.userToken = options.userToken
    this.onUploadComplete = options.onUploadComplete
    this.onUploadError = options.onUploadError
    this.maxFiles = options.maxFiles || 10
    
    this.attachments = []
    this.init()
  }

  init() {
    this.createUploadArea()
    this.bindEvents()
  }

  createUploadArea() {
    this.container.innerHTML = `
      <div class="file-upload-area" style="
        border: 2px dashed #ddd;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip" style="display: none;">
        <p>Drop files here or click to browse</p>
        <p style="font-size: 12px; color: #666; margin-top: 5px;">
          Images, videos, documents up to 100MB
        </p>
        <div class="attachments-list"></div>
      </div>
    `
  }

  bindEvents() {
    const uploadArea = this.container.querySelector('.file-upload-area')
    const fileInput = this.container.querySelector('input[type="file"]')
    const attachmentsList = this.container.querySelector('.attachments-list')

    // Click to browse
    uploadArea.addEventListener('click', () => fileInput.click())

    // File selection
    fileInput.addEventListener('change', (e) => {
      if (e.target.files) {
        Array.from(e.target.files).forEach(file => this.uploadFile(file))
      }
    })

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault()
      uploadArea.style.borderColor = '#007bff'
      uploadArea.style.backgroundColor = '#f8f9ff'
    })

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault()
      uploadArea.style.borderColor = '#ddd'
      uploadArea.style.backgroundColor = 'transparent'
    })

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault()
      uploadArea.style.borderColor = '#ddd'
      uploadArea.style.backgroundColor = 'transparent'
      
      const files = Array.from(e.dataTransfer.files)
      files.forEach(file => this.uploadFile(file))
    })
  }

  async uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('ticketId', this.ticketId)
    if (this.commentId) {
      formData.append('commentId', this.commentId)
    }

    try {
      const response = await fetch('/api/tickets/attachments/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        },
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        this.attachments.push(result.attachment)
        this.displayAttachment(result.attachment)
        this.onUploadComplete?.(result.attachment)
      } else {
        throw new Error(result.error || 'Upload failed')
      }

    } catch (error) {
      console.error('Upload error:', error)
      this.onUploadError?.(error.message)
    }
  }

  displayAttachment(attachment) {
    const attachmentsList = this.container.querySelector('.attachments-list')
    const attachmentEl = document.createElement('div')
    attachmentEl.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
    `
    
    attachmentEl.innerHTML = `
      <span style="font-size: 14px;">${attachment.original_filename}</span>
      <span style="font-size: 12px; color: #666;">(${attachment.size_formatted})</span>
      <button onclick="window.open('${attachment.public_url}', '_blank')" 
              style="color: #007bff; font-size: 12px; border: none; background: none; cursor: pointer;">
        View
      </button>
    `
    
    attachmentsList.appendChild(attachmentEl)
  }
}

// Usage
const fileUpload = new CentcomFileUpload(
  document.getElementById('file-upload-container'),
  {
    ticketId: 'ticket-uuid',
    userToken: 'bearer-token',
    onUploadComplete: (attachment) => {
      console.log('File uploaded:', attachment)
    },
    onUploadError: (error) => {
      alert('Upload failed: ' + error)
    }
  }
)
```

---

## 📋 File Type Specifications

### **Supported File Types & Limits**

| Category | File Types | Extensions | Max Size | Use Cases |
|----------|------------|------------|----------|-----------|
| **Images** | JPEG, PNG, GIF, WebP, SVG | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg` | 10 MB | Screenshots, diagrams, UI mockups |
| **Videos** | MP4, WebM, AVI, MOV | `.mp4`, `.webm`, `.avi`, `.mov` | 100 MB | Bug reproductions, feature demos |
| **Documents** | PDF, Word, Text, CSV | `.pdf`, `.doc`, `.docx`, `.txt`, `.csv` | 25 MB | Specs, logs, requirements |
| **Archives** | ZIP, RAR, 7Z | `.zip`, `.rar`, `.7z` | 50 MB | Log bundles, source code |

### **Validation Rules**

```typescript
const VALIDATION_RULES = {
  maxFileSize: {
    image: 10 * 1024 * 1024,     // 10 MB
    video: 100 * 1024 * 1024,    // 100 MB
    document: 25 * 1024 * 1024,  // 25 MB
    archive: 50 * 1024 * 1024    // 50 MB
  },
  allowedTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime',
    'application/pdf', 'application/msword', 'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
  ],
  maxFilesPerTicket: 10,
  maxFilesPerComment: 5
}
```

---

## 🔐 Security & Privacy

### **File Security**

1. **Virus Scanning**: All uploaded files are marked for scanning (production implementation required)
2. **Type Validation**: Strict MIME type checking on both client and server
3. **Size Limits**: Enforced file size limits prevent abuse
4. **Access Control**: Files are only accessible to ticket owners and admins
5. **Secure Storage**: Files stored in Supabase Storage with proper access policies

### **Privacy Controls**

```typescript
// File visibility options
interface AttachmentPrivacy {
  is_public: boolean        // Visible to ticket submitter
  is_internal: boolean      // Admin-only files
  comment_id?: string       // Associated with specific comment
}
```

### **Access Policies**

- **Ticket Files**: Visible to ticket creator and all admins
- **Comment Files**: Visible based on comment visibility (public/internal)
- **Admin Files**: Can be marked as internal (admin-only)
- **User Files**: Users can only delete their own attachments

---

## 🎨 UI/UX Guidelines

### **Design Patterns**

1. **Drag & Drop Zone**
   - Visual feedback during drag operations
   - Clear file type and size indicators
   - Progress indicators during upload

2. **File Display**
   - Thumbnail previews for images
   - File type icons for documents
   - File size and upload date
   - Quick action buttons (view, download, delete)

3. **Error Handling**
   - Clear error messages for invalid files
   - Retry mechanisms for failed uploads
   - Validation feedback before upload

### **Responsive Design**

```css
/* Mobile-first file upload styling */
.file-upload-area {
  min-height: 120px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s ease;
}

.file-upload-area:hover {
  border-color: #007bff;
  background-color: #f8f9ff;
}

.file-upload-area.drag-over {
  border-color: #007bff;
  background-color: #e3f2fd;
}

@media (max-width: 768px) {
  .file-upload-area {
    min-height: 100px;
    padding: 12px;
    font-size: 14px;
  }
}
```

---

## 🚀 Implementation Checklist

### **Phase 1: Basic Upload**
- [ ] Set up file upload component
- [ ] Implement drag & drop functionality
- [ ] Add file type validation
- [ ] Display upload progress
- [ ] Handle upload errors

### **Phase 2: File Management**
- [ ] Display uploaded files list
- [ ] Add file preview functionality
- [ ] Implement delete functionality
- [ ] Add file download links
- [ ] Show file metadata

### **Phase 3: Integration**
- [ ] Integrate with ticket creation form
- [ ] Add to comment system
- [ ] Update ticket editing interface
- [ ] Add attachment notifications
- [ ] Implement file search

### **Phase 4: Advanced Features**
- [ ] Image compression/resizing
- [ ] Video thumbnail generation
- [ ] Bulk file operations
- [ ] File versioning
- [ ] Collaborative file comments

---

## 🔧 Testing

### **Test File Upload**

```bash
# Test file upload with curl
curl -X POST "https://your-lyceum-domain.com/api/tickets/attachments/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg" \
  -F "ticketId=YOUR_TICKET_ID" \
  -F "description=Test upload"
```

### **Test File Retrieval**

```bash
# Get ticket attachments
curl -X GET "https://your-lyceum-domain.com/api/tickets/YOUR_TICKET_ID/attachments" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Test Cases**

1. **Valid Uploads**
   - Image files (JPEG, PNG, GIF)
   - Video files (MP4, WebM)
   - Document files (PDF, DOC)
   - Various file sizes (1KB to max limit)

2. **Invalid Uploads**
   - Unsupported file types
   - Files exceeding size limits
   - Corrupted files
   - Empty files

3. **Edge Cases**
   - Multiple simultaneous uploads
   - Network interruption during upload
   - Invalid ticket IDs
   - Expired authentication tokens

---

## 📞 Support & Troubleshooting

### **Common Issues**

1. **Upload Fails with 401 Unauthorized**
   - Verify authentication token is valid
   - Check token expiration
   - Ensure user has access to the ticket

2. **File Type Not Supported**
   - Check allowed MIME types list
   - Verify file extension matches content
   - Use supported file formats only

3. **File Too Large**
   - Check file size limits for each category
   - Compress files if possible
   - Split large files into smaller parts

4. **Upload Timeout**
   - Check network connection
   - Verify server upload limits
   - Try uploading smaller files

### **Debug Information**

```typescript
// Enable debug logging
const DEBUG_UPLOAD = true

if (DEBUG_UPLOAD) {
  console.log('Upload attempt:', {
    filename: file.name,
    size: file.size,
    type: file.type,
    ticketId,
    timestamp: new Date().toISOString()
  })
}
```

---

## 📈 Analytics & Monitoring

### **Upload Metrics**

Track these metrics for monitoring:

- Total files uploaded per day/week/month
- Average file size by category
- Upload success/failure rates
- Most common file types
- Storage usage by ticket/user
- Upload performance (speed, errors)

### **User Behavior Analytics**

- Files per ticket distribution
- Comment attachment usage
- File deletion rates
- Preview/download activity
- Mobile vs desktop upload patterns

---

## 🎯 Next Steps

1. **Implement file upload component** in your Centcom interface
2. **Test with various file types** and sizes
3. **Add error handling and user feedback**
4. **Integrate with existing ticket creation flow**
5. **Add to comment system for better communication**
6. **Monitor upload performance and user adoption**

For additional support or questions about the file upload integration, please refer to the main [Centcom Integration Guide](CENTCOM_TICKET_SYSTEM_INTEGRATION_GUIDE.md) or contact the Lyceum development team.
