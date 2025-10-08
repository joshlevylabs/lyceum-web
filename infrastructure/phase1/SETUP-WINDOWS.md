# 🪟 Windows Setup Guide for Lyceum Cluster Optimization

This guide will help you set up your Windows environment to deploy the Lyceum cluster optimization infrastructure.

## 🔧 Prerequisites Installation

### 1. Install Google Cloud CLI

**Option A: Download Installer (Recommended)**
1. Visit: https://cloud.google.com/sdk/docs/install-sdk#windows
2. Download the Google Cloud CLI installer
3. Run the installer and follow the prompts
4. Restart PowerShell after installation

**Option B: Using PowerShell (Advanced)**
```powershell
# Download and install using PowerShell
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe
```

### 2. Verify Installation
```powershell
# Test gcloud installation
gcloud version

# Should show output like:
# Google Cloud SDK 450.0.0
# bq 2.0.97
# core 2023.10.11
# gcloud-crc32c 1.0.0
# gsutil 5.25
```

### 3. Authenticate with Google Cloud
```powershell
# Login to your Google account
gcloud auth login

# This will open a browser window for authentication
# Follow the prompts to authenticate
```

### 4. Verify Authentication
```powershell
# Check if you're logged in
gcloud auth list

# Should show your authenticated account with status ACTIVE
```

## 🚀 Quick Start Deployment

Once you have the prerequisites installed:

### 1. Navigate to Infrastructure Directory
```powershell
cd C:\Users\joshual\Documents\Cursor\lyceum\infrastructure\phase1
```

### 2. Run Project Setup
```powershell
# Create GCP project and enable APIs
.\gcp-project-setup.ps1
```

**Important:** When prompted, you'll need to enable billing in the GCP Console:
- Visit: https://console.cloud.google.com/billing/projects
- Find your project "lyceum-clusters-optimized"
- Link it to a billing account

### 3. Deploy Infrastructure
```powershell
# Deploy all Phase 1 infrastructure (takes 20-30 minutes)
.\deploy-phase1.ps1
```

### 4. Test Customer Creation
```powershell
# Test the customer namespace automation
.\create-customer-namespace.ps1 -CustomerId test-customer
```

## 🐛 Troubleshooting

### Problem: "gcloud is not recognized"
**Solution:**
1. Reinstall Google Cloud CLI
2. Restart PowerShell completely
3. Add to PATH manually if needed:
   ```powershell
   $env:PATH += ";C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin"
   ```

### Problem: "Permission denied" or "Access denied"
**Solution:**
1. Run PowerShell as Administrator
2. Set execution policy:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### Problem: Authentication issues
**Solution:**
1. Clear existing auth:
   ```powershell
   gcloud auth revoke --all
   ```
2. Re-authenticate:
   ```powershell
   gcloud auth login
   ```

### Problem: Billing not enabled
**Solution:**
1. Visit [GCP Billing Console](https://console.cloud.google.com/billing/projects)
2. Find project "lyceum-clusters-optimized"
3. Click "Link a billing account"
4. Select your billing account

### Problem: API quota exceeded
**Solution:**
1. Visit [GCP Quotas](https://console.cloud.google.com/iam-admin/quotas)
2. Search for the specific API (e.g., "Compute Engine API")
3. Request quota increase if needed

## 📊 What Gets Created

After successful deployment, you'll have:

### GCP Resources:
- **Project:** lyceum-clusters-optimized
- **Clusters:** 
  - lyceum-micro-shared (e2-micro, preemptible)
  - lyceum-autopilot-cluster (autopilot, regional)
- **Storage:** 4 buckets with lifecycle policies
- **Redis:** 2 instances (curve cache + session cache)
- **BigQuery:** 2 datasets for usage analytics

### Monthly Costs:
- **Micro Shared Cluster:** ~$20/month
- **Autopilot Cluster:** ~$75/month (scales to zero)
- **Redis Instances:** ~$150/month
- **Storage:** ~$10-50/month
- **Total:** ~$255-295/month

### Revenue Model:
- **Micro Customers:** $10/month each
- **Infrastructure Cost:** ~$0.25/month per customer
- **Gross Margin:** 97.5%

## 🔗 Useful Links

- **GCP Console:** https://console.cloud.google.com/
- **Kubernetes Clusters:** https://console.cloud.google.com/kubernetes/list
- **Cloud Storage:** https://console.cloud.google.com/storage/browser
- **Redis Instances:** https://console.cloud.google.com/memorystore/redis/instances
- **Billing:** https://console.cloud.google.com/billing
- **Support:** https://cloud.google.com/support

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs:** PowerShell will show detailed error messages
2. **Verify prerequisites:** Ensure gcloud and kubectl are installed
3. **Check permissions:** You need Project Owner or equivalent permissions
4. **Review quotas:** Some APIs have usage limits for new accounts
5. **Billing:** Ensure billing is enabled for the project

## ✅ Success Indicators

You'll know the deployment was successful when:

- ✅ All PowerShell scripts run without errors
- ✅ You can see resources in GCP Console
- ✅ `kubectl get nodes` shows cluster nodes
- ✅ Customer namespace creation works
- ✅ Storage buckets are created with lifecycle policies
- ✅ Redis instances show "READY" status

## 📋 Next Steps

After Phase 1 completion:
1. **Phase 2:** Batch processing pipeline implementation
2. **Phase 3:** Real-time serving layer
3. **Phase 4:** UI/UX integration with existing Lyceum platform
4. **Testing:** Load testing with simulated customers
5. **Launch:** Go-to-market for Micro tier offering




