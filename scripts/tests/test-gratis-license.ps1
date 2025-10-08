# Test gratis license functionality
# This script tests the new gratis license type and payment responsibility features

$licenseId = "1e445cb5-a158-4db1-8a67-1fbfb23b42b3"
$baseUrl = "http://localhost:3594"

Write-Host "🆓 Testing Gratis License Features" -ForegroundColor Cyan
Write-Host "License ID: $licenseId" -ForegroundColor Gray
Write-Host ""

# First, let's see the current license details
Write-Host "📋 Current License Details:" -ForegroundColor Yellow
try {
    $currentLicense = Invoke-RestMethod -Uri "$baseUrl/api/admin/licenses/$licenseId"
    if ($currentLicense.success) {
        Write-Host "  Type: $($currentLicense.license.license_type)" -ForegroundColor Green
        Write-Host "  Status: $($currentLicense.license.status)" -ForegroundColor Green
        if ($currentLicense.license.responsible_user) {
            Write-Host "  Responsible User: $($currentLicense.license.responsible_user.full_name)" -ForegroundColor Green
        } else {
            Write-Host "  Responsible User: None" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  ❌ Failed to get license details" -ForegroundColor Red
}
Write-Host ""

# Test changing to gratis license type
Write-Host "🆓 Changing to Gratis License Type..." -ForegroundColor Yellow
try {
    $body = @{ license_type = "gratis" } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "$baseUrl/api/admin/licenses/$licenseId" -Method PUT -Body $body -ContentType "application/json"
    
    if ($result.success) {
        Write-Host "  ✅ SUCCESS - Changed to gratis" -ForegroundColor Green
        Write-Host "     New type: $($result.license.license_type)" -ForegroundColor Gray
        Write-Host "     No payment responsibility required!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAILED - $($result.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "  ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "     This likely means the database constraints need to be updated" -ForegroundColor Yellow
    Write-Host "     Run the update-license-types-for-gratis.sql script first" -ForegroundColor Yellow
}
Write-Host ""

# Test billing exclusion
Write-Host "💰 Testing Billing Exclusion..." -ForegroundColor Yellow
try {
    $billingResponse = Invoke-RestMethod -Uri "$baseUrl/api/billing/usage-filtered"
    
    if ($billingResponse.success) {
        $gratisLicenses = $billingResponse.data.active_licenses | Where-Object { $_.type -eq "gratis" }
        if ($gratisLicenses) {
            Write-Host "  ⚠️  Gratis licenses found in billing data (should be excluded)" -ForegroundColor Yellow
            $gratisLicenses | ForEach-Object {
                Write-Host "     • License $($_.name) - Type: $($_.type)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ✅ No gratis licenses in billing data - correct exclusion!" -ForegroundColor Green
        }
        
        Write-Host "     Total billable licenses: $($billingResponse.data.total_licenses)" -ForegroundColor Gray
        Write-Host "     Total clusters: $($billingResponse.data.total_clusters)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Failed to get billing data" -ForegroundColor Red
    }
}
catch {
    Write-Host "  ❌ ERROR getting billing data: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Restore to original license type for next tests
Write-Host "🔄 Restoring license for future tests..." -ForegroundColor Cyan
try {
    $body = @{ license_type = "enterprise" } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "$baseUrl/api/admin/licenses/$licenseId" -Method PUT -Body $body -ContentType "application/json"
    
    if ($result.success) {
        Write-Host "  ✅ Restored to enterprise" -ForegroundColor Green
    }
}
catch {
    Write-Host "  ⚠️  Could not restore - manual restoration may be needed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Gratis license testing complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor White
Write-Host "  1. Run update-license-types-for-gratis.sql to add database constraints" -ForegroundColor Gray
Write-Host "  2. Test the license details page UI for gratis licenses" -ForegroundColor Gray
Write-Host "  3. Verify billing dashboards exclude gratis licenses" -ForegroundColor Gray
