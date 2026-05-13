/**
 * Seed: 15 Apple iPhone variants (iPhone 12–16, India/Global models)
 * Run:  node scripts/seed-apple-iphones.js
 * Undo: node scripts/seed-apple-iphones.js --undo
 */

require('dotenv').config();
const { Client } = require('pg');

const DB = process.env.ELEX_CONNECTION_STRING;
const UNDO = process.argv.includes('--undo');

// ─── Data ───────────────────────────────────────────────────────────────────

const BRAND = {
  name: 'Apple', slug: 'apple',
  description: 'iPhone, iPad, Mac, AirPods.',
  website: 'https://www.apple.com',
};

const CATEGORY = {
  name: 'iPhone', slug: 'iphone',
  hsn_code: '85171300', uom: 'PCS',
  category_type: 'GOODS',
  description: 'Apple iPhone smartphones.',
};

// 5 products × 3 variants = 15 entries
const PRODUCTS = [
  {
    sku: 'APP-IPH-iphone12',
    name: 'Apple iPhone 12',
    slug: 'apple-iphone-12',
    description: 'Apple iPhone 12, A2403, available in 64GB/128GB/256GB.',
    long_description: 'Apple iPhone 12. Version A2403 (India/Global). Display: Super Retina XDR 1170x2532. Chip: Apple A14 Bionic. Battery: 2815 mAh, MagSafe 20W. Available in Black, White, Red, Green, Blue, Purple.',
    base_price: 950,
    hsn_code: '85171300', uom: 'PCS', warranty_months: 12,
    variants: [
      { sku: 'ap-iph-64-26sgo9',  name: 'Apple iPhone 12 64 GB',  price_offset: 0,   attributes: { storage: '64 GB',  model: 'A2403', colors: ['Black','White','Red','Green','Blue','Purple'] } },
      { sku: 'ap-iph-128-sy92t7', name: 'Apple iPhone 12 128 GB', price_offset: 59,  attributes: { storage: '128 GB', model: 'A2403', colors: ['Black','White','Red','Green','Blue','Purple'] } },
      { sku: 'ap-iph-256-4blssi', name: 'Apple iPhone 12 256 GB', price_offset: 178, attributes: { storage: '256 GB', model: 'A2403', colors: ['Black','White','Red','Green','Blue','Purple'] } },
    ],
  },
  {
    sku: 'APP-IPH-iphone13',
    name: 'Apple iPhone 13',
    slug: 'apple-iphone-13',
    description: 'Apple iPhone 13, A2633, available in 128GB/256GB/512GB.',
    long_description: 'Apple iPhone 13. Version A2633 (India/Global). Display: Super Retina XDR 1170x2532. Chip: Apple A15 Bionic Lite. Battery: 3227 mAh, MagSafe 20W. Available in Starlight, Midnight, Blue, Pink, Red.',
    base_price: 926,
    hsn_code: '85171300', uom: 'PCS', warranty_months: 12,
    variants: [
      { sku: 'ap-iph-128-19he76', name: 'Apple iPhone 13 128 GB', price_offset: 0,   attributes: { storage: '128 GB', model: 'A2633', colors: ['Starlight','Midnight','Blue','Pink','Red'] } },
      { sku: 'ap-iph-256-2hauec', name: 'Apple iPhone 13 256 GB', price_offset: 119, attributes: { storage: '256 GB', model: 'A2633', colors: ['Starlight','Midnight','Blue','Pink','Red'] } },
      { sku: 'ap-iph-512-154rwt', name: 'Apple iPhone 13 512 GB', price_offset: 357, attributes: { storage: '512 GB', model: 'A2633', colors: ['Starlight','Midnight','Blue','Pink','Red'] } },
    ],
  },
  {
    sku: 'APP-IPH-iphone14',
    name: 'Apple iPhone 14',
    slug: 'apple-iphone-14',
    description: 'Apple iPhone 14, A2882, available in 128GB/256GB/512GB.',
    long_description: 'Apple iPhone 14. Version A2882 (India/Global). Display: Super Retina XDR 1170x2532. Chip: Apple A15 Bionic. Battery: 3279 mAh, MagSafe 20W. Available in Midnight, Purple, Starlight, Blue, Red.',
    base_price: 1027,
    hsn_code: '85171300', uom: 'PCS', warranty_months: 12,
    variants: [
      { sku: 'ap-iph-128-41sngv', name: 'Apple iPhone 14 128 GB', price_offset: 0,   attributes: { storage: '128 GB', model: 'A2882', colors: ['Midnight','Purple','Starlight','Blue','Red'] } },
      { sku: 'ap-iph-256-1r9we6', name: 'Apple iPhone 14 256 GB', price_offset: 133, attributes: { storage: '256 GB', model: 'A2882', colors: ['Midnight','Purple','Starlight','Blue','Red'] } },
      { sku: 'ap-iph-512-3rsu2v', name: 'Apple iPhone 14 512 GB', price_offset: 399, attributes: { storage: '512 GB', model: 'A2882', colors: ['Midnight','Purple','Starlight','Blue','Red'] } },
    ],
  },
  {
    sku: 'APP-IPH-iphone15',
    name: 'Apple iPhone 15',
    slug: 'apple-iphone-15',
    description: 'Apple iPhone 15, A3092, available in 128GB/256GB/512GB.',
    long_description: 'Apple iPhone 15. Version A3092 (China/HK). Display: Super Retina XDR 1179x2556. Chip: Apple A16 Bionic. Battery: 3349 mAh, MagSafe 20W. Available in Black, Blue, Green, Yellow, Pink.',
    base_price: 799,
    hsn_code: '85171300', uom: 'PCS', warranty_months: 12,
    variants: [
      { sku: 'ap-iph-128-2bgmr9', name: 'Apple iPhone 15 128 GB', price_offset: 0,   attributes: { storage: '128 GB', model: 'A3092', colors: ['Black','Blue','Green','Yellow','Pink'] } },
      { sku: 'ap-iph-256-qhvzjc', name: 'Apple iPhone 15 256 GB', price_offset: 100, attributes: { storage: '256 GB', model: 'A3092', colors: ['Black','Blue','Green','Yellow','Pink'] } },
      { sku: 'ap-iph-512-478fh8', name: 'Apple iPhone 15 512 GB', price_offset: 300, attributes: { storage: '512 GB', model: 'A3092', colors: ['Black','Blue','Green','Yellow','Pink'] } },
    ],
  },
  {
    sku: 'APP-IPH-iphone16',
    name: 'Apple iPhone 16',
    slug: 'apple-iphone-16',
    description: 'Apple iPhone 16, A3287, available in 128GB/256GB/512GB.',
    long_description: 'Apple iPhone 16. Version A3287 (India/Global). Display: Super Retina XDR 1179x2556. Chip: Apple A18. Battery: 3561 mAh, MagSafe 25W. Available in Black, White, Pink, Teal, Ultramarine.',
    base_price: 799,
    hsn_code: '85171300', uom: 'PCS', warranty_months: 12,
    variants: [
      { sku: 'ap-iph-128-42zrp3', name: 'Apple iPhone 16 128 GB', price_offset: 0,   attributes: { storage: '128 GB', model: 'A3287', colors: ['Black','White','Pink','Teal','Ultramarine'] } },
      { sku: 'ap-iph-256-49nsau', name: 'Apple iPhone 16 256 GB', price_offset: 100, attributes: { storage: '256 GB', model: 'A3287', colors: ['Black','White','Pink','Teal','Ultramarine'] } },
      { sku: 'ap-iph-512-4in039', name: 'Apple iPhone 16 512 GB', price_offset: 300, attributes: { storage: '512 GB', model: 'A3287', colors: ['Black','White','Pink','Teal','Ultramarine'] } },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seed(client) {
  await client.query(`SET LOCAL app.current_user_role = 'SUPER_ADMIN'`);

  // 1. Brand
  const brandRes = await client.query(
    `INSERT INTO brands (name, slug, description, website, is_active)
     VALUES ($1,$2,$3,$4,TRUE)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [BRAND.name, BRAND.slug, BRAND.description, BRAND.website],
  );
  const brandId = brandRes.rows[0].id;
  console.log(`  Brand:    ${brandRes.rows[0].name} (${brandId})`);

  // 2. Category
  const catRes = await client.query(
    `INSERT INTO product_categories (name, slug, description, brand_id, hsn_code, uom, category_type, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7::category_type,TRUE,1)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [CATEGORY.name, CATEGORY.slug, CATEGORY.description, brandId, CATEGORY.hsn_code, CATEGORY.uom, CATEGORY.category_type],
  );
  const categoryId = catRes.rows[0].id;
  console.log(`  Category: ${catRes.rows[0].name} (${categoryId})`);

  const insertedProductIds = [];
  const insertedVariantIds = [];

  for (const p of PRODUCTS) {
    // 3. Product — products.sku has no unique constraint, use SELECT-then-INSERT
    let prodRes = await client.query(
      `SELECT id, name FROM products WHERE sku = $1`,
      [p.sku],
    );
    if (prodRes.rowCount === 0) {
      prodRes = await client.query(
        `INSERT INTO products (category_id, brand_id, name, sku, slug, description, long_description, status, base_price, unit_of_measure, warranty_months, hsn_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE',$8,$9,$10,$11)
         RETURNING id, name`,
        [categoryId, brandId, p.name, p.sku, p.slug, p.description, p.long_description, p.base_price, p.uom, p.warranty_months, p.hsn_code],
      );
    }
    const productId = prodRes.rows[0].id;
    insertedProductIds.push(productId);
    console.log(`  Product:  ${prodRes.rows[0].name} (${productId})`);

    // 4. Variants
    for (const v of p.variants) {
      const varRes = await client.query(
        `INSERT INTO product_variants (product_id, sku, name, variant_attributes, price_offset, is_active)
         VALUES ($1,$2,$3,$4,$5,TRUE)
         ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name`,
        [productId, v.sku, v.name, JSON.stringify(v.attributes), v.price_offset],
      );
      const variantId = varRes.rows[0].id;
      insertedVariantIds.push(variantId);
      console.log(`    Variant: ${varRes.rows[0].name} (${variantId})`);
    }
  }

  return { brandId, categoryId, insertedProductIds, insertedVariantIds };
}

async function undo(client) {
  await client.query(`SET LOCAL app.current_user_role = 'SUPER_ADMIN'`);

  const skus = PRODUCTS.map(p => p.sku);
  const variantSkus = PRODUCTS.flatMap(p => p.variants.map(v => v.sku));

  const vDel = await client.query(
    `DELETE FROM product_variants WHERE sku = ANY($1) RETURNING sku`,
    [variantSkus],
  );
  console.log(`  Deleted ${vDel.rowCount} variants`);

  const pDel = await client.query(
    `DELETE FROM products WHERE sku = ANY($1) RETURNING sku`,
    [skus],
  );
  console.log(`  Deleted ${pDel.rowCount} products`);

  const cDel = await client.query(
    `DELETE FROM product_categories WHERE slug = $1 RETURNING slug`,
    [CATEGORY.slug],
  );
  console.log(`  Deleted ${cDel.rowCount} category (${CATEGORY.slug})`);

  const bDel = await client.query(
    `DELETE FROM brands WHERE slug = $1 RETURNING slug`,
    [BRAND.slug],
  );
  console.log(`  Deleted ${bDel.rowCount} brand (${BRAND.slug})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  const client = new Client({ connectionString: DB });
  await client.connect();
  try {
    await client.query('BEGIN');

    if (UNDO) {
      console.log('\n⏪ Undoing Apple iPhone seed...');
      await undo(client);
    } else {
      console.log('\n🌱 Seeding 15 Apple iPhone variants...');
      await seed(client);
    }

    await client.query('COMMIT');
    console.log(UNDO ? '\n✅ Undo complete.' : '\n✅ Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Failed — rolled back:', err.message);
  } finally {
    await client.end();
  }
})();
