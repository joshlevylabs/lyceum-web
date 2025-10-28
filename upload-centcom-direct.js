/**
 * Direct Supabase Upload Script for Centcom Installers
 * This bypasses the Next.js API to avoid timeout/size limits
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = 'https://kffiaqsihldgqdwagook.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'; // Get from Supabase Dashboard → Settings → API → service_role key

const FILES = [
  {
    path: 'C:\\Users\\joshual\\Documents\\Cursor\\datacenter\\src-tauri\\target\\release\\bundle\\msi\\Centcom_1.0.0_x64_en-US.msi',
    version: '1.0.0',
    platform: 'windows',
    architecture: 'x64',
    installerType: 'msi',
  },
  {
    path: 'C:\\Users\\joshual\\Documents\\Cursor\\datacenter\\src-tauri\\target\\release\\bundle\\nsis\\Centcom_1.0.0_x64-setup.exe',
    version: '1.0.0',
    platform: 'windows',
    architecture: 'x64',
    installerType: 'exe',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function calculateSHA256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex').toUpperCase()));
    stream.on('error', reject);
  });
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function uploadFile(supabase, fileConfig) {
  const { path: filePath, version, platform, architecture, installerType } = fileConfig;
  const fileName = path.basename(filePath);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Uploading: ${fileName}`);
  console.log(`${'='.repeat(80)}`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    return false;
  }

  // Get file stats
  const stats = fs.statSync(filePath);
  console.log(`📦 File size: ${formatBytes(stats.size)}`);

  // Calculate SHA256 hash
  console.log(`🔐 Calculating SHA256 hash...`);
  const sha256Hash = await calculateSHA256(filePath);
  console.log(`✅ SHA256: ${sha256Hash}`);

  // Read file
  console.log(`📤 Reading file...`);
  const fileBuffer = fs.readFileSync(filePath);

  // Upload to Supabase Storage
  const storagePath = `${platform}/${version}/${fileName}`;
  console.log(`☁️  Uploading to Supabase Storage: ${storagePath}`);
  console.log(`⏱️  This may take 5-15 minutes...`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('centcom-releases')
    .upload(storagePath, fileBuffer, {
      contentType: installerType === 'msi' ? 'application/x-msi' : 'application/x-msdownload',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error(`❌ Upload failed: ${uploadError.message}`);
    return false;
  }

  console.log(`✅ Upload successful!`);

  // Create version record in database
  console.log(`💾 Creating database record...`);

  const { data: versionData, error: versionError } = await supabase
    .from('application_versions')
    .insert({
      application_name: 'centcom',
      version_number: version,
      platform: platform,
      architecture: architecture,
      installer_type: installerType,
      file_size_bytes: stats.size,
      sha256_hash: sha256Hash,
      storage_path: storagePath,
      release_date: new Date().toISOString(),
      is_stable: true,
      is_supported: true,
      auto_update_enabled: true,
      force_update: false,
    })
    .select()
    .single();

  if (versionError) {
    console.error(`❌ Database record creation failed: ${versionError.message}`);
    console.log(`⚠️  File uploaded but database record not created. You may need to clean up manually.`);
    return false;
  }

  console.log(`✅ Database record created!`);
  console.log(`📋 Version ID: ${versionData.id}`);

  return true;
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'Centcom v1.0.0 Direct Upload' + ' '.repeat(30) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');

  // Check if service key is configured
  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ Error: SUPABASE_SERVICE_KEY not configured!');
    console.log('\nTo get your service_role key:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to Settings → API');
    console.log('4. Copy the "service_role" key (not the anon key!)');
    console.log('5. Paste it into this script at line 13');
    console.log('\n⚠️  WARNING: Keep this key secret! It bypasses all RLS policies.\n');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Upload each file
  let successCount = 0;
  for (const fileConfig of FILES) {
    const success = await uploadFile(supabase, fileConfig);
    if (success) successCount++;
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Upload Complete: ${successCount}/${FILES.length} files uploaded successfully`);
  console.log(`${'='.repeat(80)}\n`);

  if (successCount === FILES.length) {
    console.log('✅ All files uploaded successfully!');
    console.log('\nNext steps:');
    console.log('1. Test download from: https://thelyceum.io/dashboard');
    console.log('2. Verify SHA256 hashes match');
    console.log('3. Coordinate with Centcom team for end-to-end testing\n');
  } else {
    console.log('⚠️  Some uploads failed. Check errors above.\n');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
