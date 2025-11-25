-- Add principle field to plugins table and set it for existing plugins
-- This categorizes plugins by their principle/discipline

-- 1. Add the principle column if it doesn't exist
ALTER TABLE plugins
ADD COLUMN IF NOT EXISTS principle TEXT;

-- 2. Update existing plugins with their principles
UPDATE plugins
SET principle = 'audio'
WHERE slug IN ('klippel-qc', 'apx500');

-- 3. Log the changes
DO $$
BEGIN
    RAISE NOTICE '✅ Added principle field to plugins table';
    RAISE NOTICE '   Updated Klippel QC and APx500 plugins with principle: audio';
END $$;
