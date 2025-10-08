# Phase 0: Minimal Serverless Infrastructure - README

## 🎯 **Overview**

Phase 0 provides a fully functional, cost-optimized cluster optimization service using serverless architecture. Perfect for validating your business model with minimal financial risk.

## 💰 **Cost Structure**

- **Monthly Cost**: $5-15 (scales with usage)
- **Customer Capacity**: 50 customers
- **Revenue Potential**: $500/month  
- **Profit Margin**: 97%+

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Lyceum UI     │    │  Cloud Functions │    │  Cloud Storage  │
│   (existing)    │────▶│  (serverless)    │────▶│  (pay per GB)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    Firestore     │
                       │ (customer data)  │
                       └──────────────────┘
```

### **Components:**

1. **Cloud Functions**:
   - `processCurves` - Generate and store curves
   - `manageCustomer` - Customer CRUD operations
   - Auto-scales to zero when unused

2. **Cloud Storage**:
   - Aggressive lifecycle management
   - Auto-delete after 30 days (configurable)
   - Pay only for data stored

3. **Firestore**:
   - Customer profiles and quotas
   - Usage tracking
   - Real-time updates

## 🚀 **Deployment**

### **Prerequisites**
- Google Cloud CLI installed and authenticated
- Billing enabled on your GCP project
- PowerShell (Windows)

### **Deploy Phase 0**
```powershell
cd infrastructure/phase0
.\deploy-phase0.ps1
```

**Deployment time**: 5-10 minutes

### **Test Deployment** 
```powershell
.\test-phase0.ps1
```

## 📊 **Capabilities**

### **Customer Tiers**
```yaml
Micro Tier ($10/month):
  - 100 curves/month
  - Basic processing
  - Standard support

Starter Tier ($49/month):
  - 1,000 curves/month  
  - Priority processing
  - Email support

Professional Tier ($149/month):
  - 10,000 curves/month
  - Advanced features
  - Priority support
```

### **Auto-scaling**
- Functions scale from 0 to 1000+ concurrent requests
- Storage scales automatically
- Database scales with usage
- Costs scale proportionally

## 🔌 **API Integration**

### **Customer Management API**

**Create Customer:**
```bash
POST https://your-region-your-project.cloudfunctions.net/manageCustomer
{
  "action": "create",
  "customerId": "customer-123",
  "tier": "micro"
}
```

**Get Customer:**
```bash
POST https://your-region-your-project.cloudfunctions.net/manageCustomer
{
  "action": "get", 
  "customerId": "customer-123"
}
```

### **Curve Processing API**

**Process Curves:**
```bash
POST https://your-region-your-project.cloudfunctions.net/processCurves
{
  "customerId": "customer-123",
  "curveCount": 10
}
```

**Response:**
```json
{
  "success": true,
  "processed": 10,
  "customerId": "customer-123",
  "storageLocation": "curves/customer-123/timestamp_batch.json",
  "remainingQuota": 90,
  "tier": "micro"
}
```

## 🧪 **Testing**

### **Manual Testing**
1. Run `.\test-phase0.ps1`
2. Check GCP Console for resources
3. Verify function logs
4. Monitor billing

### **Load Testing**
```powershell
# Test with multiple customers
for ($i=1; $i -le 10; $i++) {
  # Create customer and process curves
  # Verify quota enforcement
  # Check performance
}
```

## 💳 **Cost Control**

### **Built-in Cost Controls**
- **Storage Lifecycle**: Auto-delete after 30 days
- **Function Timeout**: 60 seconds max
- **Memory Limits**: 256MB-512MB per function
- **Budget Alerts**: 50% and 90% thresholds

### **Cost Monitoring**
```powershell
# Check current costs
gcloud billing projects describe lyceum-clusters-optimized

# View detailed billing
# Go to: https://console.cloud.google.com/billing
```

### **Emergency Cost Stop**
```powershell
# Delete all functions (stops all costs)
gcloud functions delete processCurves --region=us-central1 --quiet
gcloud functions delete manageCustomer --region=us-central1 --quiet

# Keep storage for data recovery
# Total cost after deletion: ~$1/month (storage only)
```

## 📈 **Scaling Triggers**

### **Phase 0 → Phase 1** ($15 → $50/month)
**Trigger**: 25+ active customers OR $250+/month revenue
**Benefits**: 
- Dedicated compute resources
- Better performance
- Higher customer capacity (200 customers)

### **Phase 1 → Phase 2** ($50 → $200/month)  
**Trigger**: 200+ customers OR $2,000+/month revenue
**Benefits**:
- High availability
- Advanced features
- Enterprise-grade performance

## 🔗 **Integration with Lyceum UI**

### **Add to Existing Cluster Page**

```typescript
// Add to src/app/admin/clusters/page.tsx

const optimizedClusterOptions = {
  micro: {
    name: "Optimized Micro",
    price: "$10/month", 
    curves: 100,
    description: "Cost-optimized serverless processing"
  },
  starter: {
    name: "Optimized Starter",
    price: "$49/month",
    curves: 1000, 
    description: "Enhanced serverless with priority"
  }
}

// API integration
const processOptimizedCurves = async (customerId: string, count: number) => {
  const response = await fetch(CURVE_PROCESSOR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, curveCount: count })
  })
  return response.json()
}
```

## 🛠️ **Maintenance**

### **Monthly Tasks**
- Review cost reports
- Check function performance
- Update quotas if needed
- Monitor customer usage

### **Scaling Preparation**
- Monitor customer growth
- Plan Phase 1 upgrade timing
- Prepare migration scripts
- Test Phase 1 in staging

## 🆘 **Troubleshooting**

### **Common Issues**

**Functions not responding:**
```powershell
# Check function status
gcloud functions list --region=us-central1

# View logs
gcloud functions logs read processCurves --region=us-central1
```

**Quota issues:**
```powershell
# Reset customer quota
POST /manageCustomer
{
  "action": "resetUsage",
  "customerId": "customer-123"
}
```

**Cost alerts:**
- Check billing console
- Review usage patterns  
- Consider scaling to next phase

## 🎉 **Success Metrics**

### **Technical KPIs**
- Function response time: <2 seconds
- Error rate: <1%
- Availability: >99%
- Cost per customer: <$0.30/month

### **Business KPIs**  
- Customer acquisition: 5+ new customers/month
- Revenue growth: 20%+ month-over-month
- Customer satisfaction: >4.5/5
- Profit margin: >95%

---

**🚀 You're ready to launch your cost-optimized cluster service!**

Phase 0 gives you everything needed to serve real customers, validate your business model, and build sustainable revenue - all while keeping costs under $15/month.



