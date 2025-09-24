-- Database Clusters SaaS Subscription Tables Migration
-- This adds the necessary tables for Stripe billing and subscription management

-- Add Stripe customer ID to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    tier_name TEXT NOT NULL CHECK (tier_name IN ('starter', 'professional', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'trialing')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, status) -- Only one active subscription per user
);

-- Create BYOD connections table
CREATE TABLE IF NOT EXISTS byod_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES database_clusters(id) ON DELETE CASCADE,
    connection_name TEXT NOT NULL,
    database_type TEXT NOT NULL CHECK (database_type IN ('postgresql', 'mysql', 'clickhouse', 'sqlserver')),
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    database_name TEXT NOT NULL,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL, -- Encrypted password
    ssl_enabled BOOLEAN DEFAULT TRUE,
    connection_string_encrypted TEXT, -- Encrypted full connection string
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'failed', 'disabled')),
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    stripe_subscription_id TEXT, -- For BYOD billing
    monthly_fee DECIMAL(10,2) DEFAULT 10.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, connection_name)
);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES database_clusters(id) ON DELETE SET NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('storage', 'api_request', 'query_execution', 'data_ingestion')),
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit TEXT NOT NULL, -- GB, requests, queries, MB, etc.
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    stripe_usage_record_id TEXT, -- For usage-based billing
    
    INDEX idx_usage_metrics_user_period (user_id, billing_period_start, billing_period_end),
    INDEX idx_usage_metrics_cluster (cluster_id, measured_at)
);

-- Create billing events table for tracking all billing activities
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'subscription_created', 'subscription_updated', 'subscription_cancelled',
        'invoice_created', 'invoice_paid', 'invoice_failed',
        'usage_recorded', 'overage_charged', 'byod_connection_added'
    )),
    stripe_event_id TEXT UNIQUE, -- Stripe webhook event ID
    stripe_object_id TEXT, -- Subscription ID, Invoice ID, etc.
    amount_cents INTEGER, -- Amount in cents
    currency TEXT DEFAULT 'usd',
    description TEXT,
    metadata JSONB, -- Additional event data
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_billing_events_user (user_id, processed_at),
    INDEX idx_billing_events_stripe (stripe_event_id)
);

-- Create subscription limits table for caching tier limits
CREATE TABLE IF NOT EXISTS subscription_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    clusters_limit INTEGER NOT NULL,
    storage_limit_gb INTEGER NOT NULL,
    projects_limit INTEGER NOT NULL,
    team_members_limit INTEGER NOT NULL,
    data_retention_days INTEGER NOT NULL,
    api_requests_limit INTEGER NOT NULL,
    features JSONB, -- Additional tier features
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, effective_from)
);

-- Enable Row Level Security on all new tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE byod_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for byod_connections
CREATE POLICY "Users can manage own BYOD connections" ON byod_connections
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all BYOD connections" ON byod_connections
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for usage_metrics
CREATE POLICY "Users can view own usage metrics" ON usage_metrics
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all usage metrics" ON usage_metrics
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for billing_events
CREATE POLICY "Users can view own billing events" ON billing_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all billing events" ON billing_events
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for subscription_limits
CREATE POLICY "Users can view own subscription limits" ON subscription_limits
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all subscription limits" ON subscription_limits
    FOR ALL USING (auth.role() = 'service_role');

-- Create functions for subscription management
CREATE OR REPLACE FUNCTION update_subscription_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically update subscription limits when subscription changes
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Insert/update limits based on tier
        INSERT INTO subscription_limits (
            user_id, tier_name, clusters_limit, storage_limit_gb,
            projects_limit, team_members_limit, data_retention_days, api_requests_limit,
            effective_from
        ) VALUES (
            NEW.user_id,
            NEW.tier_name,
            CASE NEW.tier_name
                WHEN 'starter' THEN 1
                WHEN 'professional' THEN 3
                WHEN 'enterprise' THEN 999
            END,
            CASE NEW.tier_name
                WHEN 'starter' THEN 10
                WHEN 'professional' THEN 100
                WHEN 'enterprise' THEN 1000
            END,
            CASE NEW.tier_name
                WHEN 'starter' THEN 5
                WHEN 'professional' THEN 25
                WHEN 'enterprise' THEN 999
            END,
            CASE NEW.tier_name
                WHEN 'starter' THEN 3
                WHEN 'professional' THEN 10
                WHEN 'enterprise' THEN 999
            END,
            CASE NEW.tier_name
                WHEN 'starter' THEN 30
                WHEN 'professional' THEN 90
                WHEN 'enterprise' THEN 365
            END,
            CASE NEW.tier_name
                WHEN 'starter' THEN 1000
                WHEN 'professional' THEN 10000
                WHEN 'enterprise' THEN 100000
            END,
            NOW()
        )
        ON CONFLICT (user_id, effective_from)
        DO UPDATE SET
            tier_name = EXCLUDED.tier_name,
            clusters_limit = EXCLUDED.clusters_limit,
            storage_limit_gb = EXCLUDED.storage_limit_gb,
            projects_limit = EXCLUDED.projects_limit,
            team_members_limit = EXCLUDED.team_members_limit,
            data_retention_days = EXCLUDED.data_retention_days,
            api_requests_limit = EXCLUDED.api_requests_limit;
            
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic limits updating
CREATE TRIGGER trigger_update_subscription_limits
    AFTER INSERT OR UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_limits();

-- Create function to get current user limits
CREATE OR REPLACE FUNCTION get_user_subscription_limits(p_user_id UUID)
RETURNS TABLE (
    clusters_limit INTEGER,
    storage_limit_gb INTEGER,
    projects_limit INTEGER,
    team_members_limit INTEGER,
    data_retention_days INTEGER,
    api_requests_limit INTEGER,
    tier_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.clusters_limit,
        sl.storage_limit_gb,
        sl.projects_limit,
        sl.team_members_limit,
        sl.data_retention_days,
        sl.api_requests_limit,
        sl.tier_name
    FROM subscription_limits sl
    WHERE sl.user_id = p_user_id
        AND sl.effective_from <= NOW()
        AND (sl.effective_until IS NULL OR sl.effective_until > NOW())
    ORDER BY sl.effective_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_within_limits(p_user_id UUID)
RETURNS TABLE (
    within_limits BOOLEAN,
    clusters_used INTEGER,
    clusters_limit INTEGER,
    storage_used_gb DECIMAL(10,2),
    storage_limit_gb INTEGER,
    projects_used INTEGER,
    projects_limit INTEGER
) AS $$
DECLARE
    limits RECORD;
    usage RECORD;
BEGIN
    -- Get current limits
    SELECT INTO limits * FROM get_user_subscription_limits(p_user_id);
    
    IF NOT FOUND THEN
        -- No subscription, return starter limits
        limits := ROW(1, 10, 5, 3, 30, 1000, 'starter');
    END IF;
    
    -- Calculate current usage
    SELECT 
        COUNT(dc.id)::INTEGER as clusters_count,
        COALESCE(SUM(dc.storage_gb), 0)::DECIMAL(10,2) as total_storage,
        COUNT(DISTINCT cp.id)::INTEGER as projects_count
    INTO usage
    FROM database_clusters dc
    LEFT JOIN cluster_projects cp ON dc.id = cp.cluster_id
    WHERE dc.owner_id = p_user_id;
    
    -- Return comparison
    RETURN QUERY SELECT
        (usage.clusters_count <= limits.clusters_limit AND 
         usage.total_storage <= limits.storage_limit_gb AND 
         usage.projects_count <= limits.projects_limit)::BOOLEAN,
        usage.clusters_count,
        limits.clusters_limit,
        usage.total_storage,
        limits.storage_limit_gb,
        usage.projects_count,
        limits.projects_limit;
END;
$$ LANGUAGE plpgsql;

-- Insert default subscription data for existing users (optional)
INSERT INTO user_subscriptions (user_id, stripe_customer_id, stripe_subscription_id, tier_name, status, current_period_start, current_period_end)
SELECT 
    id as user_id,
    'cus_temp_' || id::TEXT as stripe_customer_id,
    'sub_temp_' || id::TEXT as stripe_subscription_id,
    'starter' as tier_name,
    'active' as status,
    NOW() as current_period_start,
    NOW() + INTERVAL '1 month' as current_period_end
FROM users 
WHERE NOT EXISTS (
    SELECT 1 FROM user_subscriptions us WHERE us.user_id = users.id
)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_sub ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_byod_connections_user ON byod_connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_date ON usage_metrics(user_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_user_date ON billing_events(user_id, processed_at);

-- Add comments for documentation
COMMENT ON TABLE user_subscriptions IS 'Stores user subscription data from Stripe';
COMMENT ON TABLE byod_connections IS 'Stores bring-your-own-database connections with billing';
COMMENT ON TABLE usage_metrics IS 'Tracks usage metrics for billing and limits enforcement';
COMMENT ON TABLE billing_events IS 'Audit log for all billing-related events';
COMMENT ON TABLE subscription_limits IS 'Cached subscription limits for quick access';

COMMENT ON FUNCTION get_user_subscription_limits IS 'Returns current subscription limits for a user';
COMMENT ON FUNCTION check_usage_within_limits IS 'Checks if user usage is within their subscription limits';

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON user_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON byod_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON usage_metrics TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_limits TO service_role;

GRANT EXECUTE ON FUNCTION get_user_subscription_limits TO service_role;
GRANT EXECUTE ON FUNCTION check_usage_within_limits TO service_role;
