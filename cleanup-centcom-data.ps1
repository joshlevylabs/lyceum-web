# CentCom Data Cleanup Script
# This script removes CentCom's local database/cache to force a clean re-registration

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "CentCom Local Data Cleanup Script" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if CentCom is running
$centcomProcess = Get-Process | Where-Object { $_.ProcessName -like "*centcom*" -or $_.ProcessName -like "*lyceum*" }

if ($centcomProcess) {
    Write-Host "⚠️  WARNING: CentCom appears to be running!" -ForegroundColor Yellow
    Write-Host "   Please close CentCom before running this script." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Running processes:" -ForegroundColor Yellow
    $centcomProcess | ForEach-Object { Write-Host "   - $($_.ProcessName)" -ForegroundColor Yellow }
    Write-Host ""
    $continue = Read-Host "Do you want to force quit CentCom and continue? (y/N)"

    if ($continue -eq 'y' -or $continue -eq 'Y') {
        Write-Host "🛑 Stopping CentCom processes..." -ForegroundColor Yellow
        $centcomProcess | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Host "✅ Processes stopped" -ForegroundColor Green
    } else {
        Write-Host "❌ Script cancelled. Please close CentCom manually and run again." -ForegroundColor Red
        exit
    }
}

# Find CentCom data directory
$centcomDir = "$env:APPDATA\.centcom"
$centcomLocalDir = "$env:LOCALAPPDATA\.centcom"

Write-Host "🔍 Looking for CentCom data directories..." -ForegroundColor Cyan
Write-Host ""

# Check AppData\Roaming
if (Test-Path $centcomDir) {
    Write-Host "✅ Found: $centcomDir" -ForegroundColor Green

    # List contents
    $items = Get-ChildItem $centcomDir -Recurse | Select-Object FullName, Length, LastWriteTime
    Write-Host ""
    Write-Host "📁 Contents:" -ForegroundColor Cyan
    $items | ForEach-Object {
        $size = if ($_.Length) { "{0:N0} KB" -f ($_.Length / 1KB) } else { "Folder" }
        Write-Host "   $($_.FullName) - $size" -ForegroundColor Gray
    }
    Write-Host ""

    # Ask for confirmation
    Write-Host "⚠️  This will DELETE all CentCom local data:" -ForegroundColor Yellow
    Write-Host "   - Cluster registrations (including LOCAL-0002)" -ForegroundColor Yellow
    Write-Host "   - Local cache" -ForegroundColor Yellow
    Write-Host "   - App settings (may need to reconfigure)" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Are you sure you want to delete this directory? (yes/NO)"

    if ($confirm -eq 'yes') {
        try {
            Remove-Item -Path $centcomDir -Recurse -Force
            Write-Host "✅ Deleted: $centcomDir" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to delete: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "⏭️  Skipped deletion of $centcomDir" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  Not found: $centcomDir" -ForegroundColor Gray
}

Write-Host ""

# Check AppData\Local
if (Test-Path $centcomLocalDir) {
    Write-Host "✅ Found: $centcomLocalDir" -ForegroundColor Green

    # List contents
    $items = Get-ChildItem $centcomLocalDir -Recurse | Select-Object FullName, Length, LastWriteTime
    Write-Host ""
    Write-Host "📁 Contents:" -ForegroundColor Cyan
    $items | ForEach-Object {
        $size = if ($_.Length) { "{0:N0} KB" -f ($_.Length / 1KB) } else { "Folder" }
        Write-Host "   $($_.FullName) - $size" -ForegroundColor Gray
    }
    Write-Host ""

    # Ask for confirmation
    $confirm = Read-Host "Delete this directory too? (yes/NO)"

    if ($confirm -eq 'yes') {
        try {
            Remove-Item -Path $centcomLocalDir -Recurse -Force
            Write-Host "✅ Deleted: $centcomLocalDir" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to delete: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "⏭️  Skipped deletion of $centcomLocalDir" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  Not found: $centcomLocalDir" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "✅ Cleanup Complete!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure LOCAL-0002 is deleted from Lyceum Supabase database" -ForegroundColor White
Write-Host "2. Start CentCom app" -ForegroundColor White
Write-Host "3. Login and let it re-register the cluster" -ForegroundColor White
Write-Host "4. Check Database Connections page - should only show LOCAL-0011" -ForegroundColor White
Write-Host "5. Check Lyceum /clusters page - should only show 1 local cluster" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  If LOCAL-0002 appears again, it means the Lyceum database still has it." -ForegroundColor Yellow
Write-Host "   Delete it from Lyceum Supabase Table Editor first!" -ForegroundColor Yellow
Write-Host ""
