# Find CentCom Data Locations
Write-Host "Searching for CentCom data..." -ForegroundColor Cyan
Write-Host ""

$locations = @(
    "$env:APPDATA\.centcom",
    "$env:LOCALAPPDATA\.centcom",
    "$env:USERPROFILE\.centcom",
    "$env:APPDATA\centcom",
    "$env:LOCALAPPDATA\centcom",
    "$env:USERPROFILE\centcom",
    "$env:APPDATA\CentCom",
    "$env:LOCALAPPDATA\CentCom"
)

Write-Host "Checking common locations:" -ForegroundColor Yellow
foreach ($loc in $locations) {
    if (Test-Path $loc) {
        Write-Host "✅ FOUND: $loc" -ForegroundColor Green
        Write-Host "   Contents:" -ForegroundColor Gray
        Get-ChildItem $loc -Force | ForEach-Object {
            Write-Host "   - $($_.Name)" -ForegroundColor Gray
        }
        Write-Host ""
    } else {
        Write-Host "❌ Not found: $loc" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Searching for 'centcom' folders in AppData..." -ForegroundColor Yellow
Get-ChildItem -Path "$env:APPDATA" -Directory -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*centcom*" } | ForEach-Object {
    Write-Host "✅ Found: $($_.FullName)" -ForegroundColor Green
}

Get-ChildItem -Path "$env:LOCALAPPDATA" -Directory -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*centcom*" } | ForEach-Object {
    Write-Host "✅ Found: $($_.FullName)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Checking for PostgreSQL connection..." -ForegroundColor Yellow
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "✅ PostgreSQL is running on localhost:5432" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL is NOT accessible on localhost:5432" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Could not test PostgreSQL connection" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
