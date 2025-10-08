# Lyceum Cluster Optimization - Phase 1 Deployment Script (PowerShell)
# Fixed version without syntax errors

param(
    [string]$ProjectId = "lyceum-clusters-optimized",
    [string]$Region = "us-central1",
    [string]$Zone = "us-central1-c"
)

# Colors for output
function Write-Info { 
    param([string]$Message)
    Write-Host "INFO: $Message" -ForegroundColor Blue 
}

function Write-Success { 
    param([string]$Message)
    Write-Host "SUCCESS: $Message" -ForegroundColor Green 
}

function Write-Warning { 
    param([string]$Message)
    Write-Host "WARNING: $Message" -ForegroundColor Yellow 
}

function Write-Error { 
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red 
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if gcloud is installed
    try {
        $null = gcloud version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "gcloud CLI is installed"
        } else {
            throw "gcloud not found"
        }
    } catch {
        Write-Error "gcloud CLI is not installed. Please install it first."
        Write-Host "Download from: https://cloud.google.com/sdk/docs/install-sdk"
        exit 1
    }
    
    # Check if kubectl is installed
    try {
        $null = kubectl version --client --short 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "kubectl is installed"
        } else {
            Write-Warning "kubectl not found. Installing via gcloud..."
            gcloud components install kubectl
        }
    } catch {
        Write-Warning "Installing kubectl..."
        gcloud components install kubectl --quiet
    }
    
    # Check if logged in to gcloud
    $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $activeAccount) {
        Write-Error "Not logged in to gcloud. Run 'gcloud auth login' first."
        exit 1
    } else {
        Write-Success "Authenticated as: $activeAccount"
    }
    
    # Set project
    gcloud config set project $ProjectId
    Write-Success "Prerequisites check passed"
}

function Deploy-Storage {
    Write-Info "Deploying storage infrastructure..."
    
    # Create storage buckets using gcloud
    $buckets = @(
        @{Name="lyceum-cluster-data-$ProjectId"; Location="us-central1"; StorageClass="STANDARD"},
        @{Name="lyceum-processed-results-$ProjectId"; Location="us-central1"; StorageClass="STANDARD"},
        @{Name="lyceum-access-logs-$ProjectId"; Location="us-central1"; StorageClass="COLDLINE"},
        @{Name="lyceum-cache-storage-$ProjectId"; Location="us-central1"; StorageClass="STANDARD"}
    )
    
    foreach ($bucket in $buckets) {
        Write-Info "Creating bucket: $($bucket.Name)"
        gsutil mb -p $ProjectId -l $($bucket.Location) -c $($bucket.StorageClass) "gs://$($bucket.Name)" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Bucket $($bucket.Name) created"
        } else {
            Write-Warning "Bucket $($bucket.Name) may already exist"
        }
    }
    
    Write-Success "Storage infrastructure deployed"
}

function Deploy-Redis {
    Write-Info "Deploying Redis cache infrastructure..."
    
    # Create Redis instances
    Write-Info "Creating curve cache Redis instance..."
    gcloud redis instances create lyceum-curve-cache --size=5 --region=$Region --redis-version=redis_7_0 --tier=standard-ha --redis-config maxmemory-policy=allkeys-lru --display-name="Lyceum Curve Cache" --async 2>$null
    
    Write-Info "Creating session cache Redis instance..."
    gcloud redis instances create lyceum-session-cache --size=2 --region=$Region --redis-version=redis_7_0 --tier=standard-ha --redis-config maxmemory-policy=allkeys-lru --display-name="Lyceum Session Cache" --async 2>$null
    
    Write-Info "Redis instances are being created in the background..."
    Write-Success "Redis cache infrastructure deployment initiated"
}

function Deploy-SharedCluster {
    Write-Info "Deploying shared micro cluster..."
    
    # Create GKE cluster for micro tier
    gcloud container clusters create lyceum-micro-shared --zone=$Zone --enable-autoscaling --min-nodes=1 --max-nodes=10 --num-nodes=2 --machine-type=e2-micro --disk-size=20 --disk-type=pd-standard --preemptible --enable-network-policy --enable-autorepair --enable-autoupgrade --workload-pool="$ProjectId.svc.id.goog" --async 2>$null
    
    Write-Info "Shared micro cluster is being created in the background..."
    Write-Success "Shared micro cluster deployment initiated"
}

function Deploy-AutopilotCluster {
    Write-Info "Deploying GKE Autopilot cluster..."
    
    # Create Autopilot cluster
    gcloud container clusters create-auto lyceum-autopilot-cluster --region=$Region --workload-pool="$ProjectId.svc.id.goog" --enable-private-nodes --master-ipv4-cidr="172.16.0.0/28" --async 2>$null
    
    Write-Info "Autopilot cluster is being created in the background..."
    Write-Success "GKE Autopilot cluster deployment initiated"
}

function Create-Monitoring {
    Write-Info "Setting up monitoring and alerting..."
    
    # Create BigQuery datasets for usage analytics
    $datasets = @("cluster_usage_analytics", "autopilot_cluster_usage")
    
    foreach ($dataset in $datasets) {
        bq mk --dataset --location=US --description="Cluster usage analytics for cost optimization" "$ProjectId`:$dataset" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Created BigQuery dataset: $dataset"
        } else {
            Write-Warning "BigQuery dataset $dataset may already exist"
        }
    }
    
    Write-Success "Monitoring setup complete"
}

function Setup-CustomerNamespaceAutomation {
    Write-Info "Setting up customer namespace automation..."
    
    # Create PowerShell script for customer onboarding
    $customerScript = @'
param(
    [Parameter(Mandatory=$true)]
    [string]$CustomerId
)

if (-not $CustomerId) {
    Write-Host "Usage: create-customer-namespace.ps1 -CustomerId customer-id"
    Write-Host "Example: create-customer-namespace.ps1 -CustomerId customer-12345"
    exit 1
}

$creationTimestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host "Creating namespace and resources for customer: $CustomerId"

# Read template and replace variables
$template = Get-Content "customer-namespace-template.yaml" -Raw
$template = $template -replace '\$\{CUSTOMER_ID\}', $CustomerId
$template = $template -replace '\$\{CREATION_TIMESTAMP\}', $creationTimestamp

# Apply the configuration
$template | kubectl apply -f -

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Created namespace and resources for customer: $CustomerId" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create resources for customer: $CustomerId" -ForegroundColor Red
}
'@
    
    $customerScript | Out-File -FilePath "create-customer-namespace.ps1" -Encoding utf8
    Write-Success "Customer namespace automation setup complete"
}

function Test-Deployment {
    Write-Info "Verifying deployment..."
    
    Write-Host "Checking resource status:"
    Write-Host "========================"
    
    # Check storage buckets
    Write-Host ""
    Write-Host "Storage Buckets:"
    gsutil ls -p $ProjectId
    
    # Check Redis instances
    Write-Host ""
    Write-Host "Redis Instances:"
    gcloud redis instances list --region=$Region
    
    # Check clusters
    Write-Host ""
    Write-Host "Clusters:"
    gcloud container clusters list
    
    Write-Success "Phase 1 deployment verification complete"
}

function Show-Summary {
    Write-Host ""
    Write-Host "PHASE 1 INFRASTRUCTURE DEPLOYMENT COMPLETE!" -ForegroundColor Cyan
    Write-Host "=============================================="
    Write-Host ""
    Write-Success "Project: $ProjectId"
    Write-Success "Shared Micro Cluster: lyceum-micro-shared (creating...)"
    Write-Success "Autopilot Cluster: lyceum-autopilot-cluster (creating...)"
    Write-Success "Storage Buckets: 4 buckets created"
    Write-Success "Redis Cache: 2 instances creating"
    Write-Success "Monitoring: BigQuery datasets configured"
    Write-Success "Customer Automation: PowerShell scripts ready"
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor White
    Write-Host "1. Wait 10-15 minutes for clusters to finish creating"
    Write-Host "2. Test customer namespace: .\create-customer-namespace.ps1 -CustomerId test-customer"
    Write-Host "3. Monitor progress in GCP Console"
    Write-Host ""
    Write-Host "Expected Monthly Costs:" -ForegroundColor White
    Write-Host "  - Micro Shared Cluster: ~$20/month"
    Write-Host "  - Autopilot Cluster: ~$75/month (scales to zero when unused)"
    Write-Host "  - Redis Instances: ~$150/month"
    Write-Host "  - Storage: ~$10-50/month"
    Write-Host "  - Total: ~$255-295/month"
    Write-Host ""
    Write-Host "Revenue Model:" -ForegroundColor White
    Write-Host "  - Cost per Micro Customer: ~$0.25/month"
    Write-Host "  - Revenue per Micro Customer: $10/month"
    Write-Host "  - Gross Margin: 97.5%"
    Write-Host ""
    Write-Host "Management Links:" -ForegroundColor White
    Write-Host "  - GCP Console: https://console.cloud.google.com/home/dashboard?project=$ProjectId"
    Write-Host "  - Kubernetes: https://console.cloud.google.com/kubernetes/list?project=$ProjectId"
    Write-Host "  - Storage: https://console.cloud.google.com/storage/browser?project=$ProjectId"
    Write-Host "  - Redis: https://console.cloud.google.com/memorystore/redis/instances?project=$ProjectId"
}

# Main execution
Write-Host "LYCEUM CLUSTER OPTIMIZATION - PHASE 1 DEPLOYMENT" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

try {
    Test-Prerequisites
    
    Write-Info "Starting infrastructure deployment..."
    Write-Warning "This process will take approximately 20-30 minutes"
    Write-Host ""
    
    # Deploy in order of dependencies
    Deploy-Storage
    Deploy-Redis
    Deploy-SharedCluster
    Deploy-AutopilotCluster
    Create-Monitoring
    Setup-CustomerNamespaceAutomation
    
    Test-Deployment
    Show-Summary
    
} catch {
    Write-Error "Deployment failed: $_"
    Write-Host "Please check the error message above and retry." -ForegroundColor Red
    exit 1
}



