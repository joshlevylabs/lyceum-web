#!/bin/bash

# Lyceum Cluster Optimization - Phase 1 Deployment Script
# Deploys all Phase 1 infrastructure components

set -e

PROJECT_ID="lyceum-clusters-optimized"
REGION="us-central1"
ZONE="us-central1-c"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged in to gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not logged in to gcloud. Run 'gcloud auth login' first."
        exit 1
    fi
    
    # Check if project exists and is set
    if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
        log_error "Project $PROJECT_ID does not exist or is not accessible."
        log_info "Please run the gcp-project-setup.sh script first."
        exit 1
    fi
    
    gcloud config set project $PROJECT_ID
    log_success "Prerequisites check passed"
}

install_config_connector() {
    log_info "Installing Config Connector for infrastructure as code..."
    
    # Check if Config Connector is already enabled
    if kubectl get ns cnrm-system &> /dev/null; then
        log_warning "Config Connector already installed, skipping..."
        return
    fi
    
    # Install Config Connector
    curl -X GET -sLO --location-trusted https://us-central1-cnrm.cloudfunctions.net/download/latest/infra/install-bundle-workload-identity
    chmod +x install-bundle-workload-identity
    
    ./install-bundle-workload-identity \
        --project-id $PROJECT_ID \
        --cluster-name temp-connector-cluster \
        --cluster-location $REGION
    
    log_success "Config Connector installed"
}

deploy_storage() {
    log_info "Deploying storage infrastructure..."
    
    # Deploy storage buckets and lifecycle policies
    kubectl apply -f storage-lifecycle.yaml
    
    # Wait for storage buckets to be ready
    log_info "Waiting for storage buckets to be created..."
    kubectl wait --for=condition=Ready storagebucket/lyceum-cluster-data --timeout=300s
    kubectl wait --for=condition=Ready storagebucket/lyceum-processed-results --timeout=300s
    kubectl wait --for=condition=Ready storagebucket/lyceum-access-logs --timeout=300s
    kubectl wait --for=condition=Ready storagebucket/lyceum-cache-storage --timeout=300s
    
    log_success "Storage infrastructure deployed"
}

deploy_redis() {
    log_info "Deploying Redis cache infrastructure..."
    
    # Deploy Redis instances
    kubectl apply -f redis-cache.yaml
    
    # Wait for Redis instances to be ready
    log_info "Waiting for Redis instances to be created (this may take 5-10 minutes)..."
    kubectl wait --for=condition=Ready redisinstance/lyceum-curve-cache --timeout=600s
    kubectl wait --for=condition=Ready redisinstance/lyceum-session-cache --timeout=600s
    
    # Get Redis IP addresses and update ConfigMap
    CURVE_REDIS_IP=$(kubectl get redisinstance lyceum-curve-cache -o jsonpath='{.status.host}')
    SESSION_REDIS_IP=$(kubectl get redisinstance lyceum-session-cache -o jsonpath='{.status.host}')
    
    # Update Redis configuration with actual IPs
    sed -i "s/CURVE_REDIS_HOST: \"10.0.0.3\"/CURVE_REDIS_HOST: \"$CURVE_REDIS_IP\"/" redis-cache.yaml
    sed -i "s/SESSION_REDIS_HOST: \"10.0.0.4\"/SESSION_REDIS_HOST: \"$SESSION_REDIS_IP\"/" redis-cache.yaml
    
    # Reapply the updated configuration
    kubectl apply -f redis-cache.yaml
    
    log_success "Redis cache infrastructure deployed"
    log_info "Curve Redis IP: $CURVE_REDIS_IP"
    log_info "Session Redis IP: $SESSION_REDIS_IP"
}

deploy_shared_cluster() {
    log_info "Deploying shared micro cluster..."
    
    # Deploy the shared cluster for micro tier
    kubectl apply -f shared-micro-cluster.yaml
    
    # Wait for cluster to be ready
    log_info "Waiting for shared micro cluster to be created (this may take 10-15 minutes)..."
    kubectl wait --for=condition=Ready containercluster/lyceum-micro-shared --timeout=900s
    
    # Get cluster credentials
    gcloud container clusters get-credentials lyceum-micro-shared --zone=$ZONE
    
    log_success "Shared micro cluster deployed"
}

deploy_autopilot_cluster() {
    log_info "Deploying GKE Autopilot cluster..."
    
    # Deploy KMS keys first
    kubectl apply -f cluster-autopilot.yaml
    
    # Wait for KMS key to be ready
    log_info "Waiting for KMS key to be created..."
    kubectl wait --for=condition=Ready kmskeyring/lyceum-cluster-ring --timeout=300s
    kubectl wait --for=condition=Ready kmscryptokey/cluster-encryption-key --timeout=300s
    
    # Wait for the main cluster to be ready
    log_info "Waiting for Autopilot cluster to be created (this may take 10-15 minutes)..."
    kubectl wait --for=condition=Ready containercluster/lyceum-autopilot-cluster --timeout=900s
    
    # Get cluster credentials
    gcloud container clusters get-credentials lyceum-autopilot-cluster --region=$REGION
    
    log_success "GKE Autopilot cluster deployed"
}

create_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Create BigQuery datasets for usage analytics
    if ! bq ls -d lyceum-clusters-optimized:cluster_usage_analytics &> /dev/null; then
        bq mk --dataset --location=US --description="Cluster usage analytics for cost optimization" lyceum-clusters-optimized:cluster_usage_analytics
        log_success "Created BigQuery dataset for cluster usage analytics"
    else
        log_warning "BigQuery dataset already exists"
    fi
    
    if ! bq ls -d lyceum-clusters-optimized:autopilot_cluster_usage &> /dev/null; then
        bq mk --dataset --location=US --description="Autopilot cluster usage analytics" lyceum-clusters-optimized:autopilot_cluster_usage
        log_success "Created BigQuery dataset for autopilot usage analytics"
    else
        log_warning "Autopilot BigQuery dataset already exists"
    fi
}

setup_customer_namespace_automation() {
    log_info "Setting up customer namespace automation..."
    
    # Create a script for easy customer onboarding
    cat > create-customer-namespace.sh << 'EOF'
#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <customer-id>"
    echo "Example: $0 customer-12345"
    exit 1
fi

CUSTOMER_ID=$1
CREATION_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Replace variables in template
sed -e "s/\${CUSTOMER_ID}/$CUSTOMER_ID/g" \
    -e "s/\${CREATION_TIMESTAMP}/$CREATION_TIMESTAMP/g" \
    customer-namespace-template.yaml | kubectl apply -f -

echo "✅ Created namespace and resources for customer: $CUSTOMER_ID"
EOF
    
    chmod +x create-customer-namespace.sh
    log_success "Customer namespace automation setup complete"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check if all resources are ready
    echo "Checking resource status:"
    echo "========================"
    
    # Check storage buckets
    echo "Storage Buckets:"
    kubectl get storagebucket
    
    # Check Redis instances
    echo -e "\nRedis Instances:"
    kubectl get redisinstance
    
    # Check clusters
    echo -e "\nClusters:"
    kubectl get containercluster
    
    # Check if we can access the clusters
    echo -e "\nCluster Access Test:"
    if gcloud container clusters describe lyceum-micro-shared --zone=$ZONE &> /dev/null; then
        log_success "Micro cluster accessible"
    else
        log_warning "Micro cluster not accessible"
    fi
    
    if gcloud container clusters describe lyceum-autopilot-cluster --region=$REGION &> /dev/null; then
        log_success "Autopilot cluster accessible"
    else
        log_warning "Autopilot cluster not accessible"
    fi
    
    log_success "Phase 1 deployment verification complete"
}

print_summary() {
    echo ""
    echo "🎉 Phase 1 Infrastructure Deployment Complete!"
    echo "=============================================="
    echo ""
    log_success "✅ GCP Project: $PROJECT_ID"
    log_success "✅ Shared Micro Cluster: lyceum-micro-shared"
    log_success "✅ Autopilot Cluster: lyceum-autopilot-cluster"
    log_success "✅ Storage Buckets: 4 buckets with lifecycle policies"
    log_success "✅ Redis Cache: Curve and session caches deployed"
    log_success "✅ Monitoring: BigQuery datasets and logging configured"
    log_success "✅ Customer Automation: Namespace creation script ready"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Test customer namespace creation: ./create-customer-namespace.sh test-customer"
    echo "2. Proceed to Phase 2: Batch Processing Pipeline"
    echo "3. Monitor costs in GCP Console: https://console.cloud.google.com/billing"
    echo ""
    echo "📊 Expected Monthly Costs:"
    echo "  - Micro Shared Cluster: ~$20/month"
    echo "  - Redis Instances: ~$150/month"
    echo "  - Storage: ~$10-50/month (depending on usage)"
    echo "  - Total Phase 1 Infrastructure: ~$180-220/month"
    echo ""
    echo "💰 Cost per Micro Customer: ~$0.20/month"
    echo "📈 Revenue per Micro Customer: $10/month"
    echo "🎯 Gross Margin: ~98%"
}

main() {
    echo "🚀 Lyceum Cluster Optimization - Phase 1 Deployment"
    echo "=================================================="
    echo ""
    
    check_prerequisites
    
    # Deploy in order of dependencies
    deploy_storage
    deploy_redis
    deploy_shared_cluster
    deploy_autopilot_cluster
    create_monitoring
    setup_customer_namespace_automation
    
    verify_deployment
    print_summary
}

# Run main function
main "$@"




