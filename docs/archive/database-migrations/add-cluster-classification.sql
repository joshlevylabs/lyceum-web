-- =====================================================
-- CLUSTER CLASSIFICATION SYSTEM
-- =====================================================
-- This migration adds a classification system to clusters:
-- - Gratis: Completely free, no billing required
-- - Trial: 30-day trial period before requiring payment
-- - Enterprise: Paid tier with full features
-- =====================================================

-- Add classification column to unified_clusters table
ALTER TABLE unified_clusters 
ADD COLUMN IF NOT EXISTS classification VARCHAR(20) DEFAULT 'enterprise' 
CHECK (classification IN ('gratis', 'trial', 'enterprise'));

-- Add trial-related columns
ALTER TABLE unified_clusters 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_trial_expired BOOLEAN DEFAULT FALSE;

-- Add billing requirement flag (false for gratis, true for trial/enterprise)
ALTER TABLE unified_clusters 
ADD COLUMN IF NOT EXISTS requires_billing BOOLEAN DEFAULT TRUE;

-- Create index for faster classification queries
CREATE INDEX IF NOT EXISTS idx_unified_clusters_classification 
ON unified_clusters(classification);

CREATE INDEX IF NOT EXISTS idx_unified_clusters_trial_end 
ON unified_clusters(trial_end_date) 
WHERE classification = 'trial';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if a trial cluster has expired
CREATE OR REPLACE FUNCTION check_trial_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.classification = 'trial' AND NEW.trial_end_date IS NOT NULL THEN
    NEW.is_trial_expired := (NOW() > NEW.trial_end_date);
  ELSE
    NEW.is_trial_expired := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically check trial expiration
DROP TRIGGER IF EXISTS trigger_check_trial_expiration ON unified_clusters;
CREATE TRIGGER trigger_check_trial_expiration
  BEFORE INSERT OR UPDATE ON unified_clusters
  FOR EACH ROW
  EXECUTE FUNCTION check_trial_expiration();

-- Function to set trial dates when classification is set to 'trial'
CREATE OR REPLACE FUNCTION set_trial_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- If classification is being set to 'trial' and trial dates aren't set
  IF NEW.classification = 'trial' AND NEW.trial_start_date IS NULL THEN
    NEW.trial_start_date := NOW();
    NEW.trial_end_date := NOW() + INTERVAL '30 days';
    NEW.is_trial_expired := FALSE;
  END IF;
  
  -- Set billing requirements based on classification
  IF NEW.classification = 'gratis' THEN
    NEW.requires_billing := FALSE;
    NEW.responsible_user_id := NULL; -- Clear responsible user for gratis
  ELSIF NEW.classification IN ('trial', 'enterprise') THEN
    NEW.requires_billing := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set trial dates
DROP TRIGGER IF EXISTS trigger_set_trial_dates ON unified_clusters;
CREATE TRIGGER trigger_set_trial_dates
  BEFORE INSERT OR UPDATE ON unified_clusters
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_dates();

-- =====================================================
-- UPDATE EXISTING CLUSTERS
-- =====================================================

-- Update existing clusters to have 'enterprise' classification by default
UPDATE unified_clusters 
SET 
  classification = 'enterprise',
  requires_billing = TRUE
WHERE classification IS NULL;

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View for active trial clusters
CREATE OR REPLACE VIEW active_trial_clusters AS
SELECT 
  *,
  EXTRACT(DAY FROM (trial_end_date - NOW())) AS days_remaining
FROM unified_clusters
WHERE 
  classification = 'trial' 
  AND is_trial_expired = FALSE
  AND trial_end_date > NOW();

-- View for expired trial clusters
CREATE OR REPLACE VIEW expired_trial_clusters AS
SELECT 
  *,
  EXTRACT(DAY FROM (NOW() - trial_end_date)) AS days_expired
FROM unified_clusters
WHERE 
  classification = 'trial' 
  AND (is_trial_expired = TRUE OR trial_end_date <= NOW());

-- View for gratis clusters
CREATE OR REPLACE VIEW gratis_clusters AS
SELECT *
FROM unified_clusters
WHERE classification = 'gratis';

-- View for enterprise clusters
CREATE OR REPLACE VIEW enterprise_clusters AS
SELECT *
FROM unified_clusters
WHERE classification = 'enterprise';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON active_trial_clusters TO authenticated;
GRANT SELECT ON expired_trial_clusters TO authenticated;
GRANT SELECT ON gratis_clusters TO authenticated;
GRANT SELECT ON enterprise_clusters TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Cluster classification system successfully installed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Classifications available:';
  RAISE NOTICE '  - gratis: Free tier, no billing required';
  RAISE NOTICE '  - trial: 30-day trial, converts to enterprise after expiration';
  RAISE NOTICE '  - enterprise: Paid tier with full features';
  RAISE NOTICE '';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '  - classification';
  RAISE NOTICE '  - trial_start_date';
  RAISE NOTICE '  - trial_end_date';
  RAISE NOTICE '  - is_trial_expired';
  RAISE NOTICE '  - requires_billing';
  RAISE NOTICE '';
  RAISE NOTICE 'Helpful views created:';
  RAISE NOTICE '  - active_trial_clusters';
  RAISE NOTICE '  - expired_trial_clusters';
  RAISE NOTICE '  - gratis_clusters';
  RAISE NOTICE '  - enterprise_clusters';
END $$;

