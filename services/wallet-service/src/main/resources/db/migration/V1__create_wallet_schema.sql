CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE wallet_type        AS ENUM ('USER', 'SYSTEM_FLOAT', 'TRADE_ESCROW', 'FEE_REVENUE');
CREATE TYPE wallet_status      AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');
CREATE TYPE entry_direction    AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE transaction_type   AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRADE_LOCK', 'TRADE_UNLOCK', 'TRADE_SETTLE', 'FEE', 'REFUND');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'REVERSED');

-- ─── Wallets ────────────────────────────────────────────────────────────────
-- user_id is NULL for internal system accounts (FLOAT, ESCROW, FEE).
CREATE TABLE wallets (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            UNIQUE,                   -- NULL for system wallets
    wallet_type     wallet_type     NOT NULL DEFAULT 'USER',
    currency        CHAR(3)         NOT NULL DEFAULT 'INR',
    balance         NUMERIC(20,2)   NOT NULL DEFAULT 0 CHECK (balance >= 0),
    locked_balance  NUMERIC(20,2)   NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
    status          wallet_status   NOT NULL DEFAULT 'ACTIVE',
    version         BIGINT          NOT NULL DEFAULT 0,       -- JPA optimistic lock
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- One system wallet per type
CREATE UNIQUE INDEX idx_wallets_system_type
    ON wallets(wallet_type) WHERE user_id IS NULL;

-- ─── Ledger entries (double-entry) ──────────────────────────────────────────
-- Every financial event creates exactly two rows sharing the same journal_id.
-- For USER wallets:   CREDIT increases balance, DEBIT decreases it.
-- For SYSTEM wallets: DEBIT increases balance (asset normal), CREDIT decreases it.
-- The signed sum across both legs of a journal is always zero.
CREATE TABLE transactions (
    id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id        UUID                NOT NULL,
    wallet_id         UUID                NOT NULL REFERENCES wallets(id),
    direction         entry_direction     NOT NULL,
    amount            NUMERIC(20,2)       NOT NULL CHECK (amount > 0),
    running_balance   NUMERIC(20,2)       NOT NULL,
    transaction_type  transaction_type    NOT NULL,
    status            transaction_status  NOT NULL DEFAULT 'PENDING',
    idempotency_key   VARCHAR(128)        UNIQUE,             -- set only on user-wallet leg
    reference_id      UUID,                                   -- external: payment_id, trade_id
    description       VARCHAR(500),
    created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_txn_wallet_id   ON transactions(wallet_id);
CREATE INDEX idx_txn_journal_id  ON transactions(journal_id);
CREATE INDEX idx_txn_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_txn_status      ON transactions(status);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER wallets_updated_at
    BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Seed system wallets ────────────────────────────────────────────────────
INSERT INTO wallets (wallet_type, user_id) VALUES
    ('SYSTEM_FLOAT',  NULL),
    ('TRADE_ESCROW',  NULL),
    ('FEE_REVENUE',   NULL);
