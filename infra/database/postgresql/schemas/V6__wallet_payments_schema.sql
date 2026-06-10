-- ============================================================
-- InvestIQ :: Wallet / Payments Extended  (investiq_wallet)
-- Schema Version : V6
-- Target         : PostgreSQL 17
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE wallet_type_enum    AS ENUM ('USER','SYSTEM_FLOAT','TRADE_ESCROW','FEE_REVENUE','REFUND_HOLD');
CREATE TYPE wallet_status_enum  AS ENUM ('ACTIVE','FROZEN','CLOSED','SUSPENDED');
CREATE TYPE entry_dir_enum      AS ENUM ('CREDIT','DEBIT');
CREATE TYPE txn_type_enum       AS ENUM (
    'DEPOSIT','WITHDRAWAL','TRADE_LOCK','TRADE_UNLOCK','TRADE_SETTLE',
    'FEE','REFUND','BONUS','CASHBACK','TRANSFER_IN','TRANSFER_OUT',
    'SIP_DEBIT','DIVIDEND_CREDIT','INTEREST_CREDIT'
);
CREATE TYPE txn_status_enum     AS ENUM ('PENDING','PROCESSING','SETTLED','FAILED','REVERSED');
CREATE TYPE payment_mode_enum   AS ENUM ('UPI','NEFT','RTGS','IMPS','NET_BANKING','DEBIT_CARD','WALLET');
CREATE TYPE payment_status_enum AS ENUM ('INITIATED','PROCESSING','SUCCESS','FAILED','REFUNDED','CANCELLED','EXPIRED');
CREATE TYPE payment_dir_enum    AS ENUM ('DEPOSIT','WITHDRAWAL');

-- ─────────────────────────────────────────────
-- TABLE: wallets  (replaces existing, extended)
-- ─────────────────────────────────────────────
CREATE TABLE wallets (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                UNIQUE,           -- NULL = system wallet
    wallet_type     wallet_type_enum    NOT NULL DEFAULT 'USER',
    currency        CHAR(3)             NOT NULL DEFAULT 'INR',
    balance         NUMERIC(20,2)       NOT NULL DEFAULT 0 CHECK(balance >= 0),
    locked_balance  NUMERIC(20,2)       NOT NULL DEFAULT 0 CHECK(locked_balance >= 0),
    daily_limit     NUMERIC(20,2)       NOT NULL DEFAULT 100000,   -- ₹1 lakh/day default
    monthly_limit   NUMERIC(20,2)       NOT NULL DEFAULT 2000000,  -- ₹20 lakh/month
    status          wallet_status_enum  NOT NULL DEFAULT 'ACTIVE',
    frozen_reason   VARCHAR(300),
    version         BIGINT              NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_wallets_type ON wallets(wallet_type);

-- ─────────────────────────────────────────────
-- TABLE: transactions  (double-entry ledger — partitioned)
-- ─────────────────────────────────────────────
CREATE TABLE transactions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id          UUID            NOT NULL,         -- groups debit + credit pair
    wallet_id           UUID            NOT NULL REFERENCES wallets(id),
    direction           entry_dir_enum  NOT NULL,
    amount              NUMERIC(20,2)   NOT NULL CHECK(amount > 0),
    running_balance     NUMERIC(20,2)   NOT NULL,
    transaction_type    txn_type_enum   NOT NULL,
    status              txn_status_enum NOT NULL DEFAULT 'PENDING',
    idempotency_key     VARCHAR(128)    UNIQUE,
    reference_id        UUID,           -- payment_id / order_id / sip_id
    reference_type      VARCHAR(30),
    description         VARCHAR(500),
    metadata            JSONB,
    fee_journal_id      UUID,           -- link to the fee leg
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE transactions_2025 PARTITION OF transactions FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE transactions_2026 PARTITION OF transactions FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE transactions_2027 PARTITION OF transactions FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE transactions_future PARTITION OF transactions DEFAULT;

CREATE INDEX ix_txn_wallet_created ON transactions(wallet_id, created_at DESC);
CREATE INDEX ix_txn_journal        ON transactions(journal_id);
CREATE INDEX ix_txn_reference      ON transactions(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX ix_txn_status_pending ON transactions(status, created_at) WHERE status IN ('PENDING','PROCESSING');

-- ─────────────────────────────────────────────
-- TABLE: payments   (UPI / NEFT / RTGS gateway records)
-- ─────────────────────────────────────────────
CREATE TABLE payments (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID                NOT NULL,
    wallet_id           UUID                NOT NULL REFERENCES wallets(id),
    direction           payment_dir_enum    NOT NULL,
    amount              NUMERIC(20,2)       NOT NULL CHECK(amount > 0),
    mode                payment_mode_enum   NOT NULL,
    status              payment_status_enum NOT NULL DEFAULT 'INITIATED',
    -- gateway fields
    gateway             VARCHAR(50)         NOT NULL,  -- RAZORPAY, CASHFREE, PHONEPE
    gateway_order_id    VARCHAR(200),
    gateway_payment_id  VARCHAR(200),
    gateway_signature   TEXT,
    gateway_raw         JSONB,             -- full gateway response for audit
    bank_account_id     UUID,
    upi_id              VARCHAR(100),
    utr_number          VARCHAR(50),       -- unique transaction reference
    bank_ref            VARCHAR(100),
    failure_reason      VARCHAR(300),
    refund_id           UUID               REFERENCES payments(id),
    refunded_amount     NUMERIC(20,2),
    refunded_at         TIMESTAMPTZ,
    idempotency_key     VARCHAR(128)        NOT NULL UNIQUE,
    expires_at          TIMESTAMPTZ,
    initiated_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE payments_2025 PARTITION OF payments FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE payments_2026 PARTITION OF payments FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE payments_2027 PARTITION OF payments FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE payments_future PARTITION OF payments DEFAULT;

CREATE INDEX ix_payments_user_created  ON payments(user_id, created_at DESC);
CREATE INDEX ix_payments_gateway_id    ON payments(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
CREATE INDEX ix_payments_status        ON payments(status, created_at) WHERE status IN ('INITIATED','PROCESSING');
CREATE INDEX ix_payments_utr           ON payments(utr_number) WHERE utr_number IS NOT NULL;

-- ─────────────────────────────────────────────
-- TABLE: wallet_limits_audit  (track limit changes)
-- ─────────────────────────────────────────────
CREATE TABLE wallet_limits_audit (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       UUID        NOT NULL REFERENCES wallets(id),
    changed_by      UUID,       -- admin user id
    old_daily_limit NUMERIC(20,2),
    new_daily_limit NUMERIC(20,2),
    reason          TEXT,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRIGGERS
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallets_upd      BEFORE UPDATE ON wallets      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transactions_upd BEFORE UPDATE ON transactions  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_upd     BEFORE UPDATE ON payments      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
