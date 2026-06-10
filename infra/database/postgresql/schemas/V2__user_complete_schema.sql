-- ============================================================
-- InvestIQ :: User Database  (investiq_users)
-- Schema Version : V2 — Full KYC, profile, banking
-- Target         : PostgreSQL 17
-- ============================================================

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE gender_enum           AS ENUM ('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY');
CREATE TYPE kyc_doc_type          AS ENUM ('AADHAAR','PAN','PASSPORT','DRIVING_LICENSE','VOTER_ID');
CREATE TYPE kyc_doc_status        AS ENUM ('PENDING','UNDER_REVIEW','APPROVED','REJECTED','EXPIRED');
CREATE TYPE kyc_overall_status    AS ENUM ('PENDING','SUBMITTED','UNDER_REVIEW','VERIFIED','REJECTED','EXPIRED');
CREATE TYPE bank_account_type     AS ENUM ('SAVINGS','CURRENT','NRI');
CREATE TYPE bank_account_status   AS ENUM ('PENDING_VERIFY','ACTIVE','INACTIVE','REJECTED');
CREATE TYPE risk_appetite_enum    AS ENUM ('CONSERVATIVE','MODERATE','AGGRESSIVE','VERY_AGGRESSIVE');
CREATE TYPE marital_status_enum   AS ENUM ('SINGLE','MARRIED','DIVORCED','WIDOWED');
CREATE TYPE income_range_enum     AS ENUM (
    'BELOW_1L','1L_TO_3L','3L_TO_5L','5L_TO_10L','10L_TO_25L','ABOVE_25L'
);

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
    nationality         CHAR(2)             DEFAULT 'IN',
    occupation          VARCHAR(100),
    income_range        income_range_enum,
    kyc_status          kyc_overall_status  NOT NULL DEFAULT 'PENDING',
    kyc_completed_at    TIMESTAMPTZ,
    profile_photo_url   VARCHAR(500),
    is_politically_exposed BOOLEAN         NOT NULL DEFAULT FALSE,
    consent_given_at    TIMESTAMPTZ,
    consent_version     VARCHAR(20),
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_user_profiles_kyc ON user_profiles(kyc_status);
CREATE INDEX ix_user_profiles_phone ON user_profiles(phone);

-- ─────────────────────────────────────────────
-- TABLE: addresses
-- ─────────────────────────────────────────────
CREATE TABLE addresses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    address_type    VARCHAR(20) NOT NULL DEFAULT 'CURRENT'  -- CURRENT, PERMANENT, OFFICE
                    CHECK(address_type IN ('CURRENT','PERMANENT','OFFICE')),
    address_line1   VARCHAR(255) NOT NULL,
    address_line2   VARCHAR(255),
    landmark        VARCHAR(100),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    pincode         CHAR(6)      NOT NULL CHECK(pincode ~ '^[1-9][0-9]{5}$'),
    country         CHAR(2)      NOT NULL DEFAULT 'IN',
    is_primary      BOOLEAN      NOT NULL DEFAULT FALSE,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_addresses_user ON addresses(user_id);
CREATE UNIQUE INDEX uq_addresses_primary ON addresses(user_id) WHERE is_primary = TRUE;

-- ─────────────────────────────────────────────
-- TABLE: kyc_documents
-- ─────────────────────────────────────────────
CREATE TABLE kyc_documents (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    document_type       kyc_doc_type    NOT NULL,
    document_number     TEXT,                               -- encrypted at app layer
    document_number_masked VARCHAR(20),                    -- e.g. XXXX-XXXX-1234
    front_url           VARCHAR(500),
    back_url            VARCHAR(500),
    selfie_url          VARCHAR(500),
    status              kyc_doc_status  NOT NULL DEFAULT 'PENDING',
    rejection_reason    VARCHAR(500),
    digio_request_id    VARCHAR(100),                      -- eKYC provider ref
    aadhaar_verified    BOOLEAN         NOT NULL DEFAULT FALSE,
    pan_verified        BOOLEAN         NOT NULL DEFAULT FALSE,
    reviewed_at         TIMESTAMPTZ,
    reviewed_by         UUID,
    expires_at          DATE,                              -- for passport, DL
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_kyc_user_doctype ON kyc_documents(user_id, document_type);
CREATE        INDEX ix_kyc_status       ON kyc_documents(status);

-- ─────────────────────────────────────────────
-- TABLE: bank_accounts
-- ─────────────────────────────────────────────
CREATE TABLE bank_accounts (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID                NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    account_number      TEXT                NOT NULL,           -- encrypted
    account_number_masked VARCHAR(20),                         -- e.g. XXXX1234
    ifsc_code           VARCHAR(11)         NOT NULL CHECK(ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
    bank_name           VARCHAR(100)        NOT NULL,
    branch_name         VARCHAR(150),
    account_holder_name VARCHAR(200)        NOT NULL,
    account_type        bank_account_type   NOT NULL DEFAULT 'SAVINGS',
    status              bank_account_status NOT NULL DEFAULT 'PENDING_VERIFY',
    is_primary          BOOLEAN             NOT NULL DEFAULT FALSE,
    penny_drop_amount   NUMERIC(10,2),
    penny_drop_ref      VARCHAR(100),
    verified_at         TIMESTAMPTZ,
    upi_id              VARCHAR(50),                           -- optional
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE        INDEX ix_bank_accounts_user   ON bank_accounts(user_id);
CREATE UNIQUE INDEX uq_bank_accounts_primary ON bank_accounts(user_id) WHERE is_primary = TRUE AND status = 'ACTIVE';

-- ─────────────────────────────────────────────
-- TABLE: nominees
-- ─────────────────────────────────────────────
CREATE TABLE nominees (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    full_name       VARCHAR(200) NOT NULL,
    relationship    VARCHAR(50)  NOT NULL,
    date_of_birth   DATE,
    phone           VARCHAR(15),
    email           VARCHAR(255),
    percentage      SMALLINT     NOT NULL CHECK(percentage BETWEEN 1 AND 100),
    address_id      UUID         REFERENCES addresses(id),
    guardian_name   VARCHAR(200),                   -- if nominee is minor
    guardian_relationship VARCHAR(50),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT nominees_pct_max CHECK (percentage <= 100)
);

CREATE INDEX ix_nominees_user ON nominees(user_id);

-- ─────────────────────────────────────────────
-- TABLE: risk_profiles
-- ─────────────────────────────────────────────
CREATE TABLE risk_profiles (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
    risk_score          SMALLINT        NOT NULL CHECK(risk_score BETWEEN 1 AND 100),
    risk_appetite       risk_appetite_enum NOT NULL,
    investment_horizon  SMALLINT        NOT NULL CHECK(investment_horizon BETWEEN 1 AND 40), -- years
    monthly_income      NUMERIC(14,2),
    monthly_expenses    NUMERIC(14,2),
    existing_investments NUMERIC(14,2),
    dependents          SMALLINT        NOT NULL DEFAULT 0,
    has_emergency_fund  BOOLEAN         NOT NULL DEFAULT FALSE,
    questionnaire_answers JSONB,                            -- raw Q&A from onboarding
    ml_risk_score       NUMERIC(5,2),                      -- from ml-scoring-service
    ml_model_version    VARCHAR(20),
    computed_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ     NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_risk_profiles_appetite ON risk_profiles(risk_appetite);

-- ─────────────────────────────────────────────
-- TABLE: consent_records  (GDPR / RBI compliance)
-- ─────────────────────────────────────────────
CREATE TABLE consent_records (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    consent_type    VARCHAR(50) NOT NULL,   -- DATA_USAGE, MARKETING, AI_ANALYSIS, KYC_FETCH
    consent_version VARCHAR(20) NOT NULL,
    given           BOOLEAN     NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    given_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX ix_consent_user ON consent_records(user_id, consent_type);

-- ─────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_addresses_updated_at     BEFORE UPDATE ON addresses       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_kyc_documents_updated_at BEFORE UPDATE ON kyc_documents   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_nominees_updated_at      BEFORE UPDATE ON nominees        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_risk_profiles_updated_at BEFORE UPDATE ON risk_profiles   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
