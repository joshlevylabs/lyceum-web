"use client"

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  File,
  Check,
  X,
  AlertTriangle,
  Download,
  Database,
  MapPin,
  Play,
  RefreshCw
} from 'lucide-react';

interface CSVColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  sample_values: string[];
  nullable: boolean;
  suggested_mapping?: string;
}

interface CSVPreview {
  columns: CSVColumn[];
  rows: any[][];
  total_rows: number;
  file_size: string;
  estimated_import_time: string;
}

interface ImportProgress {
  status: 'preparing' | 'processing' | 'validating' | 'importing' | 'completed' | 'error';
  progress: number;
  message: string;
  rows_processed?: number;
  total_rows?: number;
  errors?: string[];
}

interface CSVImportWizardProps {
  clusterId: string;
  projectId?: string;
  onImportComplete?: (importResult: any) => void;
}

export default function CSVImportWizard({ 
  clusterId, 
  projectId, 
  onImportComplete 
}: CSVImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'mapping' | 'import'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableDescription, setTableDescription] = useState('');
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const COMMON_DATA_TYPES = [
    { value: 'text', label: 'Text', description: 'String values' },
    { value: 'number', label: 'Number', description: 'Numeric values' },
    { value: 'date', label: 'Date/Time', description: 'Timestamp values' },
    { value: 'boolean', label: 'Boolean', description: 'True/False values' }
  ];

  const SUGGESTED_MAPPINGS = [
    'timestamp', 'datetime', 'created_at', 'updated_at',
    'id', 'user_id', 'product_id', 'session_id',
    'name', 'title', 'description', 'category',
    'value', 'amount', 'price', 'quantity',
    'status', 'state', 'type', 'level',
    'email', 'phone', 'address', 'location'
  ];

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile) return;
    
    const validTypes = ['text/csv', 'application/csv', 'text/plain'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      setError('Please select a valid CSV file');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
      setError('File size must be less than 100MB');
      return;
    }

    setFile(selectedFile);
    setTableName(selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, '_'));
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const generatePreview = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clusterId', clusterId);
      
      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

      const response = await fetch('/api/data/csv-preview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const preview = await response.json();
      setCsvPreview(preview);
      
      // Initialize column mappings with suggested mappings
      const mappings: Record<string, string> = {};
      preview.columns.forEach((column: CSVColumn) => {
        mappings[column.name] = column.suggested_mapping || column.type;
      });
      setColumnMappings(mappings);
      
      setCurrentStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const startImport = async () => {
    if (!file || !tableName.trim()) return;

    setCurrentStep('import');
    setImportProgress({
      status: 'preparing',
      progress: 0,
      message: 'Preparing import...'
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clusterId', clusterId);
      formData.append('projectId', projectId || '');
      formData.append('tableName', tableName.trim());
      formData.append('tableDescription', tableDescription);
      formData.append('columnMappings', JSON.stringify(columnMappings));

      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

      const response = await fetch('/api/data/csv-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to start import');
      }

      // Start polling for progress
      const importId = (await response.json()).importId;
      pollImportProgress(importId);

    } catch (err) {
      setImportProgress({
        status: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : 'Import failed',
        errors: [err instanceof Error ? err.message : 'Import failed']
      });
    }
  };

  const pollImportProgress = async (importId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('supabase-auth-token') || 
                     (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

        const response = await fetch(`/api/data/import-progress/${importId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to check import progress');
        }

        const progress = await response.json();
        setImportProgress(progress);

        if (progress.status === 'completed') {
          clearInterval(pollInterval);
          onImportComplete?.(progress);
        } else if (progress.status === 'error') {
          clearInterval(pollInterval);
        }
      } catch (err) {
        clearInterval(pollInterval);
        setImportProgress({
          status: 'error',
          progress: 0,
          message: 'Failed to check import progress',
          errors: [err instanceof Error ? err.message : 'Unknown error']
        });
      }
    }, 2000);
  };

  const resetWizard = () => {
    setCurrentStep('upload');
    setFile(null);
    setCsvPreview(null);
    setTableName('');
    setTableDescription('');
    setColumnMappings({});
    setImportProgress(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload CSV File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drop your CSV file here
          </h3>
          <p className="text-gray-600 mb-4">
            or click to browse for files
          </p>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
          >
            Select File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/csv"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>

        {/* File Info */}
        {file && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <File className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">{file.name}</p>
                <p className="text-sm text-blue-700">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Requirements */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Requirements:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• CSV format with headers in first row</li>
            <li>• Maximum file size: 100MB</li>
            <li>• UTF-8 encoding recommended</li>
            <li>• Comma-separated values</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button 
            onClick={generatePreview}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Continue
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Preview & Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Table Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tableName">Table Name *</Label>
              <Input
                id="tableName"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Enter table name"
              />
            </div>
            <div>
              <Label htmlFor="tableDescription">Description (Optional)</Label>
              <Input
                id="tableDescription"
                value={tableDescription}
                onChange={(e) => setTableDescription(e.target.value)}
                placeholder="Describe this dataset"
              />
            </div>
          </div>

          {/* File Info */}
          {csvPreview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total Rows</p>
                <p className="font-semibold">{csvPreview.total_rows.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Columns</p>
                <p className="font-semibold">{csvPreview.columns.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">File Size</p>
                <p className="font-semibold">{csvPreview.file_size}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Est. Import Time</p>
                <p className="font-semibold">{csvPreview.estimated_import_time}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {csvPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Column Mapping & Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {csvPreview.columns.map((column, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="font-medium">{column.name}</Label>
                      <div className="mt-1">
                        <Badge variant="outline">{column.type}</Badge>
                        {column.nullable && (
                          <Badge variant="secondary" className="ml-1">Nullable</Badge>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Sample values:</p>
                        <p className="text-sm text-gray-700">
                          {column.sample_values.slice(0, 3).join(', ')}...
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Data Type</Label>
                      <Select
                        value={columnMappings[column.name]?.split(':')[0] || column.type}
                        onValueChange={(value) => 
                          setColumnMappings(prev => ({
                            ...prev,
                            [column.name]: value
                          }))
                        }
                      >
                        {COMMON_DATA_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>Semantic Mapping (Optional)</Label>
                      <Select
                        value={columnMappings[column.name]?.split(':')[1] || ''}
                        onValueChange={(value) => 
                          setColumnMappings(prev => ({
                            ...prev,
                            [column.name]: `${columnMappings[column.name]?.split(':')[0] || column.type}:${value}`
                          }))
                        }
                      >
                        <option value="">Auto-detect</option>
                        {SUGGESTED_MAPPINGS.map(mapping => (
                          <option key={mapping} value={mapping}>
                            {mapping}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={startImport}
                disabled={!tableName.trim()}
              >
                <Database className="h-4 w-4 mr-2" />
                Start Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderImportStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Importing Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {importProgress && (
          <>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">{importProgress.message}</h3>
              <Progress value={importProgress.progress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">
                {importProgress.progress}% complete
                {importProgress.rows_processed && importProgress.total_rows && (
                  <span className="ml-2">
                    ({importProgress.rows_processed.toLocaleString()} / {importProgress.total_rows.toLocaleString()} rows)
                  </span>
                )}
              </p>
            </div>

            {importProgress.status === 'error' && importProgress.errors && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Import Errors:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {importProgress.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {importProgress.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                <Check className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <h3 className="text-lg font-medium text-green-800 mb-1">
                  Import Completed Successfully!
                </h3>
                <p className="text-green-700">
                  Your data has been imported and is ready for analysis.
                </p>
              </div>
            )}

            <div className="flex justify-center gap-2">
              {importProgress.status === 'completed' || importProgress.status === 'error' ? (
                <Button onClick={resetWizard}>
                  Import Another File
                </Button>
              ) : (
                <Button disabled>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['upload', 'preview', 'import'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 
                ${currentStep === step ? 'border-blue-500 bg-blue-500 text-white' :
                  ['upload', 'preview', 'mapping'].indexOf(currentStep) > index 
                    ? 'border-green-500 bg-green-500 text-white' 
                    : 'border-gray-300 bg-white text-gray-500'
                }
              `}>
                {['upload', 'preview', 'mapping'].indexOf(currentStep) > index ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={`ml-2 ${
                currentStep === step ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}>
                {step === 'upload' ? 'Upload' : step === 'preview' ? 'Configure' : 'Import'}
              </span>
              {index < 2 && (
                <div className={`mx-4 h-0.5 w-16 ${
                  ['upload', 'preview', 'mapping'].indexOf(currentStep) > index 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'preview' && renderPreviewStep()}
      {currentStep === 'import' && renderImportStep()}
    </div>
  );
}
