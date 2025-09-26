# Test Invoice Payment Status Update
# This script simulates what happens when Stripe webhooks work correctly

Write-Host "🧪 TESTING INVOICE PAYMENT STATUS UPDATE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3594"
$apiKey = "your-secure-random-string-here"
$userId = "21b9fa0f-26cc-4b7a-865c-48759f778a38"  # joshual@sonance.com

try {
    # Step 1: Get available invoices
    Write-Host "📋 Fetching available invoices..." -ForegroundColor Yellow
    
    $invoiceResponse = Invoke-RestMethod -Uri "$baseUrl/api/debug/update-invoice-status?user_id=$userId" -Method GET -Headers @{
        "X-API-Key" = $apiKey
    }
    
    if ($invoiceResponse.success) {
        Write-Host "✅ Found $($invoiceResponse.data.invoices.Count) invoices" -ForegroundColor Green
        Write-Host ""
        
        foreach ($invoice in $invoiceResponse.data.invoices) {
            Write-Host "  📄 $($invoice.invoice_number)" -ForegroundColor White
            Write-Host "     ID: $($invoice.id)" -ForegroundColor Gray
            Write-Host "     Status: $($invoice.status)" -ForegroundColor Gray
            Write-Host "     Amount: `$$($invoice.total_dollars)" -ForegroundColor Gray
            Write-Host ""
        }
        
        # Step 2: Find the first 'sent' invoice to update
        $sentInvoice = $invoiceResponse.data.invoices | Where-Object { $_.status -eq 'sent' } | Select-Object -First 1
        
        if ($sentInvoice) {
            Write-Host "🎯 Testing payment on: $($sentInvoice.invoice_number) (`$$($sentInvoice.total_dollars))" -ForegroundColor Yellow
            
            # Step 3: Update invoice status to 'paid'
            $updateBody = @{
                invoice_id = $sentInvoice.id
                status = 'paid'
                payment_method_last4 = '4242'
                payment_method_brand = 'visa'
            } | ConvertTo-Json
            
            $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/debug/update-invoice-status" -Method POST -Headers @{
                "Content-Type" = "application/json"
                "X-API-Key" = $apiKey
            } -Body $updateBody
            
            if ($updateResponse.success) {
                Write-Host "✅ SUCCESS! Invoice status updated:" -ForegroundColor Green
                Write-Host "   📄 Invoice: $($sentInvoice.invoice_number)" -ForegroundColor White
                Write-Host "   📊 Status: sent → paid" -ForegroundColor Green
                Write-Host "   📅 Payment Date: $(Get-Date -Format 'yyyy-MM-dd')" -ForegroundColor White
                Write-Host "   💳 Payment Method: VISA ••••4242" -ForegroundColor White
                Write-Host ""
                Write-Host "🎊 REFRESH YOUR ADMIN PANEL TO SEE THE CHANGE!" -ForegroundColor Magenta
                Write-Host "   Go to: http://localhost:3594/admin/users" -ForegroundColor White
                Write-Host "   Click: joshual@sonance.com → Profile → Payments" -ForegroundColor White
                Write-Host "   The invoice should now show 'paid' status!" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to update invoice: $($updateResponse.error)" -ForegroundColor Red
            }
        } else {
            Write-Host "⚠️  No 'sent' invoices found to test payment on" -ForegroundColor Yellow
            Write-Host "   All invoices may already be 'paid' or 'draft'" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Failed to fetch invoices: $($invoiceResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Script error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure your server is running on http://localhost:3594" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 UNDERSTANDING THE WEBHOOK FLOW:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "This script simulates what should happen automatically:" -ForegroundColor Yellow
Write-Host "1. User pays invoice in Stripe" -ForegroundColor White
Write-Host "2. Stripe sends 'invoice.payment_succeeded' webhook" -ForegroundColor White
Write-Host "3. Your webhook handler updates status to 'paid'" -ForegroundColor White
Write-Host "4. User sees 'paid' status in admin panel" -ForegroundColor White
Write-Host ""
Write-Host "🔧 To fix webhooks permanently:" -ForegroundColor Yellow
Write-Host "- Verify STRIPE_WEBHOOK_SECRET in .env.local" -ForegroundColor White
Write-Host "- Check ngrok URL in Stripe Dashboard" -ForegroundColor White
Write-Host "- Test webhook endpoint manually" -ForegroundColor White
