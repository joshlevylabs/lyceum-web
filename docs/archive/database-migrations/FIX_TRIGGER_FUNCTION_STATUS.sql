-- ====================================
-- FIX TRIGGER FUNCTION TO USE CORRECT STATUS VALUES
-- Run this script in Supabase SQL Console
-- ====================================

-- Update the auto-creation function to use correct status
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
                            status,  -- Use 'scheduled' instead of 'pending'
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
                            'scheduled',  -- Use valid status value
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
                                status,  -- Use 'scheduled' instead of 'pending'
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
                                'scheduled',  -- Use valid status value
                                NOW(),
                                NOW()
                            FROM public.onboarding_session_templates t,
                                 jsonb_array_elements_text(NEW.enabled_plugins) AS plugin
                            WHERE t.plugin_id = plugin::text
                              AND t.plugin_id != 'centcom' -- Don't duplicate centcom sessions
                              AND t.is_active = true 
                              AND COALESCE(t.auto_create_on_license, false) = true;
                        END IF;
                        
                        RAISE NOTICE 'Auto-created onboarding sessions for user % with license %', NEW.assigned_to, NEW.id;
                        
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

-- Test manual insert with correct status
INSERT INTO public.onboarding_sessions (
    user_id,
    license_key_id,
    plugin_id,
    title,
    description,
    is_mandatory,
    status
) VALUES (
    'f992e7e5-ab7b-4db3-902f-25dff726360c',
    'e0000000-0000-0000-0000-000000000001',
    'centcom',
    'Test Session Fixed',
    'Manual test session with correct status',
    true,
    'scheduled'  -- Use valid status
);

-- Check if it worked
SELECT COUNT(*) as session_count FROM public.onboarding_sessions 
WHERE user_id = 'f992e7e5-ab7b-4db3-902f-25dff726360c';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Trigger function updated to use correct status values!';
  RAISE NOTICE 'Try assigning a trial license again.';
END $$;
