-- ============================================================
-- InvestIQ :: Auth Database  (investiq_auth)
-- Schema Version : V1 → replaces/extends existing V1 migration
-- Target         : PostgreSQL 17 + pgcrypto
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE user_role        AS ENUM ('STUDENT','ADMIN','SUPPORT','COMPLIANCE','SUPER_ADMIN');
CREATE TYPE kyc_status_enum  AS ENUM ('PENDING','SUBMITTED','UNDER_REVIEW','VERIFIED','REJECTED','EXPIRED');
CREATE TYPE user_status_enum AS ENUM ('ACTIVE','INACTIVE','SUSPENDED','DELETED');
CREATE TYPE device_type_enum AS ENUM ('ANDROID','IOS','WEB','DESKTOP');
CREATE TYPE session_status   AS ENUM ('ACTIVE','EXPIRED','REVOKED','FORCE_LOGOUT');
CREATE TYPE otp_purpose      AS ENUM ('LOGIN','REGISTRATION','WITHDRAW','KYC','PASSWORD_RESET','DEVICE_TRUST');

-- ─────────────────────────────────────────────
-- TABLE: users
-- ─────────────────────────────────────────────
CREATE TABLE users (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    phone               VARCHAR(15)     NOT NULL,
    email               VARCHAR(255),
    full_name           VARCHAR(200)    NOT NULL,
    role                user_role       NOT NULL DEFAULT 'STUDENT',
    kyc_status          kyc_status_enum NOT NULL DEFAULT 'PENDING',
    status              user_status_enum NOT NULL DEFAULT 'ACTIVE',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    failed_login_count  SMALLINT        NOT NULL DEFAULT 0,
    last_login_at       TIMESTAMPTZ,
    last_login_ip       INET,
    password_hash       TEXT,                               -- for admin users
    referral_code       VARCHAR(12)     UNIQUE,
    referred_by         UUID            REFERENCES users(id),
    locale              VARCHAR(10)     NOT NULL DEFAULT 'en-IN',
    timezone            VARCHAR(50)     NOT NULL DEFAULT 'Asia/Kolkata',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,                        -- soft delete
    version             BIGINT          NOT NULL DEFAULT 0  -- optimistic lock
);

CREATE UNIQUE INDEX uq_users_phone   ON users(phone)   WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_email   ON users(email)   WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE        INDEX ix_users_status  ON users(status, kyc_status) WHERE deleted_at IS NULL;
CREATE        INDEX ix_users_role    ON users(role) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────
-- TABLE: roles  (RBAC)
-- ─────────────────────────────────────────────
CREATE TABLE roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_system   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description, is_system) VALUES
    ('STUDENT',    'Default student investor',          TRUE),
    ('ADMIN',      'Platform administrator',            TRUE),
    ('SUPPORT',    'Customer support agent',            TRUE),
    ('COMPLIANCE', 'Compliance & risk officer',         TRUE),
    ('SUPER_ADMIN','Full system access',                TRUE);

-- ─────────────────────────────────────────────
-- TABLE: permissions
-- ─────────────────────────────────────────────
CREATE TABLE permissions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    resource    VARCHAR(100) NOT NULL,
    action      VARCHAR(50)  NOT NULL,   -- CREATE, READ, UPDATE, DELETE, EXECUTE
    description TEXT,
    UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by    UUID        REFERENCES users(id),
    PRIMARY KEY(role_id, permission_id)
);

-- ─────────────────────────────────────────────
-- TABLE: user_roles  (user can have multiple roles)
-- ─────────────────────────────────────────────
CREATE TABLE user_roles (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID        REFERENCES users(id),
    PRIMARY KEY(user_id, role_id)
);

-- ─────────────────────────────────────────────
-- TABLE: user_devices
-- ─────────────────────────────────────────────
CREATE TABLE user_devices (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type     device_type_enum NOT NULL,
    device_id       VARCHAR(256)    NOT NULL,             -- FCM/APNS token or browser fingerprint
    device_name     VARCHAR(200),
    os_version      VARCHAR(50),
    app_version     VARCHAR(20),
    push_token      VARCHAR(512),                         -- FCM/APNS
    is_trusted      BOOLEAN         NOT NULL DEFAULT FALSE,
    trusted_at      TIMESTAMPTZ,
    last_active_at  TIMESTAMPTZ,
    last_ip         INET,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_user_devices ON user_devices(user_id, device_id);
CREATE        INDEX ix_user_devices_push ON user_devices(push_token) WHERE push_token IS NOT NULL AND is_active = TRUE;

-- ─────────────────────────────────────────────
-- TABLE: sessions
-- ─────────────────────────────────────────────
CREATE TABLE sessions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       UUID            REFERENCES user_devices(id),
    refresh_token_hash TEXT         NOT NULL UNIQUE,
    access_jti      UUID            NOT NULL UNIQUE,      -- JWT ID for blacklisting
    status          session_status  NOT NULL DEFAULT 'ACTIVE',
    ip_address      INET,
    user_agent      TEXT,
    country_code    CHAR(2),
    expires_at      TIMESTAMPTZ     NOT NULL,
    last_active_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ,
    revoked_reason  VARCHAR(100)
);

CREATE INDEX ix_sessions_user_id  ON sessions(user_id, status) WHERE status = 'ACTIVE';
CREATE INDEX ix_sessions_expires  ON sessions(expires_at)       WHERE status = 'ACTIVE';

-- ─────────────────────────────────────────────
-- TABLE: otp_attempts
-- ─────────────────────────────────────────────
CREATE TABLE otp_attempts (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(15)     NOT NULL,
    purpose     otp_purpose     NOT NULL,
    otp_hash    TEXT            NOT NULL,                 -- bcrypt hash
    attempts    SMALLINT        NOT NULL DEFAULT 0,
    max_attempts SMALLINT       NOT NULL DEFAULT 3,
    expires_at  TIMESTAMPTZ     NOT NULL,
    verified_at TIMESTAMPTZ,
    is_used     BOOLEAN         NOT NULL DEFAULT FALSE,
    ip_address  INET,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_otp_phone_purpose ON otp_attempts(phone, purpose, expires_at) WHERE is_used = FALSE;

-- ─────────────────────────────────────────────
-- TABLE: refresh_tokens  (existing, extended)
-- ─────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id  UUID        REFERENCES sessions(id),
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked = FALSE;

-- ─────────────────────────────────────────────
-- TABLE: feature_flags
-- ─────────────────────────────────────────────
CREATE TABLE feature_flags (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key        VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    is_enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
    rollout_pct     SMALLINT    NOT NULL DEFAULT 0 CHECK(rollout_pct BETWEEN 0 AND 100),
    allowed_roles   user_role[],
    allowed_user_ids UUID[],
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      UUID        REFERENCES users(id)
);

-- ─────────────────────────────────────────────
-- TRIGGER: updated_at auto-update
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_devices_updated_at BEFORE UPDATE ON user_devices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sessions_updated_at     BEFORE UPDATE ON sessions     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION set_updated_at();
