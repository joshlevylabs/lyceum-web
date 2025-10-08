#!/bin/bash

# GCP Project Setup for Lyceum Cluster Optimization
# Phase 1: Infrastructure Foundation

set -e

echo "🚀 Setting up GCP project for Lyceum Optimized Clusters..."

# Configuration
PROJECT_ID="lyceum-clusters-optimized"
PROJECT_NAME="Lyceum Optimized Clusters"
REGION="us-central1"
ZONE="us-central1-c"

echo "📋 Project Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Project Name: $PROJECT_NAME"
echo "  Region: $REGION"
echo "  Zone: $ZONE"

# Create new GCP project
echo "🏗️  Creating new GCP project..."
gcloud projects create $PROJECT_ID --name="$PROJECT_NAME" || echo "Project may already exist"

# Set active project
echo "🎯 Setting active project..."
gcloud config set project $PROJECT_ID

# Enable billing (you'll need to do this manually in the console)
echo "💳 MANUAL STEP REQUIRED:"
echo "   Please enable billing for project $PROJECT_ID in the GCP Console"
echo "   Visit: https://console.cloud.google.com/billing/projects"
echo ""

# Enable required APIs
echo "🔌 Enabling required APIs..."
apis=(
    "container.googleapis.com"           # Google Kubernetes Engine API
    "cloudbuild.googleapis.com"          # Cloud Build API  
    "storage.googleapis.com"             # Cloud Storage API
    "redis.googleapis.com"               # Memorystore for Redis API
    "run.googleapis.com"                 # Cloud Run API
    "scheduler.googleapis.com"           # Cloud Scheduler API
    "monitoring.googleapis.com"          # Cloud Monitoring API
    "logging.googleapis.com"             # Cloud Logging API
    "compute.googleapis.com"             # Compute Engine API
    "iam.googleapis.com"                 # Identity and Access Management API
)

for api in "${apis[@]}"; do
    echo "  Enabling $api..."
    gcloud services enable $api
done

# Set default region and zone
echo "🌍 Setting default region and zone..."
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE

# Create service account for cluster management
echo "👤 Creating service account for cluster management..."
SA_NAME="lyceum-cluster-manager"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts create $SA_NAME \
    --display-name="Lyceum Cluster Manager" \
    --description="Service account for managing Lyceum optimized clusters"

# Grant necessary permissions
echo "🔐 Granting service account permissions..."
roles=(
    "roles/container.admin"
    "roles/storage.admin" 
    "roles/redis.admin"
    "roles/run.admin"
    "roles/monitoring.metricWriter"
    "roles/logging.logWriter"
)

for role in "${roles[@]}"; do
    echo "  Granting $role..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role"
done

# Generate service account key
echo "🔑 Generating service account key..."
mkdir -p ../keys
gcloud iam service-accounts keys create ../keys/lyceum-cluster-manager.json \
    --iam-account=$SA_EMAIL

echo ""
echo "✅ GCP project setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Enable billing for the project in GCP Console"
echo "2. Review and run the cluster deployment scripts"
echo "3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable:"
echo "   export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/../keys/lyceum-cluster-manager.json"
echo ""
echo "🔗 Useful links:"
echo "  - GCP Console: https://console.cloud.google.com/home/dashboard?project=$PROJECT_ID"
echo "  - Enable Billing: https://console.cloud.google.com/billing/projects"
echo "  - Kubernetes Engine: https://console.cloud.google.com/kubernetes/list?project=$PROJECT_ID"




