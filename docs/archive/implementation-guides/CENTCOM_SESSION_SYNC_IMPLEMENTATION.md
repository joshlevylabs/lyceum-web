# 🔄 CentCom Session Sync Implementation Guide

## 🚨 **Critical Issue Identified**

Your CentCom session shows **last activity at 12:04:33 PM**, but Lyceum still shows **11:54:32 AM**. This means **CentCom isn't sending session updates** to Lyceum.

## 📋 **What's Missing**

CentCom needs to implement **periodic session updates** to keep Lyceum synchronized with real-time activity.

---

## 🛠️ **Required Implementation**

### **1. Session Update Endpoint**
✅ **Already exists**: `POST /api/admin/users/{user_id}/centcom-sessions`

### **2. CentCom Must Send Updates Every 30 seconds**

```typescript
interface SessionUpdateRequest {
  session_data: {
    centcom_session_id: string           // Your session ID
    last_activity: string                // ISO timestamp of current activity
    session_status: 'active' | 'idle'    // Current status
    source_ip: string                    // Current IP
    user_agent: string                   // Current user agent
    mfa_verified: boolean                // MFA status
    risk_score: number                   // Current risk (use 10 for local)
    location: {
      country: string                    // Country (or "Local")
      city: string                       // City (or "Development")  
      timezone: string                   // User timezone
    }
    device_info: {
      platform: string                  // "Windows", "macOS", "Linux"
      device_type: string               // "desktop", "mobile", "tablet"
      browser: string                   // "CentCom Desktop", "Tauri WebView"
    }
    application_info: {
      app_name: string                  // "CentCom"
      app_version: string               // "1.0.0"
      build_number: string              // "2024.12.001"
      license_type: string              // "enterprise", "professional", "trial"
    }
  }
  sync_metadata: {
    sync_timestamp: string              // Current timestamp
    sync_source: string                 // "centcom_periodic_sync"
    sync_version: string                // "1.0"
  }
}
```

### **3. Example Implementation**

```typescript
class LyceumSessionSync {
  private sessionId: string
  private userId: string
  private updateInterval: NodeJS.Timeout | null = null
  
  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId
    this.userId = userId
  }
  
  // Start periodic updates every 30 seconds
  startSync() {
    this.updateInterval = setInterval(async () => {
      await this.sendSessionUpdate()
    }, 30000) // 30 seconds
    
    // Send immediate update
    this.sendSessionUpdate()
  }
  
  // Stop periodic updates
  stopSync() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    
    // Send final "terminated" status
    this.sendSessionUpdate('terminated')
  }
  
  // Send session update to Lyceum
  private async sendSessionUpdate(status: string = 'active') {
    const updateData = {
      session_data: {
        centcom_session_id: this.sessionId,
        last_activity: new Date().toISOString(),
        session_status: status,
        source_ip: await this.getCurrentIP(),
        user_agent: navigator.userAgent,
        mfa_verified: false, // Update based on your MFA state
        risk_score: 10, // Low risk for localhost/enterprise
        location: {
          country: "Local",
          city: "Development", 
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        device_info: {
          platform: this.getPlatform(),
          device_type: "desktop",
          browser: "CentCom Desktop"
        },
        application_info: {
          app_name: "CentCom",
          app_version: "1.0.0",
          build_number: "2024.12.001", 
          license_type: "enterprise" // Your detected license
        }
      },
      sync_metadata: {
        sync_timestamp: new Date().toISOString(),
        sync_source: "centcom_periodic_sync",
        sync_version: "1.0"
      }
    }
    
    try {
      const response = await fetch(`http://localhost:3594/api/admin/users/${this.userId}/centcom-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      
      if (response.ok) {
        console.log('✅ Session updated successfully')
      } else {
        console.error('❌ Failed to update session:', response.status)
      }
    } catch (error) {
      console.error('❌ Session update error:', error)
    }
  }
  
  private getPlatform(): string {
    const platform = navigator.platform?.toLowerCase() || ''
    if (platform.includes('win')) return 'Windows'
    if (platform.includes('mac')) return 'macOS'  
    if (platform.includes('linux')) return 'Linux'
    return 'Unknown'
  }
  
  private async getCurrentIP(): Promise<string> {
    // For localhost development, return IPv6 localhost
    return '::1'
  }
}
```

### **4. Integration Points**

```typescript
// After successful login
const sessionSync = new LyceumSessionSync(sessionId, userId)
sessionSync.startSync()

// Before app close/logout
sessionSync.stopSync()

// On user activity (optional - reset idle timer)
document.addEventListener('click', () => {
  sessionSync.sendSessionUpdate('active')
})
```

---

## 🎯 **Expected Results After Implementation**

### **Before (Current)**
```
Status: 🔵 Idle
Last Activity: 9/18/2025 at 11:54:32 AM (13 min ago)
Risk Score: 30% (🟡 Medium)
```

### **After (With Session Sync)**
```
Status: 🟢 Active  
Last Activity: 9/18/2025 at 12:04:33 PM (now)
Risk Score: 10% (🟢 Low)
```

---

## 🧪 **Testing Your Implementation**

1. **Login to CentCom** with session sync enabled
2. **Check Lyceum admin panel** - should show "Active" status
3. **Wait 30 seconds** - last activity should update  
4. **Close CentCom** - status should change to "Terminated"

---

## 🆘 **Quick Fix for Testing**

**Run this SQL** to manually update your current session:

```sql
-- Copy from fix-session-issues.sql
UPDATE centcom_sessions 
SET 
  last_activity = NOW(),
  session_status = 'active',
  risk_score = 5
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND id = (SELECT id FROM centcom_sessions ORDER BY created_at DESC LIMIT 1);
```

---

## 📞 **Next Steps**

1. **Fix current session**: Run `fix-session-issues.sql`
2. **Implement session sync**: Add periodic updates to CentCom
3. **Test real-time sync**: Verify Lyceum updates every 30 seconds
4. **Deploy and monitor**: Ensure consistent synchronization

The Lyceum backend is **ready** - CentCom just needs to start sending the updates! 🚀