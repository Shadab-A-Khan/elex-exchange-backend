-- ============================================================================
-- Migration 003: laptop and accessory listing support
-- ============================================================================
-- Changes:
--   1. listings.product_id  → made nullable (laptops/accessories have no
--      catalog product row; product identity comes from product_name + brand_id)
--   2. listings.product_name → new TEXT column for the trader's free-text
--      product name (e.g. "MacBook Air M3 256GB", "Anker 65W USB-C Charger")
--   3. PostGraphile @omit update on product_name — trader cannot edit it after
--      posting, consistent with product_id / variant_id / category_id
--   4. TSV trigger updated — uses product_name as fallback when product_id is
--      NULL so laptop/accessory listings are fully searchable; also fires on
--      product_name changes
--   5. Seven missing laptop brands added to brands table:
--      Dell, HP, Lenovo, Acer, MSI, Razer, Microsoft
--   6. chk_listings_wts_has_price constraint dropped — price is now optional
--      for all listing intents including WTS (price-on-request listings allowed)
--
-- Safe for existing phone listings:
--   • product_id is already populated for all phone rows — no behaviour change
--   • product_name is NULL for all existing rows — no change to display or search
--   • TSV trigger still reads products.name when product_id IS NOT NULL
--   • All existing WTS listings already have a price — no data change
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + ON CONFLICT (slug) DO NOTHING
--             + DROP CONSTRAINT IF EXISTS
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Make product_id nullable
-- ----------------------------------------------------------------------------
ALTER TABLE listings ALTER COLUMN product_id DROP NOT NULL;


-- ----------------------------------------------------------------------------
-- 2. Free-text product name column
-- ----------------------------------------------------------------------------
ALTER TABLE listings ADD COLUMN IF NOT EXISTS product_name TEXT;


-- ----------------------------------------------------------------------------
-- 3. PostGraphile omit comment
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN listings.product_name IS '@omit update';


-- ----------------------------------------------------------------------------
-- 4. Updated TSV trigger
--    Falls back to product_name when product_id is NULL.
--    Trigger column list extended to include product_name.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_listings_tsv()
RETURNS TRIGGER AS $$
DECLARE
  v_brand_name    TEXT;
  v_category_name TEXT;
  v_product_name  TEXT;
BEGIN
  SELECT name INTO v_brand_name    FROM brands             WHERE id = NEW.brand_id;
  SELECT name INTO v_category_name FROM product_categories WHERE id = NEW.category_id;

  IF NEW.product_id IS NOT NULL THEN
    SELECT name INTO v_product_name FROM products WHERE id = NEW.product_id;
  ELSE
    v_product_name := NEW.product_name;
  END IF;

  NEW.tsv :=
    setweight(to_tsvector('simple', COALESCE(v_product_name,  '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(v_brand_name,    '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(v_category_name, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_tsv_update ON listings;
CREATE TRIGGER listings_tsv_update
  BEFORE INSERT OR UPDATE OF product_id, product_name, variant_id, category_id, brand_id, description
  ON listings
  FOR EACH ROW EXECUTE FUNCTION update_listings_tsv();


-- ----------------------------------------------------------------------------
-- 5. Missing laptop brands
--    Apple, Samsung, Asus already present in the original seed.
-- ----------------------------------------------------------------------------
INSERT INTO brands (name, slug, logo_url, description, website, is_active) VALUES
  ('Dell',      'dell',      NULL, 'Dell laptops — XPS, Inspiron, Latitude.',        'https://www.dell.com',      TRUE),
  ('HP',        'hp',        NULL, 'HP laptops — Pavilion, Spectre, EliteBook.',      'https://www.hp.com',        TRUE),
  ('Lenovo',    'lenovo',    NULL, 'Lenovo ThinkPad, IdeaPad, Legion laptops.',       'https://www.lenovo.com',    TRUE),
  ('Acer',      'acer',      NULL, 'Acer Aspire, Swift, Predator laptops.',           'https://www.acer.com',      TRUE),
  ('MSI',       'msi',       NULL, 'MSI gaming laptops and desktops.',                'https://www.msi.com',       TRUE),
  ('Razer',     'razer',     NULL, 'Razer gaming laptops and peripherals.',           'https://www.razer.com',     TRUE),
  ('Microsoft', 'microsoft', NULL, 'Microsoft Surface laptops and tablets.',          'https://www.microsoft.com', TRUE)
ON CONFLICT (slug) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 6. Drop WTS price requirement constraint
--    Price is now optional for all listing intents including WTS.
-- ----------------------------------------------------------------------------
ALTER TABLE listings DROP CONSTRAINT IF EXISTS chk_listings_wts_has_price;
