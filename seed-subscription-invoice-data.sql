-- Sample Subscription and Invoice Data
-- Run this after setting up the subscription/invoicing schema

-- Insert sample subscriptions (replace UUIDs with actual user IDs)
INSERT INTO public.user_subscriptions (user_id, custom_plan_name, status, billing_cycle, monthly_amount, currency, current_period_start, current_period_end, cancel_at_period_end) VALUES
('00000000-0000-0000-0000-000000000001', 'Professional', 'active', 'monthly', 49.99, 'USD', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', false),
('00000000-0000-0000-0000-000000000002', 'Basic', 'active', 'yearly', 16.67, 'USD', NOW() - INTERVAL '2 months', NOW() + INTERVAL '10 months', false)
ON CONFLICT (user_id) DO UPDATE SET
  custom_plan_name = EXCLUDED.custom_plan_name,
  status = EXCLUDED.status,
  billing_cycle = EXCLUDED.billing_cycle,
  monthly_amount = EXCLUDED.monthly_amount,
  updated_at = NOW();

-- Insert sample payment methods
INSERT INTO public.user_payment_methods (user_id, payment_type, last_four_digits, card_brand, cardholder_name, is_default, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'credit_card', '4242', 'visa', 'John Doe', true, true),
('00000000-0000-0000-0000-000000000002', 'credit_card', '5555', 'mastercard', 'Jane Smith', true, true);

-- Generate sample invoices using the function
DO $$
DECLARE
  sub_record RECORD;
  invoice_num TEXT;
BEGIN
  FOR sub_record IN SELECT * FROM public.user_subscriptions LIMIT 2 LOOP
    -- Generate invoice number
    SELECT generate_invoice_number() INTO invoice_num;
    
    -- Insert invoice
    INSERT INTO public.invoices (
      user_id, 
      subscription_id, 
      invoice_number, 
      status, 
      subtotal, 
      tax_amount, 
      total_amount, 
      currency,
      billing_period_start,
      billing_period_end,
      issue_date,
      due_date,
      paid_date
    ) VALUES (
      sub_record.user_id,
      sub_record.id,
      invoice_num,
      'paid',
      sub_record.monthly_amount,
      sub_record.monthly_amount * 0.0875, -- 8.75% tax
      sub_record.monthly_amount * 1.0875,
      sub_record.currency,
      sub_record.current_period_start,
      sub_record.current_period_end,
      sub_record.current_period_start,
      sub_record.current_period_start + INTERVAL '30 days',
      sub_record.current_period_start + INTERVAL '5 days'
    );
  END LOOP;
END $$;

-- Insert line items for the invoices
INSERT INTO public.invoice_line_items (invoice_id, item_type, description, quantity, unit_price, total_price, metadata)
SELECT 
  i.id,
  'subscription',
  s.custom_plan_name || ' subscription (' || i.billing_period_start::date || ' - ' || i.billing_period_end::date || ')',
  1,
  i.subtotal,
  i.subtotal,
  jsonb_build_object('subscription_id', s.id, 'billing_cycle', s.billing_cycle)
FROM public.invoices i
JOIN public.user_subscriptions s ON i.subscription_id = s.id;

-- Insert tax line items
INSERT INTO public.invoice_line_items (invoice_id, item_type, description, quantity, unit_price, total_price, metadata)
SELECT 
  i.id,
  'tax',
  'Sales Tax (8.75%)',
  1,
  i.tax_amount,
  i.tax_amount,
  jsonb_build_object('tax_rate', 0.0875)
FROM public.invoices i;

-- Insert license subscriptions for individual plugin billing
INSERT INTO public.license_subscriptions (user_id, license_id, plugin_id, subscription_type, price_per_month, status, auto_renew, next_billing_date)
SELECT 
  l.user_id,
  l.id,
  l.plugin_id,
  'monthly',
  CASE 
    WHEN l.plugin_id = 'klippel_qc' THEN 29.99
    WHEN l.plugin_id = 'apx500' THEN 39.99
    ELSE 9.99
  END,
  'active',
  true,
  NOW() + INTERVAL '1 month'
FROM public.licenses l
WHERE l.user_id IN (
  SELECT email FROM auth.users LIMIT 2
);

-- Insert subscription change logs
INSERT INTO public.subscription_change_log (user_id, subscription_id, change_type, new_plan, new_amount, reason)
SELECT 
  s.user_id,
  s.id,
  'created',
  s.custom_plan_name,
  s.monthly_amount,
  'Initial subscription created by admin'
FROM public.user_subscriptions s;

-- Insert sample usage billing data
INSERT INTO public.usage_billing (user_id, billing_period_start, billing_period_end, usage_type, included_amount, used_amount, overage_amount, overage_rate, overage_charge)
VALUES
('00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 month', NOW(), 'storage', 25600, 30720, 5120, 0.10, 512.00),
('00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 month', NOW(), 'api_calls', 50000, 75000, 25000, 0.001, 25.00),
('00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 month', NOW(), 'storage', 5120, 4096, 0, 0.10, 0.00);

-- Update user_resource_usage with current month data
UPDATE public.user_resource_usage 
SET 
  storage_used_mb = ub.used_amount,
  updated_at = NOW()
FROM public.usage_billing ub 
WHERE user_resource_usage.user_id = ub.user_id 
AND ub.usage_type = 'storage'
AND ub.billing_period_end >= NOW() - INTERVAL '7 days';

-- Instructions:
-- 1. First run: database-setup-subscription-invoicing.sql
-- 2. Replace sample UUIDs with actual user IDs from auth.users
-- 3. Run this seed file
-- 4. Access /admin/users and expand user details to see:
--    - Subscription information with plan details
--    - Payment methods and billing status  
--    - Recent invoices with status
--    - License table with proper formatting
--    - Usage billing and overage tracking

-- To get actual user IDs for replacement:
-- SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;







