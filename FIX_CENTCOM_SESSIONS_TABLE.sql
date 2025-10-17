-- Fix centcom_sessions table to match what the sync endpoint expects
-- Run this in Supabase SQL Editor

-- First, check if table exists and what columns it has
DO $$
DECLARE
  table_exists BOOLEAN;
  rec RECORD;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'centcom_sessions'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '✅ centcom_sessions table exists';

    -- Show current columns
    RAISE NOTICE 'Current columns:';
    FOR rec IN
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'centcom_sessions'
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '  - % (%)', rec.column_name, rec.data_type;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ centcom_sessions table does NOT exist - will create it';
  END IF;
END $$;

-- Drop the existing table if it has wrong schema
-- CAUTION: This will delete existing data!
-- Comment this out if you want to preserve data
DROP TABLE IF EXISTS centcom_sessions CASCADE;

-- Create the correct centcom_sessions table with ALL required columns
CREATE TABLE centcom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session identifiers
  centcom_session_id TEXT UNIQUE NOT NULL,
  external_session_id TEXT,

  -- Session timing
  created_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ NOT NULL,
  session_status TEXT CHECK (session_status IN ('active', 'idle', 'terminated')),

  -- Location info
  source_ip TEXT,
  country TEXT,
  city TEXT,
  timezone TEXT,

  -- Device info
  user_agent TEXT,
  platform TEXT,
  device_type TEXT,
  browser TEXT,

  -- Application info
  app_name TEXT,
  app_version TEXT,
  build_number TEXT,
  license_type TEXT,

  -- Security info
  mfa_verified BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT 10,

  -- Heartbeat metadata
  heartbeat_type TEXT,
  sync_source TEXT,
  sync_version TEXT,
  last_sync_interval INTEGER,
  heartbeat_frequency TEXT,
  optimization_enabled BOOLEAN DEFAULT FALSE,

  -- Metadata
  sync_timestamp TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_centcom_sessions_user_id ON centcom_sessions(user_id);
CREATE INDEX idx_centcom_sessions_external_session_id ON centcom_sessions(external_session_id);
CREATE INDEX idx_centcom_sessions_centcom_session_id ON centcom_sessions(centcom_session_id);
CREATE INDEX idx_centcom_sessions_session_status ON centcom_sessions(session_status);
CREATE INDEX idx_centcom_sessions_last_activity ON centcom_sessions(last_activity);

-- Add trigger to auto-update updated_at
CREATE TRIGGER update_centcom_sessions_updated_at
  BEFORE UPDATE ON centcom_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ centcom_sessions table created successfully with all required columns!';
  RAISE NOTICE 'Table can now accept session sync data from Centcom';
END $$;
