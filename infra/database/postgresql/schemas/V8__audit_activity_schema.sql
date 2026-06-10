-- ============================================================
-- InvestIQ :: Audit Logs + User Activity  (investiq_audit)
-- Schema Version : V8
-- Target         : PostgreSQL 17
-- SEBI / RBI mandates 5-year minimum retention
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE audit_action_enum  AS ENUM (
    -- Auth
    'LOGIN','LOGOUT','LOGIN_FAILED','OTP_SENT','OTP_VERIFIED',
    'DEVICE_TRUSTED','SESSION_REVOKED','PASSWORD_CHANGED',
    -- KYC
    'KYC_SUBMITTED','KYC_APPROVED','KYC_REJECTED','KYC_RESUBMITTED',
    -- Financial
    'WALLET_DEPOSIT','WALLET_WITHDRAWAL','WALLET_FROZEN','WALLET_UNFROZEN',
    'ORDER_PLACED','ORDER_CANCELLED','ORDER_EXECUTED','TRADE_SETTLED',
    'SIP_CREATED','SIP_PAUSED','SIP_CANCELLED','SIP_EXECUTED',
    'PAYMENT_INITIATED','PAYMENT_SUCCESS','PAYMENT_FAILED','PAYMENT_REFUNDED',
    -- Profile
    'PROFILE_UPDATED','BANK_ADDED','BANK_VERIFIED','NOMINEE_ADDED',
    'RISK_ASSESSED','CONSENT_GIVEN','CONSENT_WITHDRAWN',
    -- Admin
    'ADMIN_LOGIN','USER_SUSPENDED','USER_UNSUSPENDED','LIMIT_CHANGED',
    'FEATURE_FLAG_CHANGED','DATA_EXPORT_REQUESTED','TICKET_ASSIGNED',
    -- AI
    'AI_ADVICE_REQUESTED','AI_ADVICE_SHOWN',
    -- Compliance
    'AML_ALERT_RAISED','SUSPICIOUS_ACTIVITY_FLAGGED'
);

CREATE TYPE audit_entity_enum  AS ENUM (
    'USER','SESSION','KYC','WALLET','TRANSACTION','PAYMENT',
    'ORDER','TRADE','SIP','PORTFOLIO','GOAL','NOTIFICATION',
    'SUPPORT_TICKET','FEATURE_FLAG','ROLE','PERMISSION'
);

CREATE TYPE risk_level_enum AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');

-- ─────────────────────────────────────────────
-- TABLE: audit_logs  (immutable — no UPDATE/DELETE)
-- Partitioned by year for performance + archiving
-- ─────────────────────────────────────────────
CREATE TABLE audit_logs (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    event_time      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    user_id         UUID,               -- actor (NULL = system)
    impersonated_by UUID,               -- admin acting as user
    action          audit_action_enum   NOT NULL,
    entity_type     audit_entity_enum   NOT NULL,
    entity_id       UUID,
    entity_version  BIGINT,
    old_values      JSONB,              -- state before change (PII masked)
    new_values      JSONB,              -- state after  change (PII masked)
    metadata        JSONB,              -- extra context: broker_ref, gateway_ref, etc.
    ip_address      INET,
    user_agent      TEXT,
    device_id       UUID,
    session_id      UUID,
    service_name    VARCHAR(50)         NOT NULL,
    trace_id        VARCHAR(100),       -- distributed tracing ID (X-Trace-ID header)
    risk_level      risk_level_enum     NOT NULL DEFAULT 'LOW',
    is_suspicious   BOOLEAN             NOT NULL DEFAULT FALSE,
    checksum        TEXT,               -- SHA-256 of (id||event_time||action||entity_id||user_id) for tamper detection
    CONSTRAINT audit_no_null_entity CHECK (entity_id IS NOT NULL OR action IN ('LOGIN','LOGOUT','LOGIN_FAILED'))
) PARTITION BY RANGE (event_time);

-- Yearly partitions (7 years online + archive)
CREATE TABLE audit_logs_2024 PARTITION OF audit_logs FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE audit_logs_2025 PARTITION OF audit_logs FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_logs_2027 PARTITION OF audit_logs FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE audit_logs_2028 PARTITION OF audit_logs FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE audit_logs_2029 PARTITION OF audit_logs FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');
CREATE TABLE audit_logs_2030 PARTITION OF audit_logs FOR VALUES FROM ('2030-01-01') TO ('2031-01-01');
CREATE TABLE audit_logs_future PARTITION OF audit_logs DEFAULT;

CREATE INDEX ix_audit_user_time        ON audit_logs(user_id, event_time DESC);
CREATE INDEX ix_audit_entity           ON audit_logs(entity_type, entity_id, event_time DESC);
CREATE INDEX ix_audit_action_time      ON audit_logs(action, event_time DESC);
CREATE INDEX ix_audit_suspicious       ON audit_logs(is_suspicious, event_time DESC) WHERE is_suspicious = TRUE;
CREATE INDEX ix_audit_service          ON audit_logs(service_name, event_time DESC);

-- Prevent any updates or deletes on audit_logs (immutability enforcement)
CREATE OR REPLACE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ─────────────────────────────────────────────
-- TABLE: user_activity  (click / page view stream — TimescaleDB)
-- ─────────────────────────────────────────────
CREATE TABLE user_activity (
    time            TIMESTAMPTZ     NOT NULL,
    user_id         UUID,
    session_id      UUID,
    device_id       UUID,
    event_type      VARCHAR(50)     NOT NULL,   -- PAGE_VIEW, BUTTON_CLICK, SEARCH, SCROLL
    screen          VARCHAR(100),
    element         VARCHAR(100),
    symbol          VARCHAR(30),
    duration_ms     INTEGER,
    platform        VARCHAR(20),
    app_version     VARCHAR(20),
    ip_address      INET,
    country_code    CHAR(2),
    properties      JSONB,
    PRIMARY KEY(time, user_id)
) PARTITION BY RANGE (time);

-- TimescaleDB for user_activity
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('user_activity', 'time',
            chunk_time_interval => INTERVAL '1 week',
            if_not_exists => TRUE);
        PERFORM add_retention_policy('user_activity', INTERVAL '2 years');
    END IF;
END $$;

CREATE INDEX ix_user_activity_session  ON user_activity(session_id, time DESC);
CREATE INDEX ix_user_activity_event    ON user_activity(event_type, time DESC);
CREATE INDEX ix_user_activity_symbol   ON user_activity(symbol, time DESC) WHERE symbol IS NOT NULL;

-- ─────────────────────────────────────────────
-- TABLE: aml_alerts  (Anti-Money Laundering)
-- ─────────────────────────────────────────────
CREATE TYPE aml_status_enum AS ENUM ('NEW','UNDER_REVIEW','CLEARED','ESCALATED','REPORTED');
CREATE TYPE aml_type_enum   AS ENUM (
    'LARGE_CASH_DEPOSIT','RAPID_FUND_MOVEMENT','STRUCTURING',
    'UNUSUAL_TRADE_PATTERN','DORMANT_ACCOUNT_ACTIVITY','POLITICALLY_EXPOSED'
);

CREATE TABLE aml_alerts (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    alert_type      aml_type_enum   NOT NULL,
    status          aml_status_enum NOT NULL DEFAULT 'NEW',
    description     TEXT            NOT NULL,
    amount_involved NUMERIC(20,2),
    related_txn_ids UUID[],
    risk_score      SMALLINT        CHECK(risk_score BETWEEN 0 AND 100),
    assigned_to     UUID,
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     UUID,
    review_notes    TEXT,
    reported_to     VARCHAR(100),   -- FIU-IND ref
    reported_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_aml_user_status ON aml_alerts(user_id, status);
CREATE INDEX ix_aml_new_alerts  ON aml_alerts(status, created_at) WHERE status = 'NEW';

-- ─────────────────────────────────────────────
-- TABLE: legal_holds  (litigation / compliance)
-- ─────────────────────────────────────────────
CREATE TABLE legal_holds (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    reason          TEXT        NOT NULL,
    hold_type       VARCHAR(30) NOT NULL,   -- SEBI_INQUIRY, COURT_ORDER, AML, GDPR
    reference_no    VARCHAR(100),
    imposed_by      VARCHAR(200) NOT NULL,
    imposed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    lifted_at       TIMESTAMPTZ,
    lifted_by       UUID,
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_legal_holds_user ON legal_holds(user_id) WHERE lifted_at IS NULL;
