-- ============================================================
-- InvestIQ :: Trade Service Extended  (investiq_trades)
-- Schema Version : V5
-- Target         : PostgreSQL 17
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE order_type_enum     AS ENUM ('MARKET','LIMIT','SL','SL_M','CNC','MIS','NRML');
CREATE TYPE order_side_enum     AS ENUM ('BUY','SELL');
CREATE TYPE order_status_enum   AS ENUM (
    'PENDING_FUNDS','FUNDS_RESERVED','PLACED','OPEN','EXECUTED',
    'PARTIALLY_FILLED','CANCELLED','REJECTED','FAILED','EXPIRED'
);
CREATE TYPE product_type_enum   AS ENUM ('DELIVERY','INTRADAY','FUTURES','OPTIONS');
CREATE TYPE validity_enum       AS ENUM ('DAY','IOC','GTC','GTT');
CREATE TYPE trade_status_enum   AS ENUM ('PENDING','SETTLED','FAILED');
CREATE TYPE sip_status_enum     AS ENUM ('ACTIVE','PAUSED','COMPLETED','CANCELLED','FAILED');
CREATE TYPE sip_freq_enum       AS ENUM ('DAILY','WEEKLY','MONTHLY','QUARTERLY');

-- ─────────────────────────────────────────────
-- TABLE: orders   (replaces existing, extended)
-- ─────────────────────────────────────────────
CREATE TABLE orders (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID                NOT NULL,
    portfolio_id        UUID,
    wallet_id           UUID                NOT NULL,
    symbol              VARCHAR(30)         NOT NULL,
    exchange            VARCHAR(10)         NOT NULL DEFAULT 'NSE',
    instrument_type     VARCHAR(20)         NOT NULL DEFAULT 'STOCK',
    order_type          order_type_enum     NOT NULL,
    side                order_side_enum     NOT NULL,
    product_type        product_type_enum   NOT NULL DEFAULT 'DELIVERY',
    validity            validity_enum       NOT NULL DEFAULT 'DAY',
    quantity            NUMERIC(20,8)       NOT NULL CHECK(quantity > 0),
    disclosed_qty       NUMERIC(20,8)       DEFAULT 0,
    price               NUMERIC(20,4),                     -- NULL for MARKET
    trigger_price       NUMERIC(20,4),                     -- for SL orders
    filled_quantity     NUMERIC(20,8)       NOT NULL DEFAULT 0,
    average_price       NUMERIC(20,4),
    total_value         NUMERIC(20,2),
    brokerage           NUMERIC(10,2)       NOT NULL DEFAULT 0,
    stt                 NUMERIC(10,2)       NOT NULL DEFAULT 0,   -- Securities Transaction Tax
    exchange_charges    NUMERIC(10,2)       NOT NULL DEFAULT 0,
    gst                 NUMERIC(10,2)       NOT NULL DEFAULT 0,
    sebi_charges        NUMERIC(10,2)       NOT NULL DEFAULT 0,
    dp_charges          NUMERIC(10,2)       NOT NULL DEFAULT 0,
    total_charges       NUMERIC(10,2)       NOT NULL DEFAULT 0,
    net_amount          NUMERIC(20,2),
    status              order_status_enum   NOT NULL DEFAULT 'PENDING_FUNDS',
    broker              VARCHAR(30)         NOT NULL DEFAULT 'ZERODHA',
    broker_order_id     VARCHAR(100),
    broker_message      VARCHAR(500),
    funded_journal_id   UUID,
    idempotency_key     VARCHAR(128)        NOT NULL UNIQUE,
    source              VARCHAR(20)         NOT NULL DEFAULT 'MOBILE',  -- MOBILE, WEB, AI, SIP
    sip_id              UUID,               -- FK to sips
    error_message       VARCHAR(500),
    tag                 TEXT[],             -- ["AI_RECOMMENDED", "SIP", "GOAL"]
    placed_at           TIMESTAMPTZ,
    executed_at         TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions (2025-2030, auto-extend via job)
CREATE TABLE orders_2025_01 PARTITION OF orders FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE orders_2025_02 PARTITION OF orders FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE orders_2025_03 PARTITION OF orders FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE orders_2025_04 PARTITION OF orders FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE orders_2025_05 PARTITION OF orders FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE orders_2025_06 PARTITION OF orders FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE orders_2025_07 PARTITION OF orders FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE orders_2025_08 PARTITION OF orders FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE orders_2025_09 PARTITION OF orders FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE orders_2025_10 PARTITION OF orders FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE orders_2025_11 PARTITION OF orders FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE orders_2025_12 PARTITION OF orders FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE orders_2026_01 PARTITION OF orders FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE orders_2026_02 PARTITION OF orders FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE orders_2026_03 PARTITION OF orders FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE orders_2026_04 PARTITION OF orders FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE orders_2026_05 PARTITION OF orders FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE orders_2026_06 PARTITION OF orders FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE orders_2026_07 PARTITION OF orders FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE orders_2026_08 PARTITION OF orders FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE orders_2026_09 PARTITION OF orders FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE orders_2026_10 PARTITION OF orders FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE orders_2026_11 PARTITION OF orders FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE orders_2026_12 PARTITION OF orders FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Default catch-all partition
CREATE TABLE orders_future PARTITION OF orders DEFAULT;

CREATE INDEX ix_orders_user_created    ON orders(user_id, created_at DESC);
CREATE INDEX ix_orders_symbol_status   ON orders(symbol, status);
CREATE INDEX ix_orders_broker_order_id ON orders(broker_order_id) WHERE broker_order_id IS NOT NULL;
CREATE INDEX ix_orders_status_pending  ON orders(status, created_at) WHERE status IN ('PENDING_FUNDS','FUNDS_RESERVED','PLACED','OPEN');

-- ─────────────────────────────────────────────
-- TABLE: order_executions   (fills / partial fills)
-- ─────────────────────────────────────────────
CREATE TABLE order_executions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID            NOT NULL,  -- partitioned parent
    user_id         UUID            NOT NULL,
    trade_id        VARCHAR(50),               -- broker trade ID
    fill_quantity   NUMERIC(20,8)   NOT NULL,
    fill_price      NUMERIC(20,4)   NOT NULL,
    fill_amount     NUMERIC(20,2)   NOT NULL,
    brokerage       NUMERIC(10,2)   NOT NULL DEFAULT 0,
    stt             NUMERIC(10,2)   NOT NULL DEFAULT 0,
    total_charges   NUMERIC(10,2)   NOT NULL DEFAULT 0,
    exchange_time   TIMESTAMPTZ,
    broker_msg      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_order_execs_order_id ON order_executions(order_id, created_at);

-- ─────────────────────────────────────────────
-- TABLE: trades   (settled trades — T+1 settlement)
-- ─────────────────────────────────────────────
CREATE TABLE trades (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID            NOT NULL,
    execution_id        UUID            REFERENCES order_executions(id),
    user_id             UUID            NOT NULL,
    symbol              VARCHAR(30)     NOT NULL,
    exchange            VARCHAR(10)     NOT NULL,
    side                order_side_enum NOT NULL,
    quantity            NUMERIC(20,8)   NOT NULL,
    price               NUMERIC(20,4)   NOT NULL,
    amount              NUMERIC(20,2)   NOT NULL,
    total_charges       NUMERIC(10,2)   NOT NULL DEFAULT 0,
    net_amount          NUMERIC(20,2)   NOT NULL,
    settlement_id       VARCHAR(50),                       -- exchange settlement ref
    settlement_date     DATE,
    status              trade_status_enum NOT NULL DEFAULT 'PENDING',
    settled_at          TIMESTAMPTZ,
    pnl                 NUMERIC(20,2),                     -- for SELL trades
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE trades_2025 PARTITION OF trades FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE trades_2026 PARTITION OF trades FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE trades_2027 PARTITION OF trades FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE trades_future PARTITION OF trades DEFAULT;

CREATE INDEX ix_trades_user_created ON trades(user_id, created_at DESC);
CREATE INDEX ix_trades_order_id     ON trades(order_id);
CREATE INDEX ix_trades_settlement   ON trades(settlement_date) WHERE status = 'PENDING';

-- ─────────────────────────────────────────────
-- TABLE: sips  (Systematic Investment Plans)
-- ─────────────────────────────────────────────
CREATE TABLE sips (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL,
    portfolio_id        UUID,
    symbol              VARCHAR(30)     NOT NULL,
    exchange            VARCHAR(10)     NOT NULL DEFAULT 'NSE',
    instrument_type     VARCHAR(20)     NOT NULL DEFAULT 'MUTUAL_FUND',
    amount_inr          NUMERIC(15,2)   NOT NULL CHECK(amount_inr >= 100),
    frequency           sip_freq_enum   NOT NULL DEFAULT 'MONTHLY',
    start_date          DATE            NOT NULL,
    end_date            DATE,
    installments_total  INTEGER,
    installments_done   INTEGER         NOT NULL DEFAULT 0,
    next_execution_date DATE,
    status              sip_status_enum NOT NULL DEFAULT 'ACTIVE',
    total_invested      NUMERIC(20,2)   NOT NULL DEFAULT 0,
    total_units         NUMERIC(20,8)   NOT NULL DEFAULT 0,
    paused_at           TIMESTAMPTZ,
    paused_reason       VARCHAR(200),
    cancelled_at        TIMESTAMPTZ,
    goal_id             UUID,
    idempotency_key     VARCHAR(128)    UNIQUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_sips_user_status ON sips(user_id, status);
CREATE INDEX ix_sips_next_exec   ON sips(next_execution_date, status) WHERE status = 'ACTIVE';

-- ─────────────────────────────────────────────
-- TABLE: sip_executions
-- ─────────────────────────────────────────────
CREATE TABLE sip_executions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    sip_id          UUID            NOT NULL REFERENCES sips(id),
    order_id        UUID,
    execution_date  DATE            NOT NULL,
    amount_inr      NUMERIC(15,2)   NOT NULL,
    units           NUMERIC(20,8),
    nav             NUMERIC(20,6),
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    failure_reason  VARCHAR(300),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_sip_exec_sip_date ON sip_executions(sip_id, execution_date DESC);

-- TRIGGER: updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_upd BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sips_upd   BEFORE UPDATE ON sips   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
