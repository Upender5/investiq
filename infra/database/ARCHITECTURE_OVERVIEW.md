# InvestIQ :: Enterprise Database Architecture
## Master Overview — All 16 Parts

---

## PART 1 — DATABASE STRATEGY

### Why PostgreSQL?
| Reason | Detail |
|--------|--------|
| **ACID Compliance** | Critical for financial transactions — wallet debits/credits must be atomic |
| **Double-Entry Ledger** | Transactions table uses journal_id to link DEBIT+CREDIT pair atomically |
| **Row Level Security** | Native RLS ensures one service cannot read another's data |
| **Partitioning** | Declarative range partitioning on orders/transactions by month — essential at 10M users |
| **TimescaleDB** | Extension converts PostgreSQL into a high-performance time-series DB for OHLCV data |
| **pgcrypto** | Built-in column-level encryption for Aadhaar/PAN — no external service needed |
| **Mature ecosystem** | pg_partman, PgBouncer, Patroni, pg_stat_statements — battle-tested at scale |
| **Cost** | Open-source; RDS costs 60% less than Oracle/SQL Server equivalent |

**Limitations:** Not ideal for unstructured/semi-structured data (use MongoDB), not for sub-millisecond key-value (use Redis), horizontal write sharding is complex (use Citus at 10M+).

**Scaling:** Vertical → Read replicas → Citus sharding → Aurora Limitless

---

### Why MongoDB?
| Reason | Detail |
|--------|--------|
| **AI Conversations** | Chat history is nested, variable-length — perfect document model |
| **Market News** | News articles with variable fields, full-text search, TTL auto-expiry |
| **User Preferences** | Flexible JSON schema — UI config varies per app version |
| **Stock Insights** | AI-generated analysis is deeply nested, schema evolves over time |
| **Horizontal Sharding** | Native hash sharding on user_id — scales to 50M+ users easily |

**Limitations:** No multi-document ACID (use within-document operations), eventual consistency by default, higher memory usage.

**Scaling:** Atlas M30 → M50 → M200 → Global Clusters

---

### Why Redis?
| Reason | Detail |
|--------|--------|
| **Sub-millisecond latency** | Live stock prices need < 1ms reads — PostgreSQL cannot compete |
| **Session store** | JWT blacklist + active sessions: O(1) lookup, automatic TTL |
| **Rate limiting** | Atomic INCR + EXPIRE for sliding window rate limits |
| **Pub/Sub** | Real-time price feed broadcast to WebSocket clients |
| **Portfolio cache** | 2-minute snapshot prevents thundering herd on portfolio DB |

**Limitations:** Memory-only (cold restart loses data), not a source of truth, limited query capability.

**Scaling:** ElastiCache cluster mode → ElastiCache Serverless

---

### Why Kafka?
| Reason | Detail |
|--------|--------|
| **Event-driven decoupling** | Trade service doesn't need to call wallet/portfolio/notification synchronously |
| **Guaranteed delivery** | At-least-once delivery with idempotent consumers |
| **Replay** | Re-process events for DR recovery or new service onboarding |
| **High throughput** | 500K price ticks/second during market hours — no other system handles this |
| **Audit stream** | investiq.audit.event topic with 5-year retention = tamper-evident audit trail |

**Limitations:** Operational complexity (but MSK removes this), not suitable for request-reply patterns (use REST/gRPC).

**Scaling:** MSK 3 brokers → 6 → 12; partitions auto-scale

---

## PART 2 — DATABASE INVENTORY

| Database | Service | Engine | Purpose | Volume (10M) | Retention |
|---|---|---|---|---|---|
| investiq_auth | auth-service | PostgreSQL 17 | Users, sessions, OTPs, RBAC | 50 GB | Forever |
| investiq_users | user-service | PostgreSQL 17 | KYC, profiles, bank accounts | 100 GB | 10 years |
| investiq_portfolio | portfolio-service | PostgreSQL 17 + TimescaleDB | Holdings, performance history | 500 GB | 10 years |
| investiq_trades | trade-service | PostgreSQL 17 | Orders, trades, SIPs | 1 TB | 7 years |
| investiq_wallet | wallet-service | PostgreSQL 17 | Wallets, transactions, payments | 500 GB | 7 years |
| investiq_market | market-data-service | PostgreSQL 17 + TimescaleDB | Stocks, OHLCV, watchlists | 2 TB | 20 years |
| investiq_notifications | notification-service | PostgreSQL 17 | Notifications, templates | 200 GB | 1 year |
| investiq_goals | goals-service | PostgreSQL 17 | Goals, investments | 50 GB | Forever |
| investiq_audit | audit-service | PostgreSQL 17 | Immutable audit logs, AML | 2 TB | 7 years |
| investiq_support | support-service | PostgreSQL 17 | Tickets, comments | 20 GB | 5 years |
| investiq_ai | ai/analytics | MongoDB Atlas M30 | Conversations, news, insights | 500 GB | 3 years |
| Redis Cluster | All services | Redis 7.2 | Cache, sessions, rate limit | 64 GB RAM | TTL-based |
| Kafka | All services | AWS MSK 3.7 | Event streaming | 500 GB disk | 7-90 days |

---

## PART 16 — PRODUCTION DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AWS ap-south-1  (Mumbai)                             │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    VPC: 10.0.0.0/16                                  │  │
│  │                                                                      │  │
│  │  Public Subnets (AZ a/b/c)          Private Subnets (AZ a/b/c)      │  │
│  │  ┌──────────────────────┐           ┌────────────────────────────┐  │  │
│  │  │   AWS ALB            │           │  EKS Cluster               │  │  │
│  │  │   CloudFront (CDN)   │──────────►│  10 microservices          │  │  │
│  │  │   NAT Gateway        │           │  (3 replicas each)         │  │  │
│  │  └──────────────────────┘           └─────────────┬──────────────┘  │  │
│  │                                                   │                 │  │
│  │  Database Subnets (isolated, no internet)         │                 │  │
│  │  ┌──────────────────────────────────────────────▼────────────────┐ │  │
│  │  │                                                                │ │  │
│  │  │  ┌──────────────────┐    ┌───────────────────────────────┐   │ │  │
│  │  │  │  RDS PostgreSQL  │    │  ElastiCache Redis 7.2        │   │ │  │
│  │  │  │  (Multi-AZ)      │    │  (Cluster: 3 shards × 2 reps) │   │ │  │
│  │  │  │  db.r7g.4xlarge  │    │  cache.r7g.xlarge             │   │ │  │
│  │  │  │  + 5 Read Replicas│   └───────────────────────────────┘   │ │  │
│  │  │  │  PgBouncer (HA)  │                                         │ │  │
│  │  │  └──────────────────┘    ┌───────────────────────────────┐   │ │  │
│  │  │                          │  AWS MSK Kafka 3.7            │   │ │  │
│  │  │  ┌──────────────────┐    │  (3 brokers, AZ a/b/c)        │   │ │  │
│  │  │  │  MongoDB Atlas   │    │  kafka.m5.4xlarge             │   │ │  │
│  │  │  │  M30 (3-node RS) │    └───────────────────────────────┘   │ │  │
│  │  │  └──────────────────┘                                         │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Support Services:                                                          │
│  • AWS Secrets Manager → all DB credentials                                 │
│  • AWS KMS → encryption keys for PII columns                               │
│  • AWS CloudTrail → all API calls logged                                    │
│  • AWS WAF → SQL injection / rate limiting at edge                          │
│  • AWS GuardDuty → threat detection                                         │
│  • AWS Config → compliance monitoring                                       │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │  Async replication (WAL streaming < 30 sec lag)
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AWS ap-southeast-1  (Singapore) DR                       │
│  • RDS Read Replica → promotable in 5 min                                   │
│  • ElastiCache warm standby                                                  │
│  • MSK MirrorMaker 2 (Kafka replication)                                    │
│  • MongoDB Atlas Global Cluster (read from Singapore)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Index

```
infra/database/
├── ARCHITECTURE_OVERVIEW.md              ← This file (Parts 1, 2, 16)
├── ER_DIAGRAM.md                         ← Part 4: Complete ER diagram
├── COMPLIANCE_AND_FINTECH.md             ← Part 11: SEBI/RBI/GDPR/PCI-DSS
├── SCALABILITY_AND_RISK_REGISTER.md      ← Parts 14 & 15
│
├── postgresql/
│   ├── schemas/
│   │   ├── V1__auth_complete_schema.sql           ← Auth DB (Part 3)
│   │   ├── V2__user_kyc_complete_schema.sql        ← User/KYC DB (Part 3)
│   │   ├── V3__portfolio_schema.sql                ← Portfolio DB (Part 3)
│   │   ├── V4__market_instruments_schema.sql       ← Market DB (Part 3)
│   │   ├── V5__trade_orders_extended_schema.sql    ← Trade DB (Part 3)
│   │   ├── V6__wallet_payments_schema.sql          ← Wallet DB (Part 3)
│   │   └── V7__goals_notifications_support_schema.sql
│   │   └── V8__audit_activity_schema.sql           ← Audit DB (Part 3)
│   │
│   ├── indexes/
│   │   └── indexing_strategy.sql                   ← Part 5: All indexes
│   │
│   ├── partitioning/   (inline in schema files)    ← Part 6
│   │
│   └── security/
│       └── rls_and_encryption.sql                  ← Part 10: RLS + Encryption
│
├── mongodb/
│   └── collections_schema.js                       ← Part 7: MongoDB design
│
├── redis/
│   └── key_design.md                               ← Part 8: Redis design
│
├── kafka/
│   └── topic_design.yml                            ← Part 9: Kafka design
│
├── monitoring/
│   └── observability.sql                           ← Part 13: Observability
│
└── backup/
    └── backup_dr_plan.md                           ← Part 12: Backup & DR
```

---

## Quick Start — Apply All Schemas

```bash
#!/bin/bash
# Apply all schemas to local dev environment
set -e

PGHOST=localhost PGPORT=5432 PGUSER=postgres

apply_schema() {
    echo "Applying $1 to $2..."
    psql -h $PGHOST -p $PGPORT -U $PGUSER -d $2 -f $1
}

# Create all databases
psql -U postgres -c "
CREATE DATABASE investiq_auth;
CREATE DATABASE investiq_users;
CREATE DATABASE investiq_portfolio;
CREATE DATABASE investiq_trades;
CREATE DATABASE investiq_wallet;
CREATE DATABASE investiq_market;
CREATE DATABASE investiq_notifications;
CREATE DATABASE investiq_goals;
CREATE DATABASE investiq_audit;
CREATE DATABASE investiq_support;
"

# Apply schemas
apply_schema V1__auth_complete_schema.sql          investiq_auth
apply_schema V2__user_kyc_complete_schema.sql      investiq_users
apply_schema V3__portfolio_schema.sql              investiq_portfolio
apply_schema V4__market_instruments_schema.sql     investiq_market
apply_schema V5__trade_orders_extended_schema.sql  investiq_trades
apply_schema V6__wallet_payments_schema.sql        investiq_wallet
apply_schema V7__goals_notifications_support_schema.sql investiq_goals
apply_schema V8__audit_activity_schema.sql         investiq_audit

# Apply security
apply_schema ../security/rls_and_encryption.sql   investiq_wallet

# Apply indexes (run after data load for speed)
# psql -U postgres -d investiq_trades -f ../indexes/indexing_strategy.sql

echo "✅ All schemas applied successfully"
```
