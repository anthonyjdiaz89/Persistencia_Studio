-- Persistencia Studio - Supabase Database Schema
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CHARACTERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at DESC);

-- Row Level Security (RLS) - Optional but recommended
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own characters
DROP POLICY IF EXISTS "Users can access own characters" ON characters;
CREATE POLICY "Users can access own characters"
  ON characters
  FOR ALL
  USING (user_id = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));

-- Public access policy (since we're using anonymous keys without auth)
DROP POLICY IF EXISTS "Public access to characters" ON characters;
CREATE POLICY "Public access to characters"
  ON characters
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PROPS (OBJECTS) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS props (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_props_user_id ON props(user_id);
CREATE INDEX IF NOT EXISTS idx_props_created_at ON props(created_at DESC);

ALTER TABLE props ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to props" ON props;
CREATE POLICY "Public access to props"
  ON props
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- LOCATIONS (SCENARIOS) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_user_id ON locations(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at DESC);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to locations" ON locations;
CREATE POLICY "Public access to locations"
  ON locations
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- REFERENCE FRAMES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reference_frames (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_frames_user_id ON reference_frames(user_id);
CREATE INDEX IF NOT EXISTS idx_reference_frames_created_at ON reference_frames(created_at DESC);

ALTER TABLE reference_frames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to reference_frames" ON reference_frames;
CREATE POLICY "Public access to reference_frames"
  ON reference_frames
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- OPTIONAL: UPDATED_AT TRIGGER
-- Automatically update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_props_updated_at BEFORE UPDATE ON props
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reference_frames_updated_at BEFORE UPDATE ON reference_frames
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify your tables were created successfully:

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('characters', 'props', 'locations', 'reference_frames');

-- SELECT * FROM characters LIMIT 5;
-- SELECT * FROM props LIMIT 5;
-- SELECT * FROM locations LIMIT 5;
-- SELECT * FROM reference_frames LIMIT 5;
