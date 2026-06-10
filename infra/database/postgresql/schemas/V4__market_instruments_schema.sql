-- ============================================================
-- InvestIQ :: Market Data / Instruments  (investiq_market)
-- Schema Version : V4
-- Target         : PostgreSQL 17 + TimescaleDB
-- ============================================================

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE exchange_enum        AS ENUM ('NSE','BSE','MCX','NCDEX');
CREATE TYPE instrument_cat_enum  AS ENUM ('EQUITY','DEBT','HYBRID','COMMODITY','CURRENCY','ALTERNATIVE');
CREATE TYPE market_cap_enum      AS ENUM ('LARGE_CAP','MID_CAP','SMALL_CAP','MICRO_CAP');
CREATE TYPE fund_category_enum   AS ENUM ('EQUITY','DEBT','HYBRID','ELSS','INDEX','LIQUID','GOLD','INTERNATIONAL');
CREATE TYPE mf_type_enum         AS ENUM ('REGULAR','DIRECT');
CREATE TYPE rating_enum          AS ENUM ('AAA','AA_PLUS','AA','AA_MINUS','A_PLUS','A','BBB','BB','B','C','D','NR');
CREATE TYPE bond_type_enum       AS ENUM ('GOVT','CORPORATE','MUNICIPAL','RBI_SAVINGS','SGBs');
CREATE TYPE listing_status_enum  AS ENUM ('LISTED','SUSPENDED','DELISTED','IPO_PENDING');

-- ─────────────────────────────────────────────
-- TABLE: stocks
-- ─────────────────────────────────────────────
CREATE TABLE stocks (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol              VARCHAR(30)     NOT NULL,
    isin                CHAR(12)        UNIQUE,
    company_name        VARCHAR(300)    NOT NULL,
    exchange            exchange_enum   NOT NULL DEFAULT 'NSE',
    sector              VARCHAR(100),
    industry            VARCHAR(100),
    market_cap_category market_cap_enum,
    market_cap_inr      NUMERIC(20,2),
    face_value          NUMERIC(10,2),
    issued_shares       BIGINT,
    free_float_pct      DECIMAL(5,2),
    pe_ratio            DECIMAL(10,2),
    pb_ratio            DECIMAL(10,2),
    eps                 DECIMAL(10,4),
    dividend_yield_pct  DECIMAL(6,4),
    week_52_high        NUMERIC(20,4),
    week_52_low         NUMERIC(20,4),
    listing_status      listing_status_enum NOT NULL DEFAULT 'LISTED',
    listing_date        DATE,
    nse_symbol          VARCHAR(30),
    bse_code            VARCHAR(10),
    logo_url            VARCHAR(500),
    website_url         VARCHAR(300),
    description         TEXT,
    tags                TEXT[],         -- ["NIFTY50","F&O","DIVIDEND"]
    is_fo_allowed       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_sip_allowed      BOOLEAN         NOT NULL DEFAULT TRUE,
    min_qty             NUMERIC(10,4)   NOT NULL DEFAULT 1,
    tick_size           NUMERIC(10,4)   NOT NULL DEFAULT 0.05,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(symbol, exchange)
);

CREATE INDEX ix_stocks_symbol_exc ON stocks(symbol, exchange);
CREATE INDEX ix_stocks_isin       ON stocks(isin);
CREATE INDEX ix_stocks_name       ON stocks USING gin(company_name gin_trgm_ops);
CREATE INDEX ix_stocks_sector     ON stocks(sector, market_cap_category);
CREATE INDEX ix_stocks_tags       ON stocks USING gin(tags);

-- ─────────────────────────────────────────────
-- TABLE: mutual_funds
-- ─────────────────────────────────────────────
CREATE TABLE mutual_funds (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_code         VARCHAR(20)         NOT NULL UNIQUE,  -- AMFI code
    isin                CHAR(12)            UNIQUE,
    scheme_name         VARCHAR(400)        NOT NULL,
    fund_house          VARCHAR(200)        NOT NULL,
    category            fund_category_enum  NOT NULL,
    sub_category        VARCHAR(100),
    type                mf_type_enum        NOT NULL DEFAULT 'DIRECT',
    nav                 NUMERIC(20,6)       NOT NULL DEFAULT 0,
    nav_date            DATE,
    aum_inr_cr          NUMERIC(20,2),
    expense_ratio_pct   DECIMAL(6,4),
    exit_load_pct       DECIMAL(6,4),
    lock_in_period_days INTEGER             NOT NULL DEFAULT 0,
    min_sip_amount      NUMERIC(15,2)       NOT NULL DEFAULT 500,
    min_lumpsum_amount  NUMERIC(15,2)       NOT NULL DEFAULT 1000,
    benchmark_index     VARCHAR(100),
    fund_manager        VARCHAR(200),
    inception_date      DATE,
    returns_1y          DECIMAL(8,4),
    returns_3y          DECIMAL(8,4),
    returns_5y          DECIMAL(8,4),
    returns_since_inception DECIMAL(8,4),
    risk_level          VARCHAR(20),        -- LOW, MODERATE_LOW, MODERATE, HIGH, VERY_HIGH
    is_active           BOOLEAN             NOT NULL DEFAULT TRUE,
    logo_url            VARCHAR(500),
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_mf_fund_house ON mutual_funds(fund_house, category);
CREATE INDEX ix_mf_name       ON mutual_funds USING gin(scheme_name gin_trgm_ops);
CREATE INDEX ix_mf_active     ON mutual_funds(category, is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────
-- TABLE: etfs
-- ─────────────────────────────────────────────
CREATE TABLE etfs (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol              VARCHAR(30)     NOT NULL,
    isin                CHAR(12)        UNIQUE,
    name                VARCHAR(300)    NOT NULL,
    exchange            exchange_enum   NOT NULL DEFAULT 'NSE',
    fund_house          VARCHAR(200),
    category            VARCHAR(100),
    underlying_index    VARCHAR(100),
    aum_inr_cr          NUMERIC(20,2),
    expense_ratio_pct   DECIMAL(6,4),
    nav                 NUMERIC(20,6),
    market_price        NUMERIC(20,4),
    discount_premium_pct DECIMAL(6,4),
    tracking_error      DECIMAL(6,4),
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(symbol, exchange)
);

-- ─────────────────────────────────────────────
-- TABLE: bonds
-- ─────────────────────────────────────────────
CREATE TABLE bonds (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    isin                CHAR(12)        NOT NULL UNIQUE,
    name                VARCHAR(400)    NOT NULL,
    issuer              VARCHAR(300)    NOT NULL,
    bond_type           bond_type_enum  NOT NULL,
    face_value          NUMERIC(15,2)   NOT NULL DEFAULT 1000,
    coupon_rate_pct     DECIMAL(6,4)    NOT NULL,
    coupon_frequency    VARCHAR(20)     NOT NULL DEFAULT 'ANNUAL',
    issue_date          DATE,
    maturity_date       DATE,
    current_yield       DECIMAL(8,4),
    ytm                 DECIMAL(8,4),   -- yield to maturity
    credit_rating       rating_enum,
    rating_agency       VARCHAR(50),
    is_tax_free         BOOLEAN         NOT NULL DEFAULT FALSE,
    min_investment      NUMERIC(15,2)   NOT NULL DEFAULT 1000,
    listing_exchange    exchange_enum,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABLE: ohlcv_daily  (TimescaleDB — OHLCV candles)
-- ─────────────────────────────────────────────
CREATE TABLE ohlcv_daily (
    time        TIMESTAMPTZ     NOT NULL,
    symbol      VARCHAR(30)     NOT NULL,
    exchange    exchange_enum   NOT NULL DEFAULT 'NSE',
    open        NUMERIC(20,4)   NOT NULL,
    high        NUMERIC(20,4)   NOT NULL,
    low         NUMERIC(20,4)   NOT NULL,
    close       NUMERIC(20,4)   NOT NULL,
    volume      BIGINT          NOT NULL DEFAULT 0,
    value       NUMERIC(20,2),  -- turnover
    vwap        NUMERIC(20,4),
    trades      INTEGER,
    delivery_pct DECIMAL(6,2),
    oi          BIGINT,         -- open interest (futures)
    adj_close   NUMERIC(20,4),
    PRIMARY KEY(time, symbol, exchange)
);

SELECT create_hypertable('ohlcv_daily','time', chunk_time_interval => INTERVAL '3 months');
SELECT add_compression_policy('ohlcv_daily', INTERVAL '1 year');
SELECT add_retention_policy('ohlcv_daily', INTERVAL '20 years');

CREATE INDEX ix_ohlcv_symbol_time ON ohlcv_daily(symbol, exchange, time DESC);

-- ─────────────────────────────────────────────
-- TABLE: ohlcv_intraday  (1-minute candles — TimescaleDB)
-- ─────────────────────────────────────────────
CREATE TABLE ohlcv_intraday (
    time        TIMESTAMPTZ     NOT NULL,
    symbol      VARCHAR(30)     NOT NULL,
    exchange    exchange_enum   NOT NULL DEFAULT 'NSE',
    open        NUMERIC(20,4)   NOT NULL,
    high        NUMERIC(20,4)   NOT NULL,
    low         NUMERIC(20,4)   NOT NULL,
    close       NUMERIC(20,4)   NOT NULL,
    volume      BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY(time, symbol, exchange)
);

SELECT create_hypertable('ohlcv_intraday','time', chunk_time_interval => INTERVAL '1 week');
SELECT add_compression_policy('ohlcv_intraday', INTERVAL '30 days');
SELECT add_retention_policy('ohlcv_intraday', INTERVAL '3 years');

CREATE INDEX ix_intraday_symbol_time ON ohlcv_intraday(symbol, exchange, time DESC);

-- ─────────────────────────────────────────────
-- TABLE: watchlists
-- ─────────────────────────────────────────────
CREATE TABLE watchlists (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    name        VARCHAR(100) NOT NULL DEFAULT 'My Watchlist',
    is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_watchlist_default ON watchlists(user_id) WHERE is_default = TRUE;
CREATE        INDEX ix_watchlist_user    ON watchlists(user_id);

-- ─────────────────────────────────────────────
-- TABLE: watchlist_items
-- ─────────────────────────────────────────────
CREATE TABLE watchlist_items (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id    UUID                NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    user_id         UUID                NOT NULL,
    symbol          VARCHAR(30)         NOT NULL,
    exchange        exchange_enum       NOT NULL DEFAULT 'NSE',
    instrument_type VARCHAR(20)         NOT NULL DEFAULT 'STOCK',
    alert_above     NUMERIC(20,4),      -- price alert: above this price
    alert_below     NUMERIC(20,4),      -- price alert: below this price
    notes           TEXT,
    sort_order      SMALLINT            NOT NULL DEFAULT 0,
    added_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    UNIQUE(watchlist_id, symbol, exchange)
);

CREATE INDEX ix_watchlist_items_user ON watchlist_items(user_id, symbol);

-- ─────────────────────────────────────────────
-- TABLE: corporate_actions
-- ─────────────────────────────────────────────
CREATE TABLE corporate_actions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol          VARCHAR(30) NOT NULL,
    exchange        exchange_enum NOT NULL DEFAULT 'NSE',
    action_type     VARCHAR(30) NOT NULL, -- DIVIDEND, BONUS, SPLIT, RIGHTS, BUYBACK, MERGER
    ex_date         DATE        NOT NULL,
    record_date     DATE,
    payment_date    DATE,
    ratio_from      DECIMAL(10,4),
    ratio_to        DECIMAL(10,4),
    amount          NUMERIC(15,4),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_corp_actions ON corporate_actions(symbol, ex_date DESC);
