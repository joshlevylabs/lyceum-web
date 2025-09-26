# Simple Invoice Payment Test
Write-Host "Testing Invoice Payment Status Update" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3594"
$apiKey = "your-secure-random-string-here"
$userId = "21b9fa0f-26cc-4b7a-865c-48759f778a38"

Write-Host "Fetching invoices..." -ForegroundColor Yellow

$url = "$baseUrl/api/debug/update-invoice-status?user_id=$userId"
$headers = @{"X-API-Key" = $apiKey}

try {
    $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers
    
    if ($response.success) {
        Write-Host "SUCCESS: Found $($response.data.invoices.Count) invoices" -ForegroundColor Green
        
        foreach ($invoice in $response.data.invoices) {
            Write-Host "  Invoice: $($invoice.invoice_number) - Status: $($invoice.status) - Amount: `$$($invoice.total_dollars)" -ForegroundColor White
        }
        
        $sentInvoice = $response.data.invoices | Where-Object { $_.status -eq 'sent' } | Select-Object -First 1
        
        if ($sentInvoice) {
            Write-Host "Found sent invoice to update: $($sentInvoice.invoice_number)" -ForegroundColor Yellow
            
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
                Write-Host "SUCCESS: Invoice updated to PAID!" -ForegroundColor Green
                Write-Host "Invoice: $($sentInvoice.invoice_number) is now marked as paid" -ForegroundColor Green
            } else {
                Write-Host "ERROR: Update failed - $($updateResponse.error)" -ForegroundColor Red
            }
        } else {
            Write-Host "No sent invoices found to update" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERROR: Failed to get invoices - $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure server is running on http://localhost:3594" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Refresh your admin panel to see the updated invoice status!" -ForegroundColor Cyan
