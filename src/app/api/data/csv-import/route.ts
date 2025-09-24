import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { dbOperations } from '@/lib/supabase-direct';

interface ImportProgress {
  importId: string;
  status: 'preparing' | 'processing' | 'validating' | 'importing' | 'completed' | 'error';
  progress: number;
  message: string;
  rows_processed?: number;
  total_rows?: number;
  errors?: string[];
}

// In-memory storage for import progress (in production, use Redis or database)
const importProgress: Map<string, ImportProgress> = new Map();

function generateImportId(): string {
  return 'import_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function processCSVImport(
  importId: string,
  userId: string,
  clusterId: string,
  csvContent: string,
  tableName: string,
  tableDescription: string,
  columnMappings: Record<string, string>
): Promise<void> {
  try {
    // Update progress
    importProgress.set(importId, {
      importId,
      status: 'processing',
      progress: 10,
      message: 'Parsing CSV data...'
    });

    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );

    importProgress.set(importId, {
      importId,
      status: 'processing',
      progress: 25,
      message: 'Creating database table...',
      total_rows: dataRows.length
    });

    // Create table in ClickHouse (simulated)
    await simulateTableCreation(tableName, headers, columnMappings);

    importProgress.set(importId, {
      importId,
      status: 'importing',
      progress: 40,
      message: 'Importing data rows...',
      rows_processed: 0,
      total_rows: dataRows.length
    });

    // Import data in batches
    const batchSize = 100;
    let processed = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i += batchSize) {
      const batch = dataRows.slice(i, i + batchSize);
      
      try {
        await simulateDataInsert(tableName, headers, batch);
        processed += batch.length;
        
        const progress = Math.min(95, 40 + (processed / dataRows.length) * 50);
        importProgress.set(importId, {
          importId,
          status: 'importing',
          progress,
          message: `Importing data... ${processed} of ${dataRows.length} rows`,
          rows_processed: processed,
          total_rows: dataRows.length,
          errors: errors.length > 0 ? errors.slice(0, 10) : undefined
        });
      } catch (error) {
        const errorMessage = `Batch ${Math.floor(i/batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        
        if (errors.length > 10) {
          throw new Error('Too many errors during import');
        }
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Create project asset record
    importProgress.set(importId, {
      importId,
      status: 'completing',
      progress: 95,
      message: 'Finalizing import...',
      rows_processed: processed,
      total_rows: dataRows.length
    });

    await createProjectAsset(userId, clusterId, tableName, tableDescription, processed);

    // Complete
    importProgress.set(importId, {
      importId,
      status: 'completed',
      progress: 100,
      message: `Import completed successfully! ${processed} rows imported.`,
      rows_processed: processed,
      total_rows: dataRows.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });

  } catch (error) {
    console.error('Import error:', error);
    importProgress.set(importId, {
      importId,
      status: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Import failed',
      errors: [error instanceof Error ? error.message : 'Import failed']
    });
  }
}

async function simulateTableCreation(
  tableName: string, 
  headers: string[], 
  columnMappings: Record<string, string>
): Promise<void> {
  // Simulate table creation delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, this would:
  // 1. Connect to the actual ClickHouse cluster
  // 2. Create the table with proper column types
  // 3. Set up indexes and partitioning
  // 4. Configure TTL policies based on subscription tier
  
  console.log(`Creating table: ${tableName}`);
  console.log(`Columns: ${headers.join(', ')}`);
  console.log(`Column mappings:`, columnMappings);
}

async function simulateDataInsert(
  tableName: string,
  headers: string[],
  rows: string[][]
): Promise<void> {
  // Simulate data insertion delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // In production, this would:
  // 1. Batch insert data into ClickHouse
  // 2. Handle data type conversions
  // 3. Validate data integrity
  // 4. Log any row-level errors
  
  console.log(`Inserting ${rows.length} rows into ${tableName}`);
  
  // Simulate occasional errors for demonstration
  if (Math.random() < 0.05) { // 5% chance of error
    throw new Error(`Simulated validation error in batch`);
  }
}

async function createProjectAsset(
  userId: string,
  clusterId: string,
  tableName: string,
  description: string,
  rowCount: number
): Promise<void> {
  try {
    // Create or get the default project for this cluster
    let projectId = await getOrCreateDefaultProject(userId, clusterId);

    // Create project asset record
    const { error } = await dbOperations.supabaseAdmin
      .from('project_assets')
      .insert({
        project_id: projectId,
        asset_name: tableName,
        asset_type: 'table',
        asset_description: description || `CSV import: ${tableName}`,
        asset_metadata: {
          table_name: tableName,
          row_count: rowCount,
          import_method: 'csv_upload',
          imported_at: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Error creating project asset:', error);
    }
  } catch (error) {
    console.error('Error in createProjectAsset:', error);
  }
}

async function getOrCreateDefaultProject(userId: string, clusterId: string): Promise<string> {
  // Check if default project exists
  const { data: existingProject } = await dbOperations.supabaseAdmin
    .from('cluster_projects')
    .select('id')
    .eq('cluster_id', clusterId)
    .eq('project_name', 'Default Project')
    .single();

  if (existingProject) {
    return existingProject.id;
  }

  // Create default project
  const { data: newProject, error } = await dbOperations.supabaseAdmin
    .from('cluster_projects')
    .insert({
      cluster_id: clusterId,
      project_name: 'Default Project',
      project_description: 'Default project for CSV imports and ad-hoc analysis',
      project_type_id: 1, // Assuming 1 is the default project type
      created_by: userId
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return newProject.id;
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
    const projectId = formData.get('projectId') as string;
    const tableName = formData.get('tableName') as string;
    const tableDescription = formData.get('tableDescription') as string || '';
    const columnMappings = JSON.parse(formData.get('columnMappings') as string || '{}');

    if (!file || !clusterId || !tableName) {
      return NextResponse.json(
        { error: 'Missing required fields: file, clusterId, and tableName are required' },
        { status: 400 }
      );
    }

    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Table name must start with a letter or underscore and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Generate import ID
    const importId = generateImportId();

    // Initialize import progress
    importProgress.set(importId, {
      importId,
      status: 'preparing',
      progress: 0,
      message: 'Starting import process...'
    });

    // Read file content
    const csvContent = await file.text();

    // Start async processing
    processCSVImport(
      importId,
      user.id,
      clusterId,
      csvContent,
      tableName,
      tableDescription,
      columnMappings
    ).catch(error => {
      console.error('Background import error:', error);
    });

    return NextResponse.json({ importId }, {
      status: 202,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error starting CSV import:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start import' },
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

// Export the progress map for the progress endpoint
export { importProgress };

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
