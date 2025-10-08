# Deployment Scripts and Guides

This directory contains deployment scripts and documentation for Lyceum.

## 📚 Documentation Files

### Quick Start
- **[QUICK_DEPLOY.md](../../QUICK_DEPLOY.md)** - Deploy in 5 minutes (absolute fastest)
- **[DEPLOYMENT_GUIDE_CHEAP.md](../../DEPLOYMENT_GUIDE_CHEAP.md)** - Comprehensive $0/month deployment guide
- **[DEPLOYMENT_COST_COMPARISON.md](../../DEPLOYMENT_COST_COMPARISON.md)** - Compare all deployment options

### Scripts
- **[prepare-deployment.ps1](./prepare-deployment.ps1)** - Pre-deployment checks and preparation

## 🚀 Quick Start

### 1. Prepare for Deployment
```powershell
.\scripts\deploy\prepare-deployment.ps1
```

This script will:
- Check your Node.js installation
- Test production build
- Check for common issues
- Generate deployment checklist
- Create .env.local template if missing

### 2. Follow Deployment Guide

Choose your path:

**Fast Track** (5 minutes):
```
Read: QUICK_DEPLOY.md
```

**Detailed Guide** (30 minutes):
```
Read: DEPLOYMENT_GUIDE_CHEAP.md
```

**Compare Options** (before deciding):
```
Read: DEPLOYMENT_COST_COMPARISON.md
```

## 🎯 Recommended Deployment

For most users, we recommend:
- **Hosting**: Vercel (Free tier)
- **Database**: Supabase (Free tier)
- **Payments**: Stripe (Pay-as-you-go)
- **Cost**: $0/month

## 📋 Deployment Checklist

Created by prepare-deployment.ps1:
- [ ] Local build passes
- [ ] Environment variables ready
- [ ] GitHub repository created
- [ ] Vercel account created
- [ ] Supabase account created
- [ ] Database migrations prepared
- [ ] Stripe account (if using payments)

## 🛠️ Manual Deployment Steps

### Option 1: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option 2: Vercel Dashboard
1. Go to vercel.com/new
2. Import your Git repository
3. Configure environment variables
4. Deploy

### Option 3: Railway
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

## 🌍 Environment Variables

Required variables for production:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

See the main deployment guides for detailed instructions on obtaining these values.

## 🔍 Troubleshooting

### Build Fails
1. Run `npm run build` locally first
2. Check TypeScript errors: `npm run lint`
3. Verify all dependencies are in package.json

### Database Connection Issues
1. Check Supabase URL is correct
2. Verify API keys are valid
3. Ensure RLS policies are set up

### Environment Variables Not Working
1. Redeploy after adding env vars
2. Check variable names match exactly
3. Verify no extra spaces in values

## 📞 Need Help?

1. Check the main deployment guides
2. Review Vercel documentation: https://vercel.com/docs
3. Check Supabase documentation: https://supabase.com/docs
4. Create an issue in the repository

## 🎓 Additional Resources

- [Vercel Deployment Docs](https://vercel.com/docs/concepts/deployments/overview)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Supabase Quick Start](https://supabase.com/docs/guides/getting-started)
- [Stripe Integration Guide](https://stripe.com/docs/payments/accept-a-payment)

## 💰 Cost Estimates

| Tier | Users | Cost/Month |
|------|-------|------------|
| Free | 0-1,000 | $0 |
| Starter | 1k-5k | $45 |
| Growth | 5k-10k | $75 |
| Scale | 10k+ | $150+ |

See DEPLOYMENT_COST_COMPARISON.md for detailed breakdown.
