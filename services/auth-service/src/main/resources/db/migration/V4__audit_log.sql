-- ─── Comprehensive Audit Log ──────────────────────────────────────────────────
-- Tracks every security and financial event: who, what, when, where, old/new values

CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,                              -- null for system events
    action          VARCHAR(100) NOT NULL,             -- e.g. USER_LOGIN, KYC_SUBMITTED
    resource_type   VARCHAR(50),                       -- USER | ORDER | WALLET | KYC | SIP
    resource_id     VARCHAR(100),                      -- UUID of the affected resource
    old_value       TEXT,                              -- JSON snapshot before change
    new_value       TEXT,                              -- JSON snapshot after change
    ip_address      INET,
    user_agent      VARCHAR(500),
    device_id       VARCHAR(100),
    correlation_id  VARCHAR(100),
    service         VARCHAR(50)  NOT NULL,             -- which microservice
    status          VARCHAR(20)  NOT NULL DEFAULT 'SUCCESS',  -- SUCCESS | FAILURE | BLOCKED
    failure_reason  TEXT,
    metadata        TEXT,                              -- extra JSON context
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_action   ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created  ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_ip       ON audit_logs(ip_address);
CREATE INDEX idx_audit_service  ON audit_logs(service);
