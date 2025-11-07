# Simple CentCom Cleanup Script
Write-Host "CentCom Data Cleanup" -ForegroundColor Cyan
Write-Host ""

$centcomDir = "$env:APPDATA\.centcom"

if (Test-Path $centcomDir) {
    Write-Host "Found CentCom data: $centcomDir" -ForegroundColor Green
    Write-Host ""
    Write-Host "This will delete LOCAL-0002 and all local cluster data." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Type 'yes' to delete"

    if ($confirm -eq 'yes') {
        Remove-Item -Path $centcomDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Deleted!" -ForegroundColor Green
    } else {
        Write-Host "Cancelled." -ForegroundColor Red
    }
} else {
    Write-Host "Not found: $centcomDir" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next: Restart CentCom and check if LOCAL-0002 is gone." -ForegroundColor Cyan
