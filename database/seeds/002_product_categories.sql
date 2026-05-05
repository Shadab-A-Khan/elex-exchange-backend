-- ============================================================================
-- Seed: product_categories
-- ============================================================================
-- Two-level hierarchy: parents at sort_order multiples of 10, children
-- nested under them. Idempotent via slug.
-- HSN codes are the standard Indian GST classification for the category.
-- ============================================================================

-- Parents
INSERT INTO product_categories (name, slug, description, parent_category_id, category_type, hsn_code, uom, is_active, sort_order) VALUES
  ('Mobiles & Smartphones', 'mobiles-smartphones', 'All mobile handsets and smartphones.',          NULL, 'GOODS', '8517', 'PCS', TRUE, 10),
  ('Tablets',               'tablets',             'Android and iPad tablets.',                     NULL, 'GOODS', '8471', 'PCS', TRUE, 20),
  ('Laptops',               'laptops',             'Notebooks and ultrabooks.',                     NULL, 'GOODS', '8471', 'PCS', TRUE, 30),
  ('Wearables',             'wearables',           'Smart watches, fitness bands, smart rings.',    NULL, 'GOODS', '9102', 'PCS', TRUE, 40),
  ('Audio',                 'audio',               'Earphones, headphones, speakers.',              NULL, 'GOODS', '8518', 'PCS', TRUE, 50),
  ('Accessories',           'accessories',         'Chargers, cables, cases, power banks, etc.',    NULL, 'GOODS', '8504', 'PCS', TRUE, 60),
  ('Storage',               'storage',             'Memory cards, USB drives, SSDs.',               NULL, 'GOODS', '8523', 'PCS', TRUE, 70)
ON CONFLICT (slug) DO NOTHING;

-- Children: Mobiles & Smartphones
INSERT INTO product_categories (name, slug, description, parent_category_id, category_type, hsn_code, uom, is_active, sort_order) VALUES
  ('Smartphones',     'smartphones',     'Touchscreen smartphones.',                                                  (SELECT id FROM product_categories WHERE slug = 'mobiles-smartphones'), 'GOODS', '8517', 'PCS', TRUE, 11),
  ('Feature Phones',  'feature-phones',  'Basic and feature handsets.',                                               (SELECT id FROM product_categories WHERE slug = 'mobiles-smartphones'), 'GOODS', '8517', 'PCS', TRUE, 12),
  ('Foldable Phones', 'foldable-phones', 'Foldable and flip smartphones.',                                            (SELECT id FROM product_categories WHERE slug = 'mobiles-smartphones'), 'GOODS', '8517', 'PCS', TRUE, 13)
ON CONFLICT (slug) DO NOTHING;

-- Children: Wearables
INSERT INTO product_categories (name, slug, description, parent_category_id, category_type, hsn_code, uom, is_active, sort_order) VALUES
  ('Smart Watches',  'smart-watches',  'Smart watches.',                                                              (SELECT id FROM product_categories WHERE slug = 'wearables'), 'GOODS', '9102', 'PCS', TRUE, 41),
  ('Fitness Bands',  'fitness-bands',  'Fitness trackers and bands.',                                                 (SELECT id FROM product_categories WHERE slug = 'wearables'), 'GOODS', '9102', 'PCS', TRUE, 42)
ON CONFLICT (slug) DO NOTHING;

-- Children: Audio
INSERT INTO product_categories (name, slug, description, parent_category_id, category_type, hsn_code, uom, is_active, sort_order) VALUES
  ('Earphones',           'earphones',           'Wired earphones.',                                                  (SELECT id FROM product_categories WHERE slug = 'audio'), 'GOODS', '8518', 'PCS', TRUE, 51),
  ('Wireless Earbuds',    'wireless-earbuds',    'TWS and wireless earbuds.',                                         (SELECT id FROM product_categories WHERE slug = 'audio'), 'GOODS', '8518', 'PCS', TRUE, 52),
  ('Headphones',          'headphones',          'Over-ear and on-ear headphones.',                                   (SELECT id FROM product_categories WHERE slug = 'audio'), 'GOODS', '8518', 'PCS', TRUE, 53),
  ('Bluetooth Speakers',  'bluetooth-speakers',  'Portable Bluetooth speakers.',                                      (SELECT id FROM product_categories WHERE slug = 'audio'), 'GOODS', '8518', 'PCS', TRUE, 54)
ON CONFLICT (slug) DO NOTHING;

-- Children: Accessories
INSERT INTO product_categories (name, slug, description, parent_category_id, category_type, hsn_code, uom, is_active, sort_order) VALUES
  ('Chargers',          'chargers',           'Wall chargers and adapters.',                                          (SELECT id FROM product_categories WHERE slug = 'accessories'), 'GOODS', '8504', 'PCS', TRUE, 61),
  ('Cables',            'cables',             'USB-C, Lightning, micro-USB cables.',                                  (SELECT id FROM product_categories WHERE slug = 'accessories'), 'GOODS', '8544', 'PCS', TRUE, 62),
  ('Power Banks',       'power-banks',        'Portable battery packs.',                                              (SELECT id FROM product_categories WHERE slug = 'accessories'), 'GOODS', '8507', 'PCS', TRUE, 63),
  ('Cases & Covers',    'cases-covers',       'Mobile cases and covers.',                                             (SELECT id FROM product_categories WHERE slug = 'accessories'), 'GOODS', '4202', 'PCS', TRUE, 64),
  ('Screen Protectors', 'screen-protectors',  'Tempered glass and films.',                                            (SELECT id FROM product_categories WHERE slug = 'accessories'), 'GOODS', '7007', 'PCS', TRUE, 65)
ON CONFLICT (slug) DO NOTHING;

-- Children: Storage
INSERT INTO product_categories (name, slug, description, parent_category_id, category_type, hsn_code, uom, is_active, sort_order) VALUES
  ('Memory Cards',  'memory-cards',  'microSD and SD cards.',                                                         (SELECT id FROM product_categories WHERE slug = 'storage'), 'GOODS', '8523', 'PCS', TRUE, 71),
  ('USB Drives',    'usb-drives',    'Pen drives and OTG drives.',                                                    (SELECT id FROM product_categories WHERE slug = 'storage'), 'GOODS', '8523', 'PCS', TRUE, 72),
  ('SSDs',          'ssds',          'Internal and external SSDs.',                                                   (SELECT id FROM product_categories WHERE slug = 'storage'), 'GOODS', '8471', 'PCS', TRUE, 73)
ON CONFLICT (slug) DO NOTHING;
