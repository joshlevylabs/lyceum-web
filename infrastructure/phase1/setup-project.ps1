# Simple GCP Project Setup for Lyceum
param(
    [string]$ProjectId = "lyceum-clusters-optimized"
)

Write-Host "🚀 Setting up GCP project: $ProjectId" -ForegroundColor Cyan

# Create project
Write-Host "Creating project..." -ForegroundColor Yellow
gcloud projects create $ProjectId --name="Lyceum Optimized Clusters"

# Set active project
Write-Host "Setting active project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Manual step for billing
Write-Host ""
Write-Host "⚠️  MANUAL STEP REQUIRED:" -ForegroundColor Red
Write-Host "1. Go to: https://console.cloud.google.com/billing/projects"
Write-Host "2. Find project: $ProjectId"
Write-Host "3. Link it to a billing account"
Write-Host ""

$response = Read-Host "Have you enabled billing? Press Enter when done (or type 'skip' to continue without billing)"

if ($response -ne 'skip') {
    # Enable APIs
    Write-Host "Enabling APIs..." -ForegroundColor Yellow
    
    gcloud services enable container.googleapis.com
    gcloud services enable storage.googleapis.com
    gcloud services enable redis.googleapis.com
    gcloud services enable compute.googleapis.com
    gcloud services enable iam.googleapis.com
    gcloud services enable monitoring.googleapis.com
    gcloud services enable logging.googleapis.com

    # Create service account
    Write-Host "Creating service account..." -ForegroundColor Yellow
    gcloud iam service-accounts create lyceum-cluster-manager --display-name="Lyceum Cluster Manager"

    # Grant permissions
    Write-Host "Granting permissions..." -ForegroundColor Yellow
    $saEmail = "lyceum-cluster-manager@$ProjectId.iam.gserviceaccount.com"
    
    gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$saEmail" --role="roles/container.admin"
    gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$saEmail" --role="roles/storage.admin"
    gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$saEmail" --role="roles/redis.admin"
    gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$saEmail" --role="roles/compute.admin"

    Write-Host ""
    Write-Host "✅ Setup complete!" -ForegroundColor Green
    Write-Host "Next step: Run .\deploy-phase1.ps1" -ForegroundColor White
} else {
    Write-Host "Skipping API enablement - billing required first" -ForegroundColor Yellow
}




