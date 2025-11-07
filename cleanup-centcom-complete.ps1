# Complete CentCom Data Cleanup
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  CentCom Complete Data Cleanup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$directories = @(
    "$env:LOCALAPPDATA\centcom",
    "$env:LOCALAPPDATA\CentCom",
    "$env:LOCALAPPDATA\com.centcom.app",
    "$env:APPDATA\centcom",
    "$env:APPDATA\CentCom",
    "$env:APPDATA\com.centcom.app"
)

Write-Host "This will delete ALL CentCom local data:" -ForegroundColor Yellow
Write-Host ""

$foundDirs = @()
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "  ✅ $dir" -ForegroundColor Green
        $foundDirs += $dir
    }
}

if ($foundDirs.Count -eq 0) {
    Write-Host "  ❌ No CentCom directories found" -ForegroundColor Red
    Write-Host ""
    Write-Host "CentCom may have already been cleaned up." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "This will remove LOCAL-0002 and all cluster registrations." -ForegroundColor Yellow
Write-Host "After cleanup, CentCom will re-register only your current machine." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Close CentCom application before proceeding!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Type 'DELETE' to proceed (case-sensitive)"

if ($confirm -eq 'DELETE') {
    Write-Host ""
    Write-Host "Deleting CentCom data..." -ForegroundColor Yellow

    foreach ($dir in $foundDirs) {
        try {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
            Write-Host "  ✅ Deleted: $dir" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Failed to delete: $dir" -ForegroundColor Red
            Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  Cleanup Complete!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Verify in Lyceum Supabase that LOCAL-0002 is deleted" -ForegroundColor White
    Write-Host "  2. Start CentCom application" -ForegroundColor White
    Write-Host "  3. Check Database Connections - should only show LOCAL-0011" -ForegroundColor White
    Write-Host "  4. Check Lyceum /clusters page - should show 1 local cluster" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Cancelled. No files were deleted." -ForegroundColor Red
    Write-Host ""
}
