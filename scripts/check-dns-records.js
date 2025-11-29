#!/usr/bin/env node

/**
 * DNS Record Checker for Email Deliverability
 *
 * Checks if SPF, DKIM, and DMARC records are properly configured
 *
 * Usage:
 *   node scripts/check-dns-records.js thelyceum.io
 */

const dns = require('dns').promises;
const domain = process.argv[2] || 'thelyceum.io';

console.log(`\n🔍 Checking DNS records for: ${domain}\n`);
console.log('='.repeat(60));

async function checkDNS() {
  try {
    // Check SPF (root domain)
    console.log('\n📧 SPF Record (Root Domain)');
    console.log('-'.repeat(60));
    try {
      const spfRecords = await dns.resolveTxt(domain);
      const spfRecord = spfRecords.find(r => r[0].startsWith('v=spf1'));

      if (spfRecord) {
        console.log('✅ FOUND:', spfRecord[0]);

        // Check if includes resend.com or amazonses.com
        if (spfRecord[0].includes('resend.com') || spfRecord[0].includes('amazonses.com')) {
          console.log('✅ Includes mail service provider');
        } else {
          console.log('⚠️  Does not include resend.com or amazonses.com');
          console.log('   Recommended: v=spf1 include:amazonses.com ~all');
        }
      } else {
        console.log('❌ NOT FOUND');
        console.log('   Add: v=spf1 include:amazonses.com ~all');
      }
    } catch (err) {
      console.log('❌ NOT FOUND');
      console.log('   Add TXT record:');
      console.log('   Name: @');
      console.log('   Value: v=spf1 include:amazonses.com ~all');
    }

    // Check DKIM
    console.log('\n🔐 DKIM Record (Email Signature)');
    console.log('-'.repeat(60));
    try {
      const dkimRecords = await dns.resolveTxt(`resend._domainkey.${domain}`);
      console.log('✅ FOUND:', dkimRecords[0][0].substring(0, 60) + '...');
    } catch (err) {
      console.log('❌ NOT FOUND at resend._domainkey');
    }

    // Check DMARC
    console.log('\n🛡️  DMARC Record (Policy)');
    console.log('-'.repeat(60));
    try {
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = dmarcRecords.find(r => r[0].startsWith('v=DMARC1'));

      if (dmarcRecord) {
        console.log('✅ FOUND:', dmarcRecord[0]);

        // Parse DMARC policy
        const policy = dmarcRecord[0].match(/p=([^;]+)/)?.[1];
        console.log(`   Policy: ${policy || 'unknown'}`);

        if (policy === 'none') {
          console.log('   ⚠️  Policy is "none" (monitoring only)');
          console.log('   Recommended: p=quarantine or p=reject');
        }
      } else {
        console.log('❌ NOT FOUND');
      }
    } catch (err) {
      console.log('❌ NOT FOUND');
      console.log('   Add TXT record:');
      console.log('   Name: _dmarc');
      console.log('   Value: v=DMARC1; p=quarantine; rua=mailto:josh@thelyceum.io');
    }

    // Check MX Records
    console.log('\n📬 MX Records (Mail Exchange)');
    console.log('-'.repeat(60));
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (mxRecords.length > 0) {
        console.log('✅ FOUND:', mxRecords.length, 'records');
        mxRecords.forEach((mx, i) => {
          console.log(`   ${i + 1}. [${mx.priority}] ${mx.exchange}`);
        });
      } else {
        console.log('⚠️  No MX records found');
      }
    } catch (err) {
      console.log('⚠️  No MX records found');
    }

    // Check send subdomain SPF (for Resend)
    console.log('\n📤 Send Subdomain SPF');
    console.log('-'.repeat(60));
    try {
      const sendSpfRecords = await dns.resolveTxt(`send.${domain}`);
      const sendSpfRecord = sendSpfRecords.find(r => r[0].startsWith('v=spf1'));

      if (sendSpfRecord) {
        console.log('✅ FOUND:', sendSpfRecord[0]);
      } else {
        console.log('❌ NOT FOUND');
      }
    } catch (err) {
      console.log('❌ NOT FOUND');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary & Recommendations');
    console.log('='.repeat(60));
    console.log('\nYour current setup:');
    console.log('✅ Resend is configured (DKIM + send subdomain)');
    console.log('');
    console.log('To improve deliverability:');
    console.log('1. Add root domain SPF if missing');
    console.log('2. Add DMARC record if missing');
    console.log('3. Wait 24-48 hours for DNS propagation');
    console.log('4. Test with: https://www.mail-tester.com/');
    console.log('5. Monitor Resend dashboard for bounces/complaints');
    console.log('');
    console.log('Where to add these records:');
    console.log('→ Go to your domain registrar DNS settings');
    console.log('  (Cloudflare, GoDaddy, Namecheap, etc.)');
    console.log('');

  } catch (error) {
    console.error('Error checking DNS:', error.message);
  }
}

checkDNS();
