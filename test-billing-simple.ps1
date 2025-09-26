# Simple Billing System Test - No JWT Tokens Required!
# Uses static API key from CRON_SECRET for easier development testing

param(
    [string]$BaseUrl = "http://localhost:3594",
    [string]$ApiKey = $env:CRON_SECRET,
    [string]$UserId = "2c3d4747-8d67-45af-90f5-b5e9058ec246"
)

Write-Host "🧪 Simple Billing System Test" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check API key
if (-not $ApiKey) {
    Write-Host "⚠️  No API key found. Set CRON_SECRET environment variable:" -ForegroundColor Yellow
    Write-Host '$env:CRON_SECRET = "your-secure-random-string-here"' -ForegroundColor Green
    Write-Host ""
    Write-Host "Using default debug key for testing..." -ForegroundColor Yellow
    $ApiKey = "debug-key-12345"
}

Write-Host "🔑 API Key: $(if ($ApiKey.Length -gt 10) { $ApiKey.Substring(0,10) + "..." } else { $ApiKey })" -ForegroundColor Blue
Write-Host "👤 User ID: $UserId" -ForegroundColor Blue
Write-Host "🌐 Base URL: $BaseUrl" -ForegroundColor Blue
Write-Host ""

$Headers = @{ "X-API-Key" = $ApiKey }

function Test-Endpoint {
    param([string]$Name, [string]$Url)
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        Write-Host "SUCCESS $Name" -ForegroundColor Green
        return $data
    } catch {
        Write-Host "FAILED $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test 1: Get available actions
Write-Host "1️⃣ Getting available actions..." -ForegroundColor Cyan
$actions = Test-Endpoint "Available Actions" "$BaseUrl/api/debug/billing-test"
if ($actions) {
    Write-Host "   Available: $($actions.available_actions -join ', ')" -ForegroundColor Blue
}
Write-Host ""

# Test 2: Check current usage
Write-Host "2️⃣ Checking current usage..." -ForegroundColor Cyan
$usage = Test-Endpoint "Current Usage" "$BaseUrl/api/debug/billing-test?action=usage`&user_id=$UserId"
if ($usage) {
    $cost = $usage.data.estimated_monthly_cost
    Write-Host "   💰 Estimated monthly cost: `$$($cost.total_dollars)" -ForegroundColor Blue
    Write-Host "   📄 Line items: $($cost.line_items.Count)" -ForegroundColor Blue
}
Write-Host ""

# Test 3: List invoices
Write-Host "3️⃣ Listing invoices..." -ForegroundColor Cyan
$invoiceData = Test-Endpoint "Invoice List" "$BaseUrl/api/debug/billing-test?action=invoices`&limit=5`&user_id=$UserId"
if ($invoiceData) {
    Write-Host "   📋 Found: $($invoiceData.data.invoices.Count) invoices" -ForegroundColor Blue
}
Write-Host ""

# Test 4: Setup billing period
Write-Host "4️⃣ Setting up billing period..." -ForegroundColor Cyan
$setup = Test-Endpoint "Billing Setup" "$BaseUrl/api/debug/billing-test?action=setup`&user_id=$UserId"
if ($setup) {
    Write-Host "   SUCCESS Billing period initialized" -ForegroundColor Green
}
Write-Host ""

# Test 5: Process monthly billing
Write-Host "5️⃣ Processing monthly billing..." -ForegroundColor Cyan
$billing = Test-Endpoint "Monthly Billing" "$BaseUrl/api/debug/billing-test?action=process`&user_id=$UserId"
if ($billing) {
    if ($billing.success) {
        Write-Host "   ✅ Billing processed successfully" -ForegroundColor Green
        if ($billing.data.invoice) {
            Write-Host "   🧾 Invoice created: $($billing.data.invoice.invoice_number)" -ForegroundColor Blue
        }
    } else {
        Write-Host "   ❌ Billing failed: $($billing.error)" -ForegroundColor Red
        if ($billing.stack) {
            Write-Host "   Stack trace:" -ForegroundColor Yellow
            Write-Host $billing.stack -ForegroundColor Gray
        }
    }
}
Write-Host ""

# Test 6: List invoices again
Write-Host "6️⃣ Checking invoices after billing..." -ForegroundColor Cyan
$finalInvoices = Test-Endpoint "Final Invoice List" "$BaseUrl/api/debug/billing-test?action=invoices`&limit=5`&user_id=$UserId"
if ($finalInvoices) {
    Write-Host "   📋 Found: $($finalInvoices.data.invoices.Count) invoices" -ForegroundColor Blue
    foreach ($invoice in $finalInvoices.data.invoices) {
        Write-Host "   • $($invoice.invoice_number): `$$($invoice.total_cents / 100) ($($invoice.status))" -ForegroundColor Blue
    }
}

Write-Host ""
Write-Host "Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Pro tip: This debug endpoint uses X-API-Key header instead of JWT tokens" -ForegroundColor Yellow
Write-Host "Much easier for development and testing!" -ForegroundColor Yellow
