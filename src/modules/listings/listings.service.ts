import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateListingDto, ListingIntent, ListingStockType } from './dto/listing.dto';

@Injectable()
export class ListingsService {
  constructor(private db: DatabaseService) {}

  async create(userId: string, role: string, dto: CreateListingDto) {
    if (dto.intent === ListingIntent.WTS && !dto.price_per_unit) {
      throw new BadRequestException('price_per_unit is required for WTS listings');
    }

    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
      await client.query(`SELECT set_config('app.current_user_role', $1, true)`, [role]);

      // Fetch trader profile — need id, city, state for the listing row
      const profileRes = await client.query(
        `SELECT id, city, state FROM trader_profiles WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      if (!profileRes.rows.length) {
        throw new ForbiddenException('Trader profile not found for this user');
      }
      const { id: traderProfileId, city: profileCity, state: profileState } = profileRes.rows[0];
      const city  = dto.city?.trim()  || profileCity
      const state = dto.state?.trim() || profileState
      if (!city || !state) {
        throw new BadRequestException(
          'Complete your trader profile (city and state) before posting a listing',
        );
      }

      // Duplicate check — same trader, same variant, same intent, not yet expired
      const dupRes = await client.query(
        `SELECT listing_code FROM listings
         WHERE trader_profile_id = $1
           AND variant_id = $2
           AND intent = $3
           AND status IN ('DRAFT', 'ACTIVE', 'PAUSED')
           AND expires_at > NOW()
         LIMIT 1`,
        [traderProfileId, dto.variant_id, dto.intent],
      )
      if (dupRes.rows.length) {
        throw new BadRequestException(
          `You already have an active listing for this product (${dupRes.rows[0].listing_code}). Edit or reactivate it instead.`,
        )
      }

      // Resolve variant → product → category + brand
      const variantRes = await client.query(
        `SELECT pv.id AS variant_id, pv.product_id, p.category_id, p.brand_id
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = $1 AND pv.is_active = TRUE AND p.status = 'ACTIVE'`,
        [dto.variant_id],
      );
      if (!variantRes.rows.length) {
        throw new BadRequestException('Invalid or inactive product variant');
      }
      const { product_id, category_id, brand_id } = variantRes.rows[0];

      const res = await client.query(
        `INSERT INTO listings
           (trader_profile_id, intent,
            product_id, variant_id, category_id, brand_id,
            stock_type, quantity, price_per_unit, currency,
            city, state, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING
           id, listing_code, intent, stock_type, quantity,
           price_per_unit, currency, city, state,
           description, status, expires_at, created_at`,
        [
          traderProfileId,
          dto.intent,
          product_id,
          dto.variant_id,
          category_id,
          brand_id   ?? null,
          dto.stock_type   ?? 'MASTER_CARTON',
          dto.quantity,
          dto.price_per_unit ?? null,
          dto.currency,
          city,
          state,
          dto.description  ?? null,
        ],
      );

      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findAll(
    intent?: string,
    stock_type?: string,
    price_min?: number,
    price_max?: number,
    search?: string,
    brand_id?: string,
    category_id?: string,
    spec_region?: string,
    city?: string,
    verified_only?: boolean,
    limit = 50,
    offset = 0,
  ) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const params: any[] = [];
    const whereClauses: string[] = [
      `l.status = 'ACTIVE'`,
      `l.expires_at > NOW()`,
    ];

    if (intent === ListingIntent.WTS || intent === ListingIntent.WTB) {
      params.push(intent);
      whereClauses.push(`l.intent = $${params.length}`);
    }

    if (stock_type) {
      const valid = Object.values(ListingStockType) as string[];
      const vals = stock_type.split(',').map((v) => v.trim()).filter((v) => valid.includes(v));
      if (vals.length !== stock_type.split(',').filter(Boolean).length) {
        throw new BadRequestException(`stock_type must be one or more of: ${valid.join(', ')}`);
      }
      if (vals.length) {
        const placeholders = vals.map((v) => { params.push(v); return `$${params.length}`; });
        whereClauses.push(`l.stock_type = ANY(ARRAY[${placeholders.join(',')}]::listing_stock_type[])`);
      }
    }

    if (price_min != null && !isNaN(price_min)) {
      params.push(price_min);
      whereClauses.push(`l.price_per_unit >= $${params.length}`);
    }

    if (price_max != null && !isNaN(price_max)) {
      params.push(price_max);
      whereClauses.push(`l.price_per_unit <= $${params.length}`);
    }

    if (search?.trim()) {
      params.push(search.trim());
      whereClauses.push(`l.tsv @@ plainto_tsquery('simple', $${params.length})`);
    }

    if (brand_id) {
      const ids = brand_id.split(',').map((v) => v.trim()).filter(Boolean);
      if (ids.some((id) => !UUID_RE.test(id))) {
        throw new BadRequestException('brand_id must contain valid UUIDs');
      }
      const placeholders = ids.map((v) => { params.push(v); return `$${params.length}`; });
      whereClauses.push(`l.brand_id = ANY(ARRAY[${placeholders.join(',')}]::uuid[])`);
    }

    if (category_id) {
      const ids = category_id.split(',').map((v) => v.trim()).filter(Boolean);
      if (ids.some((id) => !UUID_RE.test(id))) {
        throw new BadRequestException('category_id must contain valid UUIDs');
      }
      const placeholders = ids.map((v) => { params.push(v); return `$${params.length}`; });
      whereClauses.push(`l.category_id = ANY(ARRAY[${placeholders.join(',')}]::uuid[])`);
    }

    if (spec_region === 'INDIA') {
      whereClauses.push(`pv.variant_attributes->'countries' @> '"India"'`);
    } else if (spec_region === 'GLOBAL') {
      whereClauses.push(`(pv.variant_attributes ? 'countries') AND NOT (pv.variant_attributes->'countries' @> '"India"')`);
    }

    if (city?.trim()) {
      params.push(`%${city.trim()}%`);
      whereClauses.push(`l.city ILIKE $${params.length}`);
    }

    if (verified_only) {
      whereClauses.push(`tp.kyc_status = 'APPROVED'`);
    }

    params.push(limit, offset);

    const res = await this.db.query(
      `SELECT
         l.id, l.listing_code, l.intent, l.stock_type,
         l.quantity, l.price_per_unit, l.currency,
         l.description, l.status, l.expires_at, l.created_at,
         p.name              AS product_name,
         b.name              AS brand_name,
         pc.name             AS category_name,
         pv.name             AS variant_name,
         pv.variant_attributes,
         tp.company_name     AS trader,
         tp.trader_code,
         tp.whatsapp_number  AS phone,
         tp.city,
         tp.kyc_status,
         (SELECT COUNT(*)::int FROM listings l2
          WHERE l2.variant_id = l.variant_id
            AND l2.variant_id IS NOT NULL
            AND l2.intent != l.intent
            AND l2.status = 'ACTIVE'
            AND l2.expires_at > NOW()
            AND l2.trader_profile_id != l.trader_profile_id
         ) AS match_count
       FROM listings l
       JOIN products p                ON p.id  = l.product_id
       LEFT JOIN brands b             ON b.id  = l.brand_id
       LEFT JOIN product_categories pc ON pc.id = l.category_id
       LEFT JOIN product_variants pv   ON pv.id = l.variant_id
       JOIN trader_profiles tp         ON tp.id = l.trader_profile_id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return res.rows;
  }

  async findOne(id: string) {
    const res = await this.db.query(
      `SELECT
         l.id, l.listing_code, l.intent, l.stock_type,
         l.quantity, l.price_per_unit, l.currency,
         l.description, l.status, l.expires_at, l.created_at,
         l.category_id, l.brand_id, l.variant_id,
         p.name             AS product_name,
         b.name             AS brand_name,
         pc.name            AS category_name,
         pv.name            AS variant_name,
         pv.variant_attributes,
         tp.company_name    AS trader,
         tp.trader_code,
         tp.whatsapp_number AS phone,
         tp.city,
         tp.kyc_status,
         u.email            AS trader_email
       FROM listings l
       JOIN products p               ON p.id  = l.product_id
       LEFT JOIN brands b            ON b.id  = l.brand_id
       LEFT JOIN product_categories pc ON pc.id = l.category_id
       LEFT JOIN product_variants pv ON pv.id = l.variant_id
       JOIN trader_profiles tp       ON tp.id = l.trader_profile_id
       JOIN users u                  ON u.id  = tp.user_id
       WHERE (l.id::text = $1 OR l.listing_code = $1)
         AND l.status != 'CLOSED' AND l.expires_at > NOW()`,
      [id],
    );
    if (!res.rows.length) throw new NotFoundException('Listing not found');
    return res.rows[0];
  }

  async searchVariants(search?: string, limit = 20) {
    const params: any[] = [];
    const whereClauses = [`pv.is_active = TRUE`, `p.status = 'ACTIVE'`];

    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(
        `(pv.name ILIKE $${params.length} OR p.name ILIKE $${params.length} OR b.name ILIKE $${params.length})`,
      );
    }

    params.push(limit);

    const res = await this.db.query(
      `SELECT
         pv.id              AS variant_id,
         pv.name            AS variant_name,
         pv.variant_attributes,
         p.id               AS product_id,
         p.name             AS product_name,
         b.name             AS brand_name,
         pc.name            AS category_name
       FROM product_variants pv
       JOIN products p              ON p.id  = pv.product_id
       LEFT JOIN brands b           ON b.id  = p.brand_id
       JOIN product_categories pc   ON pc.id = p.category_id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY p.name, pv.name
       LIMIT $${params.length}`,
      params,
    );
    return res.rows;
  }
}
