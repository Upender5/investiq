-- ─── Mutual Fund Master Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mutual_funds (
    scheme_code        VARCHAR(20)     PRIMARY KEY,
    scheme_name        VARCHAR(500)    NOT NULL,
    amc                VARCHAR(100)    NOT NULL,
    category           VARCHAR(50)     NOT NULL,
    sub_category       VARCHAR(100),
    risk_level         VARCHAR(30)     NOT NULL,
    nav                NUMERIC(12,4),
    nav_date           DATE,
    returns_1y         NUMERIC(8,4),
    returns_3y         NUMERIC(8,4),
    returns_5y         NUMERIC(8,4),
    returns_10y        NUMERIC(8,4),
    aum                NUMERIC(20,2),
    crisil_rating      VARCHAR(10),
    expense_ratio      NUMERIC(6,4),
    min_investment     NUMERIC(12,2)   DEFAULT 500.00,
    min_sip            NUMERIC(12,2)   DEFAULT 100.00,
    fund_objective     TEXT,
    benchmark_index    VARCHAR(100),
    fund_manager       VARCHAR(200),
    inception_date     DATE,
    std_deviation      NUMERIC(8,4),
    sharpe_ratio       NUMERIC(8,4),
    beta               NUMERIC(8,4),
    alpha              NUMERIC(8,4),
    exit_load          NUMERIC(6,4),
    exit_load_period   VARCHAR(100),
    top_holdings       TEXT,
    sector_allocation  TEXT,
    active             BOOLEAN         NOT NULL DEFAULT TRUE,
    updated_at         TIMESTAMPTZ     DEFAULT NOW()
);

-- ─── User Fund Holdings (Folios) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fund_holdings (
    id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID            NOT NULL,
    scheme_code           VARCHAR(20)     NOT NULL REFERENCES mutual_funds(scheme_code),
    folio_number          VARCHAR(50),
    units                 NUMERIC(20,4)   NOT NULL DEFAULT 0,
    avg_nav               NUMERIC(12,4)   NOT NULL DEFAULT 0,
    invested_amount       NUMERIC(20,2)   NOT NULL DEFAULT 0,
    first_investment_date DATE            NOT NULL,
    updated_at            TIMESTAMPTZ     DEFAULT NOW(),
    CONSTRAINT uq_holding UNIQUE(user_id, scheme_code, folio_number)
);

-- ─── SIP Mandates ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sip_mandates (
    id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID            NOT NULL,
    scheme_code           VARCHAR(20)     NOT NULL REFERENCES mutual_funds(scheme_code),
    folio_number          VARCHAR(50),
    monthly_amount        NUMERIC(12,2)   NOT NULL,
    sip_date              INTEGER         NOT NULL CHECK(sip_date BETWEEN 1 AND 28),
    status                VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    bank_account_id       UUID            NOT NULL,
    start_date            DATE            NOT NULL,
    end_date              DATE,
    next_instalment       DATE,
    completed_instalments INT             NOT NULL DEFAULT 0,
    total_invested        NUMERIC(20,2)   NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── Fund Transactions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fund_transactions (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID            NOT NULL,
    scheme_code      VARCHAR(20)     NOT NULL REFERENCES mutual_funds(scheme_code),
    folio_number     VARCHAR(50),
    type             VARCHAR(20)     NOT NULL,   -- INVEST | REDEEM | SIP
    amount           NUMERIC(20,2)   NOT NULL,
    units            NUMERIC(20,4),
    nav              NUMERIC(12,4),
    bank_account_id  UUID            NOT NULL,
    sip_mandate_id   UUID            REFERENCES sip_mandates(id),
    status           VARCHAR(20)     NOT NULL DEFAULT 'SUBMITTED',
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_funds_category   ON mutual_funds(category);
CREATE INDEX idx_funds_risk       ON mutual_funds(risk_level);
CREATE INDEX idx_funds_active     ON mutual_funds(active) WHERE active = TRUE;
CREATE INDEX idx_holdings_user    ON fund_holdings(user_id);
CREATE INDEX idx_holdings_scheme  ON fund_holdings(scheme_code);
CREATE INDEX idx_sip_user         ON sip_mandates(user_id);
CREATE INDEX idx_sip_status_date  ON sip_mandates(status, next_instalment);
CREATE INDEX idx_txn_user         ON fund_transactions(user_id);
CREATE INDEX idx_txn_user_scheme  ON fund_transactions(user_id, scheme_code);
CREATE INDEX idx_txn_sip          ON fund_transactions(sip_mandate_id);

-- ─── Seed: Popular Indian Mutual Funds ───────────────────────────────────────
INSERT INTO mutual_funds (
    scheme_code, scheme_name, amc, category, sub_category, risk_level,
    nav, nav_date, returns_1y, returns_3y, returns_5y, returns_10y,
    aum, crisil_rating, expense_ratio, min_investment, min_sip,
    fund_objective, benchmark_index, fund_manager, inception_date,
    sharpe_ratio, std_deviation, beta, alpha, exit_load, exit_load_period,
    top_holdings, sector_allocation
) VALUES
(
    '120503', 'Mirae Asset Large Cap Fund - Direct Plan - Growth',
    'Mirae Asset', 'EQUITY', 'Large Cap', 'HIGH',
    112.45, CURRENT_DATE - 1, 15.20, 18.50, 22.30, 16.80,
    38500.00, '5', 0.52, 500.00, 100.00,
    'Long-term capital appreciation through large-cap equity stocks.',
    'NIFTY 100 TRI', 'Gaurav Misra', '2008-04-04',
    1.25, 14.80, 0.95, 2.30, 1.00, '1 year',
    '[{"name":"HDFC Bank","percentage":9.5,"sector":"Banking"},{"name":"ICICI Bank","percentage":8.2,"sector":"Banking"},{"name":"Infosys","percentage":7.8,"sector":"IT"},{"name":"Reliance Industries","percentage":7.1,"sector":"Energy"},{"name":"TCS","percentage":6.5,"sector":"IT"}]',
    '[{"sector":"Banking & Finance","percentage":28.5},{"sector":"IT","percentage":22.4},{"sector":"Energy","percentage":15.2},{"sector":"FMCG","percentage":10.1},{"sector":"Auto","percentage":8.8}]'
),
(
    '119551', 'Axis Bluechip Fund - Direct Plan - Growth',
    'Axis Mutual Fund', 'EQUITY', 'Large Cap', 'HIGH',
    58.32, CURRENT_DATE - 1, 12.40, 14.20, 19.80, 14.50,
    42000.00, '4', 0.45, 500.00, 500.00,
    'Long-term wealth creation through large-cap equity stocks.',
    'NIFTY 50 TRI', 'Shreyash Devalkar', '2010-01-05',
    1.12, 13.50, 0.88, 1.80, 1.00, '1 year',
    '[{"name":"HDFC Bank","percentage":10.2,"sector":"Banking"},{"name":"TCS","percentage":9.1,"sector":"IT"},{"name":"Bajaj Finance","percentage":7.5,"sector":"NBFC"},{"name":"Kotak Mahindra Bank","percentage":6.8,"sector":"Banking"},{"name":"Infosys","percentage":6.2,"sector":"IT"}]',
    '[{"sector":"Banking & Finance","percentage":32.1},{"sector":"IT","percentage":18.5},{"sector":"NBFC","percentage":12.2},{"sector":"Consumer","percentage":9.8},{"sector":"Auto","percentage":7.4}]'
),
(
    '100033', 'SBI Nifty Index Fund - Direct Plan - Growth',
    'SBI Mutual Fund', 'EQUITY', 'Index Funds', 'VERY_HIGH',
    195.80, CURRENT_DATE - 1, 14.80, 17.20, 20.50, 13.20,
    12000.00, '5', 0.10, 5000.00, 500.00,
    'Passive fund mirroring NIFTY 50 composition for long-term wealth creation.',
    'NIFTY 50', 'Raviprakash Sharma', '2002-01-01',
    1.05, 14.20, 1.00, 0.00, 0.00, 'NIL',
    '[{"name":"HDFC Bank","percentage":13.2,"sector":"Banking"},{"name":"Reliance Industries","percentage":11.5,"sector":"Energy"},{"name":"ICICI Bank","percentage":9.8,"sector":"Banking"},{"name":"Infosys","percentage":7.2,"sector":"IT"},{"name":"TCS","percentage":6.8,"sector":"IT"}]',
    '[{"sector":"Banking & Finance","percentage":35.5},{"sector":"IT","percentage":15.2},{"sector":"Energy","percentage":12.8},{"sector":"Consumer","percentage":8.5},{"sector":"Auto","percentage":7.2}]'
),
(
    '118551', 'HDFC Liquid Fund - Direct Plan - Growth',
    'HDFC Mutual Fund', 'DEBT', 'Liquid', 'LOW',
    4580.25, CURRENT_DATE - 1, 7.20, 6.80, 6.50, 6.20,
    85000.00, '5', 0.20, 500.00, 0.00,
    'High liquidity with stable returns by investing in money market instruments.',
    'NIFTY Liquid Index', 'Anupam Joshi', '2001-10-01',
    1.80, 0.15, 0.02, 0.10, 0.00, '7 days',
    '[{"name":"Treasury Bills","percentage":35.2,"sector":"Government"},{"name":"Commercial Papers","percentage":28.5,"sector":"Corporate"},{"name":"Certificate of Deposit","percentage":22.1,"sector":"Banking"},{"name":"Repos","percentage":14.2,"sector":"Money Market"}]',
    '[{"sector":"Government Securities","percentage":35.2},{"sector":"Corporate Debt","percentage":28.5},{"sector":"Banking & Finance","percentage":22.1},{"sector":"Money Market","percentage":14.2}]'
),
(
    '135781', 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    'PPFAS Mutual Fund', 'EQUITY', 'Flexi Cap', 'VERY_HIGH',
    76.48, CURRENT_DATE - 1, 18.50, 22.30, 26.80, 20.10,
    65000.00, '5', 0.62, 1000.00, 1000.00,
    'Flexible allocation across market caps with selective international exposure.',
    'NIFTY 500 TRI', 'Rajeev Thakkar', '2013-05-28',
    1.42, 16.20, 0.85, 4.20, 2.00, '1 year',
    '[{"name":"HDFC Bank","percentage":7.8,"sector":"Banking"},{"name":"ITC","percentage":6.5,"sector":"FMCG"},{"name":"Alphabet Inc","percentage":5.8,"sector":"Technology"},{"name":"Meta Platforms","percentage":4.2,"sector":"Technology"},{"name":"Bajaj Holdings","percentage":3.9,"sector":"Finance"}]',
    '[{"sector":"Banking & Finance","percentage":22.5},{"sector":"FMCG","percentage":15.8},{"sector":"Technology","percentage":14.2},{"sector":"Healthcare","percentage":8.5},{"sector":"Energy","percentage":6.8}]'
),
(
    '122639', 'Nippon India Small Cap Fund - Direct Plan - Growth',
    'Nippon India Mutual Fund', 'EQUITY', 'Small Cap', 'VERY_HIGH',
    145.62, CURRENT_DATE - 1, 22.40, 30.10, 35.20, 22.80,
    52000.00, '4', 0.68, 500.00, 500.00,
    'Long-term capital appreciation through small-cap companies with high growth potential.',
    'NIFTY Smallcap 250 TRI', 'Samir Rachh', '2010-09-16',
    1.15, 22.50, 0.78, 8.60, 1.00, '1 year',
    '[{"name":"KPIT Technologies","percentage":3.8,"sector":"IT"},{"name":"Tube Investments","percentage":3.2,"sector":"Engineering"},{"name":"Persistent Systems","percentage":2.9,"sector":"IT"},{"name":"Navin Fluorine","percentage":2.7,"sector":"Chemicals"},{"name":"Mphasis","percentage":2.5,"sector":"IT"}]',
    '[{"sector":"IT","percentage":18.5},{"sector":"Engineering","percentage":12.8},{"sector":"Healthcare","percentage":10.2},{"sector":"Chemicals","percentage":9.8},{"sector":"Consumer Discretionary","percentage":8.5}]'
),
(
    '108071', 'ICICI Prudential Balanced Advantage Fund - Direct Plan - Growth',
    'ICICI Prudential Mutual Fund', 'HYBRID', 'Dynamic Asset Allocation', 'MODERATELY_HIGH',
    58.94, CURRENT_DATE - 1, 13.80, 15.20, 17.40, 12.50,
    62000.00, '5', 0.78, 5000.00, 500.00,
    'Dynamically manages equity-debt allocation based on market valuations.',
    'NIFTY 50 + CRISIL Short Term Bond Fund Index', 'S Naren', '2006-12-30',
    1.22, 11.20, 0.72, 2.10, 1.00, '1 year',
    '[{"name":"ICICI Bank","percentage":7.5,"sector":"Banking"},{"name":"HDFC Bank","percentage":6.8,"sector":"Banking"},{"name":"Infosys","percentage":5.2,"sector":"IT"},{"name":"Reliance Industries","percentage":4.9,"sector":"Energy"},{"name":"Larsen & Toubro","percentage":4.2,"sector":"Infrastructure"}]',
    '[{"sector":"Banking & Finance","percentage":25.2},{"sector":"IT","percentage":14.8},{"sector":"Energy","percentage":10.5},{"sector":"Government Bonds","percentage":22.0},{"sector":"Corporate Bonds","percentage":15.0}]'
)
ON CONFLICT (scheme_code) DO NOTHING;
