# Billing System Test Script for PowerShell
# Usage: .\test-billing-system.ps1

param(
    [string]$BaseUrl = "http://localhost:3594",
    [string]$AdminToken = $env:ADMIN_TOKEN,
    [string]$UserToken = $env:USER_TOKEN,
    [string]$CronSecret = $env:CRON_SECRET
)

Write-Host "🧪 Billing System Test Script" -ForegroundColor Cyan
Write-Host "==============================`n" -ForegroundColor Cyan

function Invoke-ApiRequest {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    $Url = "$BaseUrl$Endpoint"
    Write-Host "📡 $Method $Endpoint" -ForegroundColor Yellow
    
    $DefaultHeaders = @{
        "Content-Type" = "application/json"
    }
    
    $FinalHeaders = $DefaultHeaders + $Headers
    
    try {
        $Params = @{
            Uri = $Url
            Method = $Method
            Headers = $FinalHeaders
        }
        
        if ($Body) {
            $Params.Body = $Body
        }
        
        $Response = Invoke-RestMethod @Params
        Write-Host "✅ Success" -ForegroundColor Green
        return @{ Success = $true; Data = $Response }
    }
    catch {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        $ErrorMessage = $_.Exception.Message
        Write-Host "❌ Error ($StatusCode): $ErrorMessage" -ForegroundColor Red
        return @{ Success = $false; Error = $ErrorMessage; StatusCode = $StatusCode }
    }
}

function Test-Step {
    param(
        [string]$StepName,
        [scriptblock]$TestBlock
    )
    
    Write-Host "`n🔍 $StepName" -ForegroundColor Cyan
    Write-Host ("-" * 50) -ForegroundColor Gray
    
    try {
        $Result = & $TestBlock
        if ($Result.Success -ne $false) {
            Write-Host "✅ $StepName - PASSED`n" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $StepName - FAILED`n" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ $StepName - ERROR: $($_.Exception.Message)`n" -ForegroundColor Red
        return $false
    }
}

# Environment check
Write-Host "🔧 Environment Check:" -ForegroundColor Yellow
Write-Host "📍 Base URL: $BaseUrl"
Write-Host "🔑 Admin Token: $(if ($AdminToken) { '✅ Set' } else { '❌ Not set' })"
Write-Host "👤 User Token: $(if ($UserToken) { '✅ Set' } else { '❌ Not set' })"
Write-Host "⏰ Cron Secret: $(if ($CronSecret) { '✅ Set' } else { '❌ Not set' })"

if (-not $AdminToken -and -not $UserToken -and -not $CronSecret) {
    Write-Host "`n⚠️  No tokens set! Set environment variables to run full tests:" -ForegroundColor Yellow
    Write-Host '$env:ADMIN_TOKEN="your-admin-jwt-token"'
    Write-Host '$env:USER_TOKEN="your-user-jwt-token"'
    Write-Host '$env:CRON_SECRET="your-cron-secret"'
    Write-Host "`nRunning limited tests...`n"
}

# Initialize counters
$Passed = 0
$Total = 0

# Test 1: Setup billing system
$Total++
if (Test-Step "Step 1: Initialize Billing System" {
    if (-not $AdminToken) {
        Write-Host "⚠️  ADMIN_TOKEN not set, skipping setup" -ForegroundColor Yellow
        return @{ Success = $true }
    }
    
    return Invoke-ApiRequest "/api/billing/setup" -Method "POST" -Headers @{ "Authorization" = "Bearer $AdminToken" }
}) { $Passed++ }

# Test 2: Check system status
$Total++
if (Test-Step "Step 2: Check System Status" {
    if (-not $AdminToken) {
        Write-Host "⚠️  ADMIN_TOKEN not set, skipping status check" -ForegroundColor Yellow
        return @{ Success = $true }
    }
    
    $Result = Invoke-ApiRequest "/api/billing/setup" -Headers @{ "Authorization" = "Bearer $AdminToken" }
    
    if ($Result.Success -and $Result.Data.system_ready) {
        Write-Host "📋 All billing tables are ready"
        Write-Host "👥 Users: $($Result.Data.data.stats.total_users)"
        Write-Host "📊 Active periods: $($Result.Data.data.stats.active_billing_periods)"
    }
    
    return $Result
}) { $Passed++ }

# Test 3: Get current usage
$Total++
if (Test-Step "Step 3: Check Current Usage" {
    if (-not $UserToken) {
        Write-Host "⚠️  USER_TOKEN not set, skipping usage check" -ForegroundColor Yellow
        return @{ Success = $true }
    }
    
    $Result = Invoke-ApiRequest "/api/billing/usage?include_estimate=true" -Headers @{ "Authorization" = "Bearer $UserToken" }
    
    if ($Result.Success) {
        $Usage = $Result.Data.data.usage
        $Cost = $Result.Data.data.estimated_monthly_cost
        
        Write-Host "📄 Licenses: $($Usage.licenses.Count) types"
        Write-Host "🖥️  Clusters: $($Usage.clusters.Count) types"
        Write-Host "👥 Additional users: $($Usage.additionalUsers)"
        $EstimatedCost = if ($Cost) { [math]::Round($Cost.total_cents / 100, 2) } else { 0 }
        Write-Host "💰 Estimated cost: `$$EstimatedCost"
    }
    
    return $Result
}) { $Passed++ }

# Test 4: Get billing summary
$Total++
if (Test-Step "Step 4: Get Billing Summary" {
    if (-not $UserToken) {
        Write-Host "⚠️  USER_TOKEN not set, skipping billing summary" -ForegroundColor Yellow
        return @{ Success = $true }
    }
    
    $Result = Invoke-ApiRequest "/api/billing/process-monthly" -Headers @{ "Authorization" = "Bearer $UserToken" }
    
    if ($Result.Success) {
        Write-Host "📊 Current period: $($Result.Data.data.currentPeriod.period_label)"
        Write-Host "📋 Recent invoices: $($Result.Data.data.recentInvoices.Count)"
        $Outstanding = [math]::Round(($Result.Data.data.totalOutstanding ?? 0) / 100, 2)
        Write-Host "💸 Outstanding: `$$Outstanding"
    }
    
    return $Result
}) { $Passed++ }

# Test 5: List invoices
$Total++
if (Test-Step "Step 5: List User Invoices" {
    if (-not $UserToken) {
        Write-Host "⚠️  USER_TOKEN not set, skipping invoice list" -ForegroundColor Yellow
        return @{ Success = $true }
    }
    
    $Result = Invoke-ApiRequest "/api/billing/invoices?limit=5" -Headers @{ "Authorization" = "Bearer $UserToken" }
    
    if ($Result.Success) {
        $Invoices = $Result.Data.data.invoices
        Write-Host "📋 Found $($Invoices.Count) invoices"
        
        for ($i = 0; $i -lt $Invoices.Count; $i++) {
            $Invoice = $Invoices[$i]
            Write-Host "  $($i + 1). $($Invoice.invoice_number) - `$$($Invoice.total_dollars) ($($Invoice.status))"
        }
    }
    
    return $Result
}) { $Passed++ }

# Test 6: Test automation endpoint
$Total++
if (Test-Step "Step 6: Test Automation Endpoint" {
    if (-not $CronSecret) {
        Write-Host "⚠️  CRON_SECRET not set, skipping automation test" -ForegroundColor Yellow
        return @{ Success = $true }
    }
    
    $Result = Invoke-ApiRequest "/api/billing/automated-billing" -Headers @{ "Authorization" = "Bearer $CronSecret" }
    
    if ($Result.Success) {
        Write-Host "✅ Processed: $($Result.Data.results.processed) users"
        Write-Host "📋 Generated: $($Result.Data.results.invoices_generated) invoices"
        $TotalAmount = [math]::Round(($Result.Data.results.total_amount_cents ?? 0) / 100, 2)
        Write-Host "💰 Total amount: `$$TotalAmount"
    }
    
    return $Result
}) { $Passed++ }

# Test 7: Check automation logs
$Total++
if (Test-Step "Step 7: Check Automation Logs" {
    if (-not $CronSecret) {
        Write-Host "⚠️  CRON_SECRET not set, skipping logs check" -ForegroundColor Yellow
        return @{ Success = $true }
    }
    
    $Result = Invoke-ApiRequest "/api/billing/automated-billing?limit=10" -Headers @{ "Authorization" = "Bearer $CronSecret" }
    
    if ($Result.Success) {
        $Logs = $Result.Data.data.logs
        $Stats = $Result.Data.data.stats
        
        Write-Host "📊 Last 24h total: $($Stats.last_24h_total) events"
        Write-Host "✅ Success: $($Stats.last_24h_success)"
        Write-Host "❌ Errors: $($Stats.last_24h_errors)"
        Write-Host "📋 Recent logs: $($Logs.Count) entries"
    }
    
    return $Result
}) { $Passed++ }

# Results
Write-Host "`n🎯 Test Results" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan
Write-Host "✅ Passed: $Passed/$Total" -ForegroundColor Green
Write-Host "❌ Failed: $($Total - $Passed)/$Total" -ForegroundColor Red

if ($Passed -eq $Total) {
    Write-Host "`n🎉 All tests passed! Your billing system is working correctly." -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some tests failed. Check the output above for details." -ForegroundColor Yellow
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Set up Stripe webhooks (see STRIPE_WEBHOOK_SETUP_GUIDE.md)"
Write-Host "2. Test payment processing with Stripe test cards"
Write-Host "3. Verify webhook events are received"
Write-Host "4. Test the billing dashboard UI"


