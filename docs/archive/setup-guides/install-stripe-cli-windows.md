# 🔧 Install Stripe CLI on Windows

## 📥 **Direct Download Method (Recommended)**

### **Step 1: Download**
1. Go to: https://github.com/stripe/stripe-cli/releases/latest
2. Download: `stripe_X.X.X_windows_x86_64.zip`
3. Extract to a folder (e.g., `C:\stripe\`)

### **Step 2: Add to PATH**
1. **Copy the path** where you extracted (e.g., `C:\stripe\`)
2. **Open System Environment Variables:**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Environment Variables"
   - Under "System Variables", find "Path"
   - Click "Edit" → "New" → Paste the stripe folder path
   - Click "OK" to save
3. **Restart PowerShell/Terminal**

### **Step 3: Verify Installation**
```powershell
stripe --version
```

---

## 🚀 **Quick Alternative (Chocolatey)**
If you have Chocolatey installed:
```powershell
choco install stripe-cli
```

---

## 🚀 **Quick Alternative (Scoop)**
Install Scoop first, then Stripe:
```powershell
# Install Scoop
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Stripe CLI
scoop install stripe
```

---

## ✅ **Once Installed, Run These Commands:**

### **1. Login to Stripe**
```bash
stripe login
```
This opens your browser to authenticate with Stripe.

### **2. Start Webhook Forwarding**
```bash
stripe listen --forward-to localhost:3594/api/stripe/webhook
```

### **3. Copy the Webhook Secret**
You'll see something like:
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef...
```

**Copy this `whsec_...` value** and update your `.env.local` file:
```env
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

### **4. Test a Webhook**
In another terminal:
```bash
stripe trigger checkout.session.completed
```

---

## 🎯 **Next Steps After Installation:**
1. Fix your `.env.local` file (as shown above)
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3594/api/stripe/webhook`
4. Update webhook secret in `.env.local`
5. Restart your Next.js server: `npm run dev`
