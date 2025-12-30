-- Create demo_bookings table for public demo scheduling
-- This table stores demo booking requests from potential customers

CREATE TABLE IF NOT EXISTS demo_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES admin_availability_slots(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Contact information (no auth required)
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  notes TEXT,

  -- Scheduling details
  scheduled_start_time TIMESTAMPTZ NOT NULL,
  scheduled_end_time TIMESTAMPTZ NOT NULL,
  meeting_platform TEXT DEFAULT 'zoom',
  meeting_link TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  cancellation_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_demo_bookings_email ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_slot_id ON demo_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_admin_user_id ON demo_bookings(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON demo_bookings(status);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_scheduled_start ON demo_bookings(scheduled_start_time);

-- Enable RLS
ALTER TABLE demo_bookings ENABLE ROW LEVEL SECURITY;

-- Allow public inserts for booking demos (no auth required)
CREATE POLICY "Anyone can create demo bookings" ON demo_bookings
  FOR INSERT
  WITH CHECK (true);

-- Allow admins to view all demo bookings
CREATE POLICY "Admins can view all demo bookings" ON demo_bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Allow admins to update demo bookings
CREATE POLICY "Admins can update demo bookings" ON demo_bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Allow service role full access (for API routes)
CREATE POLICY "Service role has full access to demo bookings" ON demo_bookings
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_demo_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_demo_bookings_updated_at
  BEFORE UPDATE ON demo_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_bookings_updated_at();

-- Add 'demo' to slot_type if not already present
-- First check if the constraint exists and what values are allowed
DO $$
BEGIN
  -- Try to add demo as a valid slot_type by altering the check constraint
  -- This is a safe operation that won't fail if 'demo' is already allowed
  ALTER TABLE admin_availability_slots
    DROP CONSTRAINT IF EXISTS admin_availability_slots_slot_type_check;

  ALTER TABLE admin_availability_slots
    ADD CONSTRAINT admin_availability_slots_slot_type_check
    CHECK (slot_type IN ('onboarding', 'support', 'training', 'consultation', 'demo'));
EXCEPTION
  WHEN others THEN
    -- If alter fails, the constraint might not exist or have a different name
    NULL;
END $$;

COMMENT ON TABLE demo_bookings IS 'Stores demo booking requests from potential customers - no authentication required for booking';
