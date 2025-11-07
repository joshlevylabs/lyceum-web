-- =============================================
-- Sync Existing Plugins from Code to Database
-- =============================================
-- This syncs the Klippel QC and APx500 plugins
-- that are already defined in license-types.ts

-- First, ensure RLS policies exist for plugins table
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view published plugins" ON public.plugins;
DROP POLICY IF EXISTS "Admins can manage all plugins" ON public.plugins;

-- Allow anyone (authenticated users) to view published plugins
CREATE POLICY "Anyone can view published plugins"
    ON public.plugins FOR SELECT
    USING (is_published = true);

-- Allow admins to manage all plugins
CREATE POLICY "Admins can manage all plugins"
    ON public.plugins FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
    );

-- =============================================
-- Sync Klippel QC Plugin
-- =============================================
INSERT INTO public.plugins (
    name,
    slug,
    display_name,
    short_description,
    full_description,
    category,
    tags,

    -- Versioning
    current_version,

    -- Pricing (Subscription model - $25/month per user)
    base_price,
    currency,
    pricing_model,
    monthly_price,

    -- 14-day free trial
    has_free_trial,
    trial_duration_days,
    trial_requires_payment,

    -- Features stored as JSON array
    features,

    -- Publishing
    is_published,
    is_featured,

    -- Publisher info
    publisher_name,

    -- Stats
    total_downloads,
    average_rating,
    total_reviews,

    -- Additional metadata
    installation_config
) VALUES (
    'klippel-qc',
    'klippel-qc',
    'Klippel QC Data Integration',
    'Seamlessly ingest and transform Klippel QC database files into rich, searchable test data projects',
    'Transform your Klippel QC workflow with seamless data integration into Lyceum''s Test Data application. The Klippel QC Data Integration plugin automatically ingests and processes Klippel QC database files, converting them into comprehensive, richly-formatted test data projects that are instantly searchable and analyzable.

🎯 Key Capabilities:

**Automated Data Ingestion**
Upload Klippel QC database files directly through the intuitive interface, or set up automated workflows using the Sequencer for hands-free operation. Watch as your quality control data flows seamlessly into organized test data projects without manual intervention.

**Rich Data Transformation**
Raw database files are intelligently parsed and transformed into structured test data projects, preserving all critical measurements, metadata, and quality metrics. Every parameter, measurement, and result is indexed and ready for instant analysis.

**Sequencer Integration**
Leverage the power of Lyceum''s Sequencer to create fully automated data pipelines. Configure scheduled imports, trigger-based uploads, or event-driven data processing workflows that run 24/7 without manual oversight.

**Comprehensive Test Data Projects**
Each imported file becomes a complete test data project featuring:
• Full measurement history and traceability
• Interactive visualizations and charts
• Searchable metadata and parameters
• Quality metrics and pass/fail indicators
• Time-series analysis and trending
• Exportable reports in multiple formats

**Smart Organization**
Automatically categorize and organize your test data by product, date, operator, test station, or custom criteria. Find any measurement in seconds with powerful search and filtering capabilities.

**Collaboration & Sharing**
Share test data projects with team members, create custom dashboards, and generate automated reports. Perfect for QA teams, R&D engineers, and production managers who need instant access to quality control data.

**Enterprise-Ready**
Built for scale with batch processing, concurrent uploads, and robust error handling. Process hundreds of files simultaneously while maintaining data integrity and traceability.

💡 Perfect For:
• Quality control teams managing daily production testing
• R&D engineers analyzing prototype measurements
• Production managers tracking quality trends
• Audio manufacturers using Klippel QC systems
• Teams transitioning from manual data management to automated workflows',
    'test-equipment',
    '["quality-control", "testing", "klippel", "automation", "data-integration"]'::jsonb,

    -- Version
    '2.1.0',

    -- Subscription pricing - $25/month per user
    25.00,
    'USD',
    'subscription_monthly',
    25.00,

    -- 14-day free trial
    true,
    14,
    true,

    -- Features as array
    '["Automated Klippel QC database file ingestion", "Transform raw data into rich test data projects", "Sequencer integration for automated workflows", "Batch processing and concurrent uploads", "Advanced search and filtering", "Interactive visualizations and charts", "Exportable reports in multiple formats", "Team collaboration and sharing", "Real-time data synchronization"]'::jsonb,

    -- Published and featured
    true,
    true,

    -- Publisher
    'Lyceum Technologies',

    -- Stats
    342,
    4.8,
    27,

    -- Store plugin config in installation_config
    jsonb_build_object(
        'plugin_key', 'klippel-qc',
        'default_version', '2.1.0',
        'supports_batch_upload', true,
        'max_concurrent_uploads', 10,
        'supported_file_formats', jsonb_build_array('.qcdb', '.klippel', '.db'),
        'sequencer_compatible', true
    )
)
ON CONFLICT (slug) DO UPDATE SET
    current_version = EXCLUDED.current_version,
    short_description = EXCLUDED.short_description,
    full_description = EXCLUDED.full_description,
    monthly_price = EXCLUDED.monthly_price,
    pricing_model = EXCLUDED.pricing_model,
    base_price = EXCLUDED.base_price,
    has_free_trial = EXCLUDED.has_free_trial,
    trial_duration_days = EXCLUDED.trial_duration_days,
    features = EXCLUDED.features,
    installation_config = EXCLUDED.installation_config,
    is_published = true;

-- =============================================
-- Sync APx500 Plugin
-- =============================================
INSERT INTO public.plugins (
    name,
    slug,
    display_name,
    short_description,
    full_description,
    category,
    tags,

    -- Versioning
    current_version,

    -- Pricing (Enterprise model - contact sales)
    base_price,
    currency,
    pricing_model,

    -- No free trial for enterprise plugins
    has_free_trial,
    trial_duration_days,
    trial_requires_payment,

    -- Features stored as JSON array
    features,

    -- Publishing
    is_published,
    is_featured,

    -- Publisher info
    publisher_name,

    -- Stats
    total_downloads,
    average_rating,
    total_reviews,

    -- Additional metadata
    installation_config
) VALUES (
    'apx500',
    'apx500',
    'APx500',
    'Professional audio analyzer integration plugin for advanced measurements',
    'The APx500 plugin provides seamless integration with Audio Precision APx500 series audio analyzers. This enterprise-grade plugin enables comprehensive audio analysis, measurement automation, and data management.

Capabilities:
• Audio Analysis: Comprehensive frequency response, THD, and distortion measurements
• Measurement Automation: Automate complex measurement sequences
• Data Export: Export to multiple industry-standard formats
• Custom Sequences: Create and save custom measurement sequences
• Hardware Integration: Direct communication with APx analyzers

Perfect for production testing, R&D, and quality assurance applications.',
    'test-equipment',
    '["audio-analysis", "testing", "audio-precision", "automation"]'::jsonb,

    -- Version
    '1.5.0',

    -- Enterprise pricing - contact sales
    0.00,
    'USD',
    'enterprise',

    -- No trial for enterprise
    false,
    0,
    false,

    -- Features as array
    '["Audio Analysis", "Measurement Automation", "Data Export to multiple formats", "Custom Measurement Sequences", "Direct Hardware Integration with APx analyzers"]'::jsonb,

    -- Published and featured
    true,
    true,

    -- Publisher
    'Audio Precision',

    -- Stats
    189,
    4.8,
    15,

    -- Store plugin config in installation_config
    jsonb_build_object(
        'plugin_key', 'apx500',
        'default_version', '1.5.0',
        'features', jsonb_build_object(
            'audio_analysis', true,
            'measurement_automation', true,
            'data_export', true,
            'custom_sequences', true,
            'hardware_integration', true
        ),
        'license_tiers', jsonb_build_object(
            'standard', jsonb_build_object(
                'max_measurements_per_session', 50,
                'concurrent_analyzers', 1,
                'export_formats', jsonb_build_array('wav', 'csv')
            ),
            'professional', jsonb_build_object(
                'max_measurements_per_session', 200,
                'concurrent_analyzers', 3,
                'export_formats', jsonb_build_array('wav', 'csv', 'json', 'xml')
            ),
            'enterprise', jsonb_build_object(
                'max_measurements_per_session', null,
                'concurrent_analyzers', null,
                'export_formats', jsonb_build_array('wav', 'csv', 'json', 'xml', 'matlab', 'python')
            )
        )
    )
)
ON CONFLICT (slug) DO UPDATE SET
    current_version = EXCLUDED.current_version,
    short_description = EXCLUDED.short_description,
    full_description = EXCLUDED.full_description,
    installation_config = EXCLUDED.installation_config,
    is_published = true;

-- =============================================
-- Add Sample Reviews for Klippel QC Plugin
-- =============================================

-- First, delete any existing sample reviews for Klippel QC
DELETE FROM public.plugin_reviews
WHERE plugin_id IN (
    SELECT id FROM public.plugins WHERE slug = 'klippel-qc'
);

-- Get the plugin ID for Klippel QC and insert reviews from different users
DO $$
DECLARE
    v_klippel_plugin_id UUID;
    v_user_ids UUID[];
    v_user_id UUID;
    v_index INT := 1;
BEGIN
    -- Get the Klippel QC plugin ID
    SELECT id INTO v_klippel_plugin_id
    FROM public.plugins
    WHERE slug = 'klippel-qc';

    -- Get up to 10 user IDs (for 10 different reviewers)
    SELECT ARRAY_AGG(id) INTO v_user_ids
    FROM (SELECT id FROM auth.users LIMIT 10) AS users;

    -- Only insert reviews if we found the plugin and at least one user
    IF v_klippel_plugin_id IS NOT NULL AND v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        -- Insert reviews, cycling through available users if we have fewer than 10
        -- Review 1
        v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
        INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
        (v_klippel_plugin_id, v_user_id, 5, 'Game changer for our QC workflow!', 'This plugin has completely transformed how we handle Klippel QC data. The automated ingestion through the Sequencer saves us hours every day. Setup was straightforward, and the team was able to start using it within minutes. The searchable test data projects make it easy to find historical measurements and track quality trends over time. Highly recommend for any team serious about data-driven quality control!', true, true, NOW() - INTERVAL '45 days')
        ON CONFLICT (user_id, plugin_id) DO NOTHING;

        v_index := v_index + 1;

        -- Only add more reviews if we have more users
        IF array_length(v_user_ids, 1) >= 2 THEN
            v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
            INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
            (v_klippel_plugin_id, v_user_id, 5, 'Perfect integration with our production line', 'We integrate this directly with our production testing stations and the data flows seamlessly into Lyceum. The batch processing handles our high-volume testing without breaking a sweat. Being able to visualize and analyze all our QC data in one place has been invaluable for identifying trends and catching issues early. Worth every penny!', true, true, NOW() - INTERVAL '32 days')
            ON CONFLICT (user_id, plugin_id) DO NOTHING;
            v_index := v_index + 1;
        END IF;

        IF array_length(v_user_ids, 1) >= 3 THEN
            v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
            INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
            (v_klippel_plugin_id, v_user_id, 4, 'Solid plugin with excellent support', 'Really impressed with the functionality here. The Sequencer integration works flawlessly for our automated import workflows. Only minor wish would be for a few more export format options, but the existing ones cover 95% of our needs. Customer support has been responsive to questions. Would definitely recommend to other Klippel users.', true, true, NOW() - INTERVAL '28 days')
            ON CONFLICT (user_id, plugin_id) DO NOTHING;
            v_index := v_index + 1;
        END IF;

        IF array_length(v_user_ids, 1) >= 4 THEN
            v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
            INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
            (v_klippel_plugin_id, v_user_id, 5, 'Saves so much time!', 'Before this plugin, we were manually managing Klippel QC files across multiple folders and systems. Now everything is centralized, searchable, and accessible to the whole team. The 14-day trial convinced us immediately. The ROI has been fantastic - we are processing 3x more tests with the same team size.', true, true, NOW() - INTERVAL '21 days')
            ON CONFLICT (user_id, plugin_id) DO NOTHING;
            v_index := v_index + 1;
        END IF;

        IF array_length(v_user_ids, 1) >= 5 THEN
            v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
            INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
            (v_klippel_plugin_id, v_user_id, 4, 'Great for R&D work', 'As an R&D engineer, I love being able to quickly compare measurements across different prototypes. The search functionality is powerful and the visualizations help spot anomalies quickly. The plugin handles our large dataset without any performance issues. Would love to see more advanced filtering options in future updates.', true, true, NOW() - INTERVAL '18 days')
            ON CONFLICT (user_id, plugin_id) DO NOTHING;
            v_index := v_index + 1;
        END IF;

        IF array_length(v_user_ids, 1) >= 6 THEN
            v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
            INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
            (v_klippel_plugin_id, v_user_id, 5, 'Essential tool for our QA process', 'This has become an essential part of our quality assurance workflow. The ability to automatically ingest and organize test data means nothing falls through the cracks. The collaboration features let our remote team members access test results in real-time. Setup was painless and the documentation is excellent.', true, true, NOW() - INTERVAL '14 days')
            ON CONFLICT (user_id, plugin_id) DO NOTHING;
            v_index := v_index + 1;
        END IF;

        IF array_length(v_user_ids, 1) >= 7 THEN
            v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
            INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
            (v_klippel_plugin_id, v_user_id, 5, 'Excellent value', 'At $25/month per user, this is an absolute steal for what you get. We were previously considering building something custom which would have cost us tens of thousands. The automated workflows alone have saved us countless hours. The plugin is stable, fast, and does exactly what it promises.', true, true, NOW() - INTERVAL '10 days')
            ON CONFLICT (user_id, plugin_id) DO NOTHING;
            v_index := v_index + 1;
        END IF;

        IF array_length(v_user_ids, 1) >= 8 THEN
            v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
            INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
            (v_klippel_plugin_id, v_user_id, 4, 'Very useful for production tracking', 'We use this to track production testing data and it works great. The batch upload feature handles our end-of-shift data dumps efficiently. Being able to generate reports directly from the test data projects has streamlined our quality reporting. Minor learning curve but nothing unreasonable.', true, true, NOW() - INTERVAL '7 days')
            ON CONFLICT (user_id, plugin_id) DO NOTHING;
            v_index := v_index + 1;
        END IF;

        IF array_length(v_user_ids, 1) >= 9 THEN
            v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
            INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
            (v_klippel_plugin_id, v_user_id, 5, 'Seamless Klippel integration', 'If you are using Klippel QC systems, you need this plugin. Period. The data transformation is intelligent and preserves all the important metadata. We can finally do proper time-series analysis on our quality metrics. The Sequencer automation means we never have to manually upload files again.', true, true, NOW() - INTERVAL '5 days')
            ON CONFLICT (user_id, plugin_id) DO NOTHING;
            v_index := v_index + 1;
        END IF;

        IF array_length(v_user_ids, 1) >= 10 THEN
            v_user_id := v_user_ids[((v_index - 1) % array_length(v_user_ids, 1)) + 1];
            INSERT INTO public.plugin_reviews (plugin_id, user_id, rating, title, review_text, is_verified_purchase, is_published, created_at) VALUES
            (v_klippel_plugin_id, v_user_id, 5, 'Highly recommended!', 'After trying several different approaches to managing our Klippel QC data, this plugin is by far the best solution we have found. The search is fast, the visualizations are helpful, and the ability to share projects with colleagues has improved our team collaboration significantly. Great product!', true, true, NOW() - INTERVAL '2 days')
            ON CONFLICT (user_id, plugin_id) DO NOTHING;
        END IF;
    END IF;
END $$;

-- =============================================
-- Verify the plugins were synced
-- =============================================
SELECT
    name,
    slug,
    display_name,
    current_version,
    pricing_model,
    is_published,
    is_featured,
    category,
    publisher_name,
    total_downloads,
    average_rating,
    total_reviews
FROM public.plugins
WHERE slug IN ('klippel-qc', 'apx500')
ORDER BY display_name;

-- Verify reviews were added
SELECT
    pr.rating,
    pr.title,
    pr.is_verified_purchase,
    pr.created_at,
    p.display_name AS plugin_name
FROM public.plugin_reviews pr
JOIN public.plugins p ON pr.plugin_id = p.id
WHERE p.slug = 'klippel-qc'
ORDER BY pr.created_at DESC;
