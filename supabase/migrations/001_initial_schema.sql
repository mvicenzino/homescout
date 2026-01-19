-- HomeScout Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- HOUSEHOLDS
-- ============================================
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROPERTIES
-- ============================================
CREATE TYPE property_status AS ENUM (
  'interested',
  'toured',
  'offer_made',
  'under_contract',
  'rejected',
  'purchased'
);

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  price INTEGER NOT NULL,
  beds INTEGER NOT NULL DEFAULT 0,
  baths NUMERIC(3,1) NOT NULL DEFAULT 0,
  sqft INTEGER NOT NULL DEFAULT 0,
  lot_size INTEGER,
  year_built INTEGER,
  garage INTEGER DEFAULT 0,
  stories INTEGER DEFAULT 1,
  hoa_monthly INTEGER DEFAULT 0,
  property_tax_annual INTEGER,
  insurance_annual INTEGER,
  status property_status DEFAULT 'interested',
  source_url TEXT,
  mls_number TEXT,
  listing_date DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast household lookups
CREATE INDEX idx_properties_household ON properties(household_id);

-- ============================================
-- PROPERTY PHOTOS
-- ============================================
CREATE TABLE property_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_property_photos_property ON property_photos(property_id);

-- ============================================
-- PROPERTY RATINGS
-- ============================================
CREATE TABLE property_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, user_id)
);

CREATE INDEX idx_property_ratings_property ON property_ratings(property_id);

-- ============================================
-- PROPERTY NOTES
-- ============================================
CREATE TYPE note_type AS ENUM ('pro', 'con', 'general');

CREATE TABLE property_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type note_type DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_property_notes_property ON property_notes(property_id);

-- ============================================
-- PROPERTY TAGS
-- ============================================
CREATE TABLE property_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, tag)
);

CREATE INDEX idx_property_tags_property ON property_tags(property_id);

-- ============================================
-- TOURS
-- ============================================
CREATE TABLE tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  post_tour_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tours_property ON tours(property_id);

-- ============================================
-- FINANCIAL SCENARIOS
-- ============================================
CREATE TABLE financial_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  down_payment_amount INTEGER NOT NULL,
  down_payment_percent NUMERIC(5,2) NOT NULL,
  interest_rate NUMERIC(5,3) NOT NULL,
  loan_term_years INTEGER NOT NULL DEFAULT 30,
  include_pmi BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_scenarios_property ON financial_scenarios(property_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_scenarios ENABLE ROW LEVEL SECURITY;

-- Households: Users can only see their own household
CREATE POLICY "Users can view own household" ON households
  FOR SELECT USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own household" ON households
  FOR UPDATE USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- Users: Can view members of same household
CREATE POLICY "Users can view household members" ON users
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Properties: Household members can CRUD
CREATE POLICY "Household can view properties" ON properties
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Household can insert properties" ON properties
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Household can update properties" ON properties
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Household can delete properties" ON properties
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- Property Photos: Based on property access
CREATE POLICY "Access property photos via property" ON property_photos
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties WHERE household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Property Ratings: Based on property access
CREATE POLICY "Access property ratings via property" ON property_ratings
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties WHERE household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Property Notes: Based on property access
CREATE POLICY "Access property notes via property" ON property_notes
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties WHERE household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Property Tags: Based on property access
CREATE POLICY "Access property tags via property" ON property_tags
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties WHERE household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Tours: Based on property access
CREATE POLICY "Access tours via property" ON tours
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties WHERE household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Financial Scenarios: Based on property access
CREATE POLICY "Access scenarios via property" ON financial_scenarios
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties WHERE household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER property_ratings_updated_at
  BEFORE UPDATE ON property_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER financial_scenarios_updated_at
  BEFORE UPDATE ON financial_scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run this separately in Supabase Dashboard > Storage

-- Create bucket for property photos:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('property-photos', 'property-photos', true);

-- Storage policy for property photos:
-- CREATE POLICY "Users can upload property photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'property-photos' AND auth.role() = 'authenticated');

-- CREATE POLICY "Anyone can view property photos"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'property-photos');
