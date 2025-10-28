# ============================================================================
# Centcom v1.0.0 Installer Upload Script (Windows PowerShell 5.1 Compatible)
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
Write-Host "  Centcom v1.0.0 Installer Upload (curl method)" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Function to upload using curl
function Upload-File {
    param(
        [string]$FilePath,
        [string]$InstallerType,
        [string]$FileType
    )

    Write-Host "Uploading $FileType installer..." -ForegroundColor Yellow

    if (Test-Path $FilePath) {
        $fileInfo = Get-Item $FilePath
        Write-Host "  File: $FilePath" -ForegroundColor Gray
        Write-Host "  Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
        Write-Host "  This may take 5-15 minutes depending on your connection..." -ForegroundColor Gray
        Write-Host ""

        # Use curl for multipart upload (Windows 10+ has curl built-in)
        $curlArgs = @(
            "-X", "POST",
            $API_URL,
            "-H", "Authorization: Bearer $ADMIN_TOKEN",
            "-F", "file=@$FilePath",
            "-F", "version=$VERSION",
            "-F", "platform=$PLATFORM",
            "-F", "architecture=$ARCHITECTURE",
            "-F", "installer_type=$InstallerType",
            "-F", "is_stable=true",
            "-F", "auto_update_enabled=true"
        )

        try {
            Write-Host "  Starting upload..." -ForegroundColor Gray
            $response = & curl.exe @curlArgs 2>&1

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  SUCCESS: $FileType uploaded!" -ForegroundColor Green
                Write-Host "  Response: $response" -ForegroundColor Gray
            } else {
                Write-Host "  ERROR: Upload failed" -ForegroundColor Red
                Write-Host "  Exit code: $LASTEXITCODE" -ForegroundColor Red
                Write-Host "  Response: $response" -ForegroundColor Red
            }
        } catch {
            Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
        Write-Host ""
    } else {
        Write-Host "  ERROR: File not found at: $FilePath" -ForegroundColor Red
        Write-Host ""
    }
}

# ============================================================================
# Upload both installers
# ============================================================================

Upload-File -FilePath $MSI_FILE -InstallerType "msi" -FileType "MSI"
Upload-File -FilePath $EXE_FILE -InstallerType "exe" -FileType "NSIS"

# ============================================================================
# Completion
# ============================================================================

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  Upload Process Complete!" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test download from dashboard: https://thelyceum.io/dashboard" -ForegroundColor Yellow
Write-Host "2. Verify SHA256 hashes match Centcom's values" -ForegroundColor Yellow
Write-Host "3. Coordinate with Centcom team for end-to-end testing" -ForegroundColor Yellow
Write-Host ""
