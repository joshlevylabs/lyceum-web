# Lyceum GCP Project Setup - PowerShell Version
# Phase 1: Infrastructure Foundation

param(
    [string]$ProjectId = "lyceum-clusters-optimized",
    [string]$ProjectName = "Lyceum Optimized Clusters",
    [string]$Region = "us-central1",
    [string]$Zone = "us-central1-c"
)

# Colors for output
function Write-Info { 
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue 
}

function Write-Success { 
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green 
}

function Write-Warning { 
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow 
}

function Write-Error { 
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red 
}

Write-Host "🚀 Setting up GCP project for Lyceum Optimized Clusters..." -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Project Configuration:" -ForegroundColor White
Write-Host "  Project ID: $ProjectId"
Write-Host "  Project Name: $ProjectName"
Write-Host "  Region: $Region"
Write-Host "  Zone: $Zone"
Write-Host ""

# Check if gcloud is installed
Write-Info "Checking if Google Cloud CLI is installed..."
try {
    $null = gcloud version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Google Cloud CLI is installed"
    } else {
        throw "gcloud not found"
    }
} catch {
    Write-Error "Google Cloud CLI is not installed."
    Write-Host ""
    Write-Host "📥 Please install Google Cloud CLI first:"
    Write-Host "1. Download from: https://cloud.google.com/sdk/docs/install-sdk"
    Write-Host "2. Run the installer and restart PowerShell"
    Write-Host "3. Run 'gcloud auth login' to authenticate"
    Write-Host ""
    exit 1
}

# Check if authenticated
Write-Info "Checking authentication status..."
try {
    $authList = gcloud auth list --format="value(account)" --filter="status:ACTIVE" 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $authList) {
        Write-Warning "Not authenticated with Google Cloud"
        Write-Host "Please run: gcloud auth login"
        $response = Read-Host "Would you like to authenticate now? (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            gcloud auth login
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Authentication failed"
                exit 1
            }
        } else {
            Write-Error "Authentication required to continue"
            exit 1
        }
    } else {
        Write-Success "Authenticated as: $authList"
    }
} catch {
    Write-Error "Failed to check authentication status"
    exit 1
}

# Create new GCP project
Write-Info "Creating new GCP project..."
$null = gcloud projects create $ProjectId --name="$ProjectName" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "Project created successfully"
} else {
    Write-Warning "Project may already exist, continuing..."
}

# Set active project
Write-Info "Setting active project..."
$null = gcloud config set project $ProjectId
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to set project"
    exit 1
}

# Check billing
Write-Warning "MANUAL STEP REQUIRED:"
Write-Host "   Please enable billing for project $ProjectId in the GCP Console"
Write-Host "   Visit: https://console.cloud.google.com/billing/projects"
Write-Host ""
$response = Read-Host "Have you enabled billing? (y/n)"
if ($response -ne 'y' -and $response -ne 'Y') {
    Write-Warning "Billing must be enabled to continue with API enablement"
    Write-Host "Please enable billing and run this script again"
    exit 0
}

# Enable required APIs
Write-Info "Enabling required APIs..."
$apis = @(
    "container.googleapis.com",
    "cloudbuild.googleapis.com",
    "storage.googleapis.com",
    "redis.googleapis.com",
    "run.googleapis.com",
    "scheduler.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "serviceusage.googleapis.com",
    "cloudresourcemanager.googleapis.com"
)

foreach ($api in $apis) {
    Write-Info "  Enabling $api..."
    $null = gcloud services enable $api
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to enable $api"
    } else {
        Write-Success "  ✓ $api enabled"
    }
}

# Set default region and zone
Write-Info "Setting default region and zone..."
$null = gcloud config set compute/region $Region
$null = gcloud config set compute/zone $Zone

# Create service account for cluster management
Write-Info "Creating service account for cluster management..."
$saName = "lyceum-cluster-manager"
$saEmail = "$saName@$ProjectId.iam.gserviceaccount.com"

$null = gcloud iam service-accounts create $saName --display-name="Lyceum Cluster Manager" --description="Service account for managing Lyceum optimized clusters" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "Service account created"
} else {
    Write-Warning "Service account may already exist"
}

# Grant necessary permissions
Write-Info "Granting service account permissions..."
$roles = @(
    "roles/container.admin",
    "roles/storage.admin", 
    "roles/redis.admin",
    "roles/run.admin",
    "roles/monitoring.metricWriter",
    "roles/logging.logWriter",
    "roles/compute.admin",
    "roles/iam.serviceAccountUser"
)

foreach ($role in $roles) {
    Write-Info "  Granting $role..."
    $null = gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$saEmail" --role="$role" --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  ✓ $role granted"
    }
}

# Create keys directory
$keysDir = "../keys"
if (-not (Test-Path $keysDir)) {
    $null = New-Item -ItemType Directory -Path $keysDir -Force
}

# Generate service account key
Write-Info "Generating service account key..."
$null = gcloud iam service-accounts keys create "$keysDir/lyceum-cluster-manager.json" --iam-account=$saEmail
if ($LASTEXITCODE -eq 0) {
    Write-Success "Service account key created"
} else {
    Write-Error "Failed to create service account key"
}

Write-Host ""
Write-Success "GCP project setup complete!"
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor White
Write-Host "1. ✅ Billing is enabled (completed)"
Write-Host "2. ✅ APIs are enabled (completed)"
Write-Host "3. Run deployment script: .\deploy-phase1.ps1"
Write-Host ""
Write-Host "🔗 Useful links:" -ForegroundColor White
Write-Host "  - GCP Console: https://console.cloud.google.com/home/dashboard?project=$ProjectId"
Write-Host "  - Kubernetes Engine: https://console.cloud.google.com/kubernetes/list?project=$ProjectId"
Write-Host "  - Cloud Storage: https://console.cloud.google.com/storage/browser?project=$ProjectId"
Write-Host ""
Write-Host "🔑 Environment variable to set (optional):"
Write-Host "`$env:GOOGLE_APPLICATION_CREDENTIALS = `"$(Resolve-Path "$keysDir/lyceum-cluster-manager.json")`""