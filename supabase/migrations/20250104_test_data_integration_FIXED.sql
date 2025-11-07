-- =============================================
-- Test Data Integration Migration (FIXED FOR UNIFIED_CLUSTERS)
-- =============================================
-- This migration extends the cluster_projects table functionality
-- and adds structures for test data management from clusters

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Test Data Tables
-- =============================================

-- Test data measurements: Detailed measurement data from cluster projects
CREATE TABLE IF NOT EXISTS public.test_data_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_project_id UUID NOT NULL REFERENCES public.cluster_projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Measurement identification
    measurement_id VARCHAR(255) NOT NULL,
    measurement_name VARCHAR(255),
    measurement_type VARCHAR(100), -- frequency_response, distortion, thd, impedance, etc.

    -- Measurement metadata
    test_date TIMESTAMPTZ,
    operator VARCHAR(255),
    equipment VARCHAR(255),
    test_conditions JSONB DEFAULT '{}',
    -- Structure:
    -- {
    --   "temperature_c": 25,
    --   "humidity_percent": 50,
    --   "voltage": 2.83,
    --   "frequency_range": "20Hz-20kHz",
    --   "sample_rate": 48000
    -- }

    -- Data storage
    data_format VARCHAR(50), -- json, csv, binary, etc.
    data_location TEXT, -- URL or path to stored data
    data_size_bytes BIGINT,
    data_checksum VARCHAR(64),

    -- Inline data for small datasets
    inline_data JSONB,
    -- Structure for frequency response:
    -- {
    --   "frequencies": [20, 25, 31.5, ...],
    --   "magnitudes": [85.2, 86.1, 87.3, ...],
    --   "phases": [0, -2, -5, ...]
    -- }

    -- Analysis results
    analysis_results JSONB DEFAULT '{}',
    -- Structure:
    -- {
    --   "thd_percent": 0.5,
    --   "thd_plus_noise_percent": 1.2,
    --   "snr_db": 95,
    --   "peak_frequency_hz": 1000,
    --   "resonance_frequency_hz": 850,
    --   "q_factor": 0.7
    -- }

    -- Quality and status
    quality_score DECIMAL(5, 2), -- 0-100
    validation_status VARCHAR(50) DEFAULT 'pending'
        CHECK (validation_status IN ('pending', 'validated', 'failed', 'flagged')),
    validation_notes TEXT,

    -- Tags and categorization
    tags JSONB DEFAULT '[]',
    category VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(cluster_project_id, measurement_id)
);

CREATE INDEX IF NOT EXISTS idx_test_data_measurements_cluster_project ON public.test_data_measurements(cluster_project_id);
CREATE INDEX IF NOT EXISTS idx_test_data_measurements_owner ON public.test_data_measurements(owner_id);
CREATE INDEX IF NOT EXISTS idx_test_data_measurements_type ON public.test_data_measurements(measurement_type);
CREATE INDEX IF NOT EXISTS idx_test_data_measurements_test_date ON public.test_data_measurements(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_test_data_measurements_validation ON public.test_data_measurements(validation_status);

-- Test data files: Attached files for test data projects
CREATE TABLE IF NOT EXISTS public.test_data_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_project_id UUID NOT NULL REFERENCES public.cluster_projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File identification
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_type VARCHAR(100), -- pdf, doc, xlsx, image, video, audio, etc.
    mime_type VARCHAR(100),

    -- File metadata
    file_size_bytes BIGINT,
    file_hash VARCHAR(64),
    description TEXT,

    -- Storage
    storage_provider VARCHAR(50), -- supabase, s3, gcs, azure, local
    storage_url TEXT,
    storage_key TEXT,

    -- Access control
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,

    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_data_files_cluster_project ON public.test_data_files(cluster_project_id);
CREATE INDEX IF NOT EXISTS idx_test_data_files_owner ON public.test_data_files(owner_id);
CREATE INDEX IF NOT EXISTS idx_test_data_files_type ON public.test_data_files(file_type);

-- Test data exports: Track export operations
CREATE TABLE IF NOT EXISTS public.test_data_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Export details
    export_name VARCHAR(255),
    export_format VARCHAR(50), -- csv, excel, json, pdf, etc.
    export_type VARCHAR(50) DEFAULT 'manual'
        CHECK (export_type IN ('manual', 'scheduled', 'automated')),

    -- Included data
    project_ids JSONB NOT NULL DEFAULT '[]',
    measurement_ids JSONB DEFAULT '[]',
    include_files BOOLEAN DEFAULT false,

    -- Filters applied
    filter_criteria JSONB DEFAULT '{}',
    -- Structure:
    -- {
    --   "date_range": {"start": "2024-01-01", "end": "2024-12-31"},
    --   "measurement_types": ["frequency_response", "distortion"],
    --   "clusters": ["cluster-1", "cluster-2"]
    -- }

    -- Export status
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percent INTEGER DEFAULT 0,

    -- Output
    file_url TEXT,
    file_size_bytes BIGINT,
    record_count INTEGER,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- When the export file will be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_data_exports_user ON public.test_data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_test_data_exports_status ON public.test_data_exports(status);
CREATE INDEX IF NOT EXISTS idx_test_data_exports_requested_at ON public.test_data_exports(requested_at DESC);

-- Test data templates: Reusable measurement templates
CREATE TABLE IF NOT EXISTS public.test_data_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Template identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(100), -- measurement, project, report

    -- Template configuration
    configuration JSONB NOT NULL DEFAULT '{}',
    -- Structure for measurement template:
    -- {
    --   "measurement_type": "frequency_response",
    --   "default_parameters": {...},
    --   "required_fields": [...],
    --   "validation_rules": {...}
    -- }

    -- Usage and sharing
    is_public BOOLEAN DEFAULT false,
    is_system_template BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,

    -- Categorization
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_data_templates_owner ON public.test_data_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_test_data_templates_type ON public.test_data_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_test_data_templates_public ON public.test_data_templates(is_public);

-- =============================================
-- Views for Convenience
-- =============================================

-- View: Test data projects with measurement counts (FIXED to use unified_clusters)
CREATE OR REPLACE VIEW public.test_data_projects_summary AS
SELECT
    cp.id,
    cp.cluster_id,
    cp.owner_id,
    cp.name,
    cp.description,
    cp.project_type,
    cp.metadata,
    cp.sync_status,
    cp.last_synced_at,
    uc.name AS cluster_name,
    uc.cluster_type,
    COUNT(DISTINCT tdm.id) AS measurement_count,
    COUNT(DISTINCT tdf.id) AS file_count,
    MAX(tdm.test_date) AS latest_measurement_date,
    cp.created_at,
    cp.updated_at
FROM public.cluster_projects cp
LEFT JOIN public.unified_clusters uc ON cp.cluster_id = uc.id
LEFT JOIN public.test_data_measurements tdm ON cp.id = tdm.cluster_project_id
LEFT JOIN public.test_data_files tdf ON cp.id = tdf.cluster_project_id
WHERE cp.project_type = 'test_data'
GROUP BY cp.id, uc.id;

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function: Update updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_test_data_measurements_updated_at ON public.test_data_measurements;
CREATE TRIGGER update_test_data_measurements_updated_at
    BEFORE UPDATE ON public.test_data_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_data_files_updated_at ON public.test_data_files;
CREATE TRIGGER update_test_data_files_updated_at
    BEFORE UPDATE ON public.test_data_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_data_exports_updated_at ON public.test_data_exports;
CREATE TRIGGER update_test_data_exports_updated_at
    BEFORE UPDATE ON public.test_data_exports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_data_templates_updated_at ON public.test_data_templates;
CREATE TRIGGER update_test_data_templates_updated_at
    BEFORE UPDATE ON public.test_data_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Calculate quality score for measurements
CREATE OR REPLACE FUNCTION calculate_measurement_quality_score(
    p_measurement_id UUID
)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    v_score DECIMAL(5, 2) := 100.0;
BEGIN
    -- TODO: Implement quality scoring algorithm
    -- This is a placeholder that returns 100
    -- Real implementation would analyze the measurement data
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function: Get test data statistics for a user
CREATE OR REPLACE FUNCTION get_user_test_data_stats(
    p_user_id UUID
)
RETURNS TABLE (
    total_projects BIGINT,
    total_measurements BIGINT,
    total_files BIGINT,
    total_storage_bytes BIGINT,
    measurement_types JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT cp.id) AS total_projects,
        COUNT(DISTINCT tdm.id) AS total_measurements,
        COUNT(DISTINCT tdf.id) AS total_files,
        COALESCE(SUM(tdf.file_size_bytes), 0) AS total_storage_bytes,
        jsonb_agg(DISTINCT jsonb_build_object('type', tdm.measurement_type, 'count', COUNT(*))) AS measurement_types
    FROM public.cluster_projects cp
    LEFT JOIN public.test_data_measurements tdm ON cp.id = tdm.cluster_project_id
    LEFT JOIN public.test_data_files tdf ON cp.id = tdf.cluster_project_id
    WHERE cp.owner_id = p_user_id
    AND cp.project_type = 'test_data';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.test_data_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_data_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_data_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own measurements" ON public.test_data_measurements;
DROP POLICY IF EXISTS "Users can insert their own measurements" ON public.test_data_measurements;
DROP POLICY IF EXISTS "Users can update their own measurements" ON public.test_data_measurements;
DROP POLICY IF EXISTS "Users can delete their own measurements" ON public.test_data_measurements;

DROP POLICY IF EXISTS "Users can view their own files" ON public.test_data_files;
DROP POLICY IF EXISTS "Users can insert their own files" ON public.test_data_files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.test_data_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.test_data_files;

DROP POLICY IF EXISTS "Users can view their own exports" ON public.test_data_exports;
DROP POLICY IF EXISTS "Users can create their own exports" ON public.test_data_exports;
DROP POLICY IF EXISTS "Users can update their own exports" ON public.test_data_exports;
DROP POLICY IF EXISTS "Users can delete their own exports" ON public.test_data_exports;

DROP POLICY IF EXISTS "Users can view public templates and their own" ON public.test_data_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.test_data_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.test_data_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.test_data_templates;

-- Test data measurements policies
CREATE POLICY "Users can view their own measurements"
    ON public.test_data_measurements FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own measurements"
    ON public.test_data_measurements FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own measurements"
    ON public.test_data_measurements FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own measurements"
    ON public.test_data_measurements FOR DELETE
    USING (auth.uid() = owner_id);

-- Test data files policies
CREATE POLICY "Users can view their own files"
    ON public.test_data_files FOR SELECT
    USING (auth.uid() = owner_id OR is_public = true);

CREATE POLICY "Users can insert their own files"
    ON public.test_data_files FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own files"
    ON public.test_data_files FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own files"
    ON public.test_data_files FOR DELETE
    USING (auth.uid() = owner_id);

-- Test data exports policies
CREATE POLICY "Users can view their own exports"
    ON public.test_data_exports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exports"
    ON public.test_data_exports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exports"
    ON public.test_data_exports FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exports"
    ON public.test_data_exports FOR DELETE
    USING (auth.uid() = user_id);

-- Test data templates policies
CREATE POLICY "Users can view public templates and their own"
    ON public.test_data_templates FOR SELECT
    USING (auth.uid() = owner_id OR is_public = true);

CREATE POLICY "Users can create their own templates"
    ON public.test_data_templates FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own templates"
    ON public.test_data_templates FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own templates"
    ON public.test_data_templates FOR DELETE
    USING (auth.uid() = owner_id);

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE public.test_data_measurements IS 'Detailed measurement data from cluster test data projects';
COMMENT ON TABLE public.test_data_files IS 'File attachments associated with test data projects';
COMMENT ON TABLE public.test_data_exports IS 'Export operations and tracking for test data';
COMMENT ON TABLE public.test_data_templates IS 'Reusable templates for measurements and projects';

COMMENT ON VIEW public.test_data_projects_summary IS 'Summary view of test data projects with measurement and file counts';

COMMENT ON COLUMN public.test_data_measurements.inline_data IS 'Small datasets can be stored inline as JSONB';
COMMENT ON COLUMN public.test_data_measurements.data_location IS 'URL or path for large datasets stored externally';
COMMENT ON COLUMN public.test_data_measurements.quality_score IS 'Calculated quality score (0-100) for the measurement';
