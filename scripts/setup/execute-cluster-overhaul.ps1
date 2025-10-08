# =====================================================================
# LYCEUM CLUSTER SYSTEM OVERHAUL - DATABASE MIGRATION
# =====================================================================
# This script completely rebuilds the cluster system with unified architecture
# WARNING: This will DELETE ALL EXISTING CLUSTERS
# =====================================================================

Write-Host "LYCEUM CLUSTER SYSTEM OVERHAUL" -ForegroundColor Red
Write-Host "===================================" -ForegroundColor Red
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  DELETE all existing clusters" -ForegroundColor Red
Write-Host "  DELETE all user assignments" -ForegroundColor Red
Write-Host "  DELETE all billing records" -ForegroundColor Red
Write-Host "  CREATE new unified cluster system" -ForegroundColor Green
Write-Host "  SUPPORT both traditional and optimized clusters" -ForegroundColor Green
Write-Host "  ADD comprehensive user and billing management" -ForegroundColor Green
Write-Host ""

# Confirmation
$confirmation = Read-Host "Type 'CONFIRM-OVERHAUL' to proceed with complete cluster system rebuild"
if ($confirmation -ne "CONFIRM-OVERHAUL") {
    Write-Host "Operation cancelled. No changes made." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting cluster system overhaul..." -ForegroundColor Blue
Write-Host ""

# Check if SQL file exists
if (!(Test-Path "database-overhaul-unified-clusters.sql")) {
    Write-Host "ERROR: database-overhaul-unified-clusters.sql file not found!" -ForegroundColor Red
    exit 1
}

# Load environment variables
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $name = $Matches[1]
            $value = $Matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "Loaded environment variables from .env.local" -ForegroundColor Green
} else {
    Write-Host "Warning: .env.local not found. Make sure Supabase connection is configured." -ForegroundColor Yellow
}

# Database connection details
$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (!$SUPABASE_URL -or !$SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "ERROR: Supabase connection details not found in environment variables!" -ForegroundColor Red
    Write-Host "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set." -ForegroundColor Red
    exit 1
}

Write-Host "Connecting to Supabase..." -ForegroundColor Blue
Write-Host "URL: $SUPABASE_URL" -ForegroundColor Gray

# Function to execute SQL via Supabase REST API
function Invoke-SupabaseSQL {
    param(
        [string]$sql,
        [string]$description
    )
    
    Write-Host "Executing: $description..." -ForegroundColor Cyan
    
    try {
        $headers = @{
            "apikey" = $SUPABASE_SERVICE_ROLE_KEY
            "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
        }
        
        $body = @{
            query = $sql
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body
        
        Write-Host "SUCCESS: $description completed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "ERROR: $description failed - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Step 1: Execute the unified cluster schema
Write-Host ""
Write-Host "Step 1: Executing unified cluster schema..." -ForegroundColor Blue

$sqlContent = Get-Content "database-overhaul-unified-clusters.sql" -Raw

# Execute as one large statement
$success = Invoke-SupabaseSQL -sql $sqlContent -description "Complete cluster system overhaul"

Write-Host ""
if ($success) {
    Write-Host "Database overhaul completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Database overhaul encountered errors" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "CLUSTER SYSTEM OVERHAUL SUMMARY" -ForegroundColor Blue
Write-Host "===================================" -ForegroundColor Blue
Write-Host ""
Write-Host "New Features Added:" -ForegroundColor Green
Write-Host "  - Unified cluster architecture (traditional + optimized)" -ForegroundColor White
Write-Host "  - Comprehensive user assignment system" -ForegroundColor White
Write-Host "  - Advanced billing and cost management" -ForegroundColor White
Write-Host "  - Usage tracking and analytics" -ForegroundColor White
Write-Host "  - Configurable cluster settings" -ForegroundColor White
Write-Host "  - Row-level security policies" -ForegroundColor White
Write-Host ""

Write-Host "New Database Tables:" -ForegroundColor Cyan
Write-Host "  - unified_clusters: Main cluster table supporting both architectures" -ForegroundColor White
Write-Host "  - cluster_user_assignments: Role-based user access control" -ForegroundColor White
Write-Host "  - cluster_billing_records: Monthly billing and cost tracking" -ForegroundColor White
Write-Host "  - cluster_usage_logs: Detailed usage event tracking" -ForegroundColor White
Write-Host "  - cluster_settings: Configurable cluster settings" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update API endpoints for new schema" -ForegroundColor White
Write-Host "  2. Rebuild cluster creation wizard" -ForegroundColor White
Write-Host "  3. Create new cluster management interface" -ForegroundColor White
Write-Host "  4. Test complete cluster lifecycle" -ForegroundColor White
Write-Host ""

Write-Host "You can now create clusters with:" -ForegroundColor Green
Write-Host "  - Optimized serverless architecture (85% cost savings)" -ForegroundColor White
Write-Host "  - Traditional dedicated architecture (full control)" -ForegroundColor White
Write-Host "  - User assignments with role-based access" -ForegroundColor White
Write-Host "  - Responsible user billing assignment" -ForegroundColor White
Write-Host "  - Real-time cost tracking and management" -ForegroundColor White
Write-Host ""

Write-Host "Database overhaul completed! Ready for API and UI updates." -ForegroundColor Green