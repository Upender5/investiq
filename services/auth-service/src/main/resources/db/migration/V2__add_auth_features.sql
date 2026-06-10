-- Add password-based auth, MFA, and device management fields

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash  VARCHAR(72),
    ADD COLUMN IF NOT EXISTS mfa_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_secret     VARCHAR(64),
    ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20),   -- GOOGLE | APPLE
    ADD COLUMN IF NOT EXISTS oauth_subject  VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth
    ON users(oauth_provider, oauth_subject)
    WHERE oauth_provider IS NOT NULL;

-- Trusted devices for push notifications and device-aware security
CREATE TABLE IF NOT EXISTS user_devices (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token  VARCHAR(512) NOT NULL,
    device_name   VARCHAR(100),
    platform      VARCHAR(20),   -- ANDROID | IOS | WEB
    app_version   VARCHAR(20),
    model         VARCHAR(100),
    trusted       BOOLEAN     NOT NULL DEFAULT TRUE,
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON user_devices(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_token ON user_devices(user_id, device_token);

-- MFA backup codes (stored as bcrypt hashes, each single-use)
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   VARCHAR(72) NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_codes_user_id ON mfa_backup_codes(user_id);

-- Password reset tokens (time-limited, single-use, stored hashed)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id);
