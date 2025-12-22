-- =============================================
-- Complete Plugins Setup Script
-- =============================================
-- This script sets up the plugins store with all dependencies
-- Run this in Supabase SQL Editor

-- Step 1: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    username VARCHAR(100),
    full_name VARCHAR(255),
    company VARCHAR(255),
    role VARCHAR(50) DEFAULT 'engineer',
    is_active BOOLEAN DEFAULT true,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 3: Create plugins table
CREATE TABLE IF NOT EXISTS public.plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    short_description TEXT,
    full_description TEXT,
    category VARCHAR(100),
    principle TEXT,
    tags JSONB DEFAULT '[]',
    current_version VARCHAR(50) NOT NULL,
    minimum_lyceum_version VARCHAR(50),
    changelog JSONB DEFAULT '[]',
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    pricing_model VARCHAR(50) NOT NULL DEFAULT 'one_time'
        CHECK (pricing_model IN ('one_time', 'subscription_monthly', 'subscription_annual', 'free', 'enterprise')),
    monthly_price DECIMAL(10, 2),
    annual_price DECIMAL(10, 2),
    has_free_trial BOOLEAN DEFAULT false,
    trial_duration_days INTEGER DEFAULT 14,
    trial_requires_payment BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]',
    screenshots JSONB DEFAULT '[]',
    documentation_url TEXT,
    support_url TEXT,
    website_url TEXT,
    repository_url TEXT,
    download_url TEXT,
    installation_config JSONB DEFAULT '{}',
    total_downloads INTEGER DEFAULT 0,
    active_installations INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    release_date DATE,
    publisher_name VARCHAR(255),
    publisher_email VARCHAR(255),
    publisher_website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    search_vector tsvector
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plugins_slug ON public.plugins(slug);
CREATE INDEX IF NOT EXISTS idx_plugins_category ON public.plugins(category);
CREATE INDEX IF NOT EXISTS idx_plugins_published ON public.plugins(is_published);
CREATE INDEX IF NOT EXISTS idx_plugins_featured ON public.plugins(is_featured);

-- Step 4: Create plugin_licenses table
CREATE TABLE IF NOT EXISTS public.plugin_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    license_key VARCHAR(255) NOT NULL UNIQUE,
    license_type VARCHAR(50) NOT NULL
        CHECK (license_type IN ('trial', 'purchased', 'subscription', 'enterprise', 'lifetime')),
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'cancelled', 'suspended', 'revoked')),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    last_validated_at TIMESTAMPTZ,
    is_trial BOOLEAN DEFAULT false,
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    trial_converted_to_paid BOOLEAN DEFAULT false,
    subscription_id UUID,
    subscription_status VARCHAR(50),
    next_billing_date DATE,
    auto_renew BOOLEAN DEFAULT true,
    activation_count INTEGER DEFAULT 0,
    max_activations INTEGER DEFAULT 1,
    last_used_at TIMESTAMPTZ,
    purchase_order_number VARCHAR(255),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plugin_id, license_type)
);

CREATE INDEX IF NOT EXISTS idx_plugin_licenses_user_id ON public.plugin_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_licenses_plugin_id ON public.plugin_licenses(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_licenses_status ON public.plugin_licenses(status);

-- Step 5: Create plugin_reviews table
CREATE TABLE IF NOT EXISTS public.plugin_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    is_flagged BOOLEAN DEFAULT false,
    moderation_notes TEXT,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plugin_id)
);

-- Step 6: Enable RLS
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_reviews ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view published plugins" ON public.plugins;
DROP POLICY IF EXISTS "Admins can manage all plugins" ON public.plugins;
DROP POLICY IF EXISTS "Users can view their own licenses" ON public.plugin_licenses;
DROP POLICY IF EXISTS "Users can insert their own licenses" ON public.plugin_licenses;
DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.plugin_reviews;

CREATE POLICY "Anyone can view published plugins"
    ON public.plugins FOR SELECT
    USING (is_published = true AND is_active = true);

CREATE POLICY "Admins can manage all plugins"
    ON public.plugins FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Users can view their own licenses"
    ON public.plugin_licenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own licenses"
    ON public.plugin_licenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view published reviews"
    ON public.plugin_reviews FOR SELECT
    USING (is_published = true);

-- Step 8: Insert the 6 new plugins
INSERT INTO public.plugins (
    name, slug, display_name, short_description, full_description,
    category, principle, tags, current_version, base_price, currency,
    pricing_model, monthly_price, has_free_trial, trial_duration_days,
    trial_requires_payment, features, is_published, is_featured, is_active,
    publisher_name, publisher_email, total_downloads, average_rating, total_reviews
) VALUES
(
    'Preen PSU', 'preen-psu', 'Preen PSU',
    'Preen programmable power supply control',
    'Control and monitor Preen programmable power supplies with automated test sequences and real-time voltage/current logging.',
    'power', 'electrical',
    '["power supply", "preen", "voltage", "current", "automation", "testing"]'::jsonb,
    '1.0.0', 49.00, 'USD', 'subscription_monthly', 49.00, true, 30, true,
    '["Real-time voltage and current monitoring", "Automated test sequences", "Multi-channel power supply control", "Data logging and export", "Custom power profiles", "Safety limits and protection"]'::jsonb,
    true, false, true, 'Lyceum Audio Labs', 'support@lyceum.com', 0, 0.00, 0
),
(
    'Keysight DAQ', 'keysight-daq', 'Keysight DAQ',
    'Data acquisition from Keysight instruments',
    'Direct integration with Keysight data acquisition systems for seamless measurement capture and real-time data streaming.',
    'data-acquisition', 'measurement',
    '["keysight", "daq", "data acquisition", "measurement", "streaming", "multi-channel"]'::jsonb,
    '1.0.0', 49.00, 'USD', 'subscription_monthly', 49.00, true, 30, true,
    '["Multi-channel data acquisition", "Real-time streaming", "High sample rate support", "Triggered measurements", "Data export to multiple formats", "Integration with Lyceum analytics"]'::jsonb,
    true, false, true, 'Lyceum Audio Labs', 'support@lyceum.com', 0, 0.00, 0
),
(
    'Kwikwai K110', 'kwikwai-k110', 'Kwikwai K110',
    'HDMI test and measurement integration',
    'Full integration with Kwikwai K110 HDMI analyzer for comprehensive video signal testing and compliance verification.',
    'video', 'hdmi',
    '["kwikwai", "hdmi", "video", "compliance", "testing", "4k", "8k"]'::jsonb,
    '1.0.0', 49.00, 'USD', 'subscription_monthly', 49.00, true, 30, true,
    '["HDMI signal analysis", "Compliance testing suites", "4K/8K resolution support", "EDID management", "HDCP verification", "Automated test reports"]'::jsonb,
    true, false, true, 'Lyceum Audio Labs', 'support@lyceum.com', 0, 0.00, 0
),
(
    'GRL PD', 'granite-river-labs-pd', 'GRL PD',
    'USB Power Delivery compliance testing',
    'USB-PD compliance testing integration with Granite River Labs analyzers for complete power delivery validation.',
    'power-delivery', 'usb',
    '["grl", "usb-pd", "power delivery", "compliance", "certification", "usb-c"]'::jsonb,
    '1.0.0', 49.00, 'USD', 'subscription_monthly', 49.00, true, 30, true,
    '["USB-PD 2.0/3.0/3.1 testing", "EPR specification support", "Compliance test automation", "Certification-ready reports", "Protocol analysis", "Power profile testing"]'::jsonb,
    true, false, true, 'Lyceum Audio Labs', 'support@lyceum.com', 0, 0.00, 0
),
(
    'Sifos PoE', 'sifos-poe', 'Sifos PoE',
    'Power over Ethernet test automation',
    'Automate PoE testing with Sifos analyzers including compliance testing, power measurements, and protocol analysis.',
    'networking', 'poe',
    '["sifos", "poe", "power over ethernet", "802.3af", "802.3at", "802.3bt", "compliance"]'::jsonb,
    '1.0.0', 49.00, 'USD', 'subscription_monthly', 49.00, true, 30, true,
    '["802.3af/at/bt compliance testing", "PSE and PD testing", "Power measurement and logging", "Protocol analysis", "Automated test sequences", "Multi-port testing support"]'::jsonb,
    true, false, true, 'Lyceum Audio Labs', 'support@lyceum.com', 0, 0.00, 0
),
(
    'Time Machines Grandmaster', 'time-machines-grandmaster', 'Time Machines Grandmaster',
    'Precision timing and synchronization',
    'GPS-synchronized precision timing integration with Time Machines Grandmaster for accurate timestamping and sync testing.',
    'timing', 'synchronization',
    '["time machines", "grandmaster", "ptp", "ntp", "gps", "timing", "synchronization"]'::jsonb,
    '1.0.0', 49.00, 'USD', 'subscription_monthly', 49.00, true, 30, true,
    '["GPS-synchronized timing", "PTP grandmaster support", "NTP integration", "Nanosecond accuracy", "Multi-domain support", "Timing event logging"]'::jsonb,
    true, false, true, 'Lyceum Audio Labs', 'support@lyceum.com', 0, 0.00, 0
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    short_description = EXCLUDED.short_description,
    full_description = EXCLUDED.full_description,
    category = EXCLUDED.category,
    principle = EXCLUDED.principle,
    tags = EXCLUDED.tags,
    current_version = EXCLUDED.current_version,
    base_price = EXCLUDED.base_price,
    pricing_model = EXCLUDED.pricing_model,
    monthly_price = EXCLUDED.monthly_price,
    has_free_trial = EXCLUDED.has_free_trial,
    trial_duration_days = EXCLUDED.trial_duration_days,
    features = EXCLUDED.features,
    is_published = EXCLUDED.is_published,
    updated_at = NOW();

-- Done!
SELECT 'Plugins setup complete! ' || COUNT(*) || ' plugins in database.' as result FROM public.plugins;
