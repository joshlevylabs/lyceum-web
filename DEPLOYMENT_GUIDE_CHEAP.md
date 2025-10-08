# Lyceum - Ultra-Cheap Deployment Guide

## 🎯 Deployment Strategy: $0-5/month

This guide walks you through deploying Lyceum with the cheapest possible infrastructure while maintaining production-grade quality.

---

## 📊 Cost Breakdown

| Service | Plan | Monthly Cost | Notes |
|---------|------|--------------|-------|
| **Vercel** | Hobby | $0 | Next.js hosting (100GB bandwidth, unlimited deployments) |
| **Supabase** | Free | $0 | 500MB database, 50k MAU, 2GB file storage |
| **Stripe** | Pay-as-you-go | $0* | No monthly fee, only 2.9% + $0.30 per transaction |
| **ClickHouse Cloud** | Free Trial → Serverless | $0-5 | 30-day free trial, then pay-per-use |
| **Domain (Optional)** | Namecheap | $1-2/year | Optional - Vercel provides free .vercel.app domain |

**Total: $0-5/month** (scales with usage)

---

## 🚀 Step-by-Step Deployment

### 1. Deploy to Vercel (Free - Next.js Hosting)

Vercel is the creator of Next.js and offers the best free tier for Next.js apps.

#### A. Sign up and Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
cd lyceum
vercel
```

Or use the Vercel Dashboard:
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Connect your GitHub/GitLab repository
4. Select the `lyceum` repository

#### B. Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

#### C. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
# Supabase (from next step)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URLs (will be provided by Vercel)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generate_a_random_32_char_string

# Stripe (from Stripe dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ClickHouse (optional - if using analytics)
CLICKHOUSE_HOST=your_clickhouse_host
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_password
```

---

### 2. Setup Supabase (Free - Database & Auth)

Supabase provides a generous free tier perfect for starting out.

#### A. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose a name: `lyceum-production`
4. Set a strong database password
5. Choose the region closest to your users
6. Wait ~2 minutes for provisioning

#### B. Get API Keys

From your project dashboard:
- Go to Settings → API
- Copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

#### C. Run Database Migrations

1. Go to SQL Editor in Supabase dashboard
2. Create a new query
3. Copy the SQL from your README.md (lines 62-220) or from migration files:

```bash
# If you have migration files
cat docs/centcom-integration/database/*.sql
```

4. Execute the SQL to create all tables, indexes, and RLS policies

#### D. Configure Authentication

1. Go to Authentication → Settings
2. Site URL: `https://your-app.vercel.app`
3. Redirect URLs: Add `https://your-app.vercel.app/auth/callback`
4. Enable Email provider (already enabled by default)
5. Optional: Configure email templates

#### E. Setup Storage (if needed for file uploads)

1. Go to Storage
2. Create buckets:
   - `avatars` (public)
   - `attachments` (authenticated)
   - `session-data` (authenticated)
3. Set up storage policies as needed

---

### 3. Configure Stripe (Free + Transaction Fees)

#### A. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Activate your account (requires business info)
3. Get your API keys from Dashboard → Developers → API keys

#### B. Setup Webhook Endpoint

1. Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-app.vercel.app/api/billing/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

#### C. Create Products (optional - if using subscriptions)

1. Dashboard → Products
2. Create your pricing tiers
3. Note the Price IDs for your code

---

### 4. ClickHouse Cloud (Optional - $0-5/month)

Only needed if you're using the analytics features.

#### Option A: Skip ClickHouse (Recommended for MVP)

Comment out ClickHouse usage in your code and use Supabase for analytics instead.

#### Option B: Use ClickHouse Cloud Free Trial

1. Sign up at [clickhouse.com](https://clickhouse.com)
2. Create a new service
3. Start with free 30-day trial
4. After trial, use serverless tier (pay-per-query)
5. Get connection details:
   - Host
   - Username
   - Password

---

### 5. Update Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all the keys collected from above
3. Make sure to add them for **Production**, **Preview**, and **Development** environments
4. Redeploy to apply changes

---

### 6. Deploy!

```bash
# From your local machine
vercel --prod

# Or just push to your main branch (auto-deploy)
git push origin main
```

Your app will be live at: `https://your-app-name.vercel.app`

---

## 🔧 Post-Deployment Configuration

### Set Custom Domain (Optional - $1-2/year)

1. Buy domain from Namecheap, Cloudflare, or any registrar
2. In Vercel: Settings → Domains → Add Domain
3. Update DNS records as instructed
4. SSL certificate is automatically provisioned

### Enable Monitoring

Vercel provides built-in monitoring:
- Analytics (free)
- Speed Insights (free)
- Web Vitals (free)

### Setup Error Tracking (Optional)

Free tiers available:
- **Sentry** - 5,000 errors/month free
- **LogRocket** - 1,000 sessions/month free

---

## 📈 Scaling Up (When Needed)

### When to Upgrade Supabase ($25/month)
- More than 500MB database size
- Need more than 50k monthly active users
- Want point-in-time recovery backups
- Need higher API rate limits

### When to Upgrade Vercel ($20/month)
- Need more than 100GB bandwidth/month
- Want password protection for previews
- Need analytics for >100k page views
- Want custom deployment protection rules

### Alternative: Stay Free Longer

**Supabase Alternatives (if you exceed free tier):**
- **Neon** - Generous free tier with branching
- **PlanetScale** - Serverless MySQL (5GB free)
- **Railway** - $5/month with $5 free credit

**Vercel Alternatives:**
- **Netlify** - Similar free tier, 100GB bandwidth
- **Cloudflare Pages** - Unlimited bandwidth (free)
- **Railway** - $5/month, includes database

---

## 🎯 Cost Optimization Tips

### 1. **Use Edge Functions Wisely**
- Move static content to CDN
- Cache API responses when possible
- Use ISR (Incremental Static Regeneration) for semi-static pages

### 2. **Optimize Database Queries**
- Use proper indexes
- Implement pagination
- Cache frequent queries
- Use Supabase's connection pooling

### 3. **Reduce Bundle Size**
- Use dynamic imports: `next/dynamic`
- Remove unused dependencies
- Optimize images with `next/image`
- Enable compression

### 4. **Implement Caching**
- Redis not needed at small scale
- Use Vercel's Edge Cache
- Browser caching for static assets
- SWR/React Query for client-side caching

### 5. **Monitor Usage**
- Set up Supabase usage alerts
- Monitor Vercel bandwidth
- Track Stripe transaction volume
- Review logs weekly

---

## 🚨 Free Tier Limits

### Vercel Hobby (Free)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ 6,000 build minutes/month
- ❌ No commercial use (technically)
- ❌ No team collaboration features

### Supabase Free
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 50k monthly active users
- ✅ 2GB data transfer
- ✅ Social auth providers
- ❌ No point-in-time recovery
- ❌ Community support only
- ❌ Database pauses after 7 days inactivity (wakes on request)

### Solutions for Limits:
- **Vercel**: Upgrade to Pro ($20/mo) when generating revenue
- **Supabase**: Start with free, upgrade at $25/mo when needed
- **Alternative**: Host on Railway ($5/mo fixed) with built-in Postgres

---

## 🎉 Launch Checklist

- [ ] Vercel deployment successful
- [ ] Supabase database set up with all tables
- [ ] All environment variables configured
- [ ] Stripe webhook configured and tested
- [ ] Custom domain connected (optional)
- [ ] Test user registration flow
- [ ] Test authentication (login/logout)
- [ ] Test payment flow (in test mode)
- [ ] Check all API endpoints are responding
- [ ] Enable Vercel Analytics
- [ ] Set up uptime monitoring (UptimeRobot - free)
- [ ] Create first admin user
- [ ] Update any hardcoded localhost URLs

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Stripe Docs**: https://stripe.com/docs

---

## 💡 Alternative: One-Click Deploy

If you want even faster deployment, you can use deploy buttons:

**Deploy to Vercel**:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/lyceum)

This will:
1. Clone your repository
2. Set up the Vercel project
3. Prompt for environment variables
4. Deploy automatically

---

## 🌍 Multi-Region Strategy (Future)

When scaling globally:
1. Use Vercel's Edge Network (automatic)
2. Replicate Supabase database (paid feature)
3. Use Cloudflare for additional caching
4. Consider Fly.io for custom database hosting

---

## Summary: Your $0/month Stack

```
┌─────────────────────────────────────────────┐
│  Users → Vercel Edge Network (Global CDN)  │
│         ↓                                    │
│  Next.js App on Vercel (Free Tier)         │
│         ↓                                    │
│  Supabase PostgreSQL + Auth (Free Tier)    │
│         ↓                                    │
│  Stripe Payment Processing (Pay-per-use)   │
└─────────────────────────────────────────────┘
```

**Cost**: $0/month for first ~1,000 users
**Scaling**: Pay only when you grow
**Time to Deploy**: ~30 minutes

---

Ready to deploy? Start with Step 1! 🚀
