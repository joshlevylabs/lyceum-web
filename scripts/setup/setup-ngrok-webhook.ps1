# ngrok Webhook Setup Helper
# Run this AFTER you have ngrok installed and running

param(
    [string]$NgrokUrl = ""
)

Write-Host "=== NGROK WEBHOOK SETUP HELPER ===" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

if (-not $NgrokUrl) {
    Write-Host "STEP 1: Start ngrok tunnel" -ForegroundColor Yellow
    Write-Host "------------------------" -ForegroundColor Yellow
    Write-Host "In a NEW terminal window, run:" -ForegroundColor White
    Write-Host "  ngrok http 3594" -ForegroundColor Green
    Write-Host ""
    Write-Host "Look for output like:" -ForegroundColor White
    Write-Host "  Forwarding  https://abc123.ngrok.io -> http://localhost:3594" -ForegroundColor Blue
    Write-Host ""
    Write-Host "STEP 2: Copy the HTTPS URL and run this script again:" -ForegroundColor Yellow
    Write-Host "  .\setup-ngrok-webhook.ps1 -NgrokUrl 'https://your-ngrok-url.ngrok.io'" -ForegroundColor Green
    Write-Host ""
    return
}

# Validate URL
if (-not $NgrokUrl.StartsWith('https://') -or -not $NgrokUrl.Contains('ngrok.io')) {
    Write-Host "❌ Invalid ngrok URL. Please provide the HTTPS ngrok URL." -ForegroundColor Red
    Write-Host "   Example: https://abc123.ngrok.io" -ForegroundColor Yellow
    return
}

$webhookUrl = "$NgrokUrl/api/billing/stripe-webhook"

Write-Host "✅ ngrok URL validated: $NgrokUrl" -ForegroundColor Green
Write-Host "✅ Webhook URL: $webhookUrl" -ForegroundColor Green
Write-Host ""

# Test webhook endpoint
Write-Host "STEP 3: Testing webhook endpoint..." -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $webhookUrl -Method POST -Body '{}' -ContentType 'application/json' -ErrorAction Stop
    Write-Host "❌ Unexpected: Webhook accepted invalid request" -ForegroundColor Red
} catch {
    if ($_.Exception.Message -match "400") {
        Write-Host "✅ Webhook endpoint is working correctly!" -ForegroundColor Green
        Write-Host "   (Properly rejects requests without valid Stripe signature)" -ForegroundColor Gray
    } elseif ($_.Exception.Message -match "404") {
        Write-Host "❌ Webhook endpoint not found. Check your Next.js server is running." -ForegroundColor Red
        return
    } elseif ($_.Exception.Message -match "502|503") {
        Write-Host "❌ Server not reachable. Make sure:" -ForegroundColor Red
        Write-Host "   1. Your Next.js dev server is running (npm run dev)" -ForegroundColor Yellow
        Write-Host "   2. ngrok is running (ngrok http 3594)" -ForegroundColor Yellow
        return
    } else {
        Write-Host "✅ Webhook endpoint accessible" -ForegroundColor Green
        Write-Host "   Status: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

Write-Host ""

# Stripe Dashboard Instructions
Write-Host "STEP 4: Update Stripe Dashboard" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Yellow
Write-Host "1. Go to: https://dashboard.stripe.com/test/webhooks" -ForegroundColor White
Write-Host "2. Find your existing webhook endpoint" -ForegroundColor White
Write-Host "3. Click 'Edit' or create new endpoint" -ForegroundColor White
Write-Host "4. Update Endpoint URL to:" -ForegroundColor White
Write-Host "   $webhookUrl" -ForegroundColor Green
Write-Host "5. Ensure these events are selected:" -ForegroundColor White
Write-Host "   • invoice.payment_succeeded" -ForegroundColor Blue
Write-Host "   • invoice.payment_failed" -ForegroundColor Blue
Write-Host "   • invoice.created" -ForegroundColor Blue
Write-Host "   • invoice.finalized" -ForegroundColor Blue
Write-Host "   • customer.subscription.created" -ForegroundColor Blue
Write-Host "   • customer.subscription.updated" -ForegroundColor Blue
Write-Host "   • customer.subscription.deleted" -ForegroundColor Blue
Write-Host "   • payment_method.attached" -ForegroundColor Blue
Write-Host "6. Save the webhook" -ForegroundColor White
Write-Host ""

# Test webhook from Stripe
Write-Host "STEP 5: Test from Stripe Dashboard" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow
Write-Host "1. In Stripe Dashboard, go to your webhook" -ForegroundColor White
Write-Host "2. Click 'Send test webhook'" -ForegroundColor White
Write-Host "3. Select event: 'invoice.payment_succeeded'" -ForegroundColor White
Write-Host "4. Click 'Send test webhook'" -ForegroundColor White
Write-Host "5. Check for successful delivery (green checkmark)" -ForegroundColor White
Write-Host ""

Write-Host "🎉 SETUP COMPLETE!" -ForegroundColor Green
Write-Host "Your webhook URL: $webhookUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Remember:" -ForegroundColor Yellow
Write-Host "• Keep ngrok running while testing" -ForegroundColor White
Write-Host "• ngrok URL changes each restart (unless you have paid plan)" -ForegroundColor White
Write-Host "• Update Stripe webhook URL if ngrok restarts" -ForegroundColor White


