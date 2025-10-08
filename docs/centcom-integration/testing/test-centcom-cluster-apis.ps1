# PowerShell Test Script for CentCom Cluster Management APIs
# Tests all 4 endpoints with color-coded output

$BASE_URL = "http://localhost:3594/api/centcom"

# Configuration - Update these with your actual values
$TEST_CONFIG = @{
    LicenseKey = "YOUR_TEST_LICENSE_KEY_CODE"  # from license_keys.key_code
    MachineFingerprint = "test-machine-$(Get-Date -Format 'yyyyMMddHHmmss')"
    AuthToken = "YOUR_SUPABASE_JWT_TOKEN"  # Get from browser after login
}

# Test results tracking
$testResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Warnings = 0
}

function Write-Section {
    param([string]$Title)
    Write-Host "`n$('=' * 60)" -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host "$('=' * 60)" -ForegroundColor Cyan
}

function Write-Test {
    param([string]$TestName)
    Write-Host "`n🧪 TEST: $TestName" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# Test 1: License Verification
function Test-LicenseVerification {
    Write-Section "TEST 1: License Verification"
    $testResults.Total++
    
    Write-Test "POST /api/centcom/license/verify"
    
    try {
        $body = @{
            license_key = $TEST_CONFIG.LicenseKey
            machine_fingerprint = $TEST_CONFIG.MachineFingerprint
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BASE_URL/license/verify" `
            -Method Post `
            -ContentType "application/json" `
            -Body $body `
            -ErrorAction Stop
        
        Write-Host "Status: 200 OK" -ForegroundColor Green
        Write-Host "Response:" 
        $response | ConvertTo-Json -Depth 10
        
        if ($response.success) {
            Write-Success "License verification successful"
            Write-Host "  License Type: $($response.license.type)"
            Write-Host "  Allows Local Cluster: $($response.license.allows_local_cluster)"
            Write-Host "  Storage Limit: $($response.license.limits.max_storage_gb) GB"
            Write-Host "  Query Limit: $($response.license.limits.max_monthly_queries)"
            Write-Host "  Offline Grace: $($response.license.limits.offline_grace_days) days"
            $testResults.Passed++
        } else {
            Write-Error-Custom "License verification returned success=false"
            $testResults.Failed++
        }
    } catch {
        Write-Error-Custom "Request failed: $($_.Exception.Message)"
        if ($_.ErrorDetails) {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        $testResults.Failed++
    }
}

# Test 2: Cluster Discovery
function Test-ClusterDiscovery {
    Write-Section "TEST 2: Cluster Discovery"
    $testResults.Total++
    
    Write-Test "GET /api/centcom/clusters/discover"
    
    if ($TEST_CONFIG.AuthToken -eq "YOUR_SUPABASE_JWT_TOKEN") {
        Write-Warning-Custom "Skipping - No auth token provided"
        Write-Warning-Custom "To test: Set `$TEST_CONFIG.AuthToken to a valid Supabase JWT"
        $testResults.Warnings++
        return
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $($TEST_CONFIG.AuthToken)"
        }
        
        $response = Invoke-RestMethod -Uri "$BASE_URL/clusters/discover" `
            -Method Get `
            -Headers $headers `
            -ErrorAction Stop
        
        Write-Host "Status: 200 OK" -ForegroundColor Green
        Write-Host "Response:"
        $response | ConvertTo-Json -Depth 10
        
        if ($response.success) {
            Write-Success "Cluster discovery successful"
            Write-Host "  Total Clusters Found: $($response.total)"
            
            if ($response.clusters -and $response.clusters.Count -gt 0) {
                $response.clusters | ForEach-Object -Begin { $i = 0 } -Process {
                    $i++
                    Write-Host "  Cluster ${i}:"
                    Write-Host "    - Name: $($_.name)"
                    Write-Host "    - Type: $($_.type)"
                    Write-Host "    - Architecture: $($_.architecture)"
                    Write-Host "    - Classification: $($_.classification)"
                }
                $testResults.Passed++
            } else {
                Write-Warning-Custom "No clusters returned (may be expected if user has no clusters)"
                $testResults.Warnings++
            }
        }
    } catch {
        Write-Error-Custom "Request failed: $($_.Exception.Message)"
        if ($_.ErrorDetails) {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        $testResults.Failed++
    }
}

# Test 3: Usage Sync
function Test-UsageSync {
    Write-Section "TEST 3: Usage Sync"
    $testResults.Total++
    
    Write-Test "POST /api/centcom/usage/sync"
    
    if ($TEST_CONFIG.AuthToken -eq "YOUR_SUPABASE_JWT_TOKEN") {
        Write-Warning-Custom "Skipping - No auth token provided"
        $testResults.Warnings++
        return
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $($TEST_CONFIG.AuthToken)"
        }
        
        $body = @{
            machine_fingerprint = $TEST_CONFIG.MachineFingerprint
            storage_used_gb = 2.5
            queries_this_month = 15000
            clickhouse_version = "23.8.2.7"
            machine_info = @{
                os = "Windows 10"
                memory_gb = 16
                cpu_cores = 8
            }
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BASE_URL/usage/sync" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $body `
            -ErrorAction Stop
        
        Write-Host "Status: 200 OK" -ForegroundColor Green
        Write-Host "Response:"
        $response | ConvertTo-Json -Depth 10
        
        if ($response.success) {
            Write-Success "Usage sync successful"
            Write-Host "  Storage Used: $($response.usage.storage_used_gb) GB / $($response.usage.storage_limit_gb) GB"
            Write-Host "  Storage %: $([math]::Round($response.usage.percentage_used.storage, 2))%"
            Write-Host "  Queries Used: $($response.usage.queries_this_month) / $($response.usage.query_limit)"
            Write-Host "  Queries %: $([math]::Round($response.usage.percentage_used.queries, 2))%"
            Write-Host "  Should Throttle: $($response.should_throttle)"
            
            if ($response.warnings -and $response.warnings.Count -gt 0) {
                Write-Warning-Custom "Warnings: $($response.warnings.Count)"
                $response.warnings | ForEach-Object {
                    Write-Host "    - $($_.message)" -ForegroundColor Yellow
                }
            }
            
            $testResults.Passed++
        }
    } catch {
        Write-Error-Custom "Request failed: $($_.Exception.Message)"
        if ($_.ErrorDetails) {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        $testResults.Failed++
    }
}

# Test 4: Connection Tracking
function Test-ConnectionTracking {
    Write-Section "TEST 4: Connection Tracking"
    $testResults.Total++
    
    Write-Test "POST /api/centcom/connection/track"
    
    if ($TEST_CONFIG.AuthToken -eq "YOUR_SUPABASE_JWT_TOKEN") {
        Write-Warning-Custom "Skipping - No auth token provided"
        $testResults.Warnings++
        return
    }
    
    # First get a cluster ID from discovery
    try {
        $headers = @{
            "Authorization" = "Bearer $($TEST_CONFIG.AuthToken)"
        }
        
        $discoveryResponse = Invoke-RestMethod -Uri "$BASE_URL/clusters/discover" `
            -Method Get `
            -Headers $headers `
            -ErrorAction Stop
        
        if ($discoveryResponse.success -and $discoveryResponse.clusters -and $discoveryResponse.clusters.Count -gt 0) {
            $testClusterId = $discoveryResponse.clusters[0].id
            Write-Host "Using cluster ID from discovery: $testClusterId"
        } else {
            Write-Warning-Custom "No clusters found - cannot test connection tracking"
            Write-Warning-Custom "Create a test cluster and assign it to the test user first"
            $testResults.Warnings++
            return
        }
    } catch {
        Write-Warning-Custom "Could not fetch clusters: $($_.Exception.Message)"
        $testResults.Warnings++
        return
    }
    
    try {
        $body = @{
            cluster_id = $testClusterId
            connection_type = "cloud"
            connection_name = "Test Connection"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BASE_URL/connection/track" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $body `
            -ErrorAction Stop
        
        Write-Host "Status: 200 OK" -ForegroundColor Green
        Write-Host "Response:"
        $response | ConvertTo-Json -Depth 10
        
        if ($response.success) {
            Write-Success "Connection tracking successful"
            Write-Host "  Connection ID: $($response.connection.id)"
            Write-Host "  Cluster ID: $($response.connection.cluster_id)"
            Write-Host "  Connection Type: $($response.connection.connection_type)"
            Write-Host "  Is Default: $($response.connection.is_default)"
            $testResults.Passed++
        }
    } catch {
        Write-Error-Custom "Request failed: $($_.Exception.Message)"
        if ($_.ErrorDetails) {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        $testResults.Failed++
    }
}

# Print Summary
function Show-Summary {
    Write-Section "TEST SUMMARY"
    
    Write-Host "Total Tests: $($testResults.Total)"
    Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
    Write-Host "Failed: $($testResults.Failed)" -ForegroundColor $(if ($testResults.Failed -gt 0) { "Red" } else { "White" })
    Write-Host "Warnings: $($testResults.Warnings)" -ForegroundColor $(if ($testResults.Warnings -gt 0) { "Yellow" } else { "White" })
    
    if ($testResults.Total -gt 0) {
        $successRate = [math]::Round(($testResults.Passed / $testResults.Total) * 100, 1)
        Write-Host "`nSuccess Rate: ${successRate}%" -ForegroundColor $(if ($successRate -gt 75) { "Green" } else { "Yellow" })
    }
    
    if ($testResults.Failed -eq 0 -and $testResults.Passed -gt 0) {
        Write-Host "`n🎉 All tests passed!" -ForegroundColor Green
    } elseif ($testResults.Warnings -gt 0) {
        Write-Host "`n⚠️  Some tests skipped or have warnings" -ForegroundColor Yellow
    } else {
        Write-Host "`n❌ Some tests failed" -ForegroundColor Red
    }
    
    Write-Host "`n$('=' * 60)`n"
}

# Main execution
Write-Host "`n🚀 Starting CentCom Cluster API Tests..." -ForegroundColor Cyan
Write-Host "Base URL: $BASE_URL`n"

# Configuration check
Write-Section "CONFIGURATION CHECK"
Write-Host "License Key: $(if ($TEST_CONFIG.LicenseKey -eq 'YOUR_TEST_LICENSE_KEY_CODE') { '❌ NOT SET' } else { '✅ Set' })"
Write-Host "Auth Token: $(if ($TEST_CONFIG.AuthToken -eq 'YOUR_SUPABASE_JWT_TOKEN') { '❌ NOT SET' } else { '✅ Set' })"
Write-Host "Machine Fingerprint: $($TEST_CONFIG.MachineFingerprint)"

if ($TEST_CONFIG.LicenseKey -eq "YOUR_TEST_LICENSE_KEY_CODE") {
    Write-Warning-Custom "`n⚠️  Please set `$TEST_CONFIG.LicenseKey to a valid key_code from your license_keys table"
}

if ($TEST_CONFIG.AuthToken -eq "YOUR_SUPABASE_JWT_TOKEN") {
    Write-Warning-Custom "⚠️  Please set `$TEST_CONFIG.AuthToken to a valid Supabase JWT token"
    Write-Warning-Custom "   You can get this from browser DevTools after logging in to Lyceum"
}

# Run tests
Test-LicenseVerification
Test-ClusterDiscovery
Test-UsageSync
Test-ConnectionTracking

# Show summary
Show-Summary

