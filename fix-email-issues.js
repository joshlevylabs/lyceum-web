// Fix Email Issues Script
// This script helps resolve the password reset email problems

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4';

const supabase = createClient(supabaseUrl, serviceKey);

async function fixEmailIssues() {
  console.log('🔧 Starting Email Issues Fix...\n');

  try {
    // Step 1: Get all users and their confirmation status
    console.log('📊 Getting user information...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error getting users:', usersError.message);
      return;
    }

    console.log(`Found ${users.users.length} users:`);
    users.users.forEach(user => {
      console.log(`  • ${user.email} - ${user.email_confirmed_at ? '✅ Confirmed' : '❌ Unconfirmed'}`);
    });

    // Step 2: Confirm unconfirmed emails
    const unconfirmedUsers = users.users.filter(u => !u.email_confirmed_at);
    
    if (unconfirmedUsers.length > 0) {
      console.log(`\n🔄 Confirming ${unconfirmedUsers.length} unconfirmed emails...`);
      
      // Use SQL to confirm emails
      const { error: confirmError } = await supabase.rpc('confirm_all_emails');
      
      if (confirmError) {
        console.log('⚠️  Direct confirmation failed, trying individual confirmations...');
        
        // Alternative: Update users individually
        for (const user of unconfirmedUsers) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true
          });
          
          if (updateError) {
            console.log(`   ❌ Failed to confirm ${user.email}: ${updateError.message}`);
          } else {
            console.log(`   ✅ Confirmed ${user.email}`);
          }
        }
      } else {
        console.log('✅ All emails confirmed via SQL');
      }
    } else {
      console.log('\n✅ All users already have confirmed emails');
    }

    // Step 3: Generate working password reset links
    console.log('\n🔗 Generating password reset links for all users...');
    
    for (const user of users.users) {
      try {
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: user.email,
          options: {
            redirectTo: 'http://localhost:3594/auth/set-password'
          }
        });

        if (linkError) {
          console.log(`   ❌ ${user.email}: ${linkError.message}`);
        } else {
          console.log(`   ✅ ${user.email}:`);
          console.log(`      ${linkData.properties.action_link}`);
        }
      } catch (error) {
        console.log(`   ❌ ${user.email}: ${error.message}`);
      }
    }

    // Step 4: Configuration recommendations
    console.log('\n⚙️  Configuration Recommendations:');
    console.log('');
    console.log('1. 🔧 Supabase Dashboard Settings:');
    console.log('   • Go to Authentication > Settings');
    console.log('   • Set Site URL: http://localhost:3594');
    console.log('   • Add Redirect URL: http://localhost:3594/auth/set-password');
    console.log('   • Add Redirect URL: http://localhost:3594/auth/callback');
    console.log('');
    console.log('2. 📧 Email Template Settings:');
    console.log('   • Go to Authentication > Email Templates');
    console.log('   • Edit "Reset Password" template');
    console.log('   • Ensure redirect URL uses {{ .RedirectTo }}');
    console.log('');
    console.log('3. 🚀 Immediate Solution:');
    console.log('   • Copy the generated links above');
    console.log('   • Send them directly to users');
    console.log('   • Users can reset passwords immediately');
    console.log('');
    console.log('4. ⏰ Rate Limiting:');
    console.log('   • Wait 60 seconds between password reset attempts');
    console.log('   • Use generated links to bypass rate limits');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

// Create the SQL function to confirm emails
async function createConfirmEmailsFunction() {
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE OR REPLACE FUNCTION confirm_all_emails()
      RETURNS void AS $$
      BEGIN
        UPDATE auth.users 
        SET email_confirmed_at = NOW() 
        WHERE email_confirmed_at IS NULL;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  });

  if (error) {
    console.log('Note: Could not create SQL function, will use individual updates');
  }
}

// Run the fix
async function main() {
  await createConfirmEmailsFunction();
  await fixEmailIssues();
}

main().catch(console.error);





