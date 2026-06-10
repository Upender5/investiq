# InvestIQ :: Complete ER Diagram
## Part 4 & 16 of Enterprise DB Architecture

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    InvestIQ — Entity Relationship Diagram                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────┐
│                           AUTH DATABASE                                      │
│                                                                              │
│  ┌──────────────────────────────┐    ┌───────────────────────┐               │
│  │          USERS               │    │    REFRESH_TOKENS      │               │
│  │──────────────────────────────│    │───────────────────────│               │
│  │ PK  id             UUID      │───►│ PK  id        UUID    │               │
│  │     phone          VARCHAR   │    │ FK  user_id   UUID    │               │
│  │     email          VARCHAR   │    │     token_hash TEXT   │               │
│  │     full_name      VARCHAR   │    │     expires_at TSTZ   │               │
│  │     role           ENUM      │    │     revoked    BOOL   │               │
│  │     kyc_status     ENUM      │    └───────────────────────┘               │
│  │     status         ENUM      │                                            │
│  │     referred_by    UUID ─────┐    ┌───────────────────────┐               │
│  │     created_at     TSTZ      │    │      SESSIONS          │               │
│  └──────────────────────────────┘    │───────────────────────│               │
│           │         │   │            │ PK  id        UUID    │               │
│           │         │   └───────────►│ FK  user_id   UUID    │               │
│           │         │                │ FK  device_id UUID    │               │
│           │         │                │     access_jti UUID   │               │
│           │         │                │     status     ENUM   │               │
│           │         │                └───────────────────────┘               │
│           │         │                                                         │
│           │    ┌────▼──────────────┐  ┌────────────────────────┐             │
│           │    │   USER_ROLES      │  │    USER_DEVICES         │             │
│           │    │───────────────────│  │────────────────────────│             │
│           │    │ FK user_id UUID   │  │ PK  id        UUID     │             │
│           │    │ FK role_id UUID   │  │ FK  user_id   UUID     │             │
│           │    └────────┬──────────┘  │     device_type ENUM   │             │
│           │             │             │     push_token  TEXT   │             │
│           │    ┌────────▼──────────┐  │     is_trusted  BOOL   │             │
│           │    │      ROLES        │  └────────────────────────┘             │
│           │    │───────────────────│                                         │
│           │    │ PK id    UUID     │  ┌────────────────────────┐             │
│           │    │    name  VARCHAR  │  │   FEATURE_FLAGS         │             │
│           │    └────────┬──────────┘  │────────────────────────│             │
│           │             │             │ PK  id        UUID     │             │
│           │    ┌────────▼──────────┐  │     flag_key  VARCHAR  │             │
│           │    │  ROLE_PERMISSIONS │  │     is_enabled BOOL    │             │
│           │    │───────────────────│  │     rollout_pct INT    │             │
│           │    │ FK role_id UUID   │  └────────────────────────┘             │
│           │    │ FK perm_id UUID   │                                         │
│           │    └───────────────────┘                                         │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                           USER DATABASE                                      │
│                                                                              │
│  ┌──────────────────────────────┐                                            │
│  │       USER_PROFILES          │◄── (1:1 with auth.users — same UUID)       │
│  │──────────────────────────────│                                            │
│  │ PK  id            UUID       │──────────────────────────────────┐         │
│  │     phone         VARCHAR    │                                  │         │
│  │     full_name     VARCHAR    │  ┌─────────────────────────┐     │         │
│  │     date_of_birth DATE       │  │     KYC_DOCUMENTS        │     │         │
│  │     kyc_status    ENUM       │  │─────────────────────────│     │         │
│  │     kyc_verified_at TSTZ     │  │ PK  id        UUID      │◄────┘         │
│  └──────────────────────────────┘  │ FK  user_id   UUID      │              │
│           │                        │     doc_type  ENUM      │              │
│           │                        │     doc_num_enc TEXT    │              │
│           ├──────────────────────► │     status    ENUM      │              │
│           │                        └─────────────────────────┘              │
│           │                                                                  │
│  ┌────────▼─────────────────┐    ┌────────────────────────────┐             │
│  │       ADDRESSES          │    │       BANK_ACCOUNTS         │             │
│  │──────────────────────────│    │────────────────────────────│             │
│  │ PK  id        UUID       │    │ PK  id         UUID        │             │
│  │ FK  user_id   UUID       │    │ FK  user_id    UUID        │             │
│  │     type      VARCHAR    │    │     bank_ifsc  VARCHAR     │             │
│  │     address1  VARCHAR    │    │     acct_num_enc TEXT      │             │
│  │     pincode   CHAR(6)    │    │     acct_mask  VARCHAR     │             │
│  └──────────────────────────┘    │     status     ENUM       │             │
│                                  └────────────────────────────┘             │
│  ┌─────────────────────────┐     ┌────────────────────────────┐             │
│  │       NOMINEES          │     │      RISK_PROFILES         │             │
│  │─────────────────────────│     │────────────────────────────│             │
│  │ PK  id        UUID      │     │ PK  id         UUID        │             │
│  │ FK  user_id   UUID      │     │ FK  user_id    UUID        │             │
│  │     full_name VARCHAR   │     │     risk_cat   ENUM        │             │
│  │     relation  ENUM      │     │     risk_score SMALLINT    │             │
│  │     share_pct DECIMAL   │     │     is_current BOOL        │             │
│  └─────────────────────────┘     └────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                    PORTFOLIO + MARKET DATABASE                                │
│                                                                              │
│  ┌────────────────────────────┐     ┌──────────────────────────────────┐    │
│  │        PORTFOLIOS          │     │         STOCKS                   │    │
│  │────────────────────────────│     │──────────────────────────────────│    │
│  │ PK  id          UUID       │     │ PK  id          UUID             │    │
│  │     user_id     UUID       │     │     symbol      VARCHAR          │    │
│  │     name        VARCHAR    │     │     isin        CHAR(12)         │    │
│  │     is_default  BOOL       │     │     company_name VARCHAR         │    │
│  └──────────┬─────────────────┘     │     sector      VARCHAR          │    │
│             │                       │     market_cap  ENUM             │    │
│    1:Many   │                       └──────────────────────────────────┘    │
│             │                                                                │
│  ┌──────────▼─────────────────┐     ┌──────────────────────────────────┐    │
│  │    PORTFOLIO_HOLDINGS      │     │         MUTUAL_FUNDS             │    │
│  │────────────────────────────│     │──────────────────────────────────│    │
│  │ PK  id           UUID      │     │ PK  id           UUID            │    │
│  │ FK  portfolio_id UUID      │     │     scheme_code  VARCHAR         │    │
│  │     symbol       VARCHAR   │     │     scheme_name  VARCHAR         │    │
│  │     quantity     NUMERIC   │     │     nav          NUMERIC         │    │
│  │     avg_buy_price NUMERIC  │     │     category     ENUM            │    │
│  │     current_value NUMERIC  │     └──────────────────────────────────┘    │
│  │     unrealised_pnl NUMERIC │                                             │
│  └────────────────────────────┘     ┌──────────────────────────────────┐    │
│             │                       │      OHLCV_DAILY  (TimescaleDB)  │    │
│             │                       │──────────────────────────────────│    │
│  ┌──────────▼─────────────────┐     │     time   TSTZ  PK             │    │
│  │  PORTFOLIO_PERFORMANCE     │     │     symbol VARCHAR  PK          │    │
│  │  (TimescaleDB hypertable)  │     │     open   NUMERIC              │    │
│  │────────────────────────────│     │     high   NUMERIC              │    │
│  │     time         TSTZ  PK  │     │     low    NUMERIC              │    │
│  │ FK  portfolio_id UUID      │     │     close  NUMERIC              │    │
│  │     total_value  NUMERIC   │     │     volume BIGINT               │    │
│  │     total_pnl    NUMERIC   │     └──────────────────────────────────┘    │
│  └────────────────────────────┘                                             │
│                                                                              │
│  ┌────────────────────────────┐     ┌──────────────────────────────────┐    │
│  │       WATCHLISTS           │     │         WATCHLIST_ITEMS          │    │
│  │────────────────────────────│     │──────────────────────────────────│    │
│  │ PK  id       UUID          │────►│ PK  id           UUID            │    │
│  │     user_id  UUID          │     │ FK  watchlist_id UUID            │    │
│  │     name     VARCHAR       │     │     symbol       VARCHAR         │    │
│  └────────────────────────────┘     │     alert_above  NUMERIC         │    │
│                                     │     alert_below  NUMERIC         │    │
│                                     └──────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                         TRADE DATABASE                                       │
│                                                                              │
│  ┌────────────────────────────┐                                             │
│  │   ORDERS  (partitioned)    │                                             │
│  │────────────────────────────│                                             │
│  │ PK  id            UUID     │────────────────────────────┐               │
│  │     user_id       UUID     │                            │               │
│  │     symbol        VARCHAR  │    ┌──────────────────────▼──────────┐    │
│  │     side          ENUM     │    │      ORDER_EXECUTIONS           │    │
│  │     order_type    ENUM     │    │─────────────────────────────────│    │
│  │     quantity      NUMERIC  │    │ PK  id         UUID             │    │
│  │     price         NUMERIC  │    │ FK  order_id   UUID             │    │
│  │     status        ENUM     │    │     fill_qty   NUMERIC          │    │
│  │     idempotency_key VARCHAR│    │     fill_price NUMERIC          │    │
│  └──────────┬─────────────────┘    └────────────┬───────────────────┘    │
│             │                                   │                          │
│    1:Many   │                          1:1       │                          │
│             │                                   │                          │
│  ┌──────────▼─────────────────┐    ┌────────────▼───────────────────┐    │
│  │      SIPS                  │    │    TRADES  (partitioned)        │    │
│  │────────────────────────────│    │────────────────────────────────│    │
│  │ PK  id         UUID        │    │ PK  id           UUID          │    │
│  │     user_id    UUID        │    │ FK  order_id     UUID          │    │
│  │     symbol     VARCHAR     │    │ FK  execution_id UUID          │    │
│  │     amount_inr NUMERIC     │    │     settlement_date DATE       │    │
│  │     frequency  ENUM        │    │     status       ENUM         │    │
│  │     status     ENUM        │    │     net_amount   NUMERIC      │    │
│  └──────────┬─────────────────┘    └────────────────────────────────┘    │
│             │                                                               │
│  ┌──────────▼─────────────────┐                                           │
│  │     SIP_EXECUTIONS         │                                           │
│  │────────────────────────────│                                           │
│  │ PK  id      UUID           │                                           │
│  │ FK  sip_id  UUID           │                                           │
│  │     status  VARCHAR        │                                           │
│  └────────────────────────────┘                                           │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                         WALLET DATABASE                                      │
│                                                                              │
│  ┌────────────────────────────┐                                             │
│  │        WALLETS             │                                             │
│  │────────────────────────────│                                             │
│  │ PK  id             UUID    │─────────────────────────┐                  │
│  │     user_id        UUID    │                         │                  │
│  │     wallet_type    ENUM    │    ┌────────────────────▼──────────┐       │
│  │     balance        NUMERIC │    │  TRANSACTIONS  (partitioned)  │       │
│  │     locked_balance NUMERIC │    │───────────────────────────────│       │
│  │     status         ENUM    │    │ PK  id           UUID         │       │
│  │     version        BIGINT  │    │ FK  wallet_id    UUID         │       │
│  └────────────────────────────┘    │     journal_id   UUID  ←─────┼──┐    │
│                                    │     direction    ENUM         │  │    │
│                                    │     amount       NUMERIC      │  │    │
│                                    │     transaction_type ENUM     │  │    │
│                                    │     status       ENUM         │  │    │
│                                    └───────────────────────────────┘  │    │
│                                                                        │    │
│  ┌────────────────────────────┐    Double-entry: DEBIT ─────────────┘    │
│  │      PAYMENTS              │    journal_id links the pair              │
│  │────────────────────────────│                                           │
│  │ PK  id            UUID     │                                           │
│  │ FK  wallet_id     UUID     │                                           │
│  │     gateway       VARCHAR  │                                           │
│  │     gateway_pay_id VARCHAR │                                           │
│  │     amount        NUMERIC  │                                           │
│  │     status        ENUM     │                                           │
│  │     utr_number    VARCHAR  │                                           │
│  └────────────────────────────┘                                           │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                    GOALS  + AUDIT  + NOTIFICATIONS                           │
│                                                                              │
│  ┌────────────────────────────┐     ┌──────────────────────────────────┐    │
│  │         GOALS              │     │  AUDIT_LOGS  (partitioned, immutable)  │
│  │────────────────────────────│     │──────────────────────────────────│    │
│  │ PK  id          UUID       │     │ PK  id         UUID              │    │
│  │     user_id     UUID       │     │     user_id    UUID              │    │
│  │     goal_type   ENUM       │     │     action     ENUM              │    │
│  │     target_amt  NUMERIC    │     │     entity_type ENUM             │    │
│  │     target_date DATE       │     │     entity_id  UUID              │    │
│  │     progress_pct NUMERIC   │     │     old_values JSONB             │    │
│  └──────────┬─────────────────┘     │     new_values JSONB             │    │
│             │                       │     event_time TSTZ              │    │
│  ┌──────────▼─────────────────┐     │     checksum   TEXT              │    │
│  │    GOAL_INVESTMENTS        │     └──────────────────────────────────┘    │
│  │────────────────────────────│                                             │
│  │ PK  id       UUID          │     ┌──────────────────────────────────┐    │
│  │ FK  goal_id  UUID          │     │  NOTIFICATIONS  (partitioned)    │    │
│  │     amount   NUMERIC       │     │──────────────────────────────────│    │
│  │     order_id UUID          │     │ PK  id         UUID              │    │
│  └────────────────────────────┘     │     user_id    UUID              │    │
│                                     │     channel    ENUM              │    │
│                                     │     title      VARCHAR           │    │
│                                     │     status     ENUM              │    │
│                                     │     is_read    BOOL              │    │
│                                     └──────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════
               RELATIONSHIP SUMMARY
══════════════════════════════════════════════════════════

ONE-TO-ONE:
  auth.users         ──── user_profiles         (same UUID as PK)
  user_profiles      ──── risk_profiles          (one current profile)
  orders             ──── order_executions       (per fill)
  wallets            ──── users                  (one wallet per user)

ONE-TO-MANY:
  users              ──── refresh_tokens          (many tokens)
  users              ──── sessions                (many sessions)
  users              ──── user_devices            (many devices)
  user_profiles      ──── kyc_documents           (one per doc type)
  user_profiles      ──── addresses               (home, permanent, etc.)
  user_profiles      ──── bank_accounts           (multiple bank accounts)
  user_profiles      ──── nominees                (one or more)
  portfolios         ──── portfolio_holdings       (many holdings)
  portfolios         ──── portfolio_performance    (daily snapshots)
  users              ──── portfolios              (multiple portfolios)
  users              ──── orders                  (many orders)
  users              ──── payments                (many payments)
  users              ──── goals                   (multiple goals)
  goals              ──── goal_investments         (many investments per goal)
  sips               ──── sip_executions          (monthly executions)
  orders             ──── trades                  (one order → many trades/fills)
  wallets            ──── transactions             (double-entry ledger)
  users              ──── notifications            (many notifications)
  support_tickets    ──── ticket_comments          (comment thread)

MANY-TO-MANY:
  users              ──── roles                   (via user_roles)
  roles              ──── permissions             (via role_permissions)
  watchlists         ──── stocks/mf/etf           (via watchlist_items)
  users              ──── stocks (indirect)        (via portfolio_holdings)
  users              ──── sips                    (many SIPs per user)
```
