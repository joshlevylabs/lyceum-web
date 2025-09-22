'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  XMarkIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline'

interface FileUploadProps {
  ticketId: string
  commentId?: string | null
  onUploadComplete?: (attachments: TicketAttachment[]) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
  className?: string
  accept?: string
  disabled?: boolean
  showExisting?: boolean
  existingAttachments?: TicketAttachment[]
  collapsible?: boolean // Enable collapsible mode
  defaultCollapsed?: boolean // Start collapsed
  compactMode?: boolean // Compact inline mode for comments
  title?: string // Custom title for the upload section
  resetTrigger?: number // When this value changes, reset the component
}

interface TicketAttachment {
  id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  attachment_type: 'screenshot' | 'video' | 'document' | 'other'
  public_url: string
  file_category: 'image' | 'video' | 'document' | 'archive' | 'other'
  size_formatted: string
  description?: string
  uploaded_at: string
  uploaded_by?: string
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  attachment?: TicketAttachment
}

const ACCEPTED_TYPES = {
  // Images
  'image/jpeg': { icon: PhotoIcon, color: 'text-green-500', category: 'image' },
  'image/jpg': { icon: PhotoIcon, color: 'text-green-500', category: 'image' },
  'image/png': { icon: PhotoIcon, color: 'text-green-500', category: 'image' },
  'image/gif': { icon: PhotoIcon, color: 'text-green-500', category: 'image' },
  'image/webp': { icon: PhotoIcon, color: 'text-green-500', category: 'image' },
  'image/svg+xml': { icon: PhotoIcon, color: 'text-green-500', category: 'image' },
  
  // Videos
  'video/mp4': { icon: VideoCameraIcon, color: 'text-purple-500', category: 'video' },
  'video/webm': { icon: VideoCameraIcon, color: 'text-purple-500', category: 'video' },
  'video/ogg': { icon: VideoCameraIcon, color: 'text-purple-500', category: 'video' },
  'video/avi': { icon: VideoCameraIcon, color: 'text-purple-500', category: 'video' },
  'video/mov': { icon: VideoCameraIcon, color: 'text-purple-500', category: 'video' },
  'video/quicktime': { icon: VideoCameraIcon, color: 'text-purple-500', category: 'video' },
  
  // Documents
  'application/pdf': { icon: DocumentIcon, color: 'text-red-500', category: 'document' },
  'application/msword': { icon: DocumentIcon, color: 'text-blue-500', category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: DocumentIcon, color: 'text-blue-500', category: 'document' },
  'application/vnd.ms-excel': { icon: DocumentIcon, color: 'text-green-600', category: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: DocumentIcon, color: 'text-green-600', category: 'document' },
  'text/plain': { icon: DocumentIcon, color: 'text-gray-500', category: 'document' },
  'text/csv': { icon: DocumentIcon, color: 'text-gray-500', category: 'document' },
  'application/json': { icon: DocumentIcon, color: 'text-gray-500', category: 'document' },
  'application/xml': { icon: DocumentIcon, color: 'text-gray-500', category: 'document' },
  
  // Archives
  'application/zip': { icon: DocumentArrowDownIcon, color: 'text-orange-500', category: 'archive' },
  'application/x-rar-compressed': { icon: DocumentArrowDownIcon, color: 'text-orange-500', category: 'archive' },
  'application/x-7z-compressed': { icon: DocumentArrowDownIcon, color: 'text-orange-500', category: 'archive' }
}

const FileUpload: React.FC<FileUploadProps> = ({
  ticketId,
  commentId = null,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  className = '',
  accept,
  disabled = false,
  showExisting = true,
  existingAttachments = [],
  collapsible = false,
  defaultCollapsed = false,
  compactMode = false,
  title = 'Upload Files',
  resetTrigger = 0
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [completedAttachments, setCompletedAttachments] = useState<TicketAttachment[]>([])

  // Update completedAttachments when existingAttachments prop changes
  // Use a ref to track previous value to avoid infinite loops
  const prevExistingAttachments = useRef<TicketAttachment[]>([])
  
  useEffect(() => {
    if (JSON.stringify(prevExistingAttachments.current) !== JSON.stringify(existingAttachments)) {
      setCompletedAttachments(existingAttachments)
      prevExistingAttachments.current = existingAttachments
    }
  }, [existingAttachments])

  // Reset component when resetTrigger changes (used for compact mode)
  useEffect(() => {
    if (resetTrigger > 0) {
      setUploadingFiles([])
      setCompletedAttachments([])
    }
  }, [resetTrigger])
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileTypeInfo = (mimeType: string) => {
    return ACCEPTED_TYPES[mimeType as keyof typeof ACCEPTED_TYPES] || {
      icon: DocumentIcon,
      color: 'text-gray-500',
      category: 'other'
    }
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES]) {
      return `File type ${file.type} is not supported`
    }

    // Check file size (from our backend limits)
    const typeInfo = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES]
    const maxSizes = {
      image: 500 * 1024 * 1024, // 500MB
      video: 500 * 1024 * 1024, // 500MB
      document: 500 * 1024 * 1024, // 500MB
      archive: 500 * 1024 * 1024 // 500MB
    }

    const maxSize = maxSizes[typeInfo.category as keyof typeof maxSizes] || 500 * 1024 * 1024
    if (file.size > maxSize) {
      return `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
    }

    return null
  }

  const uploadFile = async (file: File, uploadId: string) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ticketId', ticketId)
      if (commentId) {
        formData.append('commentId', commentId)
      }

      const response = await fetch('/api/tickets/attachments/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Upload response error:', errorData)
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      if (!result.success) {
        console.error('Upload result error:', result)
        throw new Error(result.error || 'Upload failed')
      }

      // Update uploading file status
      setUploadingFiles(prev => 
        prev.map(f => 
          f.id === uploadId 
            ? { ...f, status: 'success', progress: 100, attachment: result.attachment }
            : f
        )
      )

      // Add to completed attachments
      setCompletedAttachments(prev => [...prev, result.attachment])

      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete([result.attachment])
      }

      return result.attachment

    } catch (error: any) {
      console.error('Upload error:', error)
      
      // Update uploading file status
      setUploadingFiles(prev => 
        prev.map(f => 
          f.id === uploadId 
            ? { ...f, status: 'error', error: error.message }
            : f
        )
      )

      // Check if it's a storage setup issue
      if (error.message.includes('Storage bucket not found') || error.message.includes('setup_required')) {
        if (onUploadError) {
          onUploadError('Storage not configured. Please contact an administrator to set up file storage.')
        }
      } else {
        if (onUploadError) {
          onUploadError(error.message)
        }
      }

      throw error
    }
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return

    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    // Validate files
    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    }

    // Report validation errors
    if (errors.length > 0) {
      if (onUploadError) {
        onUploadError(errors.join('\n'))
      }
    }

    // Check total file limit
    const totalFiles = uploadingFiles.length + completedAttachments.length + validFiles.length
    if (totalFiles > maxFiles) {
      if (onUploadError) {
        onUploadError(`Maximum ${maxFiles} files allowed. Current: ${uploadingFiles.length + completedAttachments.length}, Adding: ${validFiles.length}`)
      }
      return
    }

    // Start uploads
    for (const file of validFiles) {
      const uploadId = Math.random().toString(36).substring(2, 15)
      
      // Add to uploading files
      setUploadingFiles(prev => [...prev, {
        id: uploadId,
        file,
        progress: 0,
        status: 'uploading'
      }])

      // Start upload
      uploadFile(file, uploadId)
    }
  }, [disabled, uploadingFiles.length, completedAttachments.length, maxFiles, ticketId, commentId, onUploadComplete, onUploadError])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [disabled, handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && e.target.files) {
      handleFiles(e.target.files)
      // Reset input
      e.target.value = ''
    }
  }, [disabled, handleFiles])

  const removeUploadingFile = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== uploadId))
  }

  const removeCompletedAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/tickets/by-id/${ticketId}/attachments`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ attachmentId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete file')
      }

      // Remove from local state
      setCompletedAttachments(prev => prev.filter(a => a.id !== attachmentId))

    } catch (error: any) {
      console.error('Delete error:', error)
      if (onUploadError) {
        onUploadError(`Failed to delete file: ${error.message}`)
      }
    }
  }

  const openFile = (attachment: TicketAttachment) => {
    window.open(attachment.public_url, '_blank')
  }

  const totalFiles = uploadingFiles.length + completedAttachments.length

  // Compact mode for comments
  if (compactMode) {
    return (
      <div className={`relative ${className}`}>
        {/* Drag overlay for compact mode */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            absolute inset-0 border-2 border-dashed rounded-lg transition-all z-20
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50 opacity-95 flex items-center justify-center' 
              : 'border-transparent pointer-events-none'
            }
          `}
        >
          {isDragOver && (
            <div className="text-center">
              <CloudArrowUpIcon className="mx-auto h-8 w-8 text-blue-500" />
              <p className="text-sm font-medium text-blue-600 mt-2">Drop files to attach</p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => !disabled && fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Attach files"
          >
            <PaperClipIcon className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept || 'image/*,video/*,.pdf,.doc,.docx,.txt,.zip'}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          {totalFiles > 0 && (
            <span className="text-xs text-gray-500">
              {totalFiles} file{totalFiles !== 1 ? 's' : ''} attached
            </span>
          )}
        </div>

        {/* Show uploading files in compact mode */}
        {uploadingFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {uploadingFiles.map((uploadingFile) => (
              <div key={uploadingFile.id} className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600 truncate max-w-32">{uploadingFile.file.name}</span>
                {uploadingFile.status === 'error' && (
                  <span className="text-red-500">✗</span>
                )}
                {uploadingFile.status === 'success' && (
                  <span className="text-green-500">✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Collapsible Header */}
      {collapsible && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 flex items-center">
            <PaperClipIcon className="h-4 w-4 mr-2" />
            {title} ({totalFiles})
          </h4>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isCollapsed ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>
      )}

      {/* Upload Area - Hidden when collapsed */}
      {(!collapsible || !isCollapsed) && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <CloudArrowUpIcon className={`mx-auto h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-900">
              {isDragOver ? 'Drop files here' : 'Upload files'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Click to browse or drag and drop files here
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Images, videos, documents up to 500MB • {totalFiles}/{maxFiles} files
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept || 'image/*,video/*,.pdf,.doc,.docx,.txt,.zip'}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {/* Uploading Files - Hidden when collapsed */}
      {uploadingFiles.length > 0 && (!collapsible || !isCollapsed) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploading...</h4>
          {uploadingFiles.map((uploadingFile) => {
            const typeInfo = getFileTypeInfo(uploadingFile.file.type)
            const IconComponent = typeInfo.icon

            return (
              <div key={uploadingFile.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <IconComponent className={`h-8 w-8 ${typeInfo.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadingFile.file.size)}
                    </p>
                    {uploadingFile.status === 'uploading' && (
                      <div className="flex-1 bg-gray-200 rounded-full h-1">
                        <div className="bg-blue-600 h-1 rounded-full transition-all duration-300" style={{ width: '50%' }} />
                      </div>
                    )}
                    {uploadingFile.status === 'error' && (
                      <div className="flex items-center space-x-1">
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                        <p className="text-xs text-red-600">{uploadingFile.error}</p>
                      </div>
                    )}
                    {uploadingFile.status === 'success' && (
                      <p className="text-xs text-green-600">✓ Uploaded</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeUploadingFile(uploadingFile.id)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed Attachments - Hidden when collapsed */}
      {showExisting && completedAttachments.length > 0 && (!collapsible || !isCollapsed) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Attached Files</h4>
          {completedAttachments.map((attachment) => {
            const typeInfo = getFileTypeInfo(attachment.mime_type)
            const IconComponent = typeInfo.icon

            return (
              <div key={attachment.id} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
                <IconComponent className={`h-8 w-8 ${typeInfo.color} flex-shrink-0`} />
                
                {/* Image preview */}
                {attachment.file_category === 'image' && (
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                      src={attachment.public_url} 
                      alt={attachment.original_filename}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.original_filename}
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">
                      {attachment.size_formatted}
                    </p>
                    <p className="text-xs text-gray-400">•</p>
                    <p className="text-xs text-gray-500">
                      {new Date(attachment.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openFile(attachment)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                    title="View file"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeCompletedAttachment(attachment.id)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600"
                    title="Delete file"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FileUpload
