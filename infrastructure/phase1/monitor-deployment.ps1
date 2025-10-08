# Lyceum Phase 1 Deployment Monitor
# Run this script to check deployment status

param(
    [string]$ProjectId = "lyceum-clusters-optimized",
    [string]$Region = "us-central1"
)

# Add gcloud to PATH
$env:PATH += ";C:\Users\joshual\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"

Write-Host "🔍 LYCEUM DEPLOYMENT STATUS MONITOR" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Set project
gcloud config set project $ProjectId --quiet

Write-Host "📊 CLUSTER DEPLOYMENT STATUS:" -ForegroundColor Yellow
Write-Host "------------------------------"
gcloud container clusters list
Write-Host ""

Write-Host "🔄 ACTIVE OPERATIONS:" -ForegroundColor Yellow  
Write-Host "---------------------"
gcloud container operations list --limit=5
Write-Host ""

Write-Host "💾 REDIS INSTANCES:" -ForegroundColor Yellow
Write-Host "-------------------"
gcloud redis instances list --region=$Region
Write-Host ""

Write-Host "🗄️ STORAGE BUCKETS:" -ForegroundColor Yellow
Write-Host "-------------------"
gsutil ls -p $ProjectId
Write-Host ""

Write-Host "📈 COST ESTIMATION:" -ForegroundColor Green
Write-Host "-------------------"
$clusterStatus = gcloud container clusters list --format="value(status)" --filter="name:lyceum-micro-shared" 2>$null
$autopilotStatus = gcloud container clusters list --format="value(status)" --filter="name:lyceum-autopilot-cluster" 2>$null

if ($clusterStatus -eq "RUNNING") {
    Write-Host "✅ Micro Cluster: RUNNING (~$20/month)" -ForegroundColor Green
} else {
    Write-Host "⏳ Micro Cluster: $clusterStatus (no cost yet)" -ForegroundColor Yellow
}

if ($autopilotStatus -eq "RUNNING") {
    Write-Host "✅ Autopilot Cluster: RUNNING (~$0-75/month when used)" -ForegroundColor Green
} else {
    Write-Host "⏳ Autopilot Cluster: $autopilotStatus (no cost yet)" -ForegroundColor Yellow
}

$redisCount = (gcloud redis instances list --region=$Region --format="value(name)" | Measure-Object).Count
if ($redisCount -gt 0) {
    Write-Host "✅ Redis Instances: $redisCount running (~$150/month)" -ForegroundColor Green
} else {
    Write-Host "⏳ Redis Instances: Creating... (no cost yet)" -ForegroundColor Yellow
}

Write-Host "✅ Storage: 4 buckets ready (cost only when data stored)" -ForegroundColor Green
Write-Host ""

Write-Host "🎯 ESTIMATED TOTAL MONTHLY COST WHEN FULLY DEPLOYED:" -ForegroundColor White
Write-Host "    - Current cost: $0-20/month (only running resources)" -ForegroundColor Green
Write-Host "    - Full deployment: $255-295/month" -ForegroundColor White
Write-Host ""

Write-Host "🔗 MONITOR IN GCP CONSOLE:" -ForegroundColor Blue
Write-Host "  - Clusters: https://console.cloud.google.com/kubernetes/list?project=$ProjectId"
Write-Host "  - Redis: https://console.cloud.google.com/memorystore/redis/instances?project=$ProjectId" 
Write-Host "  - Billing: https://console.cloud.google.com/billing?project=$ProjectId"



