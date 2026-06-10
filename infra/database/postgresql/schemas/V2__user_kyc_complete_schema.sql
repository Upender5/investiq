-- ============================================================
-- InvestIQ :: User / KYC Database  (investiq_users)
-- Schema Version : V2 — complete enterprise design
-- Target         : PostgreSQL 17
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- fuzzy name search

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE gender_enum          AS ENUM ('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY');
CREATE TYPE kyc_status_enum      AS ENUM ('PENDING','SUBMITTED','UNDER_REVIEW','VERIFIED','REJECTED','EXPIRED');
CREATE TYPE document_type_enum   AS ENUM ('AADHAAR','PAN','PASSPORT','DRIVING_LICENSE','VOTER_ID');
CREATE TYPE document_status_enum AS ENUM ('PENDING','UNDER_REVIEW','VERIFIED','REJECTED','EXPIRED');
CREATE TYPE risk_category_enum   AS ENUM ('CONSERVATIVE','MODERATE','AGGRESSIVE','VERY_AGGRESSIVE');
CREATE TYPE account_type_enum    AS ENUM ('SAVINGS','CURRENT','NRE','NRO');
CREATE TYPE bank_status_enum     AS ENUM ('PENDING','VERIFIED','REJECTED','INACTIVE');
CREATE TYPE nominee_relation_enum AS ENUM ('SPOUSE','PARENT','CHILD','SIBLING','OTHER');
CREATE TYPE marital_status_enum  AS ENUM ('SINGLE','MARRIED','DIVORCED','WIDOWED');
CREATE TYPE occupation_enum      AS ENUM ('STUDENT','SALARIED','SELF_EMPLOYED','BUSINESS','UNEMPLOYED','RETIRED');
CREATE TYPE income_bracket_enum  AS ENUM ('BELOW_1L','1L_5L','5L_10L','10L_25L','ABOVE_25L');

-- ─────────────────────────────────────────────
-- TABLE: user_profiles
-- ─────────────────────────────────────────────
CREATE TABLE user_profiles (
    id                  UUID                PRIMARY KEY,   -- same as auth.users.id
    phone               VARCHAR(15)         NOT NULL UNIQUE,
    email               VARCHAR(255)        UNIQUE,
    full_name           VARCHAR(200)        NOT NULL,
    date_of_birth       DATE,
    gender              gender_enum,
    marital_status      marital_status_enum,
    occupation          occupation_enum,
    income_bracket      income_bracket_enum,
    kyc_status          kyc_status_enum     NOT NULL DEFAULT 'PENDING',
    kyc_verified_at     TIMESTAMPTZ,
    kyc_expires_at      TIMESTAMPTZ,                      -- re-KYC after 10 yrs (SEBI)
    profile_photo_url   VARCHAR(500),
    bio                 TEXT,
    is_politically_exposed BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ                       -- GDPR soft-delete
);

CREATE INDEX ix_user_profiles_kyc    ON user_profiles(kyc_status) WHERE deleted_at IS NULL;
CREATE INDEX ix_user_profiles_name   ON user_profiles USING gin(full_name gin_trgm_ops);

-- ─────────────────────────────────────────────
-- TABLE: addresses
-- ─────────────────────────────────────────────
CREATE TABLE addresses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL DEFAULT 'RESIDENTIAL'
                                CHECK(type IN ('RESIDENTIAL','PERMANENT','OFFICE','CORRESPONDENCE')),
    address_line1   VARCHAR(300) NOT NULL,
    address_line2   VARCHAR(300),
    landmark        VARCHAR(200),
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    state           VARCHAR(100) NOT NULL,
    pincode         CHAR(6)      NOT NULL CHECK(pincode ~ '^[1-9][0-9]{5}$'),
    country         CHAR(2)      NOT NULL DEFAULT 'IN',
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    is_primary      BOOLEAN      NOT NULL DEFAULT FALSE,
    verified        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_addresses_user_id ON addresses(user_id, is_primary);

-- ─────────────────────────────────────────────
-- TABLE: kyc_documents
-- ─────────────────────────────────────────────
CREATE TABLE kyc_documents (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID                NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    document_type       document_type_enum  NOT NULL,
    -- PAN/Aadhaar stored ENCRYPTED at rest — actual value via Vault
    document_number_enc TEXT                NOT NULL,     -- pgcrypto encrypted
    document_number_hash TEXT               NOT NULL,     -- SHA-256 for lookup
    front_url           VARCHAR(500)        NOT NULL,     -- S3 presigned key
    back_url            VARCHAR(500),
    selfie_url          VARCHAR(500),
    status              document_status_enum NOT NULL DEFAULT 'PENDING',
    rejection_reason    VARCHAR(500),
    ocr_data            JSONB,                            -- raw OCR result
    verified_at         TIMESTAMPTZ,
    reviewed_by         UUID,                             -- admin user id
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, document_type)                        -- one doc per type
);

CREATE INDEX ix_kyc_docs_user_id ON kyc_documents(user_id, status);
CREATE INDEX ix_kyc_docs_hash    ON kyc_documents(document_number_hash);

-- ─────────────────────────────────────────────
-- TABLE: bank_accounts
-- ─────────────────────────────────────────────
CREATE TABLE bank_accounts (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    bank_name           VARCHAR(100)    NOT NULL,
    bank_ifsc           VARCHAR(11)     NOT NULL CHECK(bank_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
    bank_branch         VARCHAR(200),
    account_number_enc  TEXT            NOT NULL,         -- encrypted
    account_number_hash TEXT            NOT NULL,         -- hash for de-dup
    account_number_mask VARCHAR(20)     NOT NULL,         -- last 4 digits shown
    account_type        account_type_enum NOT NULL DEFAULT 'SAVINGS',
    holder_name         VARCHAR(200)    NOT NULL,
    is_primary          BOOLEAN         NOT NULL DEFAULT FALSE,
    status              bank_status_enum NOT NULL DEFAULT 'PENDING',
    verified_at         TIMESTAMPTZ,
    penny_drop_ref      VARCHAR(100),                     -- penny-drop txn ref
    penny_drop_at       TIMESTAMPTZ,
    upi_id              VARCHAR(100),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_bank_accounts_hash ON bank_accounts(account_number_hash, bank_ifsc);
CREATE        INDEX ix_bank_accounts_user ON bank_accounts(user_id, is_primary, status);

-- ─────────────────────────────────────────────
-- TABLE: nominees
-- ─────────────────────────────────────────────
CREATE TABLE nominees (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    full_name       VARCHAR(200)        NOT NULL,
    relation        nominee_relation_enum NOT NULL,
    date_of_birth   DATE,
    phone           VARCHAR(15),
    email           VARCHAR(255),
    share_pct       DECIMAL(5,2)        NOT NULL DEFAULT 100.00
                    CHECK(share_pct > 0 AND share_pct <= 100),
    address_id      UUID                REFERENCES addresses(id),
    guardian_name   VARCHAR(200),       -- if nominee is minor
    guardian_phone  VARCHAR(15),
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_nominees_user_id ON nominees(user_id) WHERE is_active = TRUE;

-- enforce 100% share across nominees per user
-- (checked at application layer + periodic DB job)

-- ─────────────────────────────────────────────
-- TABLE: risk_profiles
-- ─────────────────────────────────────────────
CREATE TABLE risk_profiles (
    id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID                NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    risk_category           risk_category_enum  NOT NULL DEFAULT 'MODERATE',
    risk_score              SMALLINT            NOT NULL CHECK(risk_score BETWEEN 0 AND 100),
    -- questionnaire responses
    investment_horizon_yrs  SMALLINT,
    investment_goal         VARCHAR(50),        -- WEALTH_GROWTH, RETIREMENT, EDUCATION, etc.
    monthly_investment_inr  NUMERIC(15,2),
    existing_investments    BOOLEAN,
    loss_tolerance_pct      SMALLINT            CHECK(loss_tolerance_pct BETWEEN 0 AND 100),
    questionnaire_answers   JSONB,              -- full Q&A for audit
    assessed_by             VARCHAR(20)         NOT NULL DEFAULT 'SYSTEM',
    assessed_at             TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    expires_at              TIMESTAMPTZ         NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
    is_current              BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- only one current risk profile per user
CREATE UNIQUE INDEX uq_risk_profile_current ON risk_profiles(user_id) WHERE is_current = TRUE;
CREATE        INDEX ix_risk_profiles_user   ON risk_profiles(user_id, assessed_at DESC);

-- ─────────────────────────────────────────────
-- TABLE: consent_records  (GDPR / RBI)
-- ─────────────────────────────────────────────
CREATE TABLE consent_records (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    consent_type    VARCHAR(50) NOT NULL,  -- MARKETING, DATA_SHARING, KYC_BUREAU, AI_ADVICE
    granted         BOOLEAN     NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    consented_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    withdrawn_at    TIMESTAMPTZ,
    version         VARCHAR(10) NOT NULL DEFAULT '1.0'
);

CREATE INDEX ix_consent_user_type ON consent_records(user_id, consent_type, granted);

-- ─────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_upd BEFORE UPDATE ON user_profiles  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_addresses_upd     BEFORE UPDATE ON addresses       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_kyc_docs_upd      BEFORE UPDATE ON kyc_documents   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bank_accts_upd    BEFORE UPDATE ON bank_accounts   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_nominees_upd      BEFORE UPDATE ON nominees        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
