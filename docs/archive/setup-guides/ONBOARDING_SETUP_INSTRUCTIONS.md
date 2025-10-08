# 🛠️ Onboarding System Setup Instructions

## 🚨 **ISSUE: 500 Internal Server Error on Onboarding Page**

The error you're seeing is because the onboarding database tables haven't been created yet. Here's how to fix it:

---

## ✅ **SOLUTION: Run the Database Setup**

### **Step 1: Access Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project: **kffiaqsihldgqdwagook**
3. Navigate to **SQL Editor**

### **Step 2: Run the Setup Script**
1. Copy the entire contents of `SETUP_ONBOARDING_TABLES.sql` (in your project root)
2. Paste it into the Supabase SQL Editor
3. Click **Run** to execute the script

### **Step 3: Verify Setup**
The script will create these tables:
- ✅ `onboarding_requirements` - Defines session requirements per license type
- ✅ `onboarding_sessions` - Individual training sessions  
- ✅ `onboarding_progress` - User progress tracking
- ✅ `onboarding_reminders` - Automated reminder system

### **Step 4: Test the System**
1. Refresh your browser at `http://localhost:3594/admin/onboarding`
2. You should now see the onboarding management interface
3. Sample data will be pre-loaded for testing

---

## 🎯 **What the Setup Script Does**

### **Creates Database Tables**
- Full onboarding system schema with relationships
- Row Level Security (RLS) policies for data protection
- Indexes for optimal performance
- Foreign key constraints for data integrity

### **Adds Sample Data**
- Trial license requirements (3 base sessions + 1 per plugin)
- Sample trial user and license
- Example onboarding session and progress records
- Default plugin requirements (Analytics, Reporting, Dashboard, etc.)

### **Sets Up Security**
- Admin-only access to manage onboarding
- User access to view their own progress
- Secure policies preventing data leaks

---

## 🔧 **Alternative: Manual Table Creation**

If you can't access the SQL Editor, you can create the tables manually:

```sql
-- Minimal setup for immediate testing
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Sample Session',
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  overall_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎉 **After Setup - System Features Available**

Once setup is complete, you'll have access to:

### **Admin Portal (`/admin/onboarding`)**
- **Sessions Management** - Schedule, track, and complete onboarding sessions
- **Progress Monitoring** - View user completion rates and deadlines
- **Analytics Dashboard** - System-wide metrics and insights
- **Reminder System** - Automated notifications for sessions and deadlines

### **Trial License Integration**
- **Automatic Requirements** - 3 base sessions + 1 per plugin license
- **Compliance Enforcement** - Trial licenses suspend if onboarding incomplete
- **Deadline Management** - 30-day completion window for trial users
- **Admin Oversight** - Full visibility into trial user engagement

### **Business Logic**
- **Smart Calculation** - Requirements auto-calculated based on enabled plugins
- **Progress Tracking** - Real-time completion status and warnings
- **License Validation** - Integration with existing license system
- **Automated Workflows** - Self-managing onboarding lifecycle

---

## 🆘 **Still Having Issues?**

If you continue to see errors after running the setup script:

1. **Check Supabase Console** - Verify tables were created successfully
2. **Refresh Browser** - Hard refresh (Ctrl+F5) the onboarding page
3. **Check Console Logs** - Look for any remaining errors in browser console
4. **Restart Dev Server** - Stop and restart `npm run dev`

The system is designed to gracefully handle missing tables and provide helpful error messages, so you should see clear instructions if anything is still missing.

---

**🎯 Once this setup is complete, your trial license onboarding system will be fully operational!**
