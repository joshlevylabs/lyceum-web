-- Add 'gratis' as a valid license type option
-- This allows licenses to be set as gratis (free) without requiring payment

-- Update licenses table constraint if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'licenses') THEN
    -- Drop existing constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'licenses' 
      AND constraint_name LIKE '%license_type%check%'
    ) THEN
      ALTER TABLE public.licenses DROP CONSTRAINT licenses_license_type_check;
    END IF;
    
    -- Add new constraint with gratis option
    ALTER TABLE public.licenses 
    ADD CONSTRAINT licenses_license_type_check 
    CHECK (license_type IN ('trial', 'standard', 'professional', 'enterprise', 'gratis'));
    
    RAISE NOTICE 'Updated licenses license_type constraint to include gratis';
  ELSE
    RAISE NOTICE 'licenses table does not exist, skipping';
  END IF;
  
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating licenses license_type constraint: %', SQLERRM;
END $$;

-- Update license_keys table constraint (this is the main table being used)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'license_keys' 
    AND constraint_name LIKE '%license_type%check%'
  ) THEN
    ALTER TABLE public.license_keys DROP CONSTRAINT license_keys_license_type_check;
  END IF;
  
  -- Add new constraint with gratis option
  ALTER TABLE public.license_keys 
  ADD CONSTRAINT license_keys_license_type_check 
  CHECK (license_type IN ('trial', 'standard', 'professional', 'enterprise', 'gratis'));
  
  RAISE NOTICE 'Updated license_keys license_type constraint to include gratis';
  
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating license_keys license_type constraint: %', SQLERRM;
END $$;

-- Add comments explaining the gratis license type
COMMENT ON COLUMN public.license_keys.license_type IS 'License type: trial=trial period, standard=basic paid, professional=advanced paid, enterprise=full paid, gratis=free license';

-- Display current license_type options for verification
SELECT 'Current license_keys license_type constraint:' as info;
SELECT 
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'license_keys' 
  AND tc.constraint_type = 'CHECK'
  AND cc.check_clause LIKE '%license_type%';
