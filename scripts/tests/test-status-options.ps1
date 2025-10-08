# Test all license status options
# This script tests each status change to verify they work correctly

$licenseId = "1e445cb5-a158-4db1-8a67-1fbfb23b42b3"
$baseUrl = "http://localhost:3594"

Write-Host "🧪 Testing License Status Changes" -ForegroundColor Cyan
Write-Host "License ID: $licenseId" -ForegroundColor Gray
Write-Host ""

# Test each status option
$statuses = @("active", "inactive", "trial", "expired", "revoked")

foreach ($status in $statuses) {
    Write-Host "Testing status: " -NoNewline
    Write-Host $status -ForegroundColor Yellow
    
    try {
        $body = @{ status = $status } | ConvertTo-Json
        $result = Invoke-RestMethod -Uri "$baseUrl/api/admin/licenses/$licenseId" -Method PUT -Body $body -ContentType "application/json"
        
        if ($result.success) {
            Write-Host "  ✅ SUCCESS" -ForegroundColor Green
            Write-Host "     New status: $($result.license.status)" -ForegroundColor Gray
        } else {
            Write-Host "  ❌ FAILED" -ForegroundColor Red
            Write-Host "     Error: $($result.error)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "  ❌ ERROR" -ForegroundColor Red
        Write-Host "     $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 500
    Write-Host ""
}

# Restore to active
Write-Host "🔄 Restoring to active status..." -ForegroundColor Cyan
try {
    $body = @{ status = "active" } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "$baseUrl/api/admin/licenses/$licenseId" -Method PUT -Body $body -ContentType "application/json"
    
    if ($result.success) {
        Write-Host "✅ Restored to active" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Failed to restore: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Status testing complete!" -ForegroundColor Cyan

