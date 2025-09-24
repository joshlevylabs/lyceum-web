import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

// Mock CSV parsing and analysis
function parseCSVPreview(csvContent: string): any {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Parse sample rows (first 100 rows for preview)
  const sampleRows = lines.slice(1, Math.min(101, lines.length))
    .map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
  
  // Analyze columns
  const columns = headers.map((header, index) => {
    const sampleValues = sampleRows
      .map(row => row[index])
      .filter(value => value !== undefined && value !== '');
    
    const uniqueValues = [...new Set(sampleValues)].slice(0, 5);
    const type = detectColumnType(sampleValues);
    const suggestedMapping = getSuggestedMapping(header.toLowerCase());
    
    return {
      name: header,
      type,
      sample_values: uniqueValues,
      nullable: sampleValues.length < sampleRows.length,
      suggested_mapping: suggestedMapping
    };
  });
  
  const totalRows = lines.length - 1; // Excluding header
  const fileSizeKB = Math.round(csvContent.length / 1024);
  const estimatedImportTime = calculateImportTime(totalRows);
  
  return {
    columns,
    rows: sampleRows.slice(0, 10), // Show first 10 rows for preview
    total_rows: totalRows,
    file_size: fileSizeKB > 1024 ? `${Math.round(fileSizeKB/1024)}MB` : `${fileSizeKB}KB`,
    estimated_import_time: estimatedImportTime
  };
}

function detectColumnType(values: string[]): 'text' | 'number' | 'date' | 'boolean' {
  if (values.length === 0) return 'text';
  
  // Check if all values are numbers
  const numericValues = values.filter(v => !isNaN(Number(v)) && v !== '');
  if (numericValues.length > values.length * 0.8) {
    return 'number';
  }
  
  // Check if all values are booleans
  const booleanValues = values.filter(v => 
    ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(v.toLowerCase())
  );
  if (booleanValues.length > values.length * 0.8) {
    return 'boolean';
  }
  
  // Check if values look like dates
  const dateValues = values.filter(v => {
    const date = new Date(v);
    return !isNaN(date.getTime()) && v.includes('-') || v.includes('/');
  });
  if (dateValues.length > values.length * 0.6) {
    return 'date';
  }
  
  return 'text';
}

function getSuggestedMapping(columnName: string): string | undefined {
  const mappings: Record<string, string> = {
    'id': 'identifier',
    'user_id': 'user_identifier',
    'email': 'email_address',
    'name': 'display_name',
    'created_at': 'creation_timestamp',
    'updated_at': 'modification_timestamp',
    'timestamp': 'event_timestamp',
    'date': 'date_field',
    'time': 'time_field',
    'status': 'status_indicator',
    'type': 'category_type',
    'category': 'category',
    'value': 'numeric_value',
    'amount': 'monetary_amount',
    'price': 'price_value',
    'quantity': 'quantity_count',
    'description': 'text_description',
    'title': 'title_field',
    'address': 'address_field',
    'phone': 'phone_number',
    'location': 'geographic_location'
  };
  
  // Direct match
  if (mappings[columnName]) {
    return mappings[columnName];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(mappings)) {
    if (columnName.includes(key) || key.includes(columnName)) {
      return value;
    }
  }
  
  return undefined;
}

function calculateImportTime(rowCount: number): string {
  // Estimate based on row count (very rough estimation)
  const rowsPerSecond = 1000;
  const seconds = Math.max(1, Math.ceil(rowCount / rowsPerSecond));
  
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;
    
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clusterId = formData.get('clusterId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!clusterId) {
      return NextResponse.json(
        { error: 'Cluster ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/csv') {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 100MB' },
        { status: 400 }
      );
    }

    // Read file content
    const csvContent = await file.text();
    
    if (!csvContent.trim()) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Parse and analyze the CSV
    const preview = parseCSVPreview(csvContent);

    return NextResponse.json(preview, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error parsing CSV:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse CSV file' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
