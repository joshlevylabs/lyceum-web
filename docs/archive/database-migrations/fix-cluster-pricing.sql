-- Fix cluster pricing for clusters with "free" pricing model
-- This ensures clusters configured as "Free Access" show $0/month cost

-- First, let's check current cluster pricing data
SELECT 
    id, 
    name, 
    cluster_type,
    pricing_model,
    estimated_monthly_cost,
    actual_monthly_cost
FROM user_database_clusters 
WHERE pricing_model = 'free' OR estimated_monthly_cost > 0
ORDER BY estimated_monthly_cost DESC;

-- Update clusters with "free" pricing model to have $0 cost
UPDATE user_database_clusters 
SET 
    estimated_monthly_cost = 0,
    actual_monthly_cost = 0
WHERE pricing_model = 'free';

-- Verify the changes
SELECT 
    id, 
    name, 
    cluster_type,
    pricing_model,
    estimated_monthly_cost,
    actual_monthly_cost
FROM user_database_clusters 
WHERE pricing_model = 'free'
ORDER BY name;

-- Show summary of pricing models
SELECT 
    pricing_model,
    COUNT(*) as cluster_count,
    AVG(estimated_monthly_cost) as avg_estimated_cost,
    SUM(estimated_monthly_cost) as total_estimated_cost
FROM user_database_clusters 
GROUP BY pricing_model
ORDER BY pricing_model;
