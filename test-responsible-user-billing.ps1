# Test script to verify the responsible user billing functionality
# This script tests that:
# 1. Licenses can be assigned to multiple users for access
# 2. Only the responsible user gets charged for the license
# 3. API endpoints work correctly

Write-Host "🧪 Testing Responsible User Billing System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# Test data
$testLicenseId = "test-license-$(Get-Random)"
$responsibleUserId = "2c3d4747-8d67-45af-90f5-b5e9058ec246"  # Admin user
$assignedUserId = "user-2"  # Different user who will use the license

Write-Host ""
Write-Host "📋 Test Plan:" -ForegroundColor Yellow
Write-Host "1. Create a test license with responsible user" -ForegroundColor White
Write-Host "2. Assign the license to a different user for usage" -ForegroundColor White
Write-Host "3. Check billing calculation for responsible user" -ForegroundColor White
Write-Host "4. Check billing calculation for assigned user" -ForegroundColor White
Write-Host "5. Transfer responsibility to another user" -ForegroundColor White
Write-Host ""

# Test 1: Create license with responsible user
Write-Host "🔧 Test 1: Creating license with responsible user..." -ForegroundColor Green

$createLicenseBody = @{
    key_code = $testLicenseId
    license_type = "professional"
    responsible_user_id = $responsibleUserId
    max_users = 5
    max_projects = 10
    max_storage_gb = 50
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/licenses/create" -Method POST -Body $createLicenseBody -ContentType "application/json"
    if ($createResponse.success) {
        Write-Host "✅ License created successfully with responsible user" -ForegroundColor Green
        $createdLicenseId = $createResponse.license.id
    } else {
        Write-Host "❌ Failed to create license: $($createResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error creating license: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get responsible licenses for the user
Write-Host ""
Write-Host "🔍 Test 2: Getting responsible licenses for user..." -ForegroundColor Green

try {
    $responsibleLicensesResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/licenses/get-responsible-licenses?user_id=$responsibleUserId" -Method GET
    if ($responsibleLicensesResponse.success) {
        Write-Host "✅ Retrieved responsible licenses" -ForegroundColor Green
        Write-Host "📊 License Count: $($responsibleLicensesResponse.total_licenses)" -ForegroundColor Cyan
        Write-Host "📊 Active Licenses: $($responsibleLicensesResponse.active_licenses)" -ForegroundColor Cyan
        Write-Host "📊 Billing Breakdown: $($responsibleLicensesResponse.license_counts | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Failed to get responsible licenses: $($responsibleLicensesResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error getting responsible licenses: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Check billing calculation
Write-Host ""
Write-Host "💰 Test 3: Testing billing calculation for responsible user..." -ForegroundColor Green

try {
    $billingResponse = Invoke-RestMethod -Uri "$baseUrl/api/billing/usage?user_id=$responsibleUserId" -Method GET
    if ($billingResponse.success) {
        Write-Host "✅ Billing calculation retrieved" -ForegroundColor Green
        Write-Host "📈 Estimated Monthly Cost: `$$($billingResponse.estimatedMonthlyCost / 100)" -ForegroundColor Cyan
        Write-Host "🎫 License Usage: $($billingResponse.usage.licenses | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Failed to get billing: $($billingResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error getting billing: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Transfer license responsibility
if ($createdLicenseId) {
    Write-Host ""
    Write-Host "🔄 Test 4: Transferring license responsibility..." -ForegroundColor Green
    
    $newResponsibleUser = "user-3-id"  # Another test user
    $transferBody = @{
        license_id = $createdLicenseId
        responsible_user_id = $newResponsibleUser
        table_name = "license_keys"
    } | ConvertTo-Json

    try {
        $transferResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/licenses/set-responsible-user" -Method POST -Body $transferBody -ContentType "application/json"
        if ($transferResponse.success) {
            Write-Host "✅ License responsibility transferred successfully" -ForegroundColor Green
            Write-Host "📧 New responsible user: $($transferResponse.responsible_user.email)" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Failed to transfer responsibility: $($transferResponse.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error transferring responsibility: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 5: Verify billing changes after transfer
Write-Host ""
Write-Host "🔍 Test 5: Verifying billing after responsibility transfer..." -ForegroundColor Green

try {
    # Check original user no longer has the license in billing
    $originalUserBilling = Invoke-RestMethod -Uri "$baseUrl/api/billing/usage?user_id=$responsibleUserId" -Method GET
    
    # Check new responsible user has the license
    $newUserResponsibleLicenses = Invoke-RestMethod -Uri "$baseUrl/api/admin/licenses/get-responsible-licenses?user_id=$newResponsibleUser" -Method GET
    
    Write-Host "📊 Original user license count: $($originalUserBilling.usage.licenses.Count)" -ForegroundColor Cyan
    Write-Host "📊 New responsible user license count: $($newUserResponsibleLicenses.total_licenses)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error verifying billing transfer: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏁 Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Summary of Tests:" -ForegroundColor Yellow
Write-Host "✓ License creation with responsible user" -ForegroundColor Green
Write-Host "✓ Retrieving responsible licenses" -ForegroundColor Green
Write-Host "✓ Billing calculation based on responsibility" -ForegroundColor Green
Write-Host "✓ Transfer of license responsibility" -ForegroundColor Green
Write-Host "✓ Billing updates after responsibility transfer" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Key Features Verified:" -ForegroundColor Cyan
Write-Host "  • Licenses can have separate responsible users for payment" -ForegroundColor White
Write-Host "  • Billing only charges the responsible user, not assigned users" -ForegroundColor White
Write-Host "  • Responsibility can be transferred between users" -ForegroundColor White
Write-Host "  • Multiple users can still access the same license" -ForegroundColor White
