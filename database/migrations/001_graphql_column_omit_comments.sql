-- ============================================================================
-- Migration 001: GraphQL column-level @omit comments
-- ============================================================================
-- Purpose : Prevent PostGraphile from exposing sensitive columns in GraphQL
--           mutations. @omit update hides a column from mutation input types
--           only — queries and the REST API are completely unaffected.
--           @omit (no qualifier) hides the column from GraphQL entirely.
--
-- Safe to run against a live DB — only adds/updates COMMENT metadata.
-- To reverse: set the comment to NULL on any column, e.g.:
--   COMMENT ON COLUMN users.password_hash IS NULL;
-- ============================================================================

-- ── users: never expose these through GraphQL at all ─────────────────────────
COMMENT ON COLUMN users.password_hash IS '@omit';
COMMENT ON COLUMN users.mfa_secret    IS '@omit';

-- ── listings: trader cannot update these via GraphQL mutation ─────────────────
COMMENT ON COLUMN listings.listing_code         IS '@omit update';
COMMENT ON COLUMN listings.trader_profile_id    IS '@omit update';
COMMENT ON COLUMN listings.intent               IS '@omit update';
COMMENT ON COLUMN listings.product_id           IS '@omit update';
COMMENT ON COLUMN listings.variant_id           IS '@omit update';
COMMENT ON COLUMN listings.category_id          IS '@omit update';
COMMENT ON COLUMN listings.brand_id             IS '@omit update';
COMMENT ON COLUMN listings.moq_units            IS '@omit update';
COMMENT ON COLUMN listings.city                 IS '@omit update';
COMMENT ON COLUMN listings.state                IS '@omit update';
COMMENT ON COLUMN listings.pincode              IS '@omit update';
COMMENT ON COLUMN listings.image_urls           IS '@omit update';
COMMENT ON COLUMN listings.is_featured          IS '@omit update';
COMMENT ON COLUMN listings.featured_until       IS '@omit update';
COMMENT ON COLUMN listings.view_count           IS '@omit update';
COMMENT ON COLUMN listings.whatsapp_click_count IS '@omit update';
COMMENT ON COLUMN listings.expires_at           IS '@omit update';
COMMENT ON COLUMN listings.tsv                  IS '@omit update';

-- ── tables that should never be writable via GraphQL at all ─────────────────
COMMENT ON TABLE otp_verifications IS '@omit';
COMMENT ON TABLE audit_logs        IS '@omit create,update,delete';
COMMENT ON TABLE whatsapp_leads    IS '@omit update,delete';

-- ── trader_profiles: trader cannot update these via GraphQL mutation ──────────
COMMENT ON COLUMN trader_profiles.kyc_status                  IS '@omit update';
COMMENT ON COLUMN trader_profiles.subscription_tier           IS '@omit update';
COMMENT ON COLUMN trader_profiles.pan_number                  IS '@omit update';
COMMENT ON COLUMN trader_profiles.verified_by                 IS '@omit update';
COMMENT ON COLUMN trader_profiles.rejection_reason            IS '@omit update';
COMMENT ON COLUMN trader_profiles.kyc_verified_at             IS '@omit update';
COMMENT ON COLUMN trader_profiles.pan_verified_at             IS '@omit update';
COMMENT ON COLUMN trader_profiles.annual_revenue              IS '@omit update';
COMMENT ON COLUMN trader_profiles.rating_count                IS '@omit update';
COMMENT ON COLUMN trader_profiles.rating_sum                  IS '@omit update';
COMMENT ON COLUMN trader_profiles.trader_code                 IS '@omit update';
COMMENT ON COLUMN trader_profiles.company_registration_number IS '@omit update';
