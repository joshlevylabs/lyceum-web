-- =============================================
-- Add Sample Plugins and Fix RLS
-- =============================================

-- First, ensure RLS policies exist for plugins table
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view published plugins" ON public.plugins;

-- Allow anyone (authenticated users) to view published plugins
CREATE POLICY "Anyone can view published plugins"
    ON public.plugins FOR SELECT
    USING (is_published = true);

-- Allow admins to manage all plugins
DROP POLICY IF EXISTS "Admins can manage all plugins" ON public.plugins;
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
-- Add Sample Plugins for Testing
-- =============================================

-- Clear any existing sample data (optional)
-- DELETE FROM public.plugins WHERE slug LIKE 'sample-%';

-- Sample Plugin 1: Audio Analyzer Pro
INSERT INTO public.plugins (
    name,
    slug,
    version,
    description,
    price,
    free_trial_days,
    trial_requires_payment,
    is_published,
    category,
    icon_url,
    downloads,
    rating,
    total_reviews
) VALUES (
    'Audio Analyzer Pro',
    'audio-analyzer-pro',
    '1.2.0',
    'Professional audio analysis tool with FFT, THD, and comprehensive frequency response measurements. Perfect for speaker testing and audio system optimization.',
    49.99,
    14,
    true,
    true,
    'test-equipment',
    'https://api.dicebear.com/7.x/shapes/svg?seed=audio',
    1247,
    4.7,
    89
) ON CONFLICT (slug) DO UPDATE SET
    version = EXCLUDED.version,
    description = EXCLUDED.description,
    price = EXCLUDED.price;

-- Sample Plugin 2: Distortion Analyzer
INSERT INTO public.plugins (
    name,
    slug,
    version,
    description,
    price,
    free_trial_days,
    trial_requires_payment,
    is_published,
    category,
    icon_url,
    downloads,
    rating,
    total_reviews
) VALUES (
    'Distortion Analyzer',
    'distortion-analyzer',
    '2.1.5',
    'Advanced THD, THD+N, and harmonic analysis. Visualize distortion across the frequency spectrum with real-time measurements and detailed reporting.',
    39.99,
    7,
    false,
    true,
    'test-equipment',
    'https://api.dicebear.com/7.x/shapes/svg?seed=distortion',
    856,
    4.5,
    67
) ON CONFLICT (slug) DO UPDATE SET
    version = EXCLUDED.version,
    description = EXCLUDED.description,
    price = EXCLUDED.price;

-- Sample Plugin 3: Impedance Sweeper
INSERT INTO public.plugins (
    name,
    slug,
    version,
    description,
    price,
    free_trial_days,
    trial_requires_payment,
    is_published,
    category,
    icon_url,
    downloads,
    rating,
    total_reviews
) VALUES (
    'Impedance Sweeper',
    'impedance-sweeper',
    '1.0.3',
    'Measure speaker impedance curves with precision. Calculate resonant frequency, Qts, and other Thiele-Small parameters automatically.',
    29.99,
    14,
    true,
    true,
    'test-equipment',
    'https://api.dicebear.com/7.x/shapes/svg?seed=impedance',
    423,
    4.3,
    34
) ON CONFLICT (slug) DO UPDATE SET
    version = EXCLUDED.version,
    description = EXCLUDED.description,
    price = EXCLUDED.price;

-- Sample Plugin 4: Waterfall 3D (Free)
INSERT INTO public.plugins (
    name,
    slug,
    version,
    description,
    price,
    free_trial_days,
    trial_requires_payment,
    is_published,
    category,
    icon_url,
    downloads,
    rating,
    total_reviews
) VALUES (
    'Waterfall 3D',
    'waterfall-3d',
    '1.5.0',
    'Free 3D waterfall visualization for frequency response over time. Beautiful real-time rendering with customizable color schemes.',
    0.00,
    0,
    false,
    true,
    'visualization',
    'https://api.dicebear.com/7.x/shapes/svg?seed=waterfall',
    3421,
    4.8,
    234
) ON CONFLICT (slug) DO UPDATE SET
    version = EXCLUDED.version,
    description = EXCLUDED.description;

-- Sample Plugin 5: Room EQ Wizard Integration
INSERT INTO public.plugins (
    name,
    slug,
    version,
    description,
    price,
    free_trial_days,
    trial_requires_payment,
    is_published,
    category,
    icon_url,
    downloads,
    rating,
    total_reviews
) VALUES (
    'REW Integration',
    'rew-integration',
    '3.0.1',
    'Seamlessly import and analyze Room EQ Wizard measurements. Full integration with REW file formats and measurement types.',
    19.99,
    30,
    false,
    true,
    'integration',
    'https://api.dicebear.com/7.x/shapes/svg?seed=rew',
    2103,
    4.6,
    178
) ON CONFLICT (slug) DO UPDATE SET
    version = EXCLUDED.version,
    description = EXCLUDED.description,
    price = EXCLUDED.price;

-- Sample Plugin 6: Data Export Pro
INSERT INTO public.plugins (
    name,
    slug,
    version,
    description,
    price,
    free_trial_days,
    trial_requires_payment,
    is_published,
    category,
    icon_url,
    downloads,
    rating,
    total_reviews
) VALUES (
    'Data Export Pro',
    'data-export-pro',
    '2.3.0',
    'Export your measurements to CSV, Excel, JSON, and industry-standard formats. Batch export with custom templates and automated scheduling.',
    24.99,
    14,
    true,
    true,
    'utilities',
    'https://api.dicebear.com/7.x/shapes/svg?seed=export',
    1567,
    4.4,
    123
) ON CONFLICT (slug) DO UPDATE SET
    version = EXCLUDED.version,
    description = EXCLUDED.description,
    price = EXCLUDED.price;

-- Verify the data was inserted
SELECT
    name,
    slug,
    price,
    free_trial_days,
    is_published,
    category
FROM public.plugins
ORDER BY name;
