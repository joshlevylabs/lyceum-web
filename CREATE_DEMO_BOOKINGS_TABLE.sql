-- ================================================
-- QUICK SETUP: Demo Bookings Table
-- Run this in your Supabase SQL Editor
-- ================================================

-- Create demo_bookings table for public demo scheduling
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_demo_bookings_email ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_slot_id ON demo_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON demo_bookings(status);

-- Enable RLS
ALTER TABLE demo_bookings ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (no auth required for booking)
CREATE POLICY "Anyone can create demo bookings" ON demo_bookings
  FOR INSERT WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Service role has full access to demo bookings" ON demo_bookings
  FOR ALL USING (true);

-- Update trigger
CREATE OR REPLACE FUNCTION update_demo_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_demo_bookings_updated_at ON demo_bookings;
CREATE TRIGGER trigger_demo_bookings_updated_at
  BEFORE UPDATE ON demo_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_bookings_updated_at();

-- Add 'demo' to slot_type check constraint
DO $$
BEGIN
  ALTER TABLE admin_availability_slots
    DROP CONSTRAINT IF EXISTS admin_availability_slots_slot_type_check;
  ALTER TABLE admin_availability_slots
    ADD CONSTRAINT admin_availability_slots_slot_type_check
    CHECK (slot_type IN ('onboarding', 'support', 'training', 'consultation', 'demo'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Done!
SELECT 'Demo bookings table created successfully!' AS status;
