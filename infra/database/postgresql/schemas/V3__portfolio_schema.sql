-- ============================================================
-- InvestIQ :: Portfolio Database  (investiq_portfolio)
-- Schema Version : V3
-- Target         : PostgreSQL 17
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;   -- time-series for performance

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE instrument_type_enum AS ENUM ('STOCK','MUTUAL_FUND','ETF','BOND','GOLD','REIT','INVIT');
CREATE TYPE holding_status_enum  AS ENUM ('ACTIVE','SOLD','TRANSFERRED','PLEDGED');
CREATE TYPE currency_enum        AS ENUM ('INR','USD');
CREATE TYPE rebalance_freq_enum  AS ENUM ('NONE','MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL');
CREATE TYPE perf_period_enum     AS ENUM ('1D','1W','1M','3M','6M','1Y','3Y','5Y','MAX');

-- ─────────────────────────────────────────────
-- TABLE: portfolios
-- ─────────────────────────────────────────────
CREATE TABLE portfolios (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID            NOT NULL,         -- FK: auth.users.id (cross-service)
    name                    VARCHAR(200)    NOT NULL DEFAULT 'My Portfolio',
    description             TEXT,
    currency                currency_enum   NOT NULL DEFAULT 'INR',
    is_default              BOOLEAN         NOT NULL DEFAULT FALSE,
    rebalance_frequency     rebalance_freq_enum NOT NULL DEFAULT 'NONE',
    target_allocation       JSONB,          -- {"STOCK":60,"BOND":20,"GOLD":20}
    benchmark_index         VARCHAR(50),    -- NIFTY50, SENSEX, NIFTY_MIDCAP100
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_portfolio_default ON portfolios(user_id) WHERE is_default = TRUE AND deleted_at IS NULL;
CREATE        INDEX ix_portfolio_user    ON portfolios(user_id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────
-- TABLE: portfolio_holdings
-- ─────────────────────────────────────────────
CREATE TABLE portfolio_holdings (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id        UUID                NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id             UUID                NOT NULL,
    instrument_type     instrument_type_enum NOT NULL,
    symbol              VARCHAR(30)         NOT NULL,         -- RELIANCE, HDFC_TOP100, etc.
    isin                CHAR(12),                             -- ISINxxxxxxxxxx
    exchange            VARCHAR(10)         NOT NULL DEFAULT 'NSE',
    quantity            NUMERIC(20,8)       NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    average_buy_price   NUMERIC(20,4)       NOT NULL DEFAULT 0,
    current_price       NUMERIC(20,4)       NOT NULL DEFAULT 0,
    invested_value      NUMERIC(20,2)       NOT NULL DEFAULT 0,   -- qty * avg_buy_price
    current_value       NUMERIC(20,2)       NOT NULL DEFAULT 0,   -- qty * current_price
    unrealised_pnl      NUMERIC(20,2)       GENERATED ALWAYS AS (current_value - invested_value) STORED,
    unrealised_pnl_pct  NUMERIC(8,4)        GENERATED ALWAYS AS (
                            CASE WHEN invested_value = 0 THEN 0
                            ELSE ((current_value - invested_value) / invested_value) * 100 END
                        ) STORED,
    realised_pnl        NUMERIC(20,2)       NOT NULL DEFAULT 0,
    day_change          NUMERIC(20,2)       NOT NULL DEFAULT 0,
    day_change_pct      NUMERIC(8,4)        NOT NULL DEFAULT 0,
    status              holding_status_enum NOT NULL DEFAULT 'ACTIVE',
    first_bought_at     TIMESTAMPTZ,
    last_updated_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_holdings_symbol ON portfolio_holdings(portfolio_id, symbol, exchange) WHERE status = 'ACTIVE';
CREATE        INDEX ix_holdings_user   ON portfolio_holdings(user_id, status);
CREATE        INDEX ix_holdings_isin   ON portfolio_holdings(isin) WHERE isin IS NOT NULL;

-- ─────────────────────────────────────────────
-- TABLE: portfolio_performance  (TimescaleDB hypertable)
-- Stores daily snapshots for charting
-- ─────────────────────────────────────────────
CREATE TABLE portfolio_performance (
    time            TIMESTAMPTZ     NOT NULL,
    portfolio_id    UUID            NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id         UUID            NOT NULL,
    total_value     NUMERIC(20,2)   NOT NULL,
    invested_value  NUMERIC(20,2)   NOT NULL,
    total_pnl       NUMERIC(20,2)   NOT NULL,
    total_pnl_pct   NUMERIC(8,4)    NOT NULL,
    day_return      NUMERIC(20,2),
    benchmark_value NUMERIC(20,2),  -- benchmark index value for comparison
    cash_balance    NUMERIC(20,2),
    PRIMARY KEY(time, portfolio_id)
);

-- Convert to TimescaleDB hypertable (1-month chunks)
SELECT create_hypertable('portfolio_performance', 'time', chunk_time_interval => INTERVAL '1 month');
SELECT add_retention_policy('portfolio_performance', INTERVAL '10 years');

CREATE INDEX ix_perf_portfolio_time ON portfolio_performance(portfolio_id, time DESC);
CREATE INDEX ix_perf_user_time      ON portfolio_performance(user_id, time DESC);

-- ─────────────────────────────────────────────
-- TABLE: portfolio_transactions (realised trades log)
-- ─────────────────────────────────────────────
CREATE TABLE portfolio_transactions (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID                NOT NULL REFERENCES portfolios(id),
    holding_id      UUID                REFERENCES portfolio_holdings(id),
    order_id        UUID,                                     -- FK: trade-service order id
    instrument_type instrument_type_enum NOT NULL,
    symbol          VARCHAR(30)         NOT NULL,
    side            VARCHAR(4)          NOT NULL CHECK(side IN ('BUY','SELL')),
    quantity        NUMERIC(20,8)       NOT NULL,
    price           NUMERIC(20,4)       NOT NULL,
    amount          NUMERIC(20,2)       NOT NULL,
    brokerage       NUMERIC(10,2)       NOT NULL DEFAULT 0,
    taxes           NUMERIC(10,2)       NOT NULL DEFAULT 0,
    net_amount      NUMERIC(20,2)       NOT NULL,
    realised_pnl    NUMERIC(20,2),                            -- only for SELL
    executed_at     TIMESTAMPTZ         NOT NULL,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Partition by range (monthly)
CREATE INDEX ix_ptxn_portfolio_time ON portfolio_transactions(portfolio_id, executed_at DESC);
CREATE INDEX ix_ptxn_user_time      ON portfolio_transactions(order_id);
