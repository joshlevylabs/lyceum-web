# Simple Billing System Test - No JWT Tokens Required!

param(
    [string]$BaseUrl = "http://localhost:3594",
    [string]$ApiKey = $env:CRON_SECRET,
    [string]$UserId = "2c3d4747-8d67-45af-90f5-b5e9058ec246"
)

Write-Host "Simple Billing System Test" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Check API key
if (-not $ApiKey) {
    Write-Host "No API key found. Using default debug key..." -ForegroundColor Yellow
    $ApiKey = "debug-key-12345"
}

Write-Host "API Key: $($ApiKey.Substring(0,[Math]::Min(10,$ApiKey.Length)))..." -ForegroundColor Blue
Write-Host "User ID: $UserId" -ForegroundColor Blue
Write-Host "Base URL: $BaseUrl" -ForegroundColor Blue
Write-Host ""

$Headers = @{ "X-API-Key" = $ApiKey }

function Test-Endpoint {
    param([string]$Name, [string]$Url)
    Write-Host "Testing: $Name..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        Write-Host "SUCCESS: $Name" -ForegroundColor Green
        return $data
    } catch {
        Write-Host "FAILED: $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test 1: Available actions
Write-Host "1. Getting available actions..." -ForegroundColor Cyan
$actions = Test-Endpoint "Available Actions" "$BaseUrl/api/debug/billing-test"
if ($actions) {
    Write-Host "   Available: $($actions.available_actions -join ', ')" -ForegroundColor Blue
}
Write-Host ""

# Test 2: Current usage
Write-Host "2. Checking current usage..." -ForegroundColor Cyan
$usageUrl = "$BaseUrl/api/debug/billing-test?action=usage&user_id=$UserId"
$usage = Test-Endpoint "Current Usage" $usageUrl
if ($usage) {
    $cost = $usage.data.estimated_monthly_cost
    Write-Host "   Monthly cost: `$$($cost.total_dollars)" -ForegroundColor Blue
    Write-Host "   Line items: $($cost.line_items.Count)" -ForegroundColor Blue
}
Write-Host ""

# Test 3: List invoices
Write-Host "3. Listing invoices..." -ForegroundColor Cyan
$invoiceUrl = "$BaseUrl/api/debug/billing-test?action=invoices&limit=5&user_id=$UserId"
$invoiceData = Test-Endpoint "Invoice List" $invoiceUrl
if ($invoiceData) {
    Write-Host "   Found: $($invoiceData.data.invoices.Count) invoices" -ForegroundColor Blue
}
Write-Host ""

# Test 4: Setup billing period
Write-Host "4. Setting up billing period..." -ForegroundColor Cyan
$setupUrl = "$BaseUrl/api/debug/billing-test?action=setup&user_id=$UserId"
$setup = Test-Endpoint "Billing Setup" $setupUrl
if ($setup) {
    Write-Host "   Billing period initialized" -ForegroundColor Green
}
Write-Host ""

# Test 5: Process monthly billing
Write-Host "5. Processing monthly billing..." -ForegroundColor Cyan
$processUrl = "$BaseUrl/api/debug/billing-test?action=process&user_id=$UserId"
$billing = Test-Endpoint "Monthly Billing" $processUrl
if ($billing) {
    if ($billing.success) {
        Write-Host "   Billing processed successfully" -ForegroundColor Green
        if ($billing.data.invoice) {
            Write-Host "   Invoice created: $($billing.data.invoice.invoice_number)" -ForegroundColor Blue
        }
    } else {
        Write-Host "   Billing failed: $($billing.error)" -ForegroundColor Red
        if ($billing.stack) {
            Write-Host "   Error details:" -ForegroundColor Yellow
            Write-Host $billing.stack -ForegroundColor Gray
        }
    }
}
Write-Host ""

# Test 6: Final invoice check
Write-Host "6. Checking invoices after billing..." -ForegroundColor Cyan
$finalUrl = "$BaseUrl/api/debug/billing-test?action=invoices&limit=5&user_id=$UserId"
$finalInvoices = Test-Endpoint "Final Invoice List" $finalUrl
if ($finalInvoices) {
    Write-Host "   Found: $($finalInvoices.data.invoices.Count) invoices" -ForegroundColor Blue
    foreach ($invoice in $finalInvoices.data.invoices) {
        $amount = [math]::Round($invoice.total_cents / 100, 2)
        Write-Host "   - $($invoice.invoice_number): `$$amount ($($invoice.status))" -ForegroundColor Blue
    }
}

Write-Host ""
Write-Host "Testing Complete!" -ForegroundColor Green
Write-Host "This debug endpoint uses X-API-Key header instead of JWT tokens" -ForegroundColor Yellow
