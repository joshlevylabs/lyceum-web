-- =============================================
-- Plugins Store System Migration
-- =============================================
-- This migration creates the infrastructure for the Plugins Store
-- Users can browse plugins, purchase licenses, and activate free trials

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Core Tables
-- =============================================

-- Plugins catalog: Available plugins in the store
CREATE TABLE IF NOT EXISTS public.plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Plugin identification
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    short_description TEXT,
    full_description TEXT,

    -- Categorization
    category VARCHAR(100), -- analytics, data-management, testing, integration, ml, etc.
    tags JSONB DEFAULT '[]',

    -- Versioning
    current_version VARCHAR(50) NOT NULL,
    minimum_lyceum_version VARCHAR(50),
    changelog JSONB DEFAULT '[]',

    -- Pricing
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    pricing_model VARCHAR(50) NOT NULL DEFAULT 'one_time'
        CHECK (pricing_model IN ('one_time', 'subscription_monthly', 'subscription_annual', 'free', 'enterprise')),

    -- Subscription-specific pricing
    monthly_price DECIMAL(10, 2),
    annual_price DECIMAL(10, 2),

    -- Free trial
    has_free_trial BOOLEAN DEFAULT false,
    trial_duration_days INTEGER DEFAULT 14,
    trial_requires_payment BOOLEAN DEFAULT true, -- Requires payment info even for trial

    -- Features and metadata
    features JSONB DEFAULT '[]',
    -- Example: ["feature 1", "feature 2", "unlimited users"]

    screenshots JSONB DEFAULT '[]',
    -- Example: [{"url": "...", "caption": "..."}, ...]

    documentation_url TEXT,
    support_url TEXT,
    website_url TEXT,

    -- Technical details
    repository_url TEXT,
    download_url TEXT,
    installation_config JSONB DEFAULT '{}',

    -- Stats and ratings
    total_downloads INTEGER DEFAULT 0,
    active_installations INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,

    -- Availability
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    release_date DATE,

    -- Publisher info
    publisher_name VARCHAR(255),
    publisher_email VARCHAR(255),
    publisher_website TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Search
    search_vector tsvector
);

CREATE INDEX idx_plugins_slug ON public.plugins(slug);
CREATE INDEX idx_plugins_category ON public.plugins(category);
CREATE INDEX idx_plugins_published ON public.plugins(is_published);
CREATE INDEX idx_plugins_featured ON public.plugins(is_featured);
CREATE INDEX idx_plugins_pricing_model ON public.plugins(pricing_model);
CREATE INDEX idx_plugins_search ON public.plugins USING GIN(search_vector);

-- Plugin licenses: User's purchased/trial licenses
CREATE TABLE IF NOT EXISTS public.plugin_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- License details
    license_key VARCHAR(255) NOT NULL UNIQUE,
    license_type VARCHAR(50) NOT NULL
        CHECK (license_type IN ('trial', 'purchased', 'subscription', 'enterprise', 'lifetime')),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'cancelled', 'suspended', 'revoked')),

    -- Validity period
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    last_validated_at TIMESTAMPTZ,

    -- Trial-specific
    is_trial BOOLEAN DEFAULT false,
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    trial_converted_to_paid BOOLEAN DEFAULT false,

    -- Subscription-specific
    subscription_id UUID, -- Reference to payment processor subscription
    subscription_status VARCHAR(50),
    next_billing_date DATE,
    auto_renew BOOLEAN DEFAULT true,

    -- Usage tracking
    activation_count INTEGER DEFAULT 0,
    max_activations INTEGER DEFAULT 1,
    last_used_at TIMESTAMPTZ,

    -- Metadata
    purchase_order_number VARCHAR(255),
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, plugin_id, license_type)
);

CREATE INDEX idx_plugin_licenses_user_id ON public.plugin_licenses(user_id);
CREATE INDEX idx_plugin_licenses_plugin_id ON public.plugin_licenses(plugin_id);
CREATE INDEX idx_plugin_licenses_status ON public.plugin_licenses(status);
CREATE INDEX idx_plugin_licenses_license_key ON public.plugin_licenses(license_key);
CREATE INDEX idx_plugin_licenses_expires_at ON public.plugin_licenses(expires_at);

-- Plugin purchases: Transaction history
CREATE TABLE IF NOT EXISTS public.plugin_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    license_id UUID REFERENCES public.plugin_licenses(id) ON DELETE SET NULL,

    -- Purchase details
    purchase_type VARCHAR(50) NOT NULL
        CHECK (purchase_type IN ('trial_activation', 'one_time_purchase', 'subscription_start', 'subscription_renewal', 'upgrade')),

    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',

    -- Payment processing
    payment_processor VARCHAR(100), -- stripe, paypal, manual, etc.
    payment_processor_transaction_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),

    payment_method VARCHAR(50), -- card, paypal, bank_transfer, etc.
    payment_details JSONB DEFAULT '{}',

    -- Refund info
    refunded_at TIMESTAMPTZ,
    refund_amount DECIMAL(10, 2),
    refund_reason TEXT,

    -- Invoice
    invoice_number VARCHAR(100) UNIQUE,
    invoice_url TEXT,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plugin_purchases_user_id ON public.plugin_purchases(user_id);
CREATE INDEX idx_plugin_purchases_plugin_id ON public.plugin_purchases(plugin_id);
CREATE INDEX idx_plugin_purchases_license_id ON public.plugin_purchases(license_id);
CREATE INDEX idx_plugin_purchases_payment_status ON public.plugin_purchases(payment_status);
CREATE INDEX idx_plugin_purchases_created_at ON public.plugin_purchases(created_at DESC);

-- Plugin reviews: User reviews and ratings
CREATE TABLE IF NOT EXISTS public.plugin_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,

    -- Verification
    is_verified_purchase BOOLEAN DEFAULT false,

    -- Moderation
    is_published BOOLEAN DEFAULT true,
    is_flagged BOOLEAN DEFAULT false,
    moderation_notes TEXT,

    -- Engagement
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, plugin_id)
);

CREATE INDEX idx_plugin_reviews_plugin_id ON public.plugin_reviews(plugin_id);
CREATE INDEX idx_plugin_reviews_user_id ON public.plugin_reviews(user_id);
CREATE INDEX idx_plugin_reviews_rating ON public.plugin_reviews(rating);
CREATE INDEX idx_plugin_reviews_published ON public.plugin_reviews(is_published);

-- Payment methods: Store user payment information
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Payment method type
    payment_type VARCHAR(50) NOT NULL
        CHECK (payment_type IN ('credit_card', 'debit_card', 'paypal', 'bank_account', 'other')),

    -- Card details (tokenized, not raw)
    card_brand VARCHAR(50), -- visa, mastercard, amex, etc.
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    cardholder_name VARCHAR(255),

    -- Payment processor details
    payment_processor VARCHAR(100) DEFAULT 'stripe',
    processor_customer_id VARCHAR(255), -- Stripe customer ID, PayPal account ID, etc.
    processor_payment_method_id VARCHAR(255), -- Stripe payment method ID

    -- Billing address
    billing_address JSONB DEFAULT '{}',
    -- Structure:
    -- {
    --   "line1": "123 Main St",
    --   "line2": "Apt 4B",
    --   "city": "New York",
    --   "state": "NY",
    --   "postal_code": "10001",
    --   "country": "US"
    -- }

    -- Status
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_user_payment_methods_user_id ON public.user_payment_methods(user_id);
CREATE INDEX idx_user_payment_methods_default ON public.user_payment_methods(user_id, is_default) WHERE is_default = true;

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_plugins_updated_at
    BEFORE UPDATE ON public.plugins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plugin_licenses_updated_at
    BEFORE UPDATE ON public.plugin_licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plugin_purchases_updated_at
    BEFORE UPDATE ON public.plugin_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plugin_reviews_updated_at
    BEFORE UPDATE ON public.plugin_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_payment_methods_updated_at
    BEFORE UPDATE ON public.user_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Update plugin statistics when license is created
CREATE OR REPLACE FUNCTION update_plugin_stats_on_license()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN
        UPDATE public.plugins
        SET
            total_downloads = total_downloads + 1,
            active_installations = active_installations + 1
        WHERE id = NEW.plugin_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status = 'active' AND NEW.status != 'active') THEN
            UPDATE public.plugins
            SET active_installations = GREATEST(0, active_installations - 1)
            WHERE id = NEW.plugin_id;
        ELSIF (OLD.status != 'active' AND NEW.status = 'active') THEN
            UPDATE public.plugins
            SET active_installations = active_installations + 1
            WHERE id = NEW.plugin_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plugin_stats_on_license_trigger
    AFTER INSERT OR UPDATE ON public.plugin_licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_plugin_stats_on_license();

-- Function: Update plugin rating when review is created/updated
CREATE OR REPLACE FUNCTION update_plugin_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(3, 2);
    v_total_reviews INTEGER;
BEGIN
    -- Calculate new average rating and total count
    SELECT
        ROUND(AVG(rating)::numeric, 2),
        COUNT(*)
    INTO v_avg_rating, v_total_reviews
    FROM public.plugin_reviews
    WHERE plugin_id = COALESCE(NEW.plugin_id, OLD.plugin_id)
    AND is_published = true;

    -- Update plugin stats
    UPDATE public.plugins
    SET
        average_rating = COALESCE(v_avg_rating, 0.00),
        total_reviews = v_total_reviews
    WHERE id = COALESCE(NEW.plugin_id, OLD.plugin_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plugin_rating_on_review
    AFTER INSERT OR UPDATE OR DELETE ON public.plugin_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_plugin_rating();

-- Function: Update search vector for plugins
CREATE OR REPLACE FUNCTION update_plugin_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.short_description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.full_description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plugin_search_vector_trigger
    BEFORE INSERT OR UPDATE ON public.plugins
    FOR EACH ROW
    EXECUTE FUNCTION update_plugin_search_vector();

-- Function: Generate unique license key
CREATE OR REPLACE FUNCTION generate_license_key(p_plugin_slug VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_key VARCHAR(255);
    v_unique BOOLEAN := false;
BEGIN
    WHILE NOT v_unique LOOP
        v_key := upper(p_plugin_slug) || '-' ||
                 upper(substring(md5(random()::text) from 1 for 8)) || '-' ||
                 upper(substring(md5(random()::text) from 1 for 8)) || '-' ||
                 upper(substring(md5(random()::text) from 1 for 8));

        IF NOT EXISTS (SELECT 1 FROM public.plugin_licenses WHERE license_key = v_key) THEN
            v_unique := true;
        END IF;
    END LOOP;

    RETURN v_key;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user has valid payment method
CREATE OR REPLACE FUNCTION user_has_payment_method(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_payment_methods
        WHERE user_id = p_user_id
        AND is_active = true
        AND is_verified = true
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user can activate trial
CREATE OR REPLACE FUNCTION user_can_activate_trial(p_user_id UUID, p_plugin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plugin_requires_payment BOOLEAN;
    v_user_has_payment BOOLEAN;
    v_has_previous_license BOOLEAN;
BEGIN
    -- Check if plugin requires payment for trial
    SELECT trial_requires_payment INTO v_plugin_requires_payment
    FROM public.plugins
    WHERE id = p_plugin_id;

    -- Check if user has valid payment method
    v_user_has_payment := user_has_payment_method(p_user_id);

    -- Check if user has already had a license for this plugin
    SELECT EXISTS (
        SELECT 1
        FROM public.plugin_licenses
        WHERE user_id = p_user_id
        AND plugin_id = p_plugin_id
    ) INTO v_has_previous_license;

    -- User can activate trial if:
    -- 1. They haven't had a license before
    -- 2. If plugin requires payment, user must have payment method
    RETURN NOT v_has_previous_license
        AND (NOT v_plugin_requires_payment OR v_user_has_payment);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

-- Plugins policies (public read for published plugins)
CREATE POLICY "Anyone can view published plugins"
    ON public.plugins FOR SELECT
    USING (is_published = true AND is_active = true);

-- Admin policy for plugins (create separate admin role)
CREATE POLICY "Admins can manage all plugins"
    ON public.plugins FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'superadmin')
        )
    );

-- Plugin licenses policies
CREATE POLICY "Users can view their own licenses"
    ON public.plugin_licenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own licenses"
    ON public.plugin_licenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own licenses"
    ON public.plugin_licenses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Plugin purchases policies
CREATE POLICY "Users can view their own purchases"
    ON public.plugin_purchases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases"
    ON public.plugin_purchases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Plugin reviews policies
CREATE POLICY "Anyone can view published reviews"
    ON public.plugin_reviews FOR SELECT
    USING (is_published = true);

CREATE POLICY "Users can create reviews"
    ON public.plugin_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
    ON public.plugin_reviews FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
    ON public.plugin_reviews FOR DELETE
    USING (auth.uid() = user_id);

-- Payment methods policies
CREATE POLICY "Users can view their own payment methods"
    ON public.user_payment_methods FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods"
    ON public.user_payment_methods FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods"
    ON public.user_payment_methods FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods"
    ON public.user_payment_methods FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE public.plugins IS 'Catalog of available plugins in the Lyceum store';
COMMENT ON TABLE public.plugin_licenses IS 'User licenses for purchased or trial plugins';
COMMENT ON TABLE public.plugin_purchases IS 'Transaction history for plugin purchases and subscriptions';
COMMENT ON TABLE public.plugin_reviews IS 'User reviews and ratings for plugins';
COMMENT ON TABLE public.user_payment_methods IS 'User payment methods for plugin purchases (tokenized)';

COMMENT ON COLUMN public.plugins.trial_requires_payment IS 'Whether user must add payment method before starting trial';
COMMENT ON COLUMN public.plugin_licenses.license_key IS 'Unique license key for plugin activation';
COMMENT ON COLUMN public.user_payment_methods.processor_payment_method_id IS 'Payment processor token/ID (never store raw card data)';
