# Test script for Centcom missing endpoints
# Run this after implementing the endpoints to verify they work correctly

# Configuration
$ApiBaseUrl = if ($env:API_BASE_URL) { $env:API_BASE_URL } else { "http://localhost:3594" }
$AuthToken = $env:AUTH_TOKEN

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Centcom Endpoints Verification Script" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

if (-not $AuthToken) {
    Write-Host "⚠️  No AUTH_TOKEN environment variable set" -ForegroundColor Yellow
    Write-Host "Please set it with a valid Centcom user token:" -ForegroundColor Yellow
    Write-Host '  $env:AUTH_TOKEN = "eyJhbGci..."' -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "API Base URL: $ApiBaseUrl" -ForegroundColor Green
Write-Host ""

# Test counter
$Passed = 0
$Failed = 0

# Function to test an endpoint
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Data,
        [string]$Description
    )

    Write-Host "Testing: $Description" -ForegroundColor Blue
    Write-Host "  $Method $Endpoint"

    $headers = @{
        "Authorization" = "Bearer $AuthToken"
        "Content-Type"  = "application/json"
    }

    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri "$ApiBaseUrl$Endpoint" `
                -Method Get `
                -Headers $headers `
                -UseBasicParsing `
                -ErrorAction Stop
        }
        else {
            $response = Invoke-WebRequest -Uri "$ApiBaseUrl$Endpoint" `
                -Method Post `
                -Headers $headers `
                -Body $Data `
                -UseBasicParsing `
                -ErrorAction Stop
        }

        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
            Write-Host "  ✅ PASSED (HTTP $($response.StatusCode))" -ForegroundColor Green
            $body = $response.Content
            if ($body.Length -gt 200) {
                $body = $body.Substring(0, 200) + "..."
            }
            Write-Host "  Response: $body" -ForegroundColor Gray
            $script:Passed++
        }
        else {
            Write-Host "  ❌ FAILED (HTTP $($response.StatusCode))" -ForegroundColor Red
            Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
            $script:Failed++
        }
    }
    catch {
        Write-Host "  ❌ FAILED (Exception)" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
        $script:Failed++
    }

    Write-Host ""
}

# Test 1: CORS Preflight
Write-Host "Test 1: CORS Preflight (OPTIONS)" -ForegroundColor Blue
try {
    $corsHeaders = @{
        "Origin"                         = "http://localhost:3003"
        "Access-Control-Request-Method"  = "POST"
        "Access-Control-Request-Headers" = "Content-Type, Authorization"
    }

    $response = Invoke-WebRequest -Uri "$ApiBaseUrl/api/centcom/auth/session-update" `
        -Method Options `
        -Headers $corsHeaders `
        -UseBasicParsing `
        -ErrorAction Stop

    if ($response.StatusCode -eq 200) {
        Write-Host "✅ CORS Preflight PASSED" -ForegroundColor Green
        $Passed++
    }
    else {
        Write-Host "❌ CORS Preflight FAILED (HTTP $($response.StatusCode))" -ForegroundColor Red
        $Failed++
    }
}
catch {
    Write-Host "❌ CORS Preflight FAILED (Exception)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
    $Failed++
}
Write-Host ""

# Test 2: Session Update
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$sessionId = "test-session-$(Get-Date -Format 'yyyyMMddHHmmss')"

Test-Endpoint -Method "POST" -Endpoint "/api/centcom/auth/session-update" `
    -Data (@{
    version     = "1.0.0"
    instance_id = "test-123"
    user_agent  = "CentCom/1.0.0"
    platform    = "Windows"
    build       = "2024.12.001"
    session_id  = $sessionId
    timestamp   = $timestamp
} | ConvertTo-Json) `
    -Description "Session Update Endpoint"

# Test 3: Admin Session Update
$adminSessionId = "test-admin-session-$(Get-Date -Format 'yyyyMMddHHmmss')"

Test-Endpoint -Method "POST" -Endpoint "/api/admin/sessions/update" `
    -Data (@{
    version     = "1.0.0"
    instance_id = "test-admin-123"
    user_agent  = "CentCom/1.0.0"
    platform    = "Windows"
    build       = "2024.12.001"
    session_id  = $adminSessionId
    timestamp   = $timestamp
} | ConvertTo-Json) `
    -Description "Admin Session Update Endpoint"

# Test 4: Session Sync (Simple)
# Note: You need to get the user_id first
Write-Host "Note: Session Sync test requires a valid user_id" -ForegroundColor Yellow
Write-Host "Skipping Session Sync test - replace USER_ID in script if needed" -ForegroundColor Yellow
Write-Host ""

# Uncomment and replace USER_ID to test:
# $userId = "REPLACE_WITH_ACTUAL_USER_ID"
# $syncSessionId = "test-sync-$(Get-Date -Format 'yyyyMMddHHmmss')"
# Test-Endpoint -Method "POST" -Endpoint "/api/centcom/sessions/sync" `
#     -Data (@{
#         session_id = $syncSessionId
#         user_id = $userId
#         status = "active"
#         last_activity = $timestamp
#         platform = "Windows"
#         version = "1.0.0"
#     } | ConvertTo-Json) `
#     -Description "Session Sync Endpoint (Simple Format)"

# Test 5: Dashboard Stats
Test-Endpoint -Method "GET" -Endpoint "/api/user/dashboard/stats" `
    -Data "" `
    -Description "Dashboard Stats Endpoint"

# Test 6: Onboarding Sessions
Test-Endpoint -Method "GET" -Endpoint "/api/user/onboarding/sessions" `
    -Data "" `
    -Description "Onboarding Sessions Endpoint"

# Summary
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Test Summary" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Passed: $Passed" -ForegroundColor Green
Write-Host "Failed: $Failed" -ForegroundColor Red
Write-Host ""

if ($Failed -eq 0) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "⚠️  Some tests failed. Check the output above." -ForegroundColor Red
    exit 1
}
