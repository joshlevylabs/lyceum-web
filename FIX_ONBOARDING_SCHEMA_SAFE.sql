-- ====================================
-- SAFER FIX FOR ONBOARDING SCHEMA AND CLEANUP
-- Run this script in Supabase SQL Console
-- ====================================

-- 1. First, clean up any remaining dummy/test sessions
DELETE FROM public.onboarding_sessions
WHERE title LIKE '%Centcom Onboarding Session%' 
   OR title LIKE '%test%' 
   OR title LIKE '%dummy%'
   OR title LIKE '%Test%'
   OR title LIKE '%Dummy%'
   OR created_at < '2025-01-01'  -- Remove any old test data
   OR (title IS NULL OR title = '');

-- 2. Add missing plugin_id column to onboarding_progress if it doesn't exist
ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS plugin_id TEXT DEFAULT 'centcom';

-- 3. Update any existing progress records to have plugin_id
UPDATE public.onboarding_progress 
SET plugin_id = 'centcom' 
WHERE plugin_id IS NULL;

-- 4. Clean up any orphaned progress records
DELETE FROM public.onboarding_progress
WHERE license_key_id NOT IN (
    SELECT id FROM public.license_keys
);

-- 5. Ensure all trial licenses have onboarding requirements (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'onboarding_requirements') THEN
    INSERT INTO public.onboarding_requirements (license_type, plugin_id, required_sessions, session_duration_minutes, description, is_active)
    VALUES 
        ('trial', 'centcom', 3, 45, 'Trial Centcom onboarding - 3 mandatory sessions', true),
        ('trial', 'APx500', 1, 90, 'Trial APx500 plugin onboarding', true),
        ('trial', 'klippel_qc', 1, 90, 'Trial Klippel QC plugin onboarding', true)
    ON CONFLICT (license_type, plugin_id) DO UPDATE SET
        required_sessions = EXCLUDED.required_sessions,
        session_duration_minutes = EXCLUDED.session_duration_minutes,
        description = EXCLUDED.description,
        is_active = true,
        updated_at = NOW();
  ELSE
    RAISE NOTICE 'onboarding_requirements table does not exist, skipping...';
  END IF;
END $$;

-- 6. Create a SAFER function to auto-create onboarding sessions for new trial licenses
CREATE OR REPLACE FUNCTION auto_create_onboarding_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if license is being assigned to a user (assigned_to is being set)
    IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
        
        -- For trial licenses, auto-create onboarding sessions
        IF NEW.license_type = 'trial' THEN
            
            BEGIN
                -- Check if user already has onboarding progress for this license
                IF NOT EXISTS (
                    SELECT 1 FROM public.onboarding_progress 
                    WHERE user_id = NEW.assigned_to AND license_key_id = NEW.id
                ) THEN
                    
                    -- Create onboarding progress record
                    INSERT INTO public.onboarding_progress (
                        user_id, 
                        license_key_id, 
                        plugin_id,
                        total_sessions_required, 
                        sessions_completed, 
                        overall_status,
                        onboarding_deadline,
                        created_at,
                        updated_at
                    ) VALUES (
                        NEW.assigned_to,
                        NEW.id,
                        'centcom',
                        3, -- Default 3 sessions for trial
                        0,
                        'pending',
                        NOW() + INTERVAL '30 days', -- 30 day deadline for trials
                        NOW(),
                        NOW()
                    );
                    
                    -- Only create sessions if template table exists and has data
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'onboarding_session_templates') THEN
                        
                        -- Create the 3 mandatory centcom sessions from templates
                        INSERT INTO public.onboarding_sessions (
                            user_id,
                            license_key_id,
                            template_id,
                            plugin_id,
                            session_type,
                            session_number,
                            title,
                            description,
                            duration_minutes,
                            is_mandatory,
                            status,
                            created_at,
                            updated_at
                        )
                        SELECT 
                            NEW.assigned_to,
                            NEW.id,
                            t.id,
                            t.plugin_id,
                            t.session_type,
                            t.priority_order,
                            t.title,
                            t.description,
                            t.duration_minutes,
                            t.is_mandatory,
                            'pending',
                            NOW(),
                            NOW()
                        FROM public.onboarding_session_templates t
                        WHERE t.plugin_id = 'centcom' 
                          AND t.is_active = true 
                          AND COALESCE(t.auto_create_on_license, false) = true
                        ORDER BY t.priority_order;
                        
                        -- If license has additional plugins, create those sessions too
                        IF NEW.enabled_plugins IS NOT NULL THEN
                            INSERT INTO public.onboarding_sessions (
                                user_id,
                                license_key_id,
                                template_id,
                                plugin_id,
                                session_type,
                                session_number,
                                title,
                                description,
                                duration_minutes,
                                is_mandatory,
                                status,
                                created_at,
                                updated_at
                            )
                            SELECT 
                                NEW.assigned_to,
                                NEW.id,
                                t.id,
                                t.plugin_id,
                                t.session_type,
                                t.priority_order,
                                t.title,
                                t.description,
                                t.duration_minutes,
                                t.is_mandatory,
                                'pending',
                                NOW(),
                                NOW()
                            FROM public.onboarding_session_templates t,
                                 jsonb_array_elements_text(NEW.enabled_plugins) AS plugin
                            WHERE t.plugin_id = plugin::text
                              AND t.plugin_id != 'centcom' -- Don't duplicate centcom sessions
                              AND t.is_active = true 
                              AND COALESCE(t.auto_create_on_license, false) = true;
                        END IF;
                        
                    ELSE
                        RAISE NOTICE 'Template table does not exist, skipping session creation...';
                    END IF;
                    
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- Log error but don't fail the license assignment
                RAISE NOTICE 'Error in auto_create_onboarding_sessions: %', SQLERRM;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-create sessions when licenses are assigned
DROP TRIGGER IF EXISTS trigger_auto_create_onboarding ON public.license_keys;
CREATE TRIGGER trigger_auto_create_onboarding
    AFTER UPDATE ON public.license_keys
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_onboarding_sessions();

-- 8. Update session templates to enable auto-creation for centcom sessions (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'onboarding_session_templates') THEN
    UPDATE public.onboarding_session_templates 
    SET auto_create_on_license = true,
        updated_at = NOW()
    WHERE plugin_id = 'centcom' AND is_mandatory = true;
  ELSE
    RAISE NOTICE 'onboarding_session_templates table does not exist, skipping update...';
  END IF;
END $$;

-- 9. Show results
SELECT 'Cleanup and setup completed!' as message;

SELECT 'Current sessions after cleanup:' as message;
SELECT COUNT(*) as session_count, status 
FROM public.onboarding_sessions 
GROUP BY status;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Schema fixed and dummy data cleaned up!';
  RAISE NOTICE 'Auto-creation trigger installed for trial licenses.';
  RAISE NOTICE 'Ready for real onboarding session management.';
END $$;
