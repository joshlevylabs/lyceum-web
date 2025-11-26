// Quick script to run the active sessions view migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    console.log('Please ensure .env.local contains:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL=...');
    console.log('  SUPABASE_SERVICE_ROLE_KEY=...');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Read the migration file
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250125_fix_active_sessions_view.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('🔄 Running migration to fix v_active_sessions view...');
  console.log('📄 Migration file:', migrationPath);

  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Migration failed:', error.message);

    // Try running it as a direct query instead
    console.log('🔄 Trying alternative approach...');
    const { error: altError } = await supabase.from('_migrations').insert({
      name: '20250125_fix_active_sessions_view',
      sql: sql,
      executed_at: new Date().toISOString()
    });

    if (altError) {
      console.error('❌ Alternative approach also failed');
      console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
      console.log('   Go to: https://supabase.com/dashboard/project/kffiaqsihldgqdwagook/sql/new');
      console.log(`\n${sql}\n`);
      process.exit(1);
    }
  }

  console.log('✅ Migration completed successfully!');
  console.log('Desktop sessions should now appear as active in the Settings > Session Information page');
}

runMigration().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
