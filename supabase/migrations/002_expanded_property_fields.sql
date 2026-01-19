-- Add expanded property fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS full_baths INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS half_baths INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lot_acres DECIMAL(10, 4);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS year_renovated INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rooms INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_year INTEGER;

-- Property type and style
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_style TEXT;

-- Features (stored as JSONB arrays)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS interior_features JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS exterior_features JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS appliances JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS flooring JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lot_description JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS garage_type JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS in_law_features JSONB DEFAULT '[]';

-- Utility strings
ALTER TABLE properties ADD COLUMN IF NOT EXISTS heating TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cooling TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS basement TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS roof TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sewer TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS water TEXT;

-- Special features
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_in_law_suite BOOLEAN DEFAULT FALSE;

-- Description fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS directions TEXT;

-- Analysis fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS original_list_price INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_per_sqft INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS days_on_market INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS list_date DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS expiration_date DATE;

-- Tax & Assessment
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 3);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS assessed_value_total INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS assessed_value_land INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS assessed_value_building INTEGER;

-- Additional details
ALTER TABLE properties ADD COLUMN IF NOT EXISTS age_restricted BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT TRUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS short_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ownership_type TEXT;

-- More property details
ALTER TABLE properties ADD COLUMN IF NOT EXISTS fireplaces INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS driveway TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS exterior_finish TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS fuel TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS kitchen_features JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS dining_room TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS block TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lot_number TEXT;
