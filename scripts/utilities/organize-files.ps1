# File Organization Script for Lyceum Project
# This script moves scattered .md, .sql, .txt, .js, and .ps1 files into organized folders

$baseDir = "c:\Users\joshual\Documents\Cursor\lyceum"

# Move all SQL files to database-migrations (except those already in docs/centcom-integration)
Write-Host "Moving SQL files..." -ForegroundColor Cyan
Get-ChildItem -Path $baseDir -Filter "*.sql" -File | ForEach-Object {
    Move-Item $_.FullName "$baseDir\docs\archive\database-migrations\" -Force
}

# Move bug fix documentation
Write-Host "Moving bug fix documentation..." -ForegroundColor Cyan
Get-ChildItem -Path $baseDir -Filter "*FIX*.md" -File | ForEach-Object {
    Move-Item $_.FullName "$baseDir\docs\archive\bug-fixes\" -Force
}

# Move implementation guides (large comprehensive docs)
Write-Host "Moving implementation guides..." -ForegroundColor Cyan
$guides = @(
    "*GUIDE*.md",
    "*IMPLEMENTATION*.md",
    "*INTEGRATION*.md",
    "*SUMMARY*.md",
    "*COMPLETE*.md",
    "*ENHANCEMENT*.md",
    "*SYSTEM*.md",
    "*FEATURE*.md",
    "*STATUS*.md",
    "*MANAGEMENT*.md"
)
foreach ($pattern in $guides) {
    Get-ChildItem -Path $baseDir -Filter $pattern -File | ForEach-Object {
        Move-Item $_.FullName "$baseDir\docs\archive\implementation-guides\" -Force -ErrorAction SilentlyContinue
    }
}

# Move setup/installation guides
Write-Host "Moving setup guides..." -ForegroundColor Cyan
$setupGuides = @(
    "*SETUP*.md",
    "*INSTALL*.md",
    "*ENVIRONMENT*.md"
)
foreach ($pattern in $setupGuides) {
    Get-ChildItem -Path $baseDir -Filter $pattern -File | ForEach-Object {
        Move-Item $_.FullName "$baseDir\docs\archive\setup-guides\" -Force -ErrorAction SilentlyContinue
    }
}

# Move remaining .md files to implementation-guides (except README.md and CENTCOM_INTEGRATION_INDEX.md)
Write-Host "Moving remaining documentation..." -ForegroundColor Cyan
Get-ChildItem -Path $baseDir -Filter "*.md" -File | Where-Object { 
    $_.Name -ne "README.md" -and $_.Name -ne "CENTCOM_INTEGRATION_INDEX.md"
} | ForEach-Object {
    Move-Item $_.FullName "$baseDir\docs\archive\implementation-guides\" -Force -ErrorAction SilentlyContinue
}

# Move .txt files to setup-guides
Write-Host "Moving text files..." -ForegroundColor Cyan
Get-ChildItem -Path $baseDir -Filter "*.txt" -File | ForEach-Object {
    Move-Item $_.FullName "$baseDir\docs\archive\setup-guides\" -Force
}

# Move test scripts
Write-Host "Moving test scripts..." -ForegroundColor Cyan
$testPatterns = @("test-*.js", "test-*.ps1", "verify-*.js")
foreach ($pattern in $testPatterns) {
    Get-ChildItem -Path $baseDir -Filter $pattern -File | ForEach-Object {
        Move-Item $_.FullName "$baseDir\scripts\tests\" -Force
    }
}

# Move setup scripts
Write-Host "Moving setup scripts..." -ForegroundColor Cyan
$setupPatterns = @("setup-*.js", "setup-*.ps1", "execute-*.ps1", "simple-*.ps1", "install-*.md")
foreach ($pattern in $setupPatterns) {
    Get-ChildItem -Path $baseDir -Filter $pattern -File | ForEach-Object {
        Move-Item $_.FullName "$baseDir\scripts\setup\" -Force -ErrorAction SilentlyContinue
    }
}

# Move example/utility scripts
Write-Host "Moving utility scripts..." -ForegroundColor Cyan
$utilityFiles = @(
    "centcom-client-example.ts",
    "centcom-session-sync-example.ts",
    "get-stripe-price-ids.js",
    "fix-email-issues.js"
)
foreach ($file in $utilityFiles) {
    $fullPath = Join-Path $baseDir $file
    if (Test-Path $fullPath) {
        Move-Item $fullPath "$baseDir\scripts\utilities\" -Force
    }
}

# Move ngrok.exe to scripts/utilities
Write-Host "Moving ngrok.exe..." -ForegroundColor Cyan
if (Test-Path "$baseDir\ngrok.exe") {
    Move-Item "$baseDir\ngrok.exe" "$baseDir\scripts\utilities\" -Force
}

Write-Host "`nFile organization complete!" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Yellow
Write-Host "  - SQL files -> docs/archive/database-migrations/"
Write-Host "  - Bug fixes -> docs/archive/bug-fixes/"
Write-Host "  - Implementation guides -> docs/archive/implementation-guides/"
Write-Host "  - Setup guides -> docs/archive/setup-guides/"
Write-Host "  - Test scripts -> scripts/tests/"
Write-Host "  - Setup scripts -> scripts/setup/"
Write-Host "  - Utility scripts -> scripts/utilities/"
Write-Host "`nKept at root: README.md, CENTCOM_INTEGRATION_INDEX.md, package.json, config files"

