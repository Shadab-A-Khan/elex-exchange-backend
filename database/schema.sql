-- ============================================================================
-- Elex Exchange India — Consolidated PostgreSQL Schema (v3)
-- ============================================================================
-- Sister product to TradeX. Standalone NeonDB project (separate from TradeX DB).
--
-- Architecture (Option F — full separation, locked 2026-05-05):
--   - Own database (this file)
--   - Own backend service: elex-exchange-backend
--   - Own admin app: elex-exchange-admin
--   - Public portal: elex-exchange-web
--
-- Mental model:
--   - Single trader profile (no buyer/seller split). One trader can post both
--     WTS (want-to-sell) and WTB (want-to-buy) listings. Intent lives on the
--     listing, not the user.
--   - Bulletin board, not a transactional marketplace. Deals close via
--     WhatsApp off-platform.
--   - Single users table holds traders + admins (mirrors TradeX). Role enum
--     differentiates them.
--   - Subscription tiering is manual (admin sets the tier on the profile).
--     No payment automation tables yet.
--   - Catalog mirrors TradeX structure (categories, brands, products, variants)
--     but lives in this DB independently. No cross-DB references.
--
-- Conventions (mirror tradex-backend):
--   - UUID PKs with gen_random_uuid()
--   - TIMESTAMP WITH TIME ZONE; trigger-driven updated_at
--   - Enum types in lower_snake_case; values in UPPER_SNAKE_CASE
--   - app_user role + RLS via current_setting('app.current_user_id')
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT nullif(current_setting('app.current_user_role', true), '');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Random code generator for entity codes (T-XXXXXX, L-XXXXXX, ...)
CREATE OR REPLACE FUNCTION generate_random_code(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := prefix || '-';
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * 30 + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('TRADER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE kyc_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE subscription_tier AS ENUM ('FREE', 'PREMIUM', 'ENTERPRISE');

CREATE TYPE entity_type AS ENUM (
  'PRIVATE_LIMITED',
  'PUBLIC_LIMITED',
  'LLP',
  'PARTNERSHIP_FIRM',
  'PROPRIETORSHIP',
  'HUF'
);
CREATE TYPE business_type AS ENUM (
  'RETAILER', 'DISTRIBUTOR', 'WHOLESALER', 'RESELLER',
  'CORPORATE', 'END_USER', 'E_COMMERCE_SELLER', 'MODERN_TRADE', 'OFFLINE_CHAIN'
);
CREATE TYPE gst_registration_type AS ENUM (
  'REGULAR',
  'COMPOSITION',
  'SEZ_UNIT',
  'SEZ_DEVELOPER',
  'ISD',
  'GOVT_ENTITY'
);
CREATE TYPE address_type AS ENUM ('OFFICE', 'WAREHOUSE', 'BILLING', 'SHIPPING');

CREATE TYPE category_type AS ENUM ('GOODS', 'SERVICES');
CREATE TYPE attribute_data_type AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT');
CREATE TYPE product_status AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'DISCONTINUED');

CREATE TYPE listing_intent AS ENUM ('WTS', 'WTB');
CREATE TYPE listing_stock_type AS ENUM ('MASTER_CARTON', 'LOOSE_ACTIVATED', 'LOOSE_NON_ACTIVATED');
CREATE TYPE listing_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED');
CREATE TYPE listing_condition AS ENUM ('SEALED', 'NEW', 'OPEN_BOX', 'REFURBISHED');
CREATE TYPE spec_region AS ENUM ('INDIA', 'GLOBAL');

-- ============================================================================
-- TABLE: users
-- Single table for traders AND admins. Role enum differentiates them.
-- Mirrors tradex-backend.users shape so auth code reuses cleanly.
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role NOT NULL DEFAULT 'TRADER',
  status user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE,
  is_mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_users_email_format
    CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================================
-- TABLE: otp_verifications
-- Mirrors tradex-backend otp_verifications shape exactly so OTP service reuses.
-- ============================================================================

CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  identifier VARCHAR(255) NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP', 'EMAIL', 'SMS')),
  otp_code VARCHAR(6) NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('LOGIN', 'REGISTRATION', 'PASSWORD_RESET')),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE otp_verifications IS '@omit';

CREATE INDEX idx_otp_lookup ON otp_verifications(identifier, channel, purpose)
  WHERE is_active = TRUE AND verified_at IS NULL;
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_otp_rate_limit ON otp_verifications(identifier, created_at DESC);
CREATE INDEX idx_otp_user ON otp_verifications(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- TABLE: trader_profiles
-- One profile per trader user (1:1, role = 'TRADER').
-- Holds KYC, company, ratings (merged from removed reviews table), and
-- manual subscription tier (admin sets these, no payment automation).
-- GST + addresses + bank accounts live in separate tables.
-- ============================================================================

CREATE TABLE trader_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  trader_code VARCHAR(20) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  company_registration_number VARCHAR(100),
  business_type business_type,
  entity_type entity_type,
  annual_revenue DECIMAL(15, 2),
  pan_number CHAR(10),
  pan_verified_at TIMESTAMP WITH TIME ZONE,
  kyc_status kyc_status NOT NULL DEFAULT 'PENDING',
  kyc_verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  whatsapp_number VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(100),
  -- Manual subscription tier (admin-managed; no payment automation yet)
  subscription_tier subscription_tier NOT NULL DEFAULT 'FREE',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  subscription_notes TEXT,
  -- Ratings (merged from former reviews table; aggregate only)
  rating_count INT NOT NULL DEFAULT 0,
  rating_sum INT NOT NULL DEFAULT 0,
  last_rated_at TIMESTAMP WITH TIME ZONE,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_trader_profiles_pan_number_format
    CHECK (pan_number IS NULL OR pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  CONSTRAINT chk_trader_profiles_rating_sum_positive
    CHECK (rating_sum >= 0 AND rating_count >= 0),
  CONSTRAINT uq_trader_profiles_pan_number UNIQUE (pan_number)
);

CREATE INDEX idx_trader_profiles_user_id           ON trader_profiles(user_id);
CREATE INDEX idx_trader_profiles_kyc_status        ON trader_profiles(kyc_status);
CREATE INDEX idx_trader_profiles_entity_type       ON trader_profiles(entity_type);
CREATE INDEX idx_trader_profiles_business_type     ON trader_profiles(business_type);
CREATE INDEX idx_trader_profiles_pan_number        ON trader_profiles(pan_number);
CREATE INDEX idx_trader_profiles_state_city        ON trader_profiles(state, city);
CREATE INDEX idx_trader_profiles_subscription_tier ON trader_profiles(subscription_tier);
CREATE INDEX idx_trader_profiles_preferences       ON trader_profiles USING GIN (preferences);

-- Computed field: rating_avg — auto-exposed by PostGraphile on the
-- TraderProfile GraphQL type as ratingAvg.
CREATE OR REPLACE FUNCTION trader_profiles_rating_avg(t trader_profiles)
RETURNS DECIMAL(3, 2) AS $$
  SELECT CASE
    WHEN t.rating_count = 0 THEN 0::DECIMAL(3, 2)
    ELSE ROUND(t.rating_sum::DECIMAL / t.rating_count, 2)
  END;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- TABLE: company_gstins
-- One trader can have multiple GSTINs (multi-state). MVP enforces one in app.
-- ============================================================================

CREATE TABLE company_gstins (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_profile_id             UUID NOT NULL REFERENCES trader_profiles(id) ON DELETE CASCADE,
  gstin                         CHAR(15) UNIQUE,
  is_primary                    BOOLEAN DEFAULT FALSE,
  gst_registration_type         gst_registration_type,
  state_code                    CHAR(2),
  state_name                    VARCHAR(100),
  registered_address_line_1     VARCHAR(255),
  registered_area_locality      VARCHAR(255),
  registered_city               VARCHAR(100),
  registered_pincode            CHAR(6),
  verified_at                   TIMESTAMP WITH TIME ZONE,
  created_at                    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_company_gstins_gstin_format
    CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
  CONSTRAINT chk_company_gstins_registered_pincode_format
    CHECK (registered_pincode IS NULL OR registered_pincode ~ '^[0-9]{6}$')
);

CREATE INDEX idx_company_gstins_trader      ON company_gstins(trader_profile_id);
CREATE INDEX idx_company_gstins_gstin       ON company_gstins(gstin);
CREATE INDEX idx_company_gstins_state_code  ON company_gstins(state_code);
CREATE UNIQUE INDEX uq_company_gstins_primary_trader
  ON company_gstins(trader_profile_id) WHERE is_primary = TRUE;

-- ============================================================================
-- TABLE: company_addresses
-- Optional additional addresses (warehouse, branch office, etc.).
-- ============================================================================

CREATE TABLE company_addresses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_profile_id    UUID NOT NULL REFERENCES trader_profiles(id) ON DELETE CASCADE,
  address_type         address_type NOT NULL,
  nickname             VARCHAR(100),
  location_name        VARCHAR(255),
  address_line_1       VARCHAR(255),
  area_locality        VARCHAR(255),
  city                 VARCHAR(100),
  state                VARCHAR(100),
  state_code           CHAR(2),
  pincode              CHAR(6),
  contact_person_name  VARCHAR(100),
  contact_person_phone VARCHAR(20),
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_company_addresses_pincode_format
    CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$')
);

CREATE INDEX idx_company_addresses_trader      ON company_addresses(trader_profile_id, address_type);
CREATE INDEX idx_company_addresses_state_code  ON company_addresses(state_code);
CREATE INDEX idx_company_addresses_is_active   ON company_addresses(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- TABLE: product_categories
-- Hierarchical catalog. Mirrors tradex-backend.product_categories.
-- Admin-curated only.
-- ============================================================================

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url VARCHAR(500),
  parent_category_id UUID REFERENCES product_categories(id),
  brand_id UUID, -- FK added after brands table creation
  category_type category_type,
  hsn_code VARCHAR(20),
  uom VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_categories_parent ON product_categories(parent_category_id);
CREATE INDEX idx_product_categories_slug   ON product_categories(slug);
CREATE INDEX idx_product_categories_active ON product_categories(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- TABLE: brands
-- Admin-curated. Mirrors tradex-backend.brands.
-- ============================================================================

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  logo_url VARCHAR(500),
  description TEXT,
  website VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_brands_slug      ON brands(slug);
CREATE INDEX idx_brands_is_active ON brands(is_active) WHERE is_active = TRUE;

-- Add deferred FK for product_categories.brand_id
ALTER TABLE product_categories
  ADD CONSTRAINT fk_product_categories_brand_id
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;

CREATE INDEX idx_product_categories_brand_id ON product_categories(brand_id);

-- ============================================================================
-- TABLE: category_attributes
-- Per-category attribute definitions. Mirrors tradex-backend.category_attributes.
-- ============================================================================

CREATE TABLE category_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  data_type attribute_data_type NOT NULL DEFAULT 'TEXT',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_filterable BOOLEAN NOT NULL DEFAULT FALSE,
  is_variant BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

CREATE INDEX idx_category_attributes_category_id   ON category_attributes(category_id);
CREATE INDEX idx_category_attributes_is_filterable ON category_attributes(is_filterable) WHERE is_filterable = TRUE;

-- ============================================================================
-- TABLE: products
-- Master product records. Mirrors tradex-backend.products.
-- ============================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES product_categories(id),
  brand_id UUID REFERENCES brands(id),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  long_description TEXT,
  status product_status NOT NULL DEFAULT 'DRAFT',
  base_price DECIMAL(12, 2) NOT NULL,
  unit_of_measure VARCHAR(50),
  warranty_months INT DEFAULT 0,
  hsn_code VARCHAR(20),
  image_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_products_base_price_positive CHECK (base_price > 0)
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id    ON products(brand_id);
CREATE INDEX idx_products_status      ON products(status);
CREATE INDEX idx_products_sku         ON products(sku);
CREATE UNIQUE INDEX idx_products_slug ON products(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_products_hsn_code    ON products(hsn_code);

-- ============================================================================
-- TABLE: product_attribute_values
-- Mirrors tradex-backend.product_attribute_values.
-- ============================================================================

CREATE TABLE product_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES category_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, attribute_id)
);

CREATE INDEX idx_product_attribute_values_product   ON product_attribute_values(product_id);
CREATE INDEX idx_product_attribute_values_attribute ON product_attribute_values(attribute_id);

-- ============================================================================
-- TABLE: product_variants
-- Mirrors tradex-backend.product_variants. variant_attributes JSONB stores
-- variant axes (e.g., {"color": "red", "storage": "256GB"}).
-- ============================================================================

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  variant_attributes JSONB NOT NULL DEFAULT '{}',
  price_offset DECIMAL(12, 2) DEFAULT 0,
  image_urls TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku        ON product_variants(sku);
CREATE INDEX idx_product_variants_is_active  ON product_variants(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_product_variants_attributes ON product_variants USING GIN (variant_attributes);

-- ============================================================================
-- TABLE: listings
-- The core entity. WTS or WTB. Trader-owned. Expires after 30 days by default.
-- stock_type uses Elex packaging convention (MASTER_CARTON / LOOSE_*).
-- ============================================================================

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_code VARCHAR(20) NOT NULL UNIQUE,
  trader_profile_id UUID NOT NULL REFERENCES trader_profiles(id) ON DELETE CASCADE,
  intent listing_intent NOT NULL,
  -- Free-text product name entered by the trader (e.g. "Apple iPhone 17 256GB")
  product_name TEXT NOT NULL,
  -- Normalized catalog refs — optional; populated when product exists in catalog
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  category_id UUID REFERENCES product_categories(id),
  brand_id UUID REFERENCES brands(id),
  condition listing_condition,
  spec_region spec_region,
  stock_type listing_stock_type NOT NULL DEFAULT 'MASTER_CARTON',
  quantity INT NOT NULL,
  moq_units INT,
  price_per_unit DECIMAL(12, 2),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  city VARCHAR(100),
  state VARCHAR(100),
  pincode CHAR(6),
  description TEXT,
  image_urls TEXT[],
  status listing_status NOT NULL DEFAULT 'ACTIVE',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_until TIMESTAMP WITH TIME ZONE,
  view_count INT NOT NULL DEFAULT 0,
  whatsapp_click_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  tsv TSVECTOR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_listings_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_listings_moq_positive CHECK (moq_units IS NULL OR moq_units > 0),
  CONSTRAINT chk_listings_price_positive CHECK (price_per_unit IS NULL OR price_per_unit > 0),
  CONSTRAINT chk_listings_pincode_format CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$'),
  CONSTRAINT chk_listings_wts_has_price CHECK (intent = 'WTB' OR price_per_unit IS NOT NULL)
);

CREATE INDEX idx_listings_trader        ON listings(trader_profile_id);
CREATE INDEX idx_listings_feed          ON listings(intent, status, expires_at);
CREATE INDEX idx_listings_category      ON listings(category_id, brand_id);
CREATE INDEX idx_listings_product       ON listings(product_id);
CREATE INDEX idx_listings_variant       ON listings(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_listings_geo           ON listings(state, city);
CREATE INDEX idx_listings_status        ON listings(status);
CREATE INDEX idx_listings_stock_type    ON listings(stock_type);
CREATE INDEX idx_listings_featured      ON listings(is_featured, featured_until)
  WHERE is_featured = TRUE;
CREATE INDEX idx_listings_expires       ON listings(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_listings_tsv           ON listings USING GIN (tsv);

-- ============================================================================
-- TABLE: whatsapp_leads
-- Logs every wa.me click on a listing. Anonymous OR authenticated.
-- ============================================================================

CREATE TABLE whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  viewer_ip INET,
  viewer_user_agent TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_leads_listing ON whatsapp_leads(listing_id, clicked_at DESC);
CREATE INDEX idx_whatsapp_leads_viewer  ON whatsapp_leads(viewer_user_id, clicked_at DESC)
  WHERE viewer_user_id IS NOT NULL;

-- ============================================================================
-- TABLE: saved_listings
-- User bookmarks.
-- ============================================================================

CREATE TABLE saved_listings (
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX idx_saved_listings_user ON saved_listings(user_id, created_at DESC);

-- ============================================================================
-- TABLE: audit_logs
-- Admin and system actions. Used for moderation history and compliance.
-- Mirrors tradex-backend.audit_logs (plural).
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(100) NOT NULL,
  target_id UUID NOT NULL,
  payload JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_target ON audit_logs(target_table, target_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor  ON audit_logs(actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- ============================================================================
-- TRIGGERS: updated_at auto-touch on every table that has the column
-- ============================================================================

CREATE TRIGGER users_updated_at                  BEFORE UPDATE ON users                  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trader_profiles_updated_at        BEFORE UPDATE ON trader_profiles        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER company_gstins_updated_at         BEFORE UPDATE ON company_gstins         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER company_addresses_updated_at      BEFORE UPDATE ON company_addresses      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER product_categories_updated_at     BEFORE UPDATE ON product_categories     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER brands_updated_at                 BEFORE UPDATE ON brands                 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER category_attributes_updated_at    BEFORE UPDATE ON category_attributes    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER products_updated_at               BEFORE UPDATE ON products               FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER product_variants_updated_at       BEFORE UPDATE ON product_variants       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER listings_updated_at               BEFORE UPDATE ON listings               FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGERS: trader_code auto-generation (T-XXXXXX)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_trader_code()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.trader_code IS NULL OR NEW.trader_code = '' THEN
    LOOP
      NEW.trader_code := generate_random_code('T');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM trader_profiles WHERE trader_code = NEW.trader_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trader_profiles_generate_code
  BEFORE INSERT ON trader_profiles
  FOR EACH ROW EXECUTE FUNCTION generate_trader_code();

-- ============================================================================
-- TRIGGERS: listing_code auto-generation (L-XXXXXX)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_listing_code()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.listing_code IS NULL OR NEW.listing_code = '' THEN
    LOOP
      NEW.listing_code := generate_random_code('L');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM listings WHERE listing_code = NEW.listing_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_generate_code
  BEFORE INSERT ON listings
  FOR EACH ROW EXECUTE FUNCTION generate_listing_code();

-- ============================================================================
-- TRIGGERS: listings.tsv full-text search vector maintenance
-- Sources: brand name, category name, product name, listing description
-- ============================================================================

CREATE OR REPLACE FUNCTION update_listings_tsv()
RETURNS TRIGGER AS $$
DECLARE
  v_brand_name TEXT;
  v_category_name TEXT;
  v_product_name TEXT;
BEGIN
  SELECT name INTO v_brand_name FROM brands WHERE id = NEW.brand_id;
  SELECT name INTO v_category_name FROM product_categories WHERE id = NEW.category_id;
  SELECT name INTO v_product_name FROM products WHERE id = NEW.product_id;

  NEW.tsv :=
    setweight(to_tsvector('simple', COALESCE(v_product_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(v_brand_name, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(v_category_name, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_tsv_update
  BEFORE INSERT OR UPDATE OF product_id, variant_id, category_id, brand_id, description
  ON listings
  FOR EACH ROW EXECUTE FUNCTION update_listings_tsv();

-- ============================================================================
-- ROW-LEVEL SECURITY: Enable + Force on every table
-- ============================================================================

ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  FORCE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications      FORCE ROW LEVEL SECURITY;
ALTER TABLE trader_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trader_profiles        FORCE ROW LEVEL SECURITY;
ALTER TABLE company_gstins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_gstins         FORCE ROW LEVEL SECURITY;
ALTER TABLE company_addresses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_addresses      FORCE ROW LEVEL SECURITY;
ALTER TABLE product_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories     FORCE ROW LEVEL SECURITY;
ALTER TABLE brands                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands                 FORCE ROW LEVEL SECURITY;
ALTER TABLE category_attributes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_attributes    FORCE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               FORCE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_values FORCE ROW LEVEL SECURITY;
ALTER TABLE product_variants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants       FORCE ROW LEVEL SECURITY;
ALTER TABLE listings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings               FORCE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_leads         FORCE ROW LEVEL SECURITY;
ALTER TABLE saved_listings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings         FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: users (own record + admins)
-- ============================================================================

CREATE POLICY users_select_policy ON users
  FOR SELECT USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR id = current_user_id()
  );
CREATE POLICY users_insert_policy ON users
  FOR INSERT WITH CHECK (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR current_user_id() IS NULL
  );
CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN') OR id = current_user_id())
  WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ADMIN') OR id = current_user_id());
CREATE POLICY users_delete_policy ON users
  FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================================
-- RLS POLICIES: otp_verifications (own / system)
-- ============================================================================

CREATE POLICY otp_verifications_select_policy ON otp_verifications
  FOR SELECT USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR user_id = current_user_id()
  );
CREATE POLICY otp_verifications_insert_policy ON otp_verifications
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY otp_verifications_update_policy ON otp_verifications
  FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- ============================================================================
-- RLS POLICIES: trader_profiles (public profiles, traders write own)
-- ============================================================================

CREATE POLICY trader_profiles_select_policy ON trader_profiles
  FOR SELECT USING (TRUE);
CREATE POLICY trader_profiles_insert_policy ON trader_profiles
  FOR INSERT WITH CHECK (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN') OR user_id = current_user_id()
  );
CREATE POLICY trader_profiles_update_policy ON trader_profiles
  FOR UPDATE
  USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN') OR user_id = current_user_id())
  WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ADMIN') OR user_id = current_user_id());
CREATE POLICY trader_profiles_delete_policy ON trader_profiles
  FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================================
-- RLS POLICIES: company_gstins / company_addresses
-- ============================================================================

CREATE POLICY company_gstins_select_policy ON company_gstins
  FOR SELECT USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  );
CREATE POLICY company_gstins_write_policy ON company_gstins FOR ALL
  USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  )
  WITH CHECK (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  );

CREATE POLICY company_addresses_select_policy ON company_addresses
  FOR SELECT USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  );
CREATE POLICY company_addresses_write_policy ON company_addresses FOR ALL
  USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  )
  WITH CHECK (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  );

-- ============================================================================
-- RLS POLICIES: catalog (public read, admin write)
-- ============================================================================

CREATE POLICY product_categories_select_policy ON product_categories FOR SELECT USING (TRUE);
CREATE POLICY product_categories_write_policy  ON product_categories FOR ALL
  USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY brands_select_policy ON brands FOR SELECT USING (TRUE);
CREATE POLICY brands_write_policy  ON brands FOR ALL
  USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY category_attributes_select_policy ON category_attributes FOR SELECT USING (TRUE);
CREATE POLICY category_attributes_write_policy  ON category_attributes FOR ALL
  USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY products_select_policy ON products
  FOR SELECT USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN') OR status = 'ACTIVE'
  );
CREATE POLICY products_write_policy ON products FOR ALL
  USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY product_attribute_values_select_policy ON product_attribute_values FOR SELECT USING (TRUE);
CREATE POLICY product_attribute_values_write_policy  ON product_attribute_values FOR ALL
  USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY product_variants_select_policy ON product_variants FOR SELECT USING (TRUE);
CREATE POLICY product_variants_write_policy  ON product_variants FOR ALL
  USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- ============================================================================
-- RLS POLICIES: listings
-- ACTIVE listings publicly readable. Traders write only their own.
-- ============================================================================

CREATE POLICY listings_select_policy ON listings
  FOR SELECT USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR status = 'ACTIVE'
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  );
CREATE POLICY listings_insert_policy ON listings
  FOR INSERT WITH CHECK (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  );
CREATE POLICY listings_update_policy ON listings
  FOR UPDATE
  USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  )
  WITH CHECK (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  );
CREATE POLICY listings_delete_policy ON listings
  FOR DELETE USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
  );

-- ============================================================================
-- RLS POLICIES: whatsapp_leads (insert anyone, read trader-of-listing + admin)
-- ============================================================================

CREATE POLICY whatsapp_leads_select_policy ON whatsapp_leads
  FOR SELECT USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR listing_id IN (
      SELECT id FROM listings
      WHERE trader_profile_id IN (SELECT id FROM trader_profiles WHERE user_id = current_user_id())
    )
  );
CREATE POLICY whatsapp_leads_insert_policy ON whatsapp_leads
  FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- RLS POLICIES: saved_listings (own only)
-- ============================================================================

CREATE POLICY saved_listings_policy ON saved_listings FOR ALL
  USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN') OR user_id = current_user_id())
  WITH CHECK (current_user_role() IN ('SUPER_ADMIN', 'ADMIN') OR user_id = current_user_id());

-- ============================================================================
-- RLS POLICIES: audit_logs (admin-only read; insert from anywhere)
-- ============================================================================

CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT USING (current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY audit_logs_update_policy ON audit_logs
  FOR UPDATE USING (current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (current_user_role() = 'SUPER_ADMIN');
CREATE POLICY audit_logs_delete_policy ON audit_logs
  FOR DELETE USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================================
-- TABLE COMMENTS (PostGraphile surfaces these as GraphQL descriptions)
-- ============================================================================

COMMENT ON TABLE users IS 'All Elex Exchange accounts (traders + admins). Role enum differentiates them.';
COMMENT ON TABLE trader_profiles IS 'Trader business profile — KYC, company, PAN, ratings, manual subscription tier.';
COMMENT ON TABLE company_gstins IS 'GSTINs per trader. Multiple allowed (multi-state); MVP enforces one in app layer.';
COMMENT ON TABLE company_addresses IS 'Optional additional company addresses (warehouses, branches, billing).';
COMMENT ON TABLE product_categories IS 'Hierarchical product taxonomy (admin-curated).';
COMMENT ON TABLE brands IS 'Brand master (admin-curated).';
COMMENT ON TABLE category_attributes IS 'Attribute definitions per category (admin-curated).';
COMMENT ON TABLE products IS 'Master product records (admin-curated).';
COMMENT ON TABLE product_variants IS 'Per-product variants (RAM/storage/colour combos).';
COMMENT ON TABLE listings IS 'Trader-posted WTS or WTB listings — the core marketplace entity.';
COMMENT ON TABLE whatsapp_leads IS 'Click logs for wa.me deep links on listings.';
COMMENT ON TABLE saved_listings IS 'User bookmarks of listings.';
COMMENT ON TABLE audit_logs IS 'Admin and system actions — moderation history and compliance.';

-- ============================================================================
-- PERMISSIONS FOR POSTGRAPHILE / APP USER
-- ============================================================================

DO $$
BEGIN
  CREATE ROLE app_user LOGIN PASSWORD 'app_password_change_me';
EXCEPTION WHEN DUPLICATE_OBJECT THEN
  NULL;
END
$$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- For NeonDB hosting, also grant to the project owner role so PostGraphile
-- can manage the schema:
DO $$
BEGIN
  EXECUTE 'GRANT app_user TO neondb_owner';
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;

-- ============================================================================
-- END OF CONSOLIDATED SCHEMA — Elex Exchange India v3
-- ============================================================================
