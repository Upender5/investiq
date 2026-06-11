-- User addresses
CREATE TABLE IF NOT EXISTS user_addresses (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    type        VARCHAR(10) NOT NULL CHECK (type IN ('HOME','WORK','OTHER')),
    line1       VARCHAR(200) NOT NULL,
    line2       VARCHAR(200),
    city        VARCHAR(100) NOT NULL,
    state       VARCHAR(100) NOT NULL,
    pincode     VARCHAR(6)  NOT NULL,
    country     VARCHAR(50) NOT NULL DEFAULT 'India',
    is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON user_addresses(user_id);

-- Bank accounts
CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    account_holder_name  VARCHAR(100) NOT NULL,
    account_number       VARCHAR(18) NOT NULL,
    ifsc_code            VARCHAR(11) NOT NULL,
    bank_name            VARCHAR(100) NOT NULL,
    branch_name          VARCHAR(100),
    account_type         VARCHAR(10) NOT NULL CHECK (account_type IN ('SAVINGS','CURRENT')),
    is_primary           BOOLEAN     NOT NULL DEFAULT FALSE,
    verified             BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON user_bank_accounts(user_id);

-- Nominees
CREATE TABLE IF NOT EXISTS user_nominees (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,
    relationship     VARCHAR(50) NOT NULL,
    date_of_birth    DATE,
    phone            VARCHAR(15),
    share_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nominees_user_id ON user_nominees(user_id);

-- Financial goals
CREATE TABLE IF NOT EXISTS user_goals (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name                 VARCHAR(100) NOT NULL,
    goal_type            VARCHAR(30) NOT NULL,
    target_amount        NUMERIC(20,2) NOT NULL,
    target_date          DATE        NOT NULL,
    current_savings      NUMERIC(20,2) NOT NULL DEFAULT 0,
    monthly_contribution NUMERIC(20,2) NOT NULL DEFAULT 0,
    icon                 VARCHAR(50),
    color                VARCHAR(20),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON user_goals(user_id);

-- Risk profiles
CREATE TABLE IF NOT EXISTS user_risk_profiles (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   UUID        NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
    risk_score                INTEGER     NOT NULL CHECK (risk_score BETWEEN 1 AND 100),
    risk_category             VARCHAR(20) NOT NULL,
    investment_horizon_years  INTEGER     NOT NULL,
    primary_goal              VARCHAR(30) NOT NULL,
    monthly_investable_income NUMERIC(20,2) NOT NULL,
    reaction_to_loss          VARCHAR(20) NOT NULL,
    financial_knowledge       INTEGER     NOT NULL,
    existing_investments      TEXT,
    dependents                VARCHAR(10) NOT NULL,
    assessed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
