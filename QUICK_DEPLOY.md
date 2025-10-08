# 🚀 Lyceum - Quick Deploy Guide (5 Minutes)

## The Absolute Fastest Way to Deploy

### Prerequisites
- GitHub account
- Vercel account (free)
- Supabase account (free)

---

## Step 1: Push to GitHub (1 min)

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/lyceum.git
git push -u origin main
```

---

## Step 2: Deploy to Vercel (2 min)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `lyceum` repository
4. Click "Deploy" (skip env vars for now)
5. Wait ~2 minutes ☕
6. Get your URL: `https://lyceum-xxx.vercel.app`

---

## Step 3: Setup Supabase (2 min)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `lyceum`, choose region, set password
4. Wait ~2 minutes ☕
5. Go to Settings → API → Copy:
   - Project URL
   - `anon` public key
   - `service_role` key

### Run Database Setup

1. In Supabase: SQL Editor → New Query
2. Paste your database schema (from README.md lines 62-220)
3. Click "Run"

---

## Step 4: Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
NEXT_PUBLIC_APP_URL=https://lyceum-xxx.vercel.app
NEXTAUTH_URL=https://lyceum-xxx.vercel.app
NEXTAUTH_SECRET=your-random-32-char-string
```

**Redeploy**: Deployments → Three dots → Redeploy

---

## Step 5: Test! ✅

Visit `https://lyceum-xxx.vercel.app`

- Sign up for an account
- Test login
- Create a session

---

## 🎉 You're Live!

**Cost**: $0/month
**Time**: 5-10 minutes
**Capacity**: ~1,000 users before needing upgrades

---

## Optional: Add Stripe (for payments)

1. Get Stripe keys from [dashboard.stripe.com](https://dashboard.stripe.com)
2. Add to Vercel env vars:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```
3. Setup webhook: `https://your-app.vercel.app/api/billing/stripe-webhook`

---

## Troubleshooting

**Build fails?**
- Check Node.js version (need 18+)
- Run `npm install` locally
- Check for TypeScript errors: `npm run lint`

**Can't connect to database?**
- Verify Supabase URL is correct
- Check if database was created successfully
- Verify RLS policies are set up

**Auth not working?**
- Check NEXTAUTH_SECRET is set
- Verify redirect URLs in Supabase Auth settings
- Make sure NEXTAUTH_URL matches your domain

---

## Next Steps

- [ ] Set up custom domain
- [ ] Enable Vercel Analytics
- [ ] Configure email templates in Supabase
- [ ] Set up monitoring (UptimeRobot)
- [ ] Review security settings

---

## Need More Help?

See **DEPLOYMENT_GUIDE_CHEAP.md** for detailed instructions.

---

## Commands Cheat Sheet

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check logs
vercel logs

# View domains
vercel domains

# Add env var
vercel env add
```

---

**That's it!** Your app is now live on the internet for $0/month! 🎊
