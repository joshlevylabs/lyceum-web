-- Quick fix for license details page error
-- This adds the responsible_user_id column to license_keys table

-- Check if column already exists and add it if not
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'license_keys' AND column_name = 'responsible_user_id'
  ) THEN
    -- Add the responsible_user_id column
    ALTER TABLE public.license_keys 
    ADD COLUMN responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_license_keys_responsible_user ON public.license_keys(responsible_user_id);
    
    -- Set existing licenses' responsible user to assigned user (migration)
    UPDATE public.license_keys 
    SET responsible_user_id = assigned_to 
    WHERE responsible_user_id IS NULL AND assigned_to IS NOT NULL;
    
    RAISE NOTICE 'Added responsible_user_id column to license_keys table';
  ELSE
    RAISE NOTICE 'responsible_user_id column already exists in license_keys table';
  END IF;
END $$;

-- Also add it to licenses table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'licenses') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'licenses' AND column_name = 'responsible_user_id'
    ) THEN
      -- Add the responsible_user_id column to licenses table too
      ALTER TABLE public.licenses 
      ADD COLUMN responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
      
      -- Create index for performance
      CREATE INDEX IF NOT EXISTS idx_licenses_responsible_user ON public.licenses(responsible_user_id);
      
      -- Set existing licenses' responsible user to assigned user (migration)
      UPDATE public.licenses 
      SET responsible_user_id = user_id 
      WHERE responsible_user_id IS NULL AND user_id IS NOT NULL;
      
      RAISE NOTICE 'Added responsible_user_id column to licenses table';
    ELSE
      RAISE NOTICE 'responsible_user_id column already exists in licenses table';
    END IF;
  ELSE
    RAISE NOTICE 'licenses table does not exist, skipping';
  END IF;
END $$;
