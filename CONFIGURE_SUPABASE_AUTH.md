# Configure Supabase Auth for Production

Your database is already connected! Now we just need to allow your production URL in Supabase auth settings.

## Step 1: Add Production URLs to Supabase

1. **Go to your Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/kffiaqsihldgqdwagook

2. **Navigate to Authentication Settings:**
   - Click "Authentication" in the left sidebar
   - Click "URL Configuration"

3. **Add these URLs:**

   **Site URL:**
   ```
   https://lyceum-3xzis6920-joshuas-projects-de807faa.vercel.app
   ```

   **Redirect URLs (add all of these):**
   ```
   https://lyceum-3xzis6920-joshuas-projects-de807faa.vercel.app/**
   https://lyceum-3xzis6920-joshuas-projects-de807faa.vercel.app/auth/callback
   https://lyceum-3xzis6920-joshuas-projects-de807faa.vercel.app/auth/signin
   https://lyceum-3xzis6920-joshuas-projects-de807faa.vercel.app/dashboard
   http://localhost:3000/**
   ```

4. **Click "Save"**

---

## Step 2: Test Your Production Deployment

Once the URLs are added, test your app:

1. **Visit:** https://lyceum-3xzis6920-joshuas-projects-de807faa.vercel.app

2. **Try to sign in** with an existing account OR create a new one

3. **Check that:**
   - ✅ Sign in works
   - ✅ Dashboard loads
   - ✅ Data is displayed correctly
   - ✅ All features work

---

## Step 3: When You Add Custom Domain

Later, when you connect `www.thelyceum.io`, you'll need to add these too:
```
https://www.thelyceum.io/**
https://www.thelyceum.io/auth/callback
https://thelyceum.io/**
```

And update environment variables:
```bash
echo "https://www.thelyceum.io" | vercel env add NEXT_PUBLIC_APP_URL production
echo "https://www.thelyceum.io" | vercel env add NEXTAUTH_URL production
vercel --prod
```

---

## Troubleshooting

### If sign-in fails:
- Check Supabase logs: https://supabase.com/dashboard/project/kffiaqsihldgqdwagook/logs
- Verify redirect URLs include the production URL
- Check browser console for errors

### If you see "Invalid redirect URL":
- The URL isn't in the Supabase redirect list
- Add it following Step 1 above

### If data doesn't load:
- Check Row Level Security policies
- Verify user has proper permissions
- Check Supabase API logs

---

That's it! Your app should be fully functional now! 🚀


