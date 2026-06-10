# InvestIQ :: Scalability Design + Production Risk Register
## Parts 14 & 15 of Enterprise DB Architecture

---

# PART 14 — SCALABILITY DESIGN

## Growth Tiers

| Metric | 1M Users | 5M Users | 10M Users | 50M Users |
|--------|----------|----------|-----------|-----------|
| Daily Active Users | 100K | 500K | 1M | 5M |
| Orders/day | 500K | 2.5M | 5M | 25M |
| Price ticks/sec | 5K | 5K | 50K | 100K |
| DB Read QPS | 5K | 25K | 50K | 250K |
| DB Write QPS | 500 | 2.5K | 5K | 25K |
| Storage (PG) | 500 GB | 2 TB | 5 TB | 25 TB |
| Redis Memory | 8 GB | 32 GB | 64 GB | 256 GB |
| Kafka msgs/sec | 10K | 50K | 100K | 500K |

---

## Tier 1 — 1 Million Users

### PostgreSQL
```yaml
rds_instance: db.r7g.xlarge    # 4 vCPU, 32 GB RAM
multi_az: true
read_replicas: 1
storage: 500 GB gp3 (6000 IOPS)
pgbouncer:
  mode: transaction
  max_client_conn: 2000
  default_pool_size: 20
shared_buffers: 8GB
effective_cache_size: 24GB
work_mem: 16MB
max_connections: 200
```

### Redis
```yaml
instance: cache.r7g.large      # 2 vCPU, 13 GB
cluster_mode: false
replicas: 1
```

### Kafka
```yaml
brokers: 3
instance: kafka.m5.large
partitions_per_topic: 12 (avg)
```

### MongoDB Atlas
```yaml
tier: M30                      # 8 vCPU, 32 GB
shards: 1
```

**Estimated monthly AWS cost: ~$3,500**

---

## Tier 2 — 5 Million Users

### PostgreSQL (Read Scaling)
```yaml
rds_instance: db.r7g.2xlarge   # 8 vCPU, 64 GB
read_replicas: 3               # 1 for app reads, 1 for analytics, 1 for DR
pgbouncer_pool_size: 50
storage: 2 TB gp3 (12000 IOPS)
# Vertical scaling + read offloading
read_replica_routing:
  app_reads: replica-1          # portfolio, watchlist, market data
  analytics: replica-2          # reports, AI training data
  dr: replica-3                 # Singapore (async)
```

### Connection pooling (PgBouncer cluster)
```yaml
pgbouncer_instances: 3         # HA cluster with HAProxy in front
max_client_conn: 10000
default_pool_size: 50
server_lifetime: 3600
```

### Redis Cluster
```yaml
cluster_mode: true
shards: 3
replica_per_shard: 1
instance: cache.r7g.xlarge     # 4 vCPU, 32 GB per node
total_memory: 96 GB
```

### Schema Changes for 5M
```sql
-- Enable parallel query
SET max_parallel_workers_per_gather = 4;

-- Partition orders by month (already done)
-- Add covering indexes for hot queries
-- Enable pg_partman for automatic partition management

CREATE EXTENSION IF NOT EXISTS pg_partman;
SELECT partman.create_parent(
    p_parent_table => 'public.orders',
    p_control => 'created_at',
    p_type => 'range',
    p_interval => 'monthly',
    p_premake => 3
);
```

**Estimated monthly AWS cost: ~$12,000**

---

## Tier 3 — 10 Million Users

### PostgreSQL (Vertical + Horizontal)
```yaml
primary: db.r7g.4xlarge        # 16 vCPU, 128 GB — writes
read_replicas: 5
  - replica-1: app hot reads (portfolio, orders)
  - replica-2: market data + search
  - replica-3: analytics + reporting
  - replica-4: AI training data
  - replica-5: DR Singapore
storage: 5 TB gp3 (20000 IOPS)

# Database sharding by service (already done — each service has own DB)
# Within wallet-service DB: shard transactions by user_id hash
# Citus extension for distributed PostgreSQL
```

### Citus Distributed PostgreSQL (transactions table)
```sql
-- Install Citus for distributed transactions table
CREATE EXTENSION IF NOT EXISTS citus;

-- Distribute the high-volume transactions table
SELECT create_distributed_table('transactions', 'wallet_id');
SELECT create_distributed_table('orders', 'user_id');

-- Reference tables (read on every shard)
SELECT create_reference_table('stocks');
SELECT create_reference_table('mutual_funds');
```

### Redis Cluster (10M)
```yaml
cluster_mode: true
shards: 6
replica_per_shard: 2           # Read from replicas
instance: cache.r7g.2xlarge    # 8 vCPU, 64 GB per node
total_memory: 384 GB
keyspace_notifications: true   # For real-time expiry callbacks
```

### Kafka (10M)
```yaml
brokers: 6                     # Scale from 3
instance: kafka.m5.4xlarge
partitions_per_topic: 48 (avg)
topics:
  investiq.market.price.tick: 100 partitions
  investiq.order.created: 48 partitions
  investiq.analytics.event: 48 partitions
```

**Estimated monthly AWS cost: ~$28,000**

---

## Tier 4 — 50 Million Users (Future)

### Strategy: Full Microservices DB Sharding + Global Distribution

```yaml
architecture:
  postgresql:
    - Use Aurora PostgreSQL Limitless (unlimited scaling)
    - OR: Citus with 10+ shards
    - Cross-region active-active (ap-south-1 + ap-southeast-1 + eu-west-1)
    - CRDB (CockroachDB) for global user table
    
  redis:
    - ElastiCache Serverless (auto-scales, $0.034/GB-hour)
    - Global Datastore for cross-region replication
    
  kafka:
    - 12+ brokers
    - 200+ partitions for price topics
    - Confluent Cloud auto-scaling
    
  mongodb:
    - Atlas M200 (96 vCPU, 768 GB)
    - 5+ shards
    - Global Clusters (read from nearest region)

cost_estimate: "$100,000+/month"
```

---

## Load Balancing Strategy

```
Internet
  │
  ▼
AWS Route53 (Latency-based routing)
  │
  ▼
AWS CloudFront (CDN for static/market data)
  │
  ▼
AWS ALB (Application Load Balancer)
  │
  ├──► API Gateway (Kong / AWS API GW) — rate limiting, auth
  │         │
  │         ├──► Auth Service (3-10 pods, HPA)
  │         ├──► User Service (2-6 pods, HPA)
  │         ├──► Trade Service (5-20 pods, HPA)
  │         ├──► Wallet Service (3-10 pods, HPA)
  │         ├──► Market Data (3-10 pods, HPA)
  │         └──► AI Advisor (2-8 pods, HPA)
  │
  └──► PgBouncer pool (3 nodes, HAProxy)
            │
            ├──► PostgreSQL Primary (writes)
            └──► PostgreSQL Replicas (reads)
```

---

# PART 15 — TOP 50 DATABASE RISKS

## Risk Matrix Key
- **Impact:** 1-5 (5 = platform down / regulatory action)
- **Likelihood:** 1-5 (5 = very likely without mitigation)
- **Score = Impact × Likelihood**

---

## 🔴 CRITICAL (Score ≥ 16)

| # | Risk | Impact | Likelihood | Score | Mitigation |
|---|------|--------|------------|-------|------------|
| 1 | **Primary DB failure with no replica** | 5 | 3 | 15 | Multi-AZ RDS; automated failover in <30 sec |
| 2 | **Double-spend: race condition on wallet balance** | 5 | 4 | 20 | Optimistic locking (version column) + DB-level CHECK(balance≥0) |
| 3 | **Plaintext PAN/Aadhaar in DB** | 5 | 3 | 15 | pgcrypto column encryption + Vault; PII never in logs |
| 4 | **Single-region deployment** | 5 | 2 | 10 | Cross-region read replica (Singapore); DR runbook tested monthly |
| 5 | **Missing audit trail for financial transactions** | 5 | 2 | 10 | Immutable audit_logs table + no UPDATE/DELETE rules |
| 6 | **Connection pool exhaustion under load** | 4 | 4 | 16 | PgBouncer transaction mode; alert at 80% connections |
| 7 | **Kafka consumer lag on order.executed (funds not settled)** | 5 | 3 | 15 | Dead-letter topic; idempotent consumers; lag alert < 10s |
| 8 | **Partition missing: order placed in wrong date** | 4 | 3 | 12 | Default partition catches overflow; pg_partman auto-creates |
| 9 | **Redis eviction deletes active session token** | 4 | 3 | 12 | Sessions in `noeviction` DB (DB 1); dedicated memory allocation |
| 10 | **SQL injection via unsanitized input** | 5 | 2 | 10 | Parameterized queries only; no string concatenation in SQL |

---

## 🟠 HIGH (Score 9–15)

| # | Risk | Impact | Likelihood | Score | Mitigation |
|---|------|--------|------------|-------|------------|
| 11 | **Replication lag causing stale reads** | 3 | 4 | 12 | Sticky sessions for critical reads (wallets, KYC); lag alert >5s |
| 12 | **Large table scan on orders without partition pruning** | 3 | 4 | 12 | Always include created_at in WHERE; review EXPLAIN plans |
| 13 | **Index bloat on high-insert tables** | 3 | 4 | 12 | Weekly REINDEX CONCURRENTLY job; bloat alert >30% |
| 14 | **Autovacuum falling behind on transactions table** | 3 | 4 | 12 | Tune autovacuum per table; manual VACUUM schedule |
| 15 | **MongoDB sharding hot spot on single shard** | 3 | 3 | 9 | Hash sharding on user_id; monitor shard size balance |
| 16 | **Kafka topic retention too short (order events lost)** | 4 | 3 | 12 | 30-day retention for financial topics; S3 export via Kafka Connect |
| 17 | **Backup not validated — silent backup failure** | 4 | 3 | 12 | Monthly automated restore test; alert if validation fails |
| 18 | **RLS policy misconfiguration exposing other users' data** | 5 | 2 | 10 | Integration test: verify user A cannot access user B's data |
| 19 | **Dead-letter queue (DLQ) growing silently** | 3 | 4 | 12 | Alert if DLQ depth > 100; auto-retry with exponential backoff |
| 20 | **WAL archive failure (S3 unreachable)** | 4 | 2 | 8 | Archive to both S3 regions; alert on archive_command failure |
| 21 | **TimescaleDB chunk not compressing** | 2 | 4 | 8 | Verify compression policy; weekly chunk health check |
| 22 | **AI conversation data including real PAN in chat** | 4 | 3 | 12 | Regex-based PII scrubber on all AI inputs/outputs |
| 23 | **Feature flag not cached — DB hit on every request** | 2 | 4 | 8 | Redis cache with 5-min TTL; fallback to DB |
| 24 | **SIP execution job failure on bank holiday** | 3 | 3 | 9 | NSE holiday calendar in scheduler; skip + retry next business day |
| 25 | **Order idempotency key collision** | 4 | 2 | 8 | UNIQUE constraint on idempotency_key; UUID includes timestamp |

---

## 🟡 MEDIUM (Score 4–8)

| # | Risk | Impact | Likelihood | Score | Mitigation |
|---|------|--------|------------|-------|------------|
| 26 | **Slow AI response caching miss** | 2 | 4 | 8 | Cache per (user, symbol, risk_profile) key; fallback = generate |
| 27 | **Mutual fund NAV not updated** | 3 | 3 | 9 | AMFI API polling every 20 min; stale data alert |
| 28 | **UserProfile deleted but auth.users still active** | 3 | 2 | 6 | Saga pattern for cross-service delete; compensating transaction |
| 29 | **KYC re-expiry not triggered (10-yr SEBI rule)** | 3 | 2 | 6 | background-jobs checks kyc_expires_at daily; re-KYC notification |
| 30 | **MongoDB Atlas cluster overloaded during market hours** | 3 | 3 | 9 | Auto-scaling enabled M30→M50; pre-scale before market open |
| 31 | **Long transaction holding WAL slots** | 3 | 3 | 9 | idle_in_transaction_session_timeout = 30s |
| 32 | **Support ticket SLA breach undetected** | 2 | 4 | 8 | Cron job checks sla_deadline every 30 min; escalation alert |
| 33 | **Notification DLQ growing — user never notified of trade** | 3 | 3 | 9 | Retry with backoff; in-app fallback always attempted |
| 34 | **Partition table statistics not updated after mass insert** | 2 | 3 | 6 | pg_partman runs ANALYZE on new partitions |
| 35 | **Watcher for price alerts (Redis TTL expiry) misses edge** | 2 | 3 | 6 | Keyspace notification + fallback sweep job every minute |
| 36 | **Cross-service data inconsistency (eventual consistency)** | 3 | 3 | 9 | Outbox pattern; saga compensating transactions |
| 37 | **Excessive sequential scans on analytics queries** | 2 | 4 | 8 | Materialized views for heavy reports; refresh nightly |
| 38 | **Cassandra (Redis) jitter causing OTP false-expiry** | 2 | 2 | 4 | 10-sec grace buffer on OTP TTL check |
| 39 | **Bank account IFSC validation accepts invalid format** | 2 | 3 | 6 | DB CHECK constraint; server-side validation |
| 40 | **Missing covering index on notifications unread count** | 2 | 4 | 8 | Partial index on (user_id, is_read) WHERE is_read=FALSE |

---

## 🟢 LOW (Score 1–3)

| # | Risk | Impact | Likelihood | Score | Mitigation |
|---|------|--------|------------|-------|------------|
| 41 | **BRIN index not refreshing after bulk inserts** | 1 | 3 | 3 | VACUUM after bulk load; pg_brin_revmap_rebuild |
| 42 | **pg_stat_statements reset losing slow query history** | 1 | 3 | 3 | Prometheus scrape every 30s; alert on reset |
| 43 | **MongoDB text index search timeout** | 2 | 2 | 4 | Atlas Search (Lucene) for production full-text |
| 44 | **Nominee share percentages not summing to 100%** | 2 | 2 | 4 | DB-level check via trigger; application validation |
| 45 | **Expired partition not detached from parent table** | 1 | 3 | 3 | pg_partman archival job detaches + moves to S3 |
| 46 | **Redis cluster split-brain** | 3 | 1 | 3 | AWS ElastiCache handles split-brain via cluster manager |
| 47 | **Slow GIN index update on arrays (tags, etc.)** | 1 | 3 | 3 | fastupdate = off for real-time consistency |
| 48 | **Hardcoded DB password in docker-compose committed** | 5 | 1 | 5 | .env in .gitignore; pre-commit hook checks for secrets |
| 49 | **Timezone mismatch in date calculations** | 2 | 2 | 4 | All timestamps stored as TIMESTAMPTZ; app uses UTC |
| 50 | **Feature flag cache poisoning** | 2 | 1 | 2 | Versioned cache keys; TTL max 5 min; signed flag values |

---

## Top 10 Mitigations by Priority

1. **Double-spend protection** — Optimistic lock + CHECK constraint (zero-cost, critical)
2. **PII encryption** — Deploy Vault + pgcrypto TODAY (SEBI/GDPR compliance)
3. **Multi-AZ** — Enable RDS Multi-AZ (2× cost, essential for 99.99% SLA)
4. **PgBouncer** — Deploy before 100K users (free, prevents connection exhaustion)
5. **Backup validation** — Monthly automated restore test (compliance requirement)
6. **Audit trigger** — Deploy fn_audit_trigger() on all financial tables (SEBI compliance)
7. **RLS policies** — Test user isolation in CI (prevents data breach)
8. **Kafka DLQ** — Implement + monitor before launch (prevents silent data loss)
9. **Partition auto-management** — pg_partman installed before 1M orders
10. **PITR tested** — Run PITR drill monthly; verify 5-min RPO achievable
