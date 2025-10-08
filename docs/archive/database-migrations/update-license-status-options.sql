-- Update license status options to include 'trial'
-- This adds 'trial' as a valid status option for licenses

-- Update license_keys table constraint (this is the main table being used)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'license_keys' 
    AND constraint_name LIKE '%status%check%'
  ) THEN
    ALTER TABLE public.license_keys DROP CONSTRAINT license_keys_status_check;
  END IF;
  
  -- Add new constraint with trial option
  ALTER TABLE public.license_keys 
  ADD CONSTRAINT license_keys_status_check 
  CHECK (status IN ('active', 'inactive', 'trial', 'expired', 'revoked'));
  
  RAISE NOTICE 'Updated license_keys status constraint to include trial';
  
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating license_keys constraint: %', SQLERRM;
END $$;

-- Update licenses table constraint if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'licenses') THEN
    -- Drop existing constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'licenses' 
      AND constraint_name LIKE '%status%check%'
    ) THEN
      ALTER TABLE public.licenses DROP CONSTRAINT licenses_status_check;
    END IF;
    
    -- Add new constraint with trial option
    ALTER TABLE public.licenses 
    ADD CONSTRAINT licenses_status_check 
    CHECK (status IN ('active', 'inactive', 'trial', 'expired', 'revoked'));
    
    RAISE NOTICE 'Updated licenses status constraint to include trial';
  ELSE
    RAISE NOTICE 'licenses table does not exist, skipping';
  END IF;
  
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating licenses constraint: %', SQLERRM;
END $$;

-- Add comments explaining each status
COMMENT ON COLUMN public.license_keys.status IS 'License status: active=fully functional, inactive=disabled but not expired, trial=trial period, expired=time expired, revoked=permanently disabled';

-- Display current status options for verification
SELECT 'Current license_keys status constraint:' as info;
SELECT 
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'license_keys' 
  AND tc.constraint_type = 'CHECK'
  AND cc.check_clause LIKE '%status%';
