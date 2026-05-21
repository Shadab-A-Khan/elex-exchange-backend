-- ============================================================================
-- MIGRATION 002: documents table
--
-- Adds document storage for trader KYC uploads.
-- Files are stored as BYTEA blobs directly in the database (max 10MB).
-- document_blob is marked @omit in PostGraphile — never exposed via GraphQL.
-- Files are served exclusively via the REST download endpoint.
--
-- Linked to trader_profiles (one trader per user in elex).
--
-- Supported document_type values (app-level, not DB-enforced):
--   PAN, AADHAAR, GST_CERTIFICATE, COMPANY_REGISTRATION, CANCELLED_CHEQUE,
--   MOA, AOA, TRADE_LICENSE, OTHER
--
-- ─── PREREQUISITES ───────────────────────────────────────────────────────────
-- The following objects must already exist in the database before running this
-- migration. They are part of the base schema and are NOT created here.
--
--   Tables   : users, trader_profiles
--   Functions: update_updated_at_column()  (used by documents_updated_at trigger)
--              current_user_role()          (used by all RLS policies)
--              current_user_id()            (used by all RLS policies)
--
-- ─── RUN ORDER ───────────────────────────────────────────────────────────────
-- Run after 001_graphql_column_omit_comments.sql.
--
-- ─── IDEMPOTENCY ─────────────────────────────────────────────────────────────
-- NOT idempotent. Run once only. If you need to re-run, first execute:
--   DROP TABLE IF EXISTS documents CASCADE;
--   DROP TYPE  IF EXISTS document_status CASCADE;
-- ============================================================================

-- ============================================================================
-- ENUM: document_status
-- ============================================================================

CREATE TYPE document_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- ============================================================================
-- TABLE: documents
-- ============================================================================

CREATE TABLE documents (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_profile_id   UUID          NOT NULL REFERENCES trader_profiles(id) ON DELETE CASCADE,
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type       VARCHAR(100)  NOT NULL,
  document_number     VARCHAR(255),
  file_name           VARCHAR(500)  NOT NULL,
  file_size           INTEGER,
  mime_type           VARCHAR(100),
  document_blob       BYTEA         NOT NULL,
  issuing_country     VARCHAR(100),
  issuing_authority   VARCHAR(255),
  expiry_date         DATE,
  status              document_status NOT NULL DEFAULT 'PENDING',
  verified_at         TIMESTAMP WITH TIME ZONE,
  verified_by         UUID          REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason    TEXT,
  notes               TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_documents_file_size_positive CHECK (file_size IS NULL OR file_size > 0),
  CONSTRAINT chk_documents_file_size_max      CHECK (file_size IS NULL OR file_size <= 10485760)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_documents_trader_profile_id ON documents(trader_profile_id);
CREATE INDEX idx_documents_user_id           ON documents(user_id);
CREATE INDEX idx_documents_document_type     ON documents(document_type);
CREATE INDEX idx_documents_status            ON documents(status);
CREATE INDEX idx_documents_trader_type       ON documents(trader_profile_id, document_type);
CREATE INDEX idx_documents_expiry            ON documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- ============================================================================
-- TRIGGER: updated_at
-- ============================================================================

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- POSTGRAPHILE: hide document_blob from GraphQL
-- ============================================================================

COMMENT ON COLUMN documents.document_blob IS E'@omit';

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- Admins see everything; traders see only their own documents
CREATE POLICY documents_select_policy ON documents
  FOR SELECT USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR user_id = current_user_id()
  );

-- Traders can upload their own documents; admins can upload for anyone
CREATE POLICY documents_insert_policy ON documents
  FOR INSERT WITH CHECK (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR user_id = current_user_id()
  );

-- Traders can only update their own document while still PENDING (before admin review)
-- Admins can update any document (to approve/reject)
CREATE POLICY documents_update_policy ON documents
  FOR UPDATE
  USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR (user_id = current_user_id() AND status = 'PENDING')
  )
  WITH CHECK (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
    OR (user_id = current_user_id() AND status = 'PENDING')
  );

-- Only admins can delete documents
CREATE POLICY documents_delete_policy ON documents
  FOR DELETE USING (
    current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
  );
