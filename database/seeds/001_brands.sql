-- ============================================================================
-- Seed: brands
-- ============================================================================
-- Top mobile + electronics brands relevant to the Indian B2B wholesale market.
-- Idempotent via slug (re-running this script is safe).
-- ============================================================================

INSERT INTO brands (name, slug, logo_url, description, website, is_active) VALUES
  ('Apple',     'apple',     NULL, 'iPhone, iPad, Mac, AirPods.',                          'https://www.apple.com',           TRUE),
  ('Samsung',   'samsung',   NULL, 'Galaxy smartphones, tablets, wearables.',              'https://www.samsung.com',         TRUE),
  ('Xiaomi',    'xiaomi',    NULL, 'Mi, Redmi, Poco smartphones and accessories.',         'https://www.mi.com',              TRUE),
  ('Realme',    'realme',    NULL, 'Realme smartphones and AIoT devices.',                 'https://www.realme.com',          TRUE),
  ('Oppo',      'oppo',      NULL, 'Oppo smartphones, Reno and A series.',                 'https://www.oppo.com',            TRUE),
  ('Vivo',      'vivo',      NULL, 'Vivo and iQOO smartphones.',                           'https://www.vivo.com',            TRUE),
  ('OnePlus',   'oneplus',   NULL, 'OnePlus smartphones and Nord series.',                 'https://www.oneplus.in',          TRUE),
  ('Motorola',  'motorola',  NULL, 'Motorola Edge, Moto G, Razr.',                         'https://www.motorola.in',         TRUE),
  ('Nothing',   'nothing',   NULL, 'Nothing Phone and CMF series.',                        'https://nothing.tech',            TRUE),
  ('Google',    'google',    NULL, 'Pixel smartphones and Nest devices.',                  'https://store.google.com',        TRUE),
  ('Poco',      'poco',      NULL, 'Poco smartphones (Xiaomi sub-brand).',                 'https://www.poco.com',            TRUE),
  ('iQOO',      'iqoo',      NULL, 'iQOO performance smartphones (Vivo sub-brand).',       'https://www.iqoo.com',            TRUE),
  ('Honor',     'honor',     NULL, 'Honor smartphones and tablets.',                       'https://www.hihonor.com',         TRUE),
  ('Asus',      'asus',      NULL, 'ROG Phone, Zenfone, laptops.',                         'https://www.asus.com',            TRUE),
  ('Tecno',     'tecno',     NULL, 'Tecno smartphones.',                                   'https://www.tecno-mobile.com',    TRUE),
  ('Infinix',   'infinix',   NULL, 'Infinix smartphones.',                                 'https://www.infinixmobility.com', TRUE),
  ('Lava',      'lava',      NULL, 'Lava smartphones (Made-in-India).',                    'https://www.lavamobiles.com',     TRUE),
  ('Nokia',     'nokia',     NULL, 'Nokia smartphones and feature phones (HMD Global).',   'https://www.nokia.com',           TRUE),
  ('Boat',      'boat',      NULL, 'Boat audio, wearables, and accessories.',              'https://www.boat-lifestyle.com',  TRUE),
  ('JBL',       'jbl',       NULL, 'JBL audio and accessories.',                           'https://in.jbl.com',              TRUE),
  ('Sony',      'sony',      NULL, 'Sony Xperia, audio, cameras.',                         'https://www.sony.co.in',          TRUE)
ON CONFLICT (slug) DO NOTHING;
