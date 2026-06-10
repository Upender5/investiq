-- ============================================================
-- InvestIQ :: Complete Indexing Strategy
-- Part 5 of Enterprise DB Architecture
-- Every index annotated with: WHY it exists + query it serves
-- ============================================================

-- ╔══════════════════════════════════════════╗
-- ║         AUTH DATABASE INDEXES            ║
-- ╚══════════════════════════════════════════╝

-- users: phone lookup on login (most frequent query, microsecond target)
-- Query: SELECT * FROM users WHERE phone = $1 AND deleted_at IS NULL
CREATE UNIQUE INDEX CONCURRENTLY idx_auth_users_phone_active
    ON users(phone) WHERE deleted_at IS NULL;

-- users: email lookup for registration de-dup
CREATE UNIQUE INDEX CONCURRENTLY idx_auth_users_email_active
    ON users(email) WHERE deleted_at IS NULL AND email IS NOT NULL;

-- users: admin panel list by role + status (paginated)
CREATE INDEX CONCURRENTLY idx_auth_users_role_status
    ON users(role, status, created_at DESC) WHERE deleted_at IS NULL;

-- users: referral chain lookups
CREATE INDEX CONCURRENTLY idx_auth_users_referred_by
    ON users(referred_by) WHERE referred_by IS NOT NULL;

-- sessions: active session lookup by user (at login / token refresh)
-- Query: SELECT * FROM sessions WHERE user_id = $1 AND status = 'ACTIVE'
CREATE INDEX CONCURRENTLY idx_sessions_user_active
    ON sessions(user_id, status) WHERE status = 'ACTIVE';

-- sessions: JWT JTI blacklist check on every API call (CRITICAL — must be fast)
-- Query: SELECT 1 FROM sessions WHERE access_jti = $1
CREATE UNIQUE INDEX CONCURRENTLY idx_sessions_jti
    ON sessions(access_jti);

-- sessions: expired session cleanup job
CREATE INDEX CONCURRENTLY idx_sessions_expires
    ON sessions(expires_at) WHERE status = 'ACTIVE';

-- otp_attempts: OTP verification lookup
-- Query: SELECT * FROM otp_attempts WHERE phone=$1 AND purpose=$2 AND is_used=FALSE
CREATE INDEX CONCURRENTLY idx_otp_phone_purpose_active
    ON otp_attempts(phone, purpose, expires_at DESC) WHERE is_used = FALSE;

-- feature_flags: flag lookup by key (cached in Redis, DB is fallback)
CREATE UNIQUE INDEX CONCURRENTLY idx_feature_flags_key
    ON feature_flags(flag_key);

-- ╔══════════════════════════════════════════╗
-- ║         USER DATABASE INDEXES            ║
-- ╚══════════════════════════════════════════╝

-- user_profiles: KYC queue — compliance dashboard query
-- Query: SELECT * FROM user_profiles WHERE kyc_status = 'UNDER_REVIEW' ORDER BY created_at
CREATE INDEX CONCURRENTLY idx_user_profiles_kyc_status
    ON user_profiles(kyc_status, created_at DESC) WHERE deleted_at IS NULL;

-- user_profiles: full-text / fuzzy name search (admin)
-- Query: SELECT * FROM user_profiles WHERE full_name ILIKE '%rajan%'
CREATE INDEX CONCURRENTLY idx_user_profiles_name_trgm
    ON user_profiles USING gin(full_name gin_trgm_ops);

-- kyc_documents: hash-based PAN/Aadhaar de-duplication check
-- Query: SELECT * FROM kyc_documents WHERE document_number_hash = $1
CREATE INDEX CONCURRENTLY idx_kyc_docs_hash
    ON kyc_documents(document_number_hash);

-- kyc_documents: pending review queue
CREATE INDEX CONCURRENTLY idx_kyc_docs_pending
    ON kyc_documents(status, created_at) WHERE status IN ('PENDING','UNDER_REVIEW');

-- bank_accounts: IFSC + account hash for duplicate check
CREATE UNIQUE INDEX CONCURRENTLY idx_bank_acc_hash_ifsc
    ON bank_accounts(account_number_hash, bank_ifsc);

-- bank_accounts: user primary account fetch
CREATE INDEX CONCURRENTLY idx_bank_acc_user_primary
    ON bank_accounts(user_id, is_primary, status);

-- risk_profiles: current profile per user (used on every advice request)
CREATE UNIQUE INDEX CONCURRENTLY idx_risk_profile_current
    ON risk_profiles(user_id) WHERE is_current = TRUE;

-- ╔══════════════════════════════════════════╗
-- ║       PORTFOLIO DATABASE INDEXES         ║
-- ╚══════════════════════════════════════════╝

-- portfolios: user's portfolios (dashboard load)
CREATE INDEX CONCURRENTLY idx_portfolios_user
    ON portfolios(user_id) WHERE deleted_at IS NULL;

-- portfolio_holdings: user's full holding list (most accessed query)
-- Query: SELECT * FROM portfolio_holdings WHERE user_id=$1 AND status='ACTIVE'
CREATE INDEX CONCURRENTLY idx_holdings_user_active
    ON portfolio_holdings(user_id, status) WHERE status = 'ACTIVE';

-- portfolio_holdings: holding by symbol (for trade impact calculation)
CREATE INDEX CONCURRENTLY idx_holdings_symbol
    ON portfolio_holdings(portfolio_id, symbol, exchange) WHERE status = 'ACTIVE';

-- portfolio_holdings: ISIN lookup for corporate actions
CREATE INDEX CONCURRENTLY idx_holdings_isin
    ON portfolio_holdings(isin) WHERE isin IS NOT NULL AND status = 'ACTIVE';

-- portfolio_performance: charting queries (range scan by time)
-- Query: SELECT * FROM portfolio_performance WHERE portfolio_id=$1 AND time > NOW()-INTERVAL '1Y'
CREATE INDEX CONCURRENTLY idx_perf_portfolio_time
    ON portfolio_performance(portfolio_id, time DESC);

-- portfolio_performance: user-level performance aggregation
CREATE INDEX CONCURRENTLY idx_perf_user_time
    ON portfolio_performance(user_id, time DESC);

-- ╔══════════════════════════════════════════╗
-- ║        MARKET DATA INDEXES               ║
-- ╚══════════════════════════════════════════╝

-- stocks: exact symbol lookup (price feed update, order placement)
-- Query: SELECT * FROM stocks WHERE symbol=$1 AND exchange=$2
CREATE UNIQUE INDEX CONCURRENTLY idx_stocks_symbol_exchange
    ON stocks(symbol, exchange);

-- stocks: ISIN lookup (corporate actions, KYC cross-check)
CREATE UNIQUE INDEX CONCURRENTLY idx_stocks_isin
    ON stocks(isin) WHERE isin IS NOT NULL;

-- stocks: full-text search (search bar — autocomplete)
-- Query: SELECT * FROM stocks WHERE company_name ILIKE '%reliance%' LIMIT 10
CREATE INDEX CONCURRENTLY idx_stocks_name_trgm
    ON stocks USING gin(company_name gin_trgm_ops);

-- stocks: sector/market-cap filter (screener)
CREATE INDEX CONCURRENTLY idx_stocks_sector_cap
    ON stocks(sector, market_cap_category, listing_status);

-- stocks: tags array lookup (e.g. find all NIFTY50 stocks)
CREATE INDEX CONCURRENTLY idx_stocks_tags
    ON stocks USING gin(tags);

-- mutual_funds: scheme search (autocomplete)
CREATE INDEX CONCURRENTLY idx_mf_name_trgm
    ON mutual_funds USING gin(scheme_name gin_trgm_ops);

-- mutual_funds: category filter (fund discovery)
CREATE INDEX CONCURRENTLY idx_mf_category_active
    ON mutual_funds(category, fund_house) WHERE is_active = TRUE;

-- ohlcv_daily: OHLCV chart data (covered index — no heap access)
-- Query: SELECT time,open,high,low,close,volume FROM ohlcv_daily WHERE symbol=$1 AND time > $2
CREATE INDEX CONCURRENTLY idx_ohlcv_daily_symbol_time
    ON ohlcv_daily(symbol, exchange, time DESC)
    INCLUDE (open, high, low, close, volume, adj_close);

-- ohlcv_intraday: real-time chart (1-min candles, last 5 days)
CREATE INDEX CONCURRENTLY idx_ohlcv_intraday_symbol_time
    ON ohlcv_intraday(symbol, exchange, time DESC)
    INCLUDE (open, high, low, close, volume);

-- watchlist_items: user watchlist fetch
CREATE INDEX CONCURRENTLY idx_watchlist_items_user
    ON watchlist_items(user_id, watchlist_id, sort_order);

-- watchlist_items: price alert sweep job
-- Query: SELECT * FROM watchlist_items WHERE alert_above IS NOT NULL OR alert_below IS NOT NULL
CREATE INDEX CONCURRENTLY idx_watchlist_alerts
    ON watchlist_items(symbol, exchange)
    WHERE alert_above IS NOT NULL OR alert_below IS NOT NULL;

-- ╔══════════════════════════════════════════╗
-- ║         TRADE DATABASE INDEXES           ║
-- ╚══════════════════════════════════════════╝

-- orders: user order history (paginated, most common query)
-- Query: SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

-- orders: open/pending orders for a symbol (broker reconciliation)
CREATE INDEX CONCURRENTLY idx_orders_symbol_status
    ON orders(symbol, status, created_at)
    WHERE status IN ('PENDING_FUNDS','FUNDS_RESERVED','PLACED','OPEN');

-- orders: broker order ID lookup (webhook callback reconciliation)
CREATE INDEX CONCURRENTLY idx_orders_broker_id
    ON orders(broker_order_id) WHERE broker_order_id IS NOT NULL;

-- orders: idempotency key (duplicate order prevention)
CREATE UNIQUE INDEX CONCURRENTLY idx_orders_idempotency
    ON orders(idempotency_key);

-- orders: pending fund reservation (wallet service query)
CREATE INDEX CONCURRENTLY idx_orders_pending_funds
    ON orders(status, wallet_id, created_at)
    WHERE status = 'PENDING_FUNDS';

-- trades: user trade history for P&L report
CREATE INDEX CONCURRENTLY idx_trades_user_created
    ON trades(user_id, created_at DESC);

-- trades: settlement batch processing
CREATE INDEX CONCURRENTLY idx_trades_settlement_pending
    ON trades(settlement_date, status) WHERE status = 'PENDING';

-- sips: active SIP list for execution job (CRITICAL batch job)
-- Query: SELECT * FROM sips WHERE status='ACTIVE' AND next_execution_date <= CURRENT_DATE
CREATE INDEX CONCURRENTLY idx_sips_active_exec_date
    ON sips(next_execution_date, status) WHERE status = 'ACTIVE';

-- sips: user SIP list
CREATE INDEX CONCURRENTLY idx_sips_user_status
    ON sips(user_id, status, created_at DESC);

-- ╔══════════════════════════════════════════╗
-- ║         WALLET DATABASE INDEXES          ║
-- ╚══════════════════════════════════════════╝

-- transactions: user transaction history (account statement)
-- Query: SELECT * FROM transactions WHERE wallet_id=$1 ORDER BY created_at DESC LIMIT 50
CREATE INDEX CONCURRENTLY idx_txn_wallet_created
    ON transactions(wallet_id, created_at DESC)
    INCLUDE (direction, amount, transaction_type, status, description);

-- transactions: journal lookup (double-entry pair retrieval)
CREATE INDEX CONCURRENTLY idx_txn_journal
    ON transactions(journal_id);

-- transactions: reference lookup (from order/payment)
CREATE INDEX CONCURRENTLY idx_txn_reference
    ON transactions(reference_id, reference_type) WHERE reference_id IS NOT NULL;

-- transactions: pending processing queue
CREATE INDEX CONCURRENTLY idx_txn_pending
    ON transactions(status, created_at) WHERE status IN ('PENDING','PROCESSING');

-- payments: user payment history
CREATE INDEX CONCURRENTLY idx_payments_user_created
    ON payments(user_id, created_at DESC);

-- payments: gateway callback lookup
CREATE INDEX CONCURRENTLY idx_payments_gateway_id
    ON payments(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;

-- payments: UTR / NEFT ref lookup
CREATE INDEX CONCURRENTLY idx_payments_utr
    ON payments(utr_number) WHERE utr_number IS NOT NULL;

-- payments: pending expiry cleanup
CREATE INDEX CONCURRENTLY idx_payments_pending_expiry
    ON payments(expires_at) WHERE status = 'INITIATED';

-- ╔══════════════════════════════════════════╗
-- ║         AUDIT DATABASE INDEXES           ║
-- ╚══════════════════════════════════════════╝

-- audit_logs: user audit trail (compliance query)
-- Query: SELECT * FROM audit_logs WHERE user_id=$1 ORDER BY event_time DESC
CREATE INDEX CONCURRENTLY idx_audit_user_time
    ON audit_logs(user_id, event_time DESC) WHERE user_id IS NOT NULL;

-- audit_logs: entity history (e.g. all changes to order X)
CREATE INDEX CONCURRENTLY idx_audit_entity_time
    ON audit_logs(entity_type, entity_id, event_time DESC);

-- audit_logs: action-based queries (e.g. all LOGIN_FAILED in last 24h)
CREATE INDEX CONCURRENTLY idx_audit_action_time
    ON audit_logs(action, event_time DESC);

-- audit_logs: suspicious activity monitoring
CREATE INDEX CONCURRENTLY idx_audit_suspicious
    ON audit_logs(is_suspicious, risk_level, event_time DESC)
    WHERE is_suspicious = TRUE;

-- audit_logs: service-level metrics
CREATE INDEX CONCURRENTLY idx_audit_service_time
    ON audit_logs(service_name, event_time DESC);

-- audit_logs: trace ID for distributed tracing
CREATE INDEX CONCURRENTLY idx_audit_trace_id
    ON audit_logs(trace_id) WHERE trace_id IS NOT NULL;

-- ╔══════════════════════════════════════════╗
-- ║         NOTIFICATIONS INDEXES            ║
-- ╚══════════════════════════════════════════╝

-- notifications: unread count badge (very frequent, must be instant)
-- Query: SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE
CREATE INDEX CONCURRENTLY idx_notif_user_unread
    ON notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;

-- notifications: push dispatch queue
CREATE INDEX CONCURRENTLY idx_notif_dispatch_queue
    ON notifications(status, channel, created_at)
    WHERE status = 'PENDING';

-- ╔══════════════════════════════════════════╗
-- ║  PARTIAL INDEXES — HIGH-VALUE FILTERS    ║
-- ╚══════════════════════════════════════════╝

-- Only KYC-verified active users (99% of production traffic)
CREATE INDEX CONCURRENTLY idx_users_verified_active
    ON users(id, phone) WHERE status = 'ACTIVE' AND kyc_status = 'VERIFIED' AND deleted_at IS NULL;

-- Only BUY orders (majority vs SELL for margin computation)
CREATE INDEX CONCURRENTLY idx_orders_buy_active
    ON orders(user_id, symbol, created_at DESC)
    WHERE side = 'BUY' AND status IN ('PLACED','OPEN','PARTIALLY_FILLED');

-- Large transactions (AML monitoring — orders > ₹1 lakh)
CREATE INDEX CONCURRENTLY idx_large_transactions
    ON transactions(wallet_id, created_at DESC, amount)
    WHERE amount > 100000;

-- ╔══════════════════════════════════════════╗
-- ║        BRIN INDEXES (time-series)        ║
-- ╚══════════════════════════════════════════╝
-- BRIN is extremely compact for monotonically-increasing timestamp columns.
-- Use on huge append-only tables where range scans are dominant.

-- audit_logs BRIN — correlated with partition time
CREATE INDEX idx_audit_brin_time ON audit_logs USING brin(event_time) WITH (pages_per_range = 128);

-- portfolio_performance BRIN
CREATE INDEX idx_perf_brin_time ON portfolio_performance USING brin(time) WITH (pages_per_range = 64);
