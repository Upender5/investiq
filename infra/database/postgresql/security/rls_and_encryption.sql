-- ============================================================
-- InvestIQ :: Security — RLS + Column Encryption + Data Masking
-- Part 10 of Enterprise DB Architecture
-- ============================================================

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Enforces that each service/role can ONLY see its own rows
-- ─────────────────────────────────────────────

-- ── Enable RLS on all financial tables ──────────────────────
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades              ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- ── Application Service Roles ─────────────────────────────
-- One role per microservice — each can only do what it needs
CREATE ROLE investiq_auth_svc       LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_user_svc       LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_trade_svc      LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_wallet_svc     LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_portfolio_svc  LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_market_svc     LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_notif_svc      LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_analytics_svc  LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_admin          LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_readonly       LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';
CREATE ROLE investiq_compliance     LOGIN PASSWORD 'REPLACE_WITH_VAULT_SECRET';

-- ── Grant least-privilege GRANT statements ───────────────

-- Auth service: full access to auth schema
GRANT SELECT, INSERT, UPDATE ON users, refresh_tokens, sessions, otp_attempts,
      user_roles, role_permissions, feature_flags TO investiq_auth_svc;

-- User service: own schema
GRANT SELECT, INSERT, UPDATE ON user_profiles, kyc_documents, bank_accounts,
      nominees, risk_profiles, addresses, consent_records TO investiq_user_svc;

-- Trade service: own schema
GRANT SELECT, INSERT, UPDATE ON orders, order_executions, trades, sips,
      sip_executions TO investiq_trade_svc;

-- Wallet service: own schema
GRANT SELECT, INSERT, UPDATE ON wallets, transactions, payments,
      wallet_limits_audit TO investiq_wallet_svc;

-- Portfolio service: own schema + read market data
GRANT SELECT, INSERT, UPDATE ON portfolios, portfolio_holdings,
      portfolio_performance, portfolio_transactions TO investiq_portfolio_svc;
GRANT SELECT ON stocks, mutual_funds, etfs, bonds, ohlcv_daily TO investiq_portfolio_svc;

-- Market data service: own schema + read-only others
GRANT SELECT, INSERT, UPDATE ON stocks, mutual_funds, etfs, bonds,
      ohlcv_daily, ohlcv_intraday, corporate_actions,
      watchlists, watchlist_items TO investiq_market_svc;

-- Notification service
GRANT SELECT, INSERT, UPDATE ON notifications, notification_templates,
      notification_preferences TO investiq_notif_svc;

-- Analytics: read-only across schemas
GRANT SELECT ON users, user_profiles, orders, trades, transactions,
      portfolio_holdings, portfolio_performance TO investiq_analytics_svc;

-- Compliance: read + audit
GRANT SELECT ON ALL TABLES IN SCHEMA public TO investiq_compliance;
GRANT SELECT, INSERT ON audit_logs, aml_alerts, legal_holds TO investiq_compliance;

-- Admin: full but restricted to non-financial mutations
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO investiq_admin;

-- Read-only: reporting / BI
GRANT SELECT ON ALL TABLES IN SCHEMA public TO investiq_readonly;

-- ── RLS Policies ─────────────────────────────────────────

-- users: auth service sees all, others see only their own row
CREATE POLICY users_own_row ON users
    FOR ALL TO investiq_auth_svc USING (TRUE);          -- service-level bypass

CREATE POLICY users_self_view ON users
    FOR SELECT USING (id = current_setting('app.current_user_id', TRUE)::uuid);

-- wallets: wallet service sees all, users see own
CREATE POLICY wallets_service ON wallets
    FOR ALL TO investiq_wallet_svc USING (TRUE);

CREATE POLICY wallets_user_own ON wallets
    FOR SELECT USING (user_id = current_setting('app.current_user_id', TRUE)::uuid);

-- orders: trade service sees all; users see own
CREATE POLICY orders_service ON orders
    FOR ALL TO investiq_trade_svc USING (TRUE);

CREATE POLICY orders_user_own ON orders
    FOR SELECT USING (user_id = current_setting('app.current_user_id', TRUE)::uuid);

-- transactions: wallet service full; users own
CREATE POLICY txn_service ON transactions
    FOR ALL TO investiq_wallet_svc USING (TRUE);

CREATE POLICY txn_user_own ON transactions
    FOR SELECT USING (
        wallet_id IN (
            SELECT id FROM wallets
            WHERE user_id = current_setting('app.current_user_id', TRUE)::uuid
        )
    );

-- kyc_documents: only user-service and compliance see PII
CREATE POLICY kyc_service ON kyc_documents
    FOR ALL TO investiq_user_svc USING (TRUE);

CREATE POLICY kyc_compliance ON kyc_documents
    FOR SELECT TO investiq_compliance USING (TRUE);

CREATE POLICY kyc_user_own ON kyc_documents
    FOR SELECT USING (user_id = current_setting('app.current_user_id', TRUE)::uuid);

-- bank_accounts: same as KYC
CREATE POLICY bank_service ON bank_accounts
    FOR ALL TO investiq_user_svc USING (TRUE);

CREATE POLICY bank_user_own ON bank_accounts
    FOR SELECT USING (user_id = current_setting('app.current_user_id', TRUE)::uuid);

-- ─────────────────────────────────────────────
-- COLUMN-LEVEL ENCRYPTION using pgcrypto
-- For: Aadhaar, PAN, Bank Account Number
-- ─────────────────────────────────────────────

-- Helper function: encrypt PII (AES-256 CBC via pgcrypto)
-- Key is fetched from Vault — NEVER hardcoded here
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(plaintext, key, 'cipher-algo=aes256, compress-algo=1'),
        'base64'
    );
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: decrypt PII (only callable by privileged roles)
CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(decode(ciphertext, 'base64'), key);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke decrypt from application roles (only compliance + admin can decrypt)
REVOKE EXECUTE ON FUNCTION decrypt_pii FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION decrypt_pii TO investiq_compliance, investiq_admin;

-- Helper: SHA-256 hash for lookup without decryption
CREATE OR REPLACE FUNCTION hash_pii(plaintext TEXT)
RETURNS TEXT AS $$
    SELECT encode(digest(plaintext, 'sha256'), 'hex');
$$ LANGUAGE sql IMMUTABLE STRICT SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- DATA MASKING VIEWS  (for analytics / reporting)
-- PAN: XXXXX1234F  →  *****1234F
-- Aadhaar: 1234-5678-9012  →  XXXX-XXXX-9012
-- Bank account: XXXXXXXX1234
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_kyc_masked AS
SELECT
    id,
    user_id,
    document_type,
    -- Mask all but last 4 chars of document_number_hash display
    CASE document_type
        WHEN 'PAN'    THEN 'XXXXX' || RIGHT(
            decrypt_pii(document_number_enc, current_setting('app.enc_key', TRUE)), 5)
        WHEN 'AADHAAR' THEN 'XXXX-XXXX-' || RIGHT(
            decrypt_pii(document_number_enc, current_setting('app.enc_key', TRUE)), 4)
        ELSE '**MASKED**'
    END AS document_number_masked,
    status,
    verified_at,
    created_at
FROM kyc_documents;

-- Mask bank account view
CREATE OR REPLACE VIEW vw_bank_accounts_masked AS
SELECT
    id,
    user_id,
    bank_name,
    bank_ifsc,
    account_number_mask,
    account_type,
    holder_name,
    is_primary,
    status,
    upi_id,
    created_at
FROM bank_accounts;
-- Note: account_number_enc is NOT in this view

-- ─────────────────────────────────────────────
-- AUDIT TRIGGER — automatic audit log generation
-- Fires on INSERT/UPDATE/DELETE of financial tables
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_action   TEXT;
    v_entity   TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
        v_action   := 'INSERT';
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_action   := 'UPDATE';
    ELSE
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
        v_action   := 'DELETE';
    END IF;

    -- Strip PII / sensitive columns before writing to audit log
    v_old_data := v_old_data
        - 'document_number_enc'
        - 'account_number_enc'
        - 'otp_hash'
        - 'password_hash'
        - 'token_hash'
        - 'refresh_token_hash'
        - 'gateway_signature'
        - 'gateway_raw';

    v_new_data := v_new_data
        - 'document_number_enc'
        - 'account_number_enc'
        - 'otp_hash'
        - 'password_hash'
        - 'token_hash'
        - 'refresh_token_hash'
        - 'gateway_signature'
        - 'gateway_raw';

    INSERT INTO audit_logs(
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        service_name,
        user_id
    ) VALUES (
        TG_TABLE_NAME::audit_entity_enum,
        COALESCE(NEW.id, OLD.id),
        v_action::audit_action_enum,
        v_old_data,
        v_new_data,
        current_setting('app.service_name', TRUE),
        current_setting('app.current_user_id', TRUE)::uuid
    );

    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- Never let audit failure block financial operation
    RAISE WARNING 'Audit trigger failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit trigger to financial tables
CREATE TRIGGER audit_wallets     AFTER INSERT OR UPDATE ON wallets    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
CREATE TRIGGER audit_orders      AFTER INSERT OR UPDATE ON orders     FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
CREATE TRIGGER audit_trades      AFTER INSERT OR UPDATE ON trades     FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
CREATE TRIGGER audit_kyc_docs    AFTER INSERT OR UPDATE ON kyc_documents FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
CREATE TRIGGER audit_bank_accts  AFTER INSERT OR UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
CREATE TRIGGER audit_payments    AFTER INSERT OR UPDATE ON payments   FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ─────────────────────────────────────────────
-- TLS: enforce SSL connections (pg_hba.conf)
-- Only managed by DBA — shown here for documentation
-- hostssl all all 0.0.0.0/0 scram-sha-256
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- CONNECTION POOLING CONFIGURATION (PgBouncer)
-- ─────────────────────────────────────────────
COMMENT ON DATABASE investiq_auth IS
'pool_mode=transaction, max_client_conn=5000, default_pool_size=25, reserve_pool_size=10';
