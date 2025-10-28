# ============================================================================
# Centcom v1.0.0 Installer Upload Script
# ============================================================================
# This PowerShell script uploads the Centcom installers to Supabase Storage
# ============================================================================

# IMPORTANT: Set your admin JWT token here
$ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6Iit2VzVWTU5OTjY4MnN0OTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tmZmlhcXNpaGxkZ3Fkd2Fnb29rLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyYzNkNDc0Ny04ZDY3LTQ1YWYtOTBmNS1iNWU5MDU4ZWMyNDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYxNjc0MTUzLCJpYXQiOjE3NjE2NzA1NTMsImVtYWlsIjoiam9zaEB0aGVseWNldW0uaW8iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJUaGUgTHljZXVtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ikpvc2h1YSBMZXZ5IiwiaW52aXRlZF9ieV9hZG1pbiI6dHJ1ZSwicGFzc3dvcmRfc2V0Ijp0cnVlLCJyb2xlIjoiYWRtaW4iLCJ1c2VyX25hbWUiOiJseWNldW0tYWRtaW4ifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MTY3MDU1M31dLCJzZXNzaW9uX2lkIjoiYTU1NjM4NDQtYzBlMC00MDE5LTk5NjktYmFhNTNlZGI4NTRjIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.h_ic5qcNHK2A6vsfdnsBxLbZoBpvkOHZF1Z5FP7m5BI"

# API endpoint
$API_URL = "https://thelyceum.io/api/admin/centcom/releases/upload"

# File locations
$MSI_FILE = "C:\Users\joshual\Documents\Cursor\datacenter\src-tauri\target\release\bundle\msi\Centcom_1.0.0_x64_en-US.msi"
$EXE_FILE = "C:\Users\joshual\Documents\Cursor\datacenter\src-tauri\target\release\bundle\nsis\Centcom_1.0.0_x64-setup.exe"

# Metadata
$VERSION = "1.0.0"
$PLATFORM = "windows"
$ARCHITECTURE = "x64"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  Centcom v1.0.0 Installer Upload" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if admin token is set
if ($ADMIN_TOKEN -eq "YOUR_ADMIN_JWT_TOKEN_HERE") {
    Write-Host "ERROR: Please set your ADMIN_TOKEN in this script first!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To get your admin JWT token:" -ForegroundColor Yellow
    Write-Host "1. Go to https://lyceum.app and log in as admin" -ForegroundColor Yellow
    Write-Host "2. Open browser DevTools (F12)" -ForegroundColor Yellow
    Write-Host "3. Go to Console and run: localStorage.getItem('supabase.auth.token')" -ForegroundColor Yellow
    Write-Host "4. Copy the 'access_token' value" -ForegroundColor Yellow
    Write-Host "5. Paste it into this script at line 9" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# ============================================================================
# Upload MSI Installer
# ============================================================================

Write-Host "Uploading MSI installer..." -ForegroundColor Yellow

if (Test-Path $MSI_FILE) {
    Write-Host "  File: $MSI_FILE" -ForegroundColor Gray
    Write-Host "  Size: $((Get-Item $MSI_FILE).Length / 1MB) MB" -ForegroundColor Gray

    $msiForm = @{
        file = Get-Item -Path $MSI_FILE
        version = $VERSION
        platform = $PLATFORM
        architecture = $ARCHITECTURE
        installer_type = "msi"
        is_stable = "true"
        auto_update_enabled = "true"
    }

    try {
        $msiResponse = Invoke-RestMethod -Uri $API_URL -Method Post -Headers @{
            "Authorization" = "Bearer $ADMIN_TOKEN"
        } -Form $msiForm

        Write-Host "  SUCCESS: MSI uploaded!" -ForegroundColor Green
        Write-Host "  Version ID: $($msiResponse.version_id)" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "  ERROR: Failed to upload MSI" -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
} else {
    Write-Host "  ERROR: MSI file not found at: $MSI_FILE" -ForegroundColor Red
    Write-Host "  Please update the file path in this script" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# Upload NSIS Installer
# ============================================================================

Write-Host "Uploading NSIS installer..." -ForegroundColor Yellow

if (Test-Path $EXE_FILE) {
    Write-Host "  File: $EXE_FILE" -ForegroundColor Gray
    Write-Host "  Size: $((Get-Item $EXE_FILE).Length / 1MB) MB" -ForegroundColor Gray

    $exeForm = @{
        file = Get-Item -Path $EXE_FILE
        version = $VERSION
        platform = $PLATFORM
        architecture = $ARCHITECTURE
        installer_type = "exe"
        is_stable = "true"
        auto_update_enabled = "true"
    }

    try {
        $exeResponse = Invoke-RestMethod -Uri $API_URL -Method Post -Headers @{
            "Authorization" = "Bearer $ADMIN_TOKEN"
        } -Form $exeForm

        Write-Host "  SUCCESS: NSIS installer uploaded!" -ForegroundColor Green
        Write-Host "  Version ID: $($exeResponse.version_id)" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "  ERROR: Failed to upload NSIS installer" -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
} else {
    Write-Host "  ERROR: NSIS installer not found at: $EXE_FILE" -ForegroundColor Red
    Write-Host "  Please update the file path in this script" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# Verification
# ============================================================================

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  Upload Complete!" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test download from dashboard: https://lyceum.app/dashboard" -ForegroundColor Yellow
Write-Host "2. Verify SHA256 hashes match Centcom's values" -ForegroundColor Yellow
Write-Host "3. Coordinate with Centcom team for end-to-end testing" -ForegroundColor Yellow
Write-Host ""
