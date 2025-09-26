-- Add Responsible User Feature to License System
-- This allows licenses to be assigned to multiple users while having a single responsible user for payment

-- 1. Add responsible_user_id to licenses table
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add responsible_user_id to license_keys table  
ALTER TABLE public.license_keys 
ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_licenses_responsible_user ON public.licenses(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_responsible_user ON public.license_keys(responsible_user_id);

-- 4. Add comments to explain the new fields
COMMENT ON COLUMN public.licenses.responsible_user_id IS 'User who is responsible for paying for this license (can be different from users who use the license)';
COMMENT ON COLUMN public.license_keys.responsible_user_id IS 'User who is responsible for paying for this license (can be different from users who use the license)';

-- 5. Update existing licenses to have the assigned user as responsible user (migration)
-- For licenses table
UPDATE public.licenses 
SET responsible_user_id = user_id 
WHERE responsible_user_id IS NULL AND user_id IS NOT NULL;

-- For license_keys table
UPDATE public.license_keys 
SET responsible_user_id = assigned_to 
WHERE responsible_user_id IS NULL AND assigned_to IS NOT NULL;

-- 6. Create a view to easily see license responsibility and assignments
CREATE OR REPLACE VIEW public.license_responsibility_view AS
SELECT 
  l.id,
  l.key_id,
  l.license_type,
  l.status,
  l.user_id as assigned_user_id,
  l.responsible_user_id,
  u_assigned.email as assigned_user_email,
  u_assigned.full_name as assigned_user_name,
  u_responsible.email as responsible_user_email,
  u_responsible.full_name as responsible_user_name,
  l.created_at,
  l.expires_at
FROM public.licenses l
LEFT JOIN public.user_profiles u_assigned ON l.user_id = u_assigned.id
LEFT JOIN public.user_profiles u_responsible ON l.responsible_user_id = u_responsible.id;

-- 7. Create a view for license_keys table as well
CREATE OR REPLACE VIEW public.license_keys_responsibility_view AS
SELECT 
  lk.id,
  lk.key_code,
  lk.license_type,
  lk.status,
  lk.assigned_to as assigned_user_id,
  lk.responsible_user_id,
  u_assigned.email as assigned_user_email,
  u_assigned.full_name as assigned_user_name,
  u_responsible.email as responsible_user_email,
  u_responsible.full_name as responsible_user_name,
  lk.created_at,
  lk.expires_at
FROM public.license_keys lk
LEFT JOIN public.user_profiles u_assigned ON lk.assigned_to = u_assigned.id
LEFT JOIN public.user_profiles u_responsible ON lk.responsible_user_id = u_responsible.id;

-- 8. Grant permissions on the new views
GRANT SELECT ON public.license_responsibility_view TO service_role;
GRANT SELECT ON public.license_keys_responsibility_view TO service_role;
GRANT SELECT ON public.license_responsibility_view TO authenticated;
GRANT SELECT ON public.license_keys_responsibility_view TO authenticated;

-- 9. Create RLS policies for the views (users can see licenses they're responsible for or assigned to)
CREATE POLICY "Users can view licenses they're responsible for or assigned to" ON public.licenses
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = responsible_user_id OR
    EXISTS (
      SELECT 1 FROM public.user_license_assignments ula 
      WHERE ula.license_id = licenses.id AND ula.user_id = auth.uid() AND ula.revoked_at IS NULL
    )
  );

-- 10. Add trigger to automatically set responsible_user_id when creating new licenses
CREATE OR REPLACE FUNCTION set_responsible_user_on_license_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- If no responsible user is set, default to the assigned user
  IF NEW.responsible_user_id IS NULL THEN
    IF NEW.user_id IS NOT NULL THEN
      NEW.responsible_user_id := NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_responsible_user_on_licenses_insert
  BEFORE INSERT ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION set_responsible_user_on_license_creation();

-- 11. Add trigger for license_keys table as well  
CREATE OR REPLACE FUNCTION set_responsible_user_on_license_keys_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- If no responsible user is set, default to the assigned user
  IF NEW.responsible_user_id IS NULL THEN
    IF NEW.assigned_to IS NOT NULL THEN
      NEW.responsible_user_id := NEW.assigned_to;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_responsible_user_on_license_keys_insert
  BEFORE INSERT ON public.license_keys
  FOR EACH ROW EXECUTE FUNCTION set_responsible_user_on_license_keys_creation();

-- 12. Create function to transfer license payment responsibility
CREATE OR REPLACE FUNCTION transfer_license_responsibility(
  license_id UUID,
  new_responsible_user_id UUID,
  table_name TEXT DEFAULT 'licenses'
)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INT;
BEGIN
  IF table_name = 'licenses' THEN
    UPDATE public.licenses 
    SET responsible_user_id = new_responsible_user_id,
        updated_at = NOW()
    WHERE id = license_id;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSIF table_name = 'license_keys' THEN
    UPDATE public.license_keys 
    SET responsible_user_id = new_responsible_user_id,
        updated_at = NOW()
    WHERE id = license_id;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'Invalid table_name. Must be either "licenses" or "license_keys"';
  END IF;
  
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION transfer_license_responsibility(UUID, UUID, TEXT) TO service_role;
