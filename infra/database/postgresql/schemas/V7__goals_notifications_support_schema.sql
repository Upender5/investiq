-- ============================================================
-- InvestIQ :: Goals + Notifications + Support  (investiq_*)
-- Schema Version : V7
-- Target         : PostgreSQL 17
-- ============================================================

-- ─────────────────────────────────────────────
-- GOALS  (investiq_goals)
-- ─────────────────────────────────────────────
CREATE TYPE goal_type_enum   AS ENUM ('RETIREMENT','EDUCATION','HOUSE','VEHICLE','TRAVEL','EMERGENCY','WEALTH','CUSTOM');
CREATE TYPE goal_status_enum AS ENUM ('ACTIVE','COMPLETED','ABANDONED','ON_TRACK','BEHIND');

CREATE TABLE goals (
    id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID                NOT NULL,
    name                    VARCHAR(200)        NOT NULL,
    goal_type               goal_type_enum      NOT NULL DEFAULT 'CUSTOM',
    target_amount_inr       NUMERIC(20,2)       NOT NULL CHECK(target_amount_inr >= 10),
    current_amount_inr      NUMERIC(20,2)       NOT NULL DEFAULT 0,
    target_date             DATE                NOT NULL,
    status                  goal_status_enum    NOT NULL DEFAULT 'ACTIVE',
    priority                SMALLINT            NOT NULL DEFAULT 1 CHECK(priority BETWEEN 1 AND 5),
    inflation_rate_pct      DECIMAL(5,2)        NOT NULL DEFAULT 6.0,
    expected_return_pct     DECIMAL(5,2),
    -- calculated fields
    monthly_sip_required    NUMERIC(15,2),
    progress_pct            DECIMAL(6,2)        GENERATED ALWAYS AS (
                                CASE WHEN target_amount_inr = 0 THEN 0
                                ELSE LEAST((current_amount_inr / target_amount_inr) * 100, 100) END
                            ) STORED,
    -- linked assets
    linked_portfolio_id     UUID,
    linked_sip_id           UUID,
    icon                    VARCHAR(50),
    color                   VARCHAR(7),         -- hex color
    notes                   TEXT,
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_goals_user_status ON goals(user_id, status, target_date);

CREATE TABLE goal_investments (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id         UUID            NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    user_id         UUID            NOT NULL,
    order_id        UUID,
    sip_id          UUID,
    amount_inr      NUMERIC(15,2)   NOT NULL,
    invested_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    notes           TEXT
);

CREATE INDEX ix_goal_investments_goal ON goal_investments(goal_id, invested_at DESC);
CREATE INDEX ix_goal_investments_user ON goal_investments(user_id, invested_at DESC);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS  (investiq_notifications)
-- ─────────────────────────────────────────────
CREATE TYPE notif_channel_enum   AS ENUM ('PUSH','SMS','EMAIL','IN_APP','WHATSAPP');
CREATE TYPE notif_status_enum    AS ENUM ('PENDING','SENT','DELIVERED','FAILED','READ');
CREATE TYPE notif_priority_enum  AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');

CREATE TABLE notification_templates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key    VARCHAR(100) NOT NULL UNIQUE,
    title_template  TEXT        NOT NULL,
    body_template   TEXT        NOT NULL,
    channels        notif_channel_enum[] NOT NULL DEFAULT '{IN_APP}',
    category        VARCHAR(50),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    user_id         UUID                PRIMARY KEY,
    channels        notif_channel_enum[] NOT NULL DEFAULT '{PUSH,IN_APP}',
    -- per-category preferences
    trade_alerts    BOOLEAN             NOT NULL DEFAULT TRUE,
    price_alerts    BOOLEAN             NOT NULL DEFAULT TRUE,
    portfolio_news  BOOLEAN             NOT NULL DEFAULT TRUE,
    ai_insights     BOOLEAN             NOT NULL DEFAULT TRUE,
    promotions      BOOLEAN             NOT NULL DEFAULT FALSE,
    kyc_reminders   BOOLEAN             NOT NULL DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end   TIME,
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                NOT NULL,
    template_id     UUID                REFERENCES notification_templates(id),
    channel         notif_channel_enum  NOT NULL DEFAULT 'IN_APP',
    priority        notif_priority_enum NOT NULL DEFAULT 'MEDIUM',
    title           VARCHAR(300)        NOT NULL,
    body            TEXT                NOT NULL,
    action_url      VARCHAR(500),
    image_url       VARCHAR(500),
    data            JSONB,              -- deep-link / action data
    status          notif_status_enum   NOT NULL DEFAULT 'PENDING',
    is_read         BOOLEAN             NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    failure_reason  VARCHAR(300),
    batch_id        UUID,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE notifications_2025 PARTITION OF notifications FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE notifications_2026 PARTITION OF notifications FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE notifications_future PARTITION OF notifications DEFAULT;

CREATE INDEX ix_notif_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX ix_notif_unread       ON notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX ix_notif_status       ON notifications(status, created_at) WHERE status IN ('PENDING');

-- ─────────────────────────────────────────────
-- SUPPORT  (investiq_support)
-- ─────────────────────────────────────────────
CREATE TYPE ticket_status_enum   AS ENUM ('OPEN','IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED','REOPENED');
CREATE TYPE ticket_priority_enum AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE ticket_category_enum AS ENUM ('KYC','PAYMENT','TRADE','TECHNICAL','ACCOUNT','COMPLIANCE','FEEDBACK','OTHER');

CREATE TABLE support_tickets (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                    NOT NULL,
    ticket_number   VARCHAR(20)             NOT NULL UNIQUE,  -- INV-2026-00001
    category        ticket_category_enum    NOT NULL,
    priority        ticket_priority_enum    NOT NULL DEFAULT 'MEDIUM',
    status          ticket_status_enum      NOT NULL DEFAULT 'OPEN',
    subject         VARCHAR(500)            NOT NULL,
    description     TEXT                    NOT NULL,
    assigned_to     UUID,                   -- support agent user id
    assigned_at     TIMESTAMPTZ,
    order_id        UUID,                   -- linked order if trade issue
    payment_id      UUID,
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,
    satisfaction    SMALLINT                CHECK(satisfaction BETWEEN 1 AND 5),
    sla_deadline    TIMESTAMPTZ,
    breached_sla    BOOLEAN                 NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_tickets_user_status   ON support_tickets(user_id, status);
CREATE INDEX ix_tickets_assigned      ON support_tickets(assigned_to, status) WHERE status NOT IN ('CLOSED','RESOLVED');
CREATE INDEX ix_tickets_sla_breach    ON support_tickets(sla_deadline) WHERE status NOT IN ('CLOSED','RESOLVED');

CREATE TABLE ticket_comments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id   UUID        NOT NULL,
    is_internal BOOLEAN     NOT NULL DEFAULT FALSE,
    body        TEXT        NOT NULL,
    attachments JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ticket_comments ON ticket_comments(ticket_id, created_at);

-- ─────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_goals_upd    BEFORE UPDATE ON goals             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tickets_upd  BEFORE UPDATE ON support_tickets   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-generate ticket number
CREATE SEQUENCE ticket_seq START 1000;
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('ticket_seq')::TEXT, 6, '0');
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_number BEFORE INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();
