# Quick Webhook URL Tester
# Run this with your ngrok URL to verify everything is working

param(
    [Parameter(Mandatory=$true)]
    [string]$NgrokUrl
)

Write-Host "=== WEBHOOK URL VERIFICATION ===" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Validate URL format
if (-not $NgrokUrl.StartsWith('https://') -or -not $NgrokUrl.Contains('ngrok.io')) {
    Write-Host "❌ Invalid ngrok URL format!" -ForegroundColor Red
    Write-Host "   Expected: https://abc123.ngrok.io" -ForegroundColor Yellow
    Write-Host "   Received: $NgrokUrl" -ForegroundColor Yellow
    exit 1
}

$webhookUrl = "$NgrokUrl/api/billing/stripe-webhook"

Write-Host "✅ ngrok URL: $NgrokUrl" -ForegroundColor Green
Write-Host "🔗 Webhook URL: $webhookUrl" -ForegroundColor Blue
Write-Host ""

# Test the webhook endpoint
Write-Host "Testing webhook endpoint..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $webhookUrl -Method POST -Body '{}' -ContentType 'application/json' -ErrorAction Stop
    Write-Host "❌ Unexpected: Webhook accepted invalid request (this shouldn't happen)" -ForegroundColor Red
    Write-Host "   Response: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Message -match "400") {
        Write-Host "✅ Perfect! Webhook properly rejects invalid signatures" -ForegroundColor Green
        Write-Host "   (This means your webhook is working correctly)" -ForegroundColor Gray
        $success = $true
    } elseif ($_.Exception.Message -match "404") {
        Write-Host "❌ Webhook endpoint not found!" -ForegroundColor Red
        Write-Host "   Make sure your Next.js server is running: npm run dev" -ForegroundColor Yellow
        $success = $false
    } elseif ($_.Exception.Message -match "502|503|timeout") {
        Write-Host "❌ Cannot reach your local server!" -ForegroundColor Red
        Write-Host "   Check:" -ForegroundColor Yellow
        Write-Host "   1. Next.js server running: npm run dev" -ForegroundColor White
        Write-Host "   2. Server is on port 3594" -ForegroundColor White
        Write-Host "   3. ngrok tunnel is active" -ForegroundColor White
        $success = $false
    } else {
        Write-Host "✅ Webhook endpoint accessible" -ForegroundColor Green
        Write-Host "   Status: $($_.Exception.Message)" -ForegroundColor Gray
        $success = $true
    }
}

Write-Host ""

if ($success) {
    Write-Host "🎉 WEBHOOK IS READY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/webhooks" -ForegroundColor White
    Write-Host "2. Edit your existing webhook (or create new one)" -ForegroundColor White
    Write-Host "3. Set Endpoint URL to:" -ForegroundColor White
    Write-Host "   $webhookUrl" -ForegroundColor Cyan
    Write-Host "4. Save and test from Stripe Dashboard" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Copy this URL to Stripe:" -ForegroundColor Magenta
    Write-Host "$webhookUrl" -ForegroundColor White
} else {
    Write-Host "❌ Webhook setup needs attention" -ForegroundColor Red
    Write-Host "Fix the issues above and try again" -ForegroundColor Yellow
}

Write-Host ""
