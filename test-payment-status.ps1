# Test Invoice Payment Status Update
Write-Host "🧪 Testing Invoice Payment Status Update" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3594"
$apiKey = "your-secure-random-string-here"
$userId = "21b9fa0f-26cc-4b7a-865c-48759f778a38"

try {
    Write-Host "📋 Fetching invoices..." -ForegroundColor Yellow
    
    $url = "$baseUrl/api/debug/update-invoice-status?user_id=$userId"
    $headers = @{"X-API-Key" = $apiKey}
    $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers
    
    if ($response.success) {
        Write-Host "✅ Found $($response.data.invoices.Count) invoices" -ForegroundColor Green
        Write-Host ""
        
        foreach ($invoice in $response.data.invoices) {
            Write-Host "  📄 $($invoice.invoice_number)" -ForegroundColor White
            Write-Host "     Status: $($invoice.status)" -ForegroundColor Gray  
            Write-Host "     Amount: `$$($invoice.total_dollars)" -ForegroundColor Gray
            Write-Host ""
        }
        
        $sentInvoice = $response.data.invoices | Where-Object { $_.status -eq 'sent' } | Select-Object -First 1
        
        if ($sentInvoice) {
            Write-Host "🎯 Found invoice to test: $($sentInvoice.invoice_number)" -ForegroundColor Yellow
            
            $updateBody = @{
                invoice_id = $sentInvoice.id
                status = 'paid'
                payment_method_last4 = '4242'
                payment_method_brand = 'visa'
            } | ConvertTo-Json
            
            $updateUrl = "$baseUrl/api/debug/update-invoice-status"
            $updateHeaders = @{
                "Content-Type" = "application/json"
                "X-API-Key" = $apiKey
            }
            
            $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method POST -Headers $updateHeaders -Body $updateBody
            
            if ($updateResponse.success) {
                Write-Host "✅ SUCCESS! Invoice updated to PAID" -ForegroundColor Green
                Write-Host "   📄 Invoice: $($sentInvoice.invoice_number)" -ForegroundColor White
                Write-Host "   📊 Status: sent → paid" -ForegroundColor Green  
                Write-Host "   💳 Payment: VISA ••••4242" -ForegroundColor White
                Write-Host ""
                Write-Host "🎊 REFRESH ADMIN PANEL TO SEE CHANGE!" -ForegroundColor Magenta
                Write-Host "   http://localhost:3594/admin/users" -ForegroundColor White
            } else {
                Write-Host "❌ Update failed: $($updateResponse.error)" -ForegroundColor Red
            }
        } else {
            Write-Host "⚠️  No 'sent' invoices found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Failed to get invoices: $($response.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure server is running on http://localhost:3594" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 This simulates Stripe webhook payment confirmation" -ForegroundColor Cyan
