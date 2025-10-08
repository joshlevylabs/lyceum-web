# Lyceum Deployment Preparation Script
# This script helps prepare your application for deployment

Write-Host "🚀 Lyceum Deployment Preparation" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Found package.json" -ForegroundColor Green

# Check Node.js version
$nodeVersion = node --version
Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "✓ Found .env.local file" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: No .env.local file found" -ForegroundColor Yellow
    Write-Host "  Creating template .env.local file..." -ForegroundColor Yellow
    
    $envTemplate = @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3594
NEXTAUTH_URL=http://localhost:3594
NEXTAUTH_SECRET=generate-a-random-32-character-secret-here

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ClickHouse (Optional)
CLICKHOUSE_HOST=
CLICKHOUSE_USER=
CLICKHOUSE_PASSWORD=
"@
    
    $envTemplate | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "  ✓ Created .env.local template" -ForegroundColor Green
    Write-Host "  Please fill in your actual values before deployment" -ForegroundColor Yellow
}

# Test build
Write-Host ""
Write-Host "📦 Testing production build..." -ForegroundColor Cyan
Write-Host "This may take a few minutes..." -ForegroundColor Gray

$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Production build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed. Please fix errors before deploying:" -ForegroundColor Red
    Write-Host $buildOutput -ForegroundColor Red
    exit 1
}

# Check for common deployment issues
Write-Host ""
Write-Host "🔍 Checking for common issues..." -ForegroundColor Cyan

# Check for hardcoded localhost URLs
$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Select-Object -First 100
$localhostIssues = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "http://localhost(?!:|3594)") {
        $localhostIssues += $file.FullName
    }
}

if ($localhostIssues.Count -gt 0) {
    Write-Host "⚠ Warning: Found hardcoded localhost URLs in:" -ForegroundColor Yellow
    $localhostIssues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host "  Consider using environment variables instead" -ForegroundColor Yellow
} else {
    Write-Host "✓ No hardcoded localhost URLs found" -ForegroundColor Green
}

# Check package.json scripts
$packageJson = Get-Content "package.json" | ConvertFrom-Json
if ($packageJson.scripts.build -and $packageJson.scripts.start) {
    Write-Host "✓ Build and start scripts configured" -ForegroundColor Green
} else {
    Write-Host "❌ Missing required scripts in package.json" -ForegroundColor Red
}

# Estimate bundle size
Write-Host ""
Write-Host "📊 Analyzing build size..." -ForegroundColor Cyan
$buildDir = ".next"
if (Test-Path $buildDir) {
    $buildSize = (Get-ChildItem $buildDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    $buildSizeRounded = [math]::Round($buildSize, 2)
    Write-Host "  Build directory size: $buildSizeRounded MB" -ForegroundColor Gray
    
    if ($buildSize -gt 100) {
        Write-Host "⚠ Warning: Build is quite large. Consider optimization:" -ForegroundColor Yellow
        Write-Host "  - Use dynamic imports" -ForegroundColor Yellow
        Write-Host "  - Remove unused dependencies" -ForegroundColor Yellow
        Write-Host "  - Optimize images" -ForegroundColor Yellow
    } else {
        Write-Host "✓ Build size is reasonable" -ForegroundColor Green
    }
}

# Generate deployment checklist
Write-Host ""
Write-Host "📋 Deployment Checklist" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

$checklist = @"
Pre-Deployment Checklist:

□ Create Vercel account at vercel.com
□ Create Supabase account at supabase.com
□ Create Stripe account at stripe.com
□ Push code to GitHub/GitLab
□ Review DEPLOYMENT_GUIDE_CHEAP.md
□ Prepare environment variables
□ Set up Supabase database (run migrations)
□ Configure Stripe webhooks
□ Test locally one more time

Deployment Steps:
1. Install Vercel CLI: npm i -g vercel
2. Login to Vercel: vercel login
3. Deploy: vercel --prod
4. Configure environment variables in Vercel dashboard
5. Redeploy to apply env vars

Post-Deployment:
□ Test user registration
□ Test user login
□ Test payment flow (test mode)
□ Verify all API endpoints
□ Set up monitoring
□ Configure custom domain (optional)

Cost Estimates (Monthly):
- Vercel Hobby: $0
- Supabase Free: $0
- Stripe: $0 + transaction fees
- Total: $0-5/month

Next Steps:
1. Read DEPLOYMENT_GUIDE_CHEAP.md for detailed instructions
2. Run: vercel login
3. Run: vercel
4. Follow the prompts!

"@

Write-Host $checklist -ForegroundColor White

# Save checklist to file
$checklist | Out-File -FilePath "DEPLOYMENT_CHECKLIST.txt" -Encoding UTF8
Write-Host "✓ Saved checklist to DEPLOYMENT_CHECKLIST.txt" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review DEPLOYMENT_GUIDE_CHEAP.md" -ForegroundColor White
Write-Host "2. Fill in .env.local with your values" -ForegroundColor White
Write-Host "3. Run: npm i -g vercel" -ForegroundColor White
Write-Host "4. Run: vercel login" -ForegroundColor White
Write-Host "5. Run: vercel" -ForegroundColor White
Write-Host ""
Write-Host "Good luck! 🚀" -ForegroundColor Cyan
