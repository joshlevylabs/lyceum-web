# Test Payment Flow Script
# Creates test invoice and processes payment through Stripe

param(
    [string]$UserId = "2c3d4747-8d67-45af-90f5-b5e9058ec246", # josh@thelyceum.io
    [string]$ApiKey = $env:CRON_SECRET
)

Write-Host "🧪 TESTING COMPLETE PAYMENT FLOW" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

if (-not $ApiKey) {
    $ApiKey = "your-secure-random-string-here"
}

$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUrl = "http://localhost:3594"

# Step 1: Check current billing status
Write-Host "1. Checking current billing status..." -ForegroundColor Yellow
try {
    $usageResponse = Invoke-WebRequest -Uri "$BaseUrl/api/debug/billing-test?action=usage&user_id=$UserId" -Headers $Headers -ErrorAction Stop
    $usageData = $usageResponse.Content | ConvertFrom-Json
    $cost = $usageData.data.estimated_monthly_cost
    
    Write-Host "✅ Current user billing:" -ForegroundColor Green
    Write-Host "   User: $UserId" -ForegroundColor Blue
    Write-Host "   Monthly cost: `$$([math]::Round($cost.totalAmount / 100, 2))" -ForegroundColor Blue
    Write-Host "   Line items: $($cost.lineItems.Count)" -ForegroundColor Blue
    
    foreach ($item in $cost.lineItems) {
        Write-Host "   • $($item.name): `$$([math]::Round($item.totalPrice / 100, 2))" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Failed to get billing status: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Check existing invoices
Write-Host "2. Checking existing invoices..." -ForegroundColor Yellow
try {
    $invoicesResponse = Invoke-WebRequest -Uri "$BaseUrl/api/debug/billing-test?action=invoices&user_id=$UserId" -Headers $Headers -ErrorAction Stop
    $invoicesData = $invoicesResponse.Content | ConvertFrom-Json
    $invoices = $invoicesData.data.invoices
    
    Write-Host "✅ Current invoices: $($invoices.Count)" -ForegroundColor Green
    if ($invoices.Count -gt 0) {
        foreach ($invoice in $invoices) {
            Write-Host "   • Invoice: $($invoice.invoice_number) - `$$($invoice.total_cents / 100) ($($invoice.status))" -ForegroundColor Blue
        }
    } else {
        Write-Host "   No invoices found (normal for new billing period)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to get invoices: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 3: Instructions for manual testing
Write-Host "3. MANUAL TESTING STEPS:" -ForegroundColor Yellow
Write-Host "-------------------------" -ForegroundColor Yellow
Write-Host ""

Write-Host "A. ADD PAYMENT METHOD IN ADMIN PANEL:" -ForegroundColor Magenta
Write-Host "   1. Go to: http://localhost:3594/admin/users" -ForegroundColor White
Write-Host "   2. Click on user: joshual@sonance.com" -ForegroundColor White
Write-Host "   3. Go to Profile > Payments tab" -ForegroundColor White
Write-Host "   4. Add payment method with test card:" -ForegroundColor White
Write-Host "      Card: 4242424242424242" -ForegroundColor Green
Write-Host "      Exp: 12/28, CVC: 123, ZIP: 12345" -ForegroundColor Green
Write-Host ""

Write-Host "B. MONITOR WEBHOOKS:" -ForegroundColor Magenta
Write-Host "   1. Open ngrok interface: http://localhost:4040" -ForegroundColor White
Write-Host "   2. Watch for webhook events when you add payment method" -ForegroundColor White
Write-Host "   3. Look for: payment_method.attached" -ForegroundColor Green
Write-Host ""

Write-Host "C. CREATE STRIPE INVOICE (Direct Stripe Test):" -ForegroundColor Magenta
Write-Host "   1. Go to: https://dashboard.stripe.com/test/invoices" -ForegroundColor White
Write-Host "   2. Click 'Create invoice'" -ForegroundColor White
Write-Host "   3. Select customer: joshual@sonance.com" -ForegroundColor White
Write-Host "   4. Add line item: Platform Base Fee - `$10.00" -ForegroundColor White
Write-Host "   5. Send invoice and watch webhooks!" -ForegroundColor White
Write-Host ""

Write-Host "D. WEBHOOK EVENTS TO WATCH FOR:" -ForegroundColor Magenta
Write-Host "   • payment_method.attached (when adding card)" -ForegroundColor Green
Write-Host "   • invoice.created (when creating invoice)" -ForegroundColor Green
Write-Host "   • invoice.finalized (when invoice is ready)" -ForegroundColor Green
Write-Host "   • invoice.payment_succeeded (when payment works)" -ForegroundColor Green
Write-Host ""

# Step 4: Create webhook monitoring helper
Write-Host "4. Webhook monitoring setup..." -ForegroundColor Yellow
Write-Host "Open these URLs in browser tabs:" -ForegroundColor White
Write-Host "   📊 ngrok webhooks: http://localhost:4040" -ForegroundColor Cyan
Write-Host "   🏪 Stripe dashboard: https://dashboard.stripe.com/test/events" -ForegroundColor Cyan
Write-Host "   👥 Admin panel: http://localhost:3594/admin/users" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎯 READY TO TEST!" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green
Write-Host "Follow steps A-C above and watch the webhook events!" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 TIP: Start with adding a payment method in the admin panel" -ForegroundColor Blue
Write-Host "You should see a payment_method.attached webhook immediately!" -ForegroundColor Blue
