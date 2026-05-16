CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE order_type          AS ENUM ('MARKET', 'LIMIT');
CREATE TYPE transaction_side    AS ENUM ('BUY', 'SELL');
CREATE TYPE order_status        AS ENUM (
    'PENDING_FUNDS',   -- waiting for trade.funded Kafka event
    'PLACED',          -- sent to broker, awaiting fill
    'EXECUTED',        -- fully filled by broker
    'PARTIALLY_FILLED',
    'CANCELLED',
    'REJECTED',
    'FAILED'
);

CREATE TABLE orders (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID                NOT NULL,
    wallet_id           UUID                NOT NULL,
    symbol              VARCHAR(30)         NOT NULL,              -- e.g. RELIANCE
    exchange            VARCHAR(10)         NOT NULL DEFAULT 'NSE',
    order_type          order_type          NOT NULL,
    transaction_side    transaction_side    NOT NULL,
    quantity            NUMERIC(20,8)       NOT NULL CHECK (quantity > 0),  -- fractional qty
    price               NUMERIC(20,2),                             -- NULL for MARKET
    status              order_status        NOT NULL DEFAULT 'PENDING_FUNDS',
    broker_order_id     VARCHAR(50),
    average_price       NUMERIC(20,2),
    filled_quantity     NUMERIC(20,8)       NOT NULL DEFAULT 0,
    total_value         NUMERIC(20,2),                             -- filled_qty * average_price
    idempotency_key     VARCHAR(128)        UNIQUE,
    funded_journal_id   UUID,                                      -- journal_id from trade.funded
    error_message       VARCHAR(500),
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status  ON orders(status);

-- Tracks processed trade.funded events — prevents duplicate order releases.
CREATE TABLE funded_deposits (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id      UUID            NOT NULL UNIQUE,
    user_id         UUID            NOT NULL,
    wallet_id       UUID            NOT NULL,
    amount          NUMERIC(20,2)   NOT NULL,
    currency        CHAR(3)         NOT NULL DEFAULT 'INR',
    processed_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_funded_deposits_user_id ON funded_deposits(user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
