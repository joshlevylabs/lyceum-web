# 🛠️ Stripe CLI Setup for Local Development

## 📥 **Install Stripe CLI**

### **For Windows (recommended):**
```bash
# Using Scoop (recommended)
scoop install stripe

# OR using direct download:
# Go to: https://github.com/stripe/stripe-cli/releases/latest
# Download stripe_X.X.X_windows_x86_64.zip
# Extract and add to PATH
```

### **Alternative methods:**
```bash
# Using npm (global install)
npm install -g @stripe/stripe-cli

# Using Chocolatey
choco install stripe-cli
```

## 🔐 **Login to Stripe**
```bash
# This will open browser to authenticate
stripe login
```

## 🎯 **Forward Webhooks to Local Server**
```bash
# Start webhook forwarding (keep this running in separate terminal)
stripe listen --forward-to localhost:3594/api/stripe/webhook
```

This will:
- ✅ **Forward all webhook events** to your local server
- ✅ **Provide a webhook secret** (starts with `whsec_`)
- ✅ **Work with your local development server**
- ✅ **Show webhook events in real-time**

## 📋 **Copy the Webhook Secret**
When you run the command above, you'll see:
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef...
```

**Copy this secret** and add it to your `.env.local` file!

---

## 🧪 **Test Webhook Events**
In another terminal, trigger test events:
```bash
# Test successful payment
stripe trigger checkout.session.completed

# Test subscription created
stripe trigger customer.subscription.created

# See all available events
stripe trigger --help
```

---

## 🎯 **Your Development Workflow:**
1. **Terminal 1**: `npm run dev` (your Next.js server)
2. **Terminal 2**: `stripe listen --forward-to localhost:3594/api/stripe/webhook`
3. **Terminal 3**: `stripe trigger checkout.session.completed` (test events)

## ✅ **Verification:**
You should see webhook events logged in:
- **Stripe CLI output** (shows events being forwarded)
- **Next.js console** (shows your webhook handler processing events)
