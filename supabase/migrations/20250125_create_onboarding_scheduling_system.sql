-- ================================================
-- ONBOARDING SCHEDULING SYSTEM
-- ================================================
-- This migration creates a comprehensive onboarding scheduling system where:
-- 1. Admins can set their availability for onboarding sessions
-- 2. Users can book onboarding sessions from available admin slots
-- 3. Trial licenses MUST schedule within 2 weeks or be revoked
-- 4. Paid licenses (except those upgraded from trials) get suggested sessions

-- ================================================
-- 1. ADMIN AVAILABILITY SLOTS
-- ================================================
CREATE TABLE IF NOT EXISTS admin_availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Time slot details
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  -- Slot metadata
  slot_type TEXT DEFAULT 'onboarding' CHECK (slot_type IN ('onboarding', 'support', 'training')),
  max_concurrent_sessions INT DEFAULT 1,
  current_bookings INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,

  -- Recurrence (for repeating availability)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
  recurrence_end_date TIMESTAMPTZ,

  -- Additional info
  notes TEXT,
  location TEXT, -- 'online', 'office', etc.
  meeting_platform TEXT DEFAULT 'zoom', -- 'zoom', 'teams', 'google-meet'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_concurrent_sessions CHECK (max_concurrent_sessions > 0),
  CONSTRAINT valid_current_bookings CHECK (current_bookings >= 0 AND current_bookings <= max_concurrent_sessions)
);

CREATE INDEX idx_admin_availability_admin ON admin_availability_slots(admin_user_id);
CREATE INDEX idx_admin_availability_time_range ON admin_availability_slots(start_time, end_time);
CREATE INDEX idx_admin_availability_is_available ON admin_availability_slots(is_available) WHERE is_available = true;

COMMENT ON TABLE admin_availability_slots IS 'Admin availability slots for onboarding session bookings';

-- ================================================
-- 2. ONBOARDING SESSION BOOKINGS
-- ================================================
CREATE TABLE IF NOT EXISTS onboarding_session_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationship to availability slot
  availability_slot_id UUID REFERENCES admin_availability_slots(id) ON DELETE SET NULL,
  admin_user_id UUID NOT NULL REFERENCES user_profiles(id),

  -- User information
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  license_key_id UUID REFERENCES license_keys(id) ON DELETE SET NULL,

  -- Session details
  scheduled_start_time TIMESTAMPTZ NOT NULL,
  scheduled_end_time TIMESTAMPTZ NOT NULL,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  duration_minutes INT DEFAULT 60,

  -- Session metadata
  session_type TEXT DEFAULT 'initial_onboarding' CHECK (session_type IN
    ('initial_onboarding', 'follow_up', 'technical_support', 'training', 'other')
  ),
  status TEXT DEFAULT 'scheduled' CHECK (status IN
    ('suggested', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')
  ),
  is_mandatory BOOLEAN DEFAULT false,

  -- Meeting details
  meeting_link TEXT,
  meeting_platform TEXT DEFAULT 'zoom',
  meeting_id TEXT,
  meeting_password TEXT,

  -- Content
  title TEXT NOT NULL DEFAULT 'Initial Onboarding Session',
  description TEXT,
  agenda JSONB, -- Array of agenda items
  preparation_notes TEXT,

  -- Communication
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  confirmation_sent BOOLEAN DEFAULT false,
  confirmation_sent_at TIMESTAMPTZ,

  -- Completion tracking
  completion_notes TEXT,
  admin_notes TEXT,
  user_feedback TEXT,
  user_rating INT CHECK (user_rating BETWEEN 1 AND 5),

  -- Cancellation/Rescheduling
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES user_profiles(id),
  cancellation_reason TEXT,
  reschedule_count INT DEFAULT 0,
  previous_booking_id UUID REFERENCES onboarding_session_bookings(id),

  -- Trial license enforcement
  is_trial_required BOOLEAN DEFAULT false, -- Must be completed for trial licenses
  trial_deadline TIMESTAMPTZ, -- If not scheduled by this date, license revoked
  trial_deadline_warning_sent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  booked_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_scheduled_time_range CHECK (scheduled_end_time > scheduled_start_time),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0)
);

CREATE INDEX idx_onboarding_bookings_user ON onboarding_session_bookings(user_id);
CREATE INDEX idx_onboarding_bookings_admin ON onboarding_session_bookings(admin_user_id);
CREATE INDEX idx_onboarding_bookings_license_key ON onboarding_session_bookings(license_key_id);
CREATE INDEX idx_onboarding_bookings_status ON onboarding_session_bookings(status);
CREATE INDEX idx_onboarding_bookings_scheduled_time ON onboarding_session_bookings(scheduled_start_time);
CREATE INDEX idx_onboarding_bookings_trial_deadline ON onboarding_session_bookings(trial_deadline) WHERE is_trial_required = true;

COMMENT ON TABLE onboarding_session_bookings IS 'User-booked onboarding sessions with admin availability';

-- ================================================
-- 3. UPDATE TRIGGERS
-- ================================================

-- Update timestamp trigger for admin_availability_slots
CREATE OR REPLACE FUNCTION update_admin_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_availability_updated_at
  BEFORE UPDATE ON admin_availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_availability_updated_at();

-- Update timestamp trigger for onboarding_session_bookings
CREATE OR REPLACE FUNCTION update_onboarding_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_booking_updated_at
  BEFORE UPDATE ON onboarding_session_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_booking_updated_at();

-- ================================================
-- 4. BOOKING COUNTER MANAGEMENT
-- ================================================

-- Increment booking counter when a new booking is confirmed
CREATE OR REPLACE FUNCTION increment_availability_slot_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.availability_slot_id IS NOT NULL AND NEW.status IN ('scheduled', 'confirmed') THEN
    UPDATE admin_availability_slots
    SET current_bookings = current_bookings + 1
    WHERE id = NEW.availability_slot_id;

    -- Mark slot as unavailable if at capacity
    UPDATE admin_availability_slots
    SET is_available = false
    WHERE id = NEW.availability_slot_id
    AND current_bookings >= max_concurrent_sessions;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_slot_bookings
  AFTER INSERT ON onboarding_session_bookings
  FOR EACH ROW
  WHEN (NEW.availability_slot_id IS NOT NULL AND NEW.status IN ('scheduled', 'confirmed'))
  EXECUTE FUNCTION increment_availability_slot_bookings();

-- Decrement booking counter when a booking is cancelled
CREATE OR REPLACE FUNCTION decrement_availability_slot_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.availability_slot_id IS NOT NULL
     AND OLD.status IN ('scheduled', 'confirmed')
     AND NEW.status IN ('cancelled', 'no_show') THEN

    UPDATE admin_availability_slots
    SET current_bookings = GREATEST(0, current_bookings - 1),
        is_available = true
    WHERE id = OLD.availability_slot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_slot_bookings
  AFTER UPDATE ON onboarding_session_bookings
  FOR EACH ROW
  WHEN (OLD.status IN ('scheduled', 'confirmed') AND NEW.status IN ('cancelled', 'no_show'))
  EXECUTE FUNCTION decrement_availability_slot_bookings();

-- ================================================
-- 5. TRIAL LICENSE ENFORCEMENT FUNCTIONS
-- ================================================

-- Function to check and revoke expired trial licenses without scheduled onboarding
CREATE OR REPLACE FUNCTION revoke_unscheduled_trial_licenses()
RETURNS TABLE(revoked_license_id UUID, user_email TEXT, reason TEXT) AS $$
DECLARE
  license_record RECORD;
  revocation_count INT := 0;
BEGIN
  -- Find trial licenses that have no scheduled onboarding or passed deadline
  FOR license_record IN
    SELECT
      lk.id AS license_key_id,
      lk.user_id,
      lk.license_type,
      lk.status AS license_status,
      lk.key_code,
      up.email AS user_email,
      osb.id AS booking_id,
      osb.status AS booking_status,
      osb.trial_deadline,
      osb.scheduled_start_time
    FROM license_keys lk
    LEFT JOIN user_profiles up ON lk.user_id = up.id
    LEFT JOIN onboarding_session_bookings osb ON osb.license_key_id = lk.id
    WHERE lk.license_type = 'trial'
      AND lk.status = 'active'
      AND (
        -- No booking exists
        osb.id IS NULL
        -- OR booking exists but not scheduled and deadline passed
        OR (osb.status = 'suggested' AND osb.trial_deadline < NOW())
        -- OR booking deadline passed without confirmation
        OR (osb.status IN ('suggested', 'scheduled') AND osb.trial_deadline < NOW() AND osb.confirmation_sent = false)
      )
      -- Only revoke if license created more than 14 days ago
      AND lk.created_at < NOW() - INTERVAL '14 days'
  LOOP
    -- Revoke the license key
    UPDATE license_keys
    SET
      status = 'revoked',
      revoked_at = NOW(),
      revoked_by = '00000000-0000-0000-0000-000000000000',
      revocation_reason = 'Trial onboarding session not scheduled within required timeframe (14 days)'
    WHERE id = license_record.license_key_id;

    -- Cancel any suggested bookings
    IF license_record.booking_id IS NOT NULL THEN
      UPDATE onboarding_session_bookings
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = '00000000-0000-0000-0000-000000000000',
        cancellation_reason = 'Trial license revoked - deadline expired'
      WHERE id = license_record.booking_id;
    END IF;

    revocation_count := revocation_count + 1;

    -- Return revoked license info
    revoked_license_id := license_record.license_key_id;
    user_email := license_record.user_email;
    reason := 'Trial onboarding not scheduled within 14 days';

    RETURN NEXT;
  END LOOP;

  RAISE NOTICE 'Revoked % trial licenses for unscheduled onboarding', revocation_count;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION revoke_unscheduled_trial_licenses IS 'Revokes trial licenses that have not scheduled required onboarding within 14 days';

-- Function to create suggested onboarding session when license is generated
CREATE OR REPLACE FUNCTION create_suggested_onboarding_session()
RETURNS TRIGGER AS $$
DECLARE
  is_trial_upgrade BOOLEAN := false;
  booking_deadline TIMESTAMPTZ;
BEGIN
  -- Check if this is a paid license upgraded from a trial
  IF NEW.license_type != 'trial' AND NEW.license_type != 'gratis' THEN
    -- Check if user had a trial before
    SELECT EXISTS(
      SELECT 1 FROM license_keys
      WHERE user_id = NEW.user_id
        AND license_type = 'trial'
        AND status IN ('expired', 'upgraded')
        AND created_at < NEW.created_at
    ) INTO is_trial_upgrade;
  END IF;

  -- Only create suggested session if:
  -- 1. It's a trial license (mandatory), OR
  -- 2. It's a paid license NOT upgraded from trial
  IF NEW.license_type = 'trial' OR (NEW.license_type NOT IN ('trial', 'gratis') AND NOT is_trial_upgrade) THEN

    -- Set deadline for trials (14 days from now)
    IF NEW.license_type = 'trial' THEN
      booking_deadline := NOW() + INTERVAL '14 days';
    ELSE
      booking_deadline := NOW() + INTERVAL '30 days'; -- Optional for paid licenses
    END IF;

    -- Create suggested onboarding booking
    INSERT INTO onboarding_session_bookings (
      user_id,
      license_key_id,
      admin_user_id,
      scheduled_start_time,
      scheduled_end_time,
      duration_minutes,
      session_type,
      status,
      is_mandatory,
      is_trial_required,
      trial_deadline,
      title,
      description
    )
    SELECT
      NEW.user_id,
      NEW.id,
      -- Select an admin user (preferably one with availability)
      COALESCE(
        (SELECT DISTINCT admin_user_id
         FROM admin_availability_slots
         WHERE is_available = true
           AND start_time > NOW()
         ORDER BY RANDOM()
         LIMIT 1),
        -- Fallback to any superadmin
        (SELECT id FROM user_profiles WHERE role = 'superadmin' LIMIT 1)
      ),
      NOW() + INTERVAL '7 days', -- Suggested 7 days from now
      NOW() + INTERVAL '7 days' + INTERVAL '1 hour',
      60,
      'initial_onboarding',
      'suggested',
      (NEW.license_type = 'trial'), -- Mandatory for trials
      (NEW.license_type = 'trial'), -- Required for trials
      booking_deadline,
      'Initial Onboarding Session - ' ||
        CASE NEW.license_type
          WHEN 'trial' THEN 'Trial License'
          WHEN 'basic' THEN 'Basic License'
          WHEN 'professional' THEN 'Professional License'
          WHEN 'enterprise' THEN 'Enterprise License'
          ELSE 'License'
        END,
      'Welcome to Lyceum! This onboarding session will help you get started with your new ' ||
        NEW.license_type || ' license. We''ll cover setup, key features, and answer any questions you may have.' ||
        CASE WHEN NEW.license_type = 'trial'
          THEN ' ⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
          ELSE ''
        END;

    RAISE NOTICE 'Created suggested onboarding session for license % (type: %)', NEW.id, NEW.license_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create onboarding sessions on license creation
CREATE TRIGGER trigger_create_onboarding_on_license_creation
  AFTER INSERT ON license_keys
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION create_suggested_onboarding_session();

COMMENT ON FUNCTION create_suggested_onboarding_session IS 'Automatically creates a suggested onboarding session when a license is generated';

-- ================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ================================================

ALTER TABLE admin_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_session_bookings ENABLE ROW LEVEL SECURITY;

-- Admin availability policies
CREATE POLICY "Admins can manage their own availability"
  ON admin_availability_slots
  FOR ALL
  USING (
    auth.uid() = admin_user_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  );

CREATE POLICY "Users can view available slots"
  ON admin_availability_slots
  FOR SELECT
  USING (is_available = true AND start_time > NOW());

-- Onboarding booking policies
CREATE POLICY "Users can view their own bookings"
  ON onboarding_session_bookings
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = admin_user_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  );

CREATE POLICY "Users can create bookings for themselves"
  ON onboarding_session_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON onboarding_session_bookings
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() = admin_user_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  );

CREATE POLICY "Admins can manage all bookings"
  ON onboarding_session_bookings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  );

-- ================================================
-- 7. HELPER VIEWS
-- ================================================

-- View for upcoming bookings with user and admin details
CREATE OR REPLACE VIEW v_upcoming_onboarding_sessions AS
SELECT
  osb.id,
  osb.scheduled_start_time,
  osb.scheduled_end_time,
  osb.duration_minutes,
  osb.session_type,
  osb.status,
  osb.is_mandatory,
  osb.is_trial_required,
  osb.trial_deadline,
  osb.title,
  osb.description,
  osb.meeting_link,
  osb.meeting_platform,

  -- User details
  u.id AS user_id,
  u.email AS user_email,
  u.full_name AS user_name,

  -- Admin details
  a.id AS admin_id,
  a.email AS admin_email,
  a.full_name AS admin_name,

  -- License details
  lk.license_type,
  lk.status AS license_status
FROM onboarding_session_bookings osb
JOIN user_profiles u ON osb.user_id = u.id
JOIN user_profiles a ON osb.admin_user_id = a.id
LEFT JOIN license_keys lk ON osb.license_key_id = lk.id
WHERE osb.scheduled_start_time > NOW()
  AND osb.status IN ('suggested', 'scheduled', 'confirmed')
ORDER BY osb.scheduled_start_time ASC;

COMMENT ON VIEW v_upcoming_onboarding_sessions IS 'View of upcoming onboarding sessions with user and admin details';

-- View for available admin slots
CREATE OR REPLACE VIEW v_available_admin_slots AS
SELECT
  aas.id,
  aas.start_time,
  aas.end_time,
  aas.slot_type,
  aas.max_concurrent_sessions,
  aas.current_bookings,
  (aas.max_concurrent_sessions - aas.current_bookings) AS available_spots,
  aas.location,
  aas.meeting_platform,
  aas.notes,

  -- Admin details
  a.id AS admin_id,
  a.email AS admin_email,
  a.full_name AS admin_name
FROM admin_availability_slots aas
JOIN user_profiles a ON aas.admin_user_id = a.id
WHERE aas.is_available = true
  AND aas.start_time > NOW()
  AND aas.current_bookings < aas.max_concurrent_sessions
ORDER BY aas.start_time ASC;

COMMENT ON VIEW v_available_admin_slots IS 'View of available admin slots for booking';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- Add helpful notices
DO $$
BEGIN
  RAISE NOTICE '✅ Onboarding scheduling system created successfully';
  RAISE NOTICE '📅 Tables: admin_availability_slots, onboarding_session_bookings';
  RAISE NOTICE '🔄 Triggers: Auto-create sessions on license generation, booking counter management';
  RAISE NOTICE '⚠️  Trial enforcement: Licenses revoked if not scheduled within 14 days';
  RAISE NOTICE '🔒 RLS policies enabled for both tables';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: SELECT revoke_unscheduled_trial_licenses(); (via cron job)';
  RAISE NOTICE '2. Create admin availability slots';
  RAISE NOTICE '3. Users will see suggested sessions on dashboard';
END $$;
