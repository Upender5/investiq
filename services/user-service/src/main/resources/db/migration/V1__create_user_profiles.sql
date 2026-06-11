CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE kyc_status    AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE document_type AS ENUM ('AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE');
CREATE TYPE gender        AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- One row per user; id = auth-service user UUID (no FK — different DB)
CREATE TABLE user_profiles (
    id              UUID        PRIMARY KEY,
    phone           VARCHAR(15) NOT NULL UNIQUE,
    email           VARCHAR(255),
    full_name       VARCHAR(255),
    date_of_birth   DATE,
    gender          gender,
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(6),
    kyc_status      kyc_status  NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX idx_user_profiles_kyc_status ON user_profiles(kyc_status);

CREATE TABLE kyc_documents (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID          NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    document_type    document_type NOT NULL,
    document_number  VARCHAR(50)   NOT NULL,
    front_url        VARCHAR(500)  NOT NULL,
    back_url         VARCHAR(500),
    status           kyc_status    NOT NULL DEFAULT 'PENDING',
    rejection_reason VARCHAR(500),
    reviewed_at      TIMESTAMPTZ,
    reviewed_by      UUID,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status  ON kyc_documents(status);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER kyc_documents_updated_at
    BEFORE UPDATE ON kyc_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
