# Coupon System Setup Instructions

## Step 1: Run Database Migration

The coupon system requires new database tables. Run the migration:

### Option A: Using Supabase CLI (Recommended)
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option B: Manual Migration via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/20250114_create_coupons_system.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**
7. Verify success messages appear

### Option C: Using psql
```bash
psql YOUR_DATABASE_CONNECTION_STRING -f supabase/migrations/20250114_create_coupons_system.sql
```

## Step 2: Verify Migration

Check that the following tables were created:
- `coupons`
- `user_coupons`
- `coupon_usage_log`

Run this query in SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('coupons', 'user_coupons', 'coupon_usage_log');
```

You should see all 3 tables listed.

## Step 3: Test with Sample Coupon (Optional)

Create a test coupon:
```sql
INSERT INTO coupons (code, name, description, discount_type, discount_value, active)
VALUES ('WELCOME20', 'Welcome Discount', '20% off your first month', 'percentage', 20.00, true);
```

## Step 4: Restart Your Development Server

After migration, restart your Next.js dev server:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Troubleshooting

### Error: "relation already exists"
This means the migration was already run. You can skip it or drop the tables first:
```sql
DROP TABLE IF EXISTS coupon_usage_log CASCADE;
DROP TABLE IF EXISTS user_coupons CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
```
Then re-run the migration.

### Error: "permission denied"
Make sure you're connected as a user with CREATE TABLE permissions.

### Error: "auth.users does not exist"
This means your Supabase auth schema isn't set up. The migration should still work for the coupon tables, but foreign key constraints to auth.users will fail. You may need to adjust the migration.

## Next Steps

Once migration is complete:
1. ✅ Database tables created
2. 🔄 Code implementation (in progress)
3. 🔄 Admin UI for creating/assigning coupons
4. 🔄 User UI showing applied discounts
5. ✅ Testing with real billing flows

## API Endpoints (After Implementation)

Admin endpoints:
- `POST /api/admin/coupons` - Create coupon
- `GET /api/admin/coupons` - List coupons
- `POST /api/admin/coupons/assign` - Assign to user

User endpoints:
- `GET /api/billing/active-coupons` - View your coupons

---

For questions or issues, check the migration file for detailed comments.
