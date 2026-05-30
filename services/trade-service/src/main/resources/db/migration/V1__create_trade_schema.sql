CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    symbol          VARCHAR(20) NOT NULL,
    exchange        VARCHAR(10) NOT NULL DEFAULT 'NSE',
    order_type      VARCHAR(10) NOT NULL,
    side            VARCHAR(4)  NOT NULL,
    quantity        NUMERIC(18, 4) NOT NULL,
    price           NUMERIC(18, 4),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    broker_order_id VARCHAR(50),
    average_price   NUMERIC(18, 4),
    filled_quantity NUMERIC(18, 4),
    failure_reason  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id        ON orders (user_id);
CREATE INDEX idx_orders_user_created   ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status         ON orders (status);

CREATE TABLE trade_audit_log (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID        NOT NULL,
    user_id    UUID        NOT NULL,
    action     VARCHAR(50) NOT NULL,
    details    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_order_id ON trade_audit_log (order_id);
CREATE INDEX idx_audit_user_id  ON trade_audit_log (user_id);
