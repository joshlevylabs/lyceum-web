# Complete ngrok Setup Verification
# Run this after authenticating ngrok

Write-Host "=== NGROK SETUP VERIFICATION ===" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if ngrok is authenticated
Write-Host "1. Checking ngrok authentication..." -ForegroundColor Yellow

try {
    $configTest = .\ngrok.exe config check 2>&1
    if ($configTest -match "error" -or $configTest -match "authentication") {
        Write-Host "❌ ngrok not authenticated yet" -ForegroundColor Red
        Write-Host "   Run: .\ngrok.exe config add-authtoken YOUR_TOKEN" -ForegroundColor Yellow
        Write-Host "   Get token from: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Blue
        exit 1
    } else {
        Write-Host "✅ ngrok is authenticated!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error checking ngrok config: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test ngrok version
Write-Host ""
Write-Host "2. Checking ngrok version..." -ForegroundColor Yellow
try {
    $version = .\ngrok.exe version
    Write-Host "✅ ngrok version: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ ngrok version check failed" -ForegroundColor Red
    exit 1
}

# Step 3: Start tunnel (in background for testing)
Write-Host ""
Write-Host "3. Testing tunnel creation..." -ForegroundColor Yellow
Write-Host "   Starting ngrok tunnel to port 3594..." -ForegroundColor Blue

# Start ngrok in background and capture output
$ngrokJob = Start-Job -ScriptBlock {
    param($ngrokPath)
    Set-Location (Split-Path $ngrokPath)
    & $ngrokPath http 3594 --log stdout
} -ArgumentList (Resolve-Path ".\ngrok.exe")

# Wait a moment for ngrok to start
Start-Sleep -Seconds 5

# Check if the job is running
if ($ngrokJob.State -eq "Running") {
    Write-Host "✅ ngrok tunnel started successfully!" -ForegroundColor Green
    
    # Try to get the URL from ngrok API
    Write-Host ""
    Write-Host "4. Getting tunnel URL..." -ForegroundColor Yellow
    
    try {
        # ngrok provides a local API to get tunnel info
        $tunnelInfo = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        $httpsUrl = ($tunnelInfo.tunnels | Where-Object { $_.proto -eq "https" }).public_url
        
        if ($httpsUrl) {
            Write-Host "✅ Tunnel URL: $httpsUrl" -ForegroundColor Green
            $webhookUrl = "$httpsUrl/api/billing/stripe-webhook"
            Write-Host "✅ Webhook URL: $webhookUrl" -ForegroundColor Green
            
            Write-Host ""
            Write-Host "5. Testing webhook endpoint..." -ForegroundColor Yellow
            
            try {
                $response = Invoke-WebRequest -Uri $webhookUrl -Method POST -Body '{}' -ContentType 'application/json' -ErrorAction Stop
                Write-Host "❌ Unexpected: Webhook accepted invalid request" -ForegroundColor Red
            } catch {
                if ($_.Exception.Message -match "400") {
                    Write-Host "✅ Webhook endpoint working correctly!" -ForegroundColor Green
                    Write-Host "   (Properly rejects invalid signatures)" -ForegroundColor Gray
                    
                    Write-Host ""
                    Write-Host "🎉 COMPLETE SUCCESS!" -ForegroundColor Green
                    Write-Host "======================" -ForegroundColor Green
                    Write-Host ""
                    Write-Host "Your ngrok tunnel is running!" -ForegroundColor Blue
                    Write-Host "Webhook URL for Stripe Dashboard:" -ForegroundColor Yellow
                    Write-Host "$webhookUrl" -ForegroundColor White
                    Write-Host ""
                    Write-Host "Next steps:" -ForegroundColor Yellow
                    Write-Host "1. Go to: https://dashboard.stripe.com/test/webhooks" -ForegroundColor White
                    Write-Host "2. Edit your webhook URL to: $webhookUrl" -ForegroundColor White
                    Write-Host "3. Test from Stripe Dashboard" -ForegroundColor White
                    Write-Host ""
                    Write-Host "Keep this terminal open - ngrok is running in background" -ForegroundColor Magenta
                    
                } else {
                    Write-Host "⚠️  Webhook accessible but unexpected response: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "❌ Could not get tunnel URL from ngrok API" -ForegroundColor Red
        }
    } catch {
        Write-Host "⚠️  Could not get tunnel info from ngrok API" -ForegroundColor Yellow
        Write-Host "   ngrok is running, but check manually at: http://localhost:4040" -ForegroundColor Blue
    }
    
} else {
    Write-Host "❌ ngrok tunnel failed to start" -ForegroundColor Red
    Write-Host "Job state: $($ngrokJob.State)" -ForegroundColor Yellow
    
    # Get any error output
    $jobOutput = Receive-Job $ngrokJob -ErrorAction SilentlyContinue
    if ($jobOutput) {
        Write-Host "Error output: $jobOutput" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press Ctrl+C to stop ngrok tunnel when done testing" -ForegroundColor Yellow
