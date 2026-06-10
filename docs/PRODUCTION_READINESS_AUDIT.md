# InvestIQ — Backend Architecture Review & Production Readiness Audit

**Date:** 2026-06-10
**Scope:** All 11 backend services, infra (Docker Compose, K8s), data layer (PostgreSQL, MongoDB, Redis, Kafka), security, compliance, operations.
**Method:** Direct code inspection of the repository. Findings marked **[VERIFIED]** were confirmed in code; findings marked **[DESIGN]** are gaps relative to the documented design in `infra/database/*` and `docs/api-catalog.md`.

**Verdict up front: NOT production-ready. NO-GO.**
The domain layer (wallet double-entry ledger, RBAC schema, fund service) is genuinely good for this stage. But there are **zero automated tests, no CI/CD, no API gateway implementation, no resilience layer, no observability instrumentation, hardcoded fallback secrets, and a brute-forceable OTP flow that prints OTPs to stdout**. For a fintech app handling real money under SEBI/RBI jurisdiction, any one of these is a launch blocker.

---

## PART 1 : ARCHITECTURE REVIEW

### 1.1 What is sound

| Area | Assessment |
|---|---|
| Service boundaries | Good. Auth / user / trade / wallet / market-data / notification / fund split follows business capabilities. |
| Database ownership | Good. Database-per-service (`investiq_auth`, `investiq_trades`, `investiq_wallet`, …) on logical DBs. **[VERIFIED]** in docker-compose. |
| Event design | Good intent. Wallet→trade via `trade.funded` Kafka event; fund-service emits events instead of HTTP calls to wallet. No synchronous service-to-service coupling found. |
| Domain design | Wallet is a real double-entry ledger (journal + two legs + system float wallet + `SELECT FOR UPDATE`). **[VERIFIED]** `LedgerService.java`. |

### 1.2 Findings

**ARCH-1 — CRITICAL — The API Gateway does not exist. [VERIFIED]**
CLAUDE.md and the K8s ingress assume a gateway on port 8080. There is no gateway service in `services/`, docker-compose, or K8s deployments. Consequences: every service does its own JWT parsing, CORS, and rate limiting; clients must know 11 ports; there is no single choke point for authn, throttling, WAF, or request logging. This is the largest missing component in the system.

**ARCH-2 — CRITICAL — Dual-write between DB and Kafka (no outbox pattern). [VERIFIED]**
`LedgerService.confirmDeposit()` publishes `trade.funded` *inside* the `@Transactional` method. Two failure modes:
- Kafka publish succeeds, DB transaction later rolls back → trade-service believes funds exist that don't (money created from nothing).
- DB commits, Kafka publish fails (broker down) → deposit settled but trade-service never notified (money disappears from the user's perspective).
Fix: transactional outbox table + Debezium/poller, or Kafka transactions with careful ordering. This applies to every event publisher in trade-service and fund-service too.

**ARCH-3 — HIGH — Idempotency is check-then-insert, racy. [VERIFIED]**
`deposit()`/`withdraw()` do `findByIdempotencyKey(...)` then insert. Two concurrent retries with the same key both pass the find. If the DB has a unique constraint the second gets a 500 instead of the cached response; if it doesn't, you get a double deposit. Fix: rely on the unique constraint, catch the violation, and re-read; or use `INSERT ... ON CONFLICT`.

**ARCH-4 — HIGH — No saga / compensation design for the trade flow.**
Order placement → wallet debit → broker execution → position update spans 3 services + an external broker (Kite gateway exists in trade-service). There is no saga orchestration, no compensation events (e.g., `wallet.debit.reversed` on broker rejection), and no state machine for stuck orders. Distributed transaction risk is unmanaged.

**ARCH-5 — MEDIUM — Schema design and live migrations have diverged. [VERIFIED]**
`infra/database/postgresql/schemas/V1..V8` (the designed schemas, incl. RLS/encryption SQL) are not the Flyway migrations the services actually run (`services/*/src/main/resources/db/migration`). Two sources of truth; the security SQL (`rls_and_encryption.sql`) is design-only and **not applied anywhere**.

**ARCH-6 — MEDIUM — Shared `ApiResponse<T>` and event classes are copy-pasted per service.**
No shared contracts module or schema registry. Event payloads (e.g., `TradeFundedEvent` defined in wallet, consumed in trade) will drift silently. Use Avro/JSON-schema + schema registry, or a versioned shared library.

**ARCH-7 — LOW — `background-jobs` (Python) receives `SPRING_PROFILES_ACTIVE` env var [VERIFIED]** — harmless but indicates copy-paste config; audit all service env contracts.

**ARCH-8 — LOW — Circular dependency risk: none found.** Event flow is acyclic today (wallet → trade). Keep it that way by policy.

---

## PART 2 : SECURITY REVIEW

### CRITICAL

**SEC-1 — OTP printed to stdout. [VERIFIED]**
`OtpService.generateAndStore()` contains `System.out.println("OTP: " + otp)`. OTPs land in container logs → log aggregators → anyone with log read access can take over any account. (CWE-532, OWASP A09). Remove before any deployment, including staging.

**SEC-2 — OTP verification has no attempt limit. [VERIFIED]**
`verify()` does a plain Redis get/compare. A 6-digit OTP valid for 300s with no attempt counter, no per-phone lockout, and no per-IP throttle is brute-forceable (10⁶ space; at even 1k req/s an attacker wins in minutes). Also: no rate limit on `otp/send` → SMS-pumping cost attack and harassment vector. (OWASP API4, CWE-307).

**SEC-3 — Hardcoded fallback secrets in every service. [VERIFIED]**
`application.yml` files ship working defaults: `DB_PASSWORD:Investiq@1301`, `REDIS_PASSWORD:redis@123`, `JWT_SECRET:investiq-super-secret-jwt-key-change-in-production-min-256bits`, `change-me-to-a-256-bit-base64-secret-in-prod`, etc. These are in git history forever. If any environment forgets to set the env var, the service comes up **silently** with a publicly-known JWT secret → total auth bypass. Violates the project's own "never hardcode secrets" rule. Fix: remove all defaults (fail fast on missing), rotate everything, use AWS Secrets Manager / External Secrets Operator, and scrub git history or treat all current values as burned.

**SEC-4 — Single shared symmetric JWT secret (HS256) across all 11 services. [VERIFIED]**
Every service (Java + Python `jwt.decode(..., algorithms=["HS256"])`) holds the signing key, so **any compromised service can mint admin tokens for the whole platform**. Fix: RS256/ES256 — auth-service signs with a private key, everything else verifies via JWKS; enables rotation too.

### HIGH

**SEC-5 — No token revocation / logout story.** JWTs are stateless with 15-min access / 7-day refresh. No denylist, no refresh-token rotation or reuse detection found. A stolen refresh token is valid for 7 days with no kill switch. For fintech: refresh rotation + server-side session record + revoke-on-password/device-change is table stakes.

**SEC-6 — Redis eviction policy can evict security state. [VERIFIED]**
`maxmemory 256mb --maxmemory-policy allkeys-lru` in docker-compose, while Redis stores OTPs and rate-limit counters. Under memory pressure Redis silently evicts rate-limit keys (limits reset → bypass) and OTPs. Use `volatile-ttl`/`noeviction` for the security keyspace or a separate Redis.

**SEC-7 — Kafka and inter-service traffic are PLAINTEXT, no authn. [VERIFIED]**
`KAFKA_LISTENER_SECURITY_PROTOCOL_MAP` is all PLAINTEXT; no SASL, no ACLs, no mTLS between services, no K8s NetworkPolicies. Anyone inside the network can publish a forged `trade.funded` event — i.e., **mint money**. Kafka events are an unauthenticated money path.

**SEC-8 — MongoDB accessed as root. [VERIFIED]** Analytics service connects with `MONGO_INITDB_ROOT_USERNAME/PASSWORD`. Create a scoped app user per database.

**SEC-9 — Swagger/OpenAPI permitAll. [VERIFIED]** `/swagger-ui/**`, `/v3/api-docs/**` are public in `SecurityConfig`. Disable or gate in production.

**SEC-10 — Authorization is role-only in Python services; no resource-level ownership checks verified.** `require_admin` checks role claims from the token. Ensure every endpoint that takes a `userId`/`walletId`/`orderId` validates ownership against the token subject (BOLA — OWASP API1, the #1 API risk). The wallet/trade controllers should be explicitly audited for IDOR.

### MEDIUM

- **SEC-11 — CORS: hardcoded localhost origins + `allowCredentials(true)` + `AllowedHeaders("*")` [VERIFIED]** — wrong origins for prod, and per-service CORS will drift; move to the (to-be-built) gateway.
- **SEC-12 — No MFA enforcement logic verified** for high-risk actions (withdrawals, bank account changes) despite MFA controllers existing. Step-up auth for money movement is expected.
- **SEC-13 — Rate limiting exists only in trade-service** (Redis filter, 60/min). Auth endpoints (login, OTP, refresh) — the most attacked surface — have none.
- **SEC-14 — No field-level encryption applied.** PAN/Aadhaar/bank numbers (user-service KYC) appear stored plaintext; `rls_and_encryption.sql` is unapplied design. RBI/SEBI expect encryption of PII at rest beyond disk encryption.
- **SEC-15 — Device trust designed (DeviceController) but no device-binding of refresh tokens or new-device step-up verified.**
- **SEC-16 — OTP comparison is not constant-time** (`stored.equals(otp)`) — minor, fix alongside SEC-2.
- **SEC-17 — No dependency/container scanning** (no CI at all): OWASP A06 vulnerable components unmonitored.

### LOW

- Actuator limited to `health,info` — good. But `show-details: when-authorized` with no actuator auth configured may leak detail; verify.
- No `SecurityHeadersFilter` outside fund-service — propagate OWASP headers everywhere (or do it at the gateway).
- Audit log table exists (V4) — verify writes are async/non-blocking and tamper-evident (hash chain) — see Part 3.

---

## PART 3 : FINTECH COMPLIANCE REVIEW (SEBI / RBI / PMLA / DPDP / SOC2 / ISO27001)

> Note: for India, the operative privacy law is the **DPDP Act 2023** (GDPR matters only if serving EU residents). Targeting students (some may be minors) raises consent stakes further.

| # | Gap | Severity | Notes |
|---|---|---|---|
| C-1 | **KYC gating before first trade not verified in code.** Business rule exists in CLAUDE.md; no check found in trade order path that queries user-service KYC status. | CRITICAL | SEBI requirement. Must be enforced server-side in trade-service (cached KYC status via event, not HTTP). |
| C-2 | **No broker/exchange regulatory layer.** Executing real trades requires a SEBI-registered broker relationship; Kite gateway exists but order audit trail to exchange-required standards (timestamps, order modification history) must be verified. | CRITICAL | |
| C-3 | **Audit logs are mutable rows in the same Postgres.** No WORM storage, no hash-chaining, no separate retention. SEBI expects tamper-evident trails; SOC2 CC7 expects integrity. | HIGH | Ship audit events to append-only store (S3 Object Lock / QLDB-style). |
| C-4 | **Data retention & deletion policy absent.** SEBI: 5–8 yrs for trade records; DPDP: delete on purpose-exhaustion. No archival/purge jobs exist (`partitioning/` dir is empty). | HIGH | |
| C-5 | **Consent management missing.** No consent capture/versioning for data processing, AI advice, or communications (TRAI DLT for SMS). | HIGH | |
| C-6 | **AML is a scoring stub.** ML-scoring has a ₹10L CTR threshold check, but there's no STR/CTR filing workflow, no FIU-IND reporting pipeline, no sanctions/PEP screening, no case management. | HIGH | PMLA 2002 obligations are operational, not just a score. |
| C-7 | **AI advisory compliance:** disclaimer rule exists, but SEBI's Investment Adviser regulations and 2025-era AI-advice guidance require suitability assessment, advice records retention, and human escalation. Verify every ai-advisor path appends disclaimers and logs advice immutably. | HIGH | |
| C-8 | **No DPDP rights endpoints** (access/correction/erasure/grievance officer). | MEDIUM | |
| C-9 | **PII in logs unaudited** — phone numbers used as Redis keys and likely logged; request logging filter logs URIs which may embed IDs. Need a PII logging policy + masking. | MEDIUM | |
| C-10 | **No vendor/DPA posture for Anthropic API** — AI advisor sends user portfolio data to an external API; needs DPDP cross-border assessment + data minimization. | MEDIUM | |
| C-11 | **SOC2/ISO27001 prerequisites missing:** no change management (no CI/CD), no access reviews, no incident response runbooks, no risk register beyond the DB doc. | MEDIUM | |
| C-12 | **Investor protection rules unverified in code:** ₹10 minimum investment, 60 trades/min (exists in trade-service only), suitability vs. risk profile. | MEDIUM | |

---

## PART 4 : PERFORMANCE REVIEW

**P-1 — Connection pools are tiny and uncoordinated. [VERIFIED]** Hikari `maximum-pool-size: 10` per service against a single Postgres. 8 Java services × 10 conns × replicas (2+ each in K8s) ≈ 160+ connections at baseline; Postgres default `max_connections=100`. **This will fail at first scale-up.** Add PgBouncer (transaction pooling), size pools deliberately, raise `max_connections` consciously.

**P-2 — No caching layer for market data reads verified at the hot path.** Quotes are the highest-QPS endpoint; verify Redis cache-aside with short TTL + request coalescing (cache stampede protection — single-flight) exists in `MarketDataService`. ML-scoring caches scores in Redis (good).

**P-3 — Single Kafka broker, 3 partitions default, auto-create topics. [VERIFIED]** Throughput ceiling and zero fault tolerance (see Part 6). Producer configs unverified — set `acks=all`, `enable.idempotence=true`, `max.in.flight=5`, compression for money topics.

**P-4 — Redis 256MB with allkeys-lru shared by sessions, OTPs, rate limits, ML score cache, AI chat cache. [VERIFIED]** One workload's cache pressure evicts another's correctness-critical keys. Split logical workloads (separate instances or at minimum key-tier policies) and size properly.

**P-5 — No HTTP client timeouts/pool config verified** for Kite broker gateway and Anthropic calls. A slow broker or LLM call with default/infinite timeouts will exhaust threads (see Part 6). AI advisor latency (LLM seconds-long) must never sit on a sync request path without timeout + queue.

**P-6 — Indexes:** `indexing_strategy.sql` exists as design but, like the rest of `infra/database`, is not in the Flyway migrations services run. Verify actual indexes on: `transactions(idempotency_key)` UNIQUE, `transactions(journal_id)`, `orders(user_id, created_at)`, `audit_logs(user_id, created_at)`, OTP-adjacent lookups. **[DESIGN]**

**P-7 — No performance budget or load test exists** (see Part 10). Latency SLOs undefined.

**P-8 — JPA pitfalls unaudited:** N+1 on portfolio/holdings endpoints, missing `@BatchSize`/fetch joins, `show-sql` off (good). Run with `hibernate.generate_statistics` in a load test.

---

## PART 5 : SCALABILITY REVIEW

| Tier | Verdict | Binding constraints |
|---|---|---|
| **100K users** | Achievable after P-1 fixes | Single Postgres + PgBouncer fine; single-AZ risk remains. |
| **1M users** | Needs work | Read replicas for portfolio/market reads; Kafka 3-broker cluster; Redis HA (Elasticache w/ replica); market-data fan-out moves to WebSocket + pub/sub; HPA exists [VERIFIED] but no cluster-autoscaler/pod-priority story. |
| **10M users** | Architecture supports it *only if* | Partitioning implemented (orders/transactions/audit by month — the empty `partitioning/` dir filled), TimescaleDB used for ticks (image present, hypertables not verified), wallet hot-row mitigation (system float wallet is a **global lock hot spot** — every deposit/withdraw serializes on `SELECT FOR UPDATE` of one row; shard the float wallet or use ledger-only balances), Kafka partition keys by userId, MongoDB sharding for AI chats. |
| **50M users** | Not with current design | Requires: user-ID sharding of Postgres (Citus/Vitess-style or app-level), CQRS read models for portfolio, regional cells, Kafka tiered storage, and a dedicated market-data distribution tier. Don't design for this now — but don't block it: keep UUID keys (✓ already), avoid cross-service joins (✓), keep events as the integration backbone (✓). |

**Biggest verified scaling bug:** the single `SYSTEM_FLOAT` wallet row (`lockedSystemWallet`) serializes **all** money movement platform-wide. At ~50 TPS of deposits/withdrawals this lock becomes the whole company's throughput ceiling.

**Write scaling:** wallet and trade writes partition naturally by user — good. **Read scaling:** no replica routing abstraction exists yet; introduce read/write `DataSource` routing before you need it.

---

## PART 6 : RESILIENCY REVIEW

**R-1 — CRITICAL — There is no resilience layer at all. [VERIFIED]** Zero hits for resilience4j/circuit breakers/retry config across all services. No `RestClient`/`WebClient` timeout configuration found. Every external dependency (broker API, Anthropic, Postgres, Redis, Kafka) is called naked.

Required minimum per service:
- Timeouts: connect 2s / read 5s (broker), 30s (LLM) — explicit, everywhere.
- Retries: idempotent ops only, exponential backoff + jitter, budgeted.
- Circuit breakers: broker gateway, market-data upstream, Anthropic, cross-service Kafka consumers' side effects.
- Bulkheads: separate thread pools for broker I/O vs API serving; FastAPI: bound the event loop with semaphores on LLM calls.
- Fallbacks: market-data → last-known-cached quote with staleness flag; ai-advisor → "advisor busy" rather than 500; ml-scoring → conservative default risk score (fail-closed for fraud checks, not fail-open).

**R-2 — CRITICAL — No DLQs. [VERIFIED]** No dead-letter topics or consumer error handling found. A poison `trade.funded` message will either be skipped (lost money event) or retry-loop forever (blocked partition). Add `<topic>.dlq` + `DefaultErrorHandler` with backoff, and an alerted re-drive runbook.

**R-3 — HIGH — Kafka single node, RF=1, auto-create on. [VERIFIED]** Broker death = total event-bus loss and possible data loss for in-flight money events. Prod: 3 brokers, RF=3, `min.insync.replicas=2`, `auto.create.topics.enable=false`, explicit topic manifests (the design exists in `topic_design.yml` — wire it up).

**R-4 — HIGH — No failover for Postgres/Redis/Mongo.** Single instances everywhere; no Multi-AZ/sentinel/replica-set config exists in infra code.

**R-5 — MEDIUM — K8s probes point liveness and readiness at the same `/actuator/health`. [VERIFIED]** A DB outage will fail liveness → restart storm on top of a DB incident. Liveness should be process-only (`/health/liveness`); readiness includes dependencies. No `PodDisruptionBudget`s, no `topologySpreadConstraints`, no startup probes.

**R-6 — Chaos readiness: zero.** No game days possible until R-1..R-4 land. Add as post-launch milestone.

---

## PART 7 : OBSERVABILITY REVIEW

Current state **[VERIFIED]**: structured-ish logging with `CorrelationIdFilter` + `RequestLoggingFilter` (3 services), actuator `health,info` only, an `observability.sql` design doc. That's it.

Missing (all required pre-launch):
1. **Metrics:** micrometer-prometheus in every Java service (`management.endpoints` → add `prometheus`), `prometheus-fastapi-instrumentator` in Python. Prometheus + Grafana (or AMP/CloudWatch) deployment — none exists in infra.
2. **Business metrics:** deposits/min, settlement lag, order reject rate, OTP failure rate, Kafka consumer lag, ledger imbalance detector (sum of journal legs ≠ 0 alarm — *the* fintech metric).
3. **Tracing:** OpenTelemetry SDK + collector; propagate `X-Correlation-ID` into Kafka headers (currently HTTP-only, so traces die at the event bus).
4. **Log aggregation:** nothing ships logs anywhere (no Fluent Bit/CloudWatch agent in K8s manifests). Plus PII-masking pipeline (C-9).
5. **Dashboards:** per-service RED + JVM/Hikari, Kafka lag, Redis evictions (security-relevant per SEC-6), Postgres connections/locks (P-1, wallet lock waits).
6. **Alerting & on-call:** no Alertmanager/PagerDuty config, no SLOs, no runbooks, no incident severity matrix, no status page.
7. **Synthetic checks:** login + quote + paper-trade canary every minute.

---

## PART 8 : DEVOPS REVIEW

| Item | State | Gap |
|---|---|---|
| Docker | Compose is solid for dev (healthchecks, depends_on) **[VERIFIED]** | Dockerfiles unaudited: verify non-root USER, multi-stage, pinned bases, `.dockerignore` (a `target/` leak was visible in wallet-service). |
| CI/CD | **None. No `.github/`, no Jenkins, nothing. [VERIFIED]** | BLOCKER. Minimum: build + unit tests + integration tests + SAST (Semgrep) + dependency scan (OWASP DC / pip-audit) + image scan (Trivy) + push to ECR. |
| Helm | None — raw manifests | Acceptable short-term; templatize before multi-env (values per env, no `<AWS_ACCOUNT_ID>` placeholders in git). |
| ArgoCD / GitOps | None | Recommended for auditability (SOC2 change management evidence). |
| K8s manifests | Deployments exist for 8 services **[VERIFIED]** | **Missing deployments: user-service, wallet-service, fund-service** — the money services aren't deployable. `image: ...:latest` (no immutable tags → no rollback), no `securityContext` (runAsNonRoot, readOnlyRootFilesystem), no NetworkPolicies, no PDBs, secrets as plain K8s Secrets (move to External Secrets + AWS SM, enable envelope encryption). |
| Blue-green / Canary | RollingUpdate maxUnavailable=0 only | Fine to launch with rolling; add Argo Rollouts canary for trade/wallet later. |
| Rollback | Undefined | Requires immutable image tags + Flyway discipline (only backward-compatible migrations; never `:latest`). |
| Environments | No staging/prod separation visible | Need at least staging with prod-shaped data (masked). |

---

## PART 9 : DATA REVIEW

1. **Backups: a plan document exists (`backup_dr_plan.md`), zero automation. [VERIFIED]** Nothing schedules pg_dump/WAL archiving/PITR; Mongo and Redis likewise. For a ledger, **PITR is mandatory** (RPO ≤ 5 min). On AWS: RDS automated backups + WAL → S3; quarterly restore drills (an untested backup is not a backup).
2. **DR:** single region (ap-south-1), single AZ implied. Define RTO/RPO; at minimum Multi-AZ RDS + cross-region snapshot copy. SEBI-regulated entities are expected to have documented DR with periodic drills.
3. **Partitioning: designed directory is empty. [VERIFIED]** `orders`, `transactions`, `audit_logs`, market ticks need time partitioning before they hit 10⁷ rows; retrofitting partitions on a live ledger is painful — do it in V2 migrations now.
4. **TimescaleDB:** image used, hypertables not verified in any migration — likely unused capacity for tick data.
5. **Archiving:** no job moves aged data to S3/Glacier (ties to C-4 retention).
6. **Sharding:** not needed pre-1M users; keep partition keys (userId) on every large table now.
7. **Data protections missing:** ledger invariant job (per-journal legs sum to zero; per-wallet running balance recompute), wallet balance vs. transaction-sum reconciliation, daily bank-vs-float reconciliation, FK/constraint audit, `NUMERIC(19,4)` everywhere money lives (spot-check passed in wallet; audit trade/fund).
8. **Mongo:** schema doc exists; no indexes/TTL verified for chats; no replica set in compose (single node = no transactions support if needed).
9. **Kafka retention 168h [VERIFIED]:** fine for replay, but money topics should be backed by the outbox table as source of truth (ARCH-2), not Kafka retention.

---

## PART 10 : TESTING REVIEW

**There are zero test files in the entire repository. [VERIFIED]** No `*Test.java`, no `test_*.py`, no conftest. This is the single clearest production blocker.

Minimum pre-launch pyramid, in priority order:
1. **Unit:** `LedgerService` (idempotency race, insufficient funds, status transitions), XIRR Newton-Raphson (known-answer + non-convergence), OTP service, JWT filters, risk/AML scoring functions. Target: wallet/trade/fund ≥80% on service layer.
2. **Integration (Testcontainers):** wallet deposit→confirm→`trade.funded` consumed by trade-service against real Postgres+Kafka; Flyway migrations apply cleanly from empty; idempotency under concurrent duplicate requests (the ARCH-3 race — write the failing test first).
3. **Contract:** Pact (or schema-registry compatibility checks) between wallet↔trade events and gateway↔services APIs.
4. **Security:** OWASP ZAP baseline in CI; authz matrix tests (every endpoint × every role × foreign-resource access — catches BOLA per SEC-10); secret-scanning (gitleaks — will fire on SEC-3 immediately).
5. **Load:** k6/Gatling — login storm, quote fan-out, 60 trades/min/user enforcement, deposit throughput until the SYSTEM_FLOAT lock (Part 5) becomes visible; soak 24h.
6. **Chaos:** post-launch, after Part 6 exists.
7. **Reconciliation tests:** property-based test that any sequence of deposits/withdrawals keeps Σ(journal legs)=0 and balance=Σ(settled legs).

---

## PART 11 : FAILURE SCENARIOS

| Scenario | System impact (today) | Recovery (today) | Business impact | Mitigation |
|---|---|---|---|---|
| **Postgres down** | All Java services fail; liveness probes fail → restart storm (R-5); in-flight ledger writes roll back safely (good). | Manual. No replica to promote. | Total outage; trading + money frozen. Reputational + SEBI incident-reporting exposure. | Multi-AZ RDS, split liveness/readiness, connection retry with backoff, status page. |
| **Redis down** | Auth OTP flow dead; rate limiting dead (**fails open — trades proceed unlimited**); ML score cache misses. | Restart node; data loss acceptable except sessions. | Logins blocked; risk controls silently off. | Redis HA; rate limiter must **fail closed** for trade path; circuit breaker + cached-deny. |
| **Kafka down** | ARCH-2 bites: deposits settle in DB but `trade.funded` lost **permanently** (no outbox, no retry). Fund/trade events lost. | None — events are gone. Manual reconciliation with no tooling. | Users see money deducted, trades not funded. Support storm + regulator complaints. | Outbox pattern (makes Kafka loss a delay, not loss), 3-broker RF=3, consumer lag alerts. |
| **Auth-service down** | Existing access tokens keep working ≤15 min (stateless); logins/refresh fail. | Restart pods (2 replicas exist). | Degraded; new sessions blocked. | Fine once HPA+PDB exist; JWKS caching when SEC-4 fixed. |
| **Market-data down** | Quotes fail; trade-service pricing path unverified — may 500 or trade on stale data. | Restart. | Mis-priced orders is the nightmare case. | Fail closed on stale quotes (reject orders if quote age > N sec), cached-quote fallback for display only. |
| **Network partition** | Split between services and Kafka → same as Kafka down; Java services to Postgres → crash-looping. | None defined. | As above. | Outbox, timeouts, idempotent consumers (consumer-side dedupe by journalId — not verified). |
| **Region failure (ap-south-1)** | Everything gone; no cross-region anything. | Rebuild from… nothing (no automated backups). **Possible permanent ledger loss.** | Existential. | PITR backups cross-region copied (Part 9 #1) is the single highest-leverage DR fix. |
| **API gateway failure** | N/A — it doesn't exist (ARCH-1). Today each service is its own front door; an ingress failure kills all client traffic but internals keep consuming Kafka. | K8s reschedules ingress. | Full client outage. | ≥2 ingress replicas across AZs; when gateway is built, make it stateless + HPA. |

---

## PART 12 : PRODUCTION READINESS SCORE

| Dimension | Score /10 | Rationale |
|---|---|---|
| Architecture | 6.5 | Sound boundaries & ledger; gateway missing, outbox missing, saga missing. |
| Security | 3 | Strong skeleton (RBAC, JWT filters, bcrypt-12) destroyed by SEC-1..4. |
| Compliance | 2.5 | Rules documented; almost nothing enforced/operationalized. |
| Performance | 4 | Reasonable patterns; pools, hot-row, no caching verification, no load data. |
| Scalability | 5 | Fine to ~100K after fixes; float-wallet hot spot is a real ceiling. |
| Reliability | 2 | No retries/CBs/DLQs/timeouts/failover anywhere. |
| Observability | 2 | Correlation IDs only; no metrics/tracing/alerting/dashboards. |
| DevOps | 3 | Good compose; no CI/CD, 3 money services missing K8s deployments, `:latest` tags. |
| Testing | 0.5 | Zero tests. |
| **Overall readiness** | **3 / 10** | |

### Go-live decision: **NO-GO.**

### Critical issues (must fix before any real-money beta)
1. SEC-1/2: OTP stdout leak + brute-force protection.
2. SEC-3/4: remove fallback secrets, rotate, move to RS256 + secret manager.
3. ARCH-2/3: outbox pattern + idempotency race fix in wallet (and trade/fund publishers).
4. Testing: wallet/trade/fund unit + Testcontainers integration suite, in CI.
5. CI/CD pipeline with security scanning; immutable image tags.
6. Deployments for user/wallet/fund services; secrets via External Secrets.
7. Automated Postgres PITR backups + restore drill.
8. C-1: server-side KYC gate on first trade.
9. R-1/R-2 minimum: timeouts everywhere, DLQs on money topics, rate-limit fail-closed.
10. Metrics + alerting baseline incl. ledger-imbalance and consumer-lag alarms.

### Priority roadmap
- **P0 (pre-beta, ~2–4 wks):** items 1–10 above.
- **P1 (pre-GA):** API gateway, refresh-token rotation/revocation, Kafka 3-node RF=3 + SASL, Multi-AZ RDS + Redis HA, tracing, load tests, partitioning V2 migrations, AML ops workflow, consent management, DPDP endpoints.
- **P2 (post-GA):** canary deploys (Argo Rollouts), chaos program, read replicas + replica routing, float-wallet sharding, CQRS read models, SOC2 evidence automation, mTLS/mesh.

---

## PART 13 : PRODUCTION LAUNCH CHECKLIST (112 items)

### Backend (14)
- [ ] 1. API gateway implemented (authn, routing, rate limit, CORS) — replaces per-service CORS
- [ ] 2. Transactional outbox for all money-event publishers (wallet, trade, fund)
- [ ] 3. Idempotency: unique constraint + conflict-handling on all financial mutations
- [ ] 4. Consumer-side dedupe (processed-event table keyed by journalId/eventId)
- [ ] 5. Saga/compensation flow for order→debit→execute→settle, incl. stuck-order sweeper
- [ ] 6. KYC status gate enforced in trade-service & fund-service order paths
- [ ] 7. ₹10 minimum investment validated server-side
- [ ] 8. 60 trades/min limiter fail-closed; auth endpoints rate-limited
- [ ] 9. Explicit timeouts on every HTTP client (broker, Anthropic, inter-service)
- [ ] 10. Circuit breakers on broker, market-data upstream, LLM calls
- [ ] 11. DLQ topics + error handlers + re-drive runbook for every consumer
- [ ] 12. Shared event schemas (registry or versioned lib); compatibility checks in CI
- [ ] 13. Stale-quote rejection on order placement (max quote age)
- [ ] 14. AI disclaimer appended on every ai-advisor response path (test-enforced)

### Database (12)
- [ ] 15. Reconcile `infra/database` design SQL with actual Flyway migrations (one source of truth)
- [ ] 16. UNIQUE index on `transactions.idempotency_key` confirmed in migration
- [ ] 17. Indexes per `indexing_strategy.sql` applied via Flyway
- [ ] 18. Time partitioning: orders, transactions, audit_logs, ticks
- [ ] 19. TimescaleDB hypertables for market ticks (or drop the image)
- [ ] 20. PgBouncer deployed; pool sizes budgeted vs max_connections
- [ ] 21. Money columns NUMERIC(19,4) audit across all schemas
- [ ] 22. Ledger invariant job: Σ legs per journal = 0, balance = Σ settled legs
- [ ] 23. RLS/field-encryption SQL applied (or consciously descoped with sign-off)
- [ ] 24. Mongo app users (non-root) + indexes + TTL on chat collections
- [ ] 25. Flyway: backward-compatible-only migration policy documented
- [ ] 26. DB change review gate (no DDL without review)

### Security (18)
- [ ] 27. Remove `System.out.println(OTP)` ✱ verified gone in code review
- [ ] 28. OTP: max 5 verify attempts, per-phone + per-IP send throttle, resend cooldown
- [ ] 29. Delete all default secrets from application.yml (fail fast if env missing)
- [ ] 30. Rotate every credential currently in git history
- [ ] 31. gitleaks/secret-scan in CI + pre-commit
- [ ] 32. JWT → RS256 with JWKS; only auth-service holds private key
- [ ] 33. Refresh-token rotation + reuse detection + server-side revocation
- [ ] 34. Logout + password-change + device-removal revoke sessions
- [ ] 35. Step-up MFA on withdrawals & bank-account changes
- [ ] 36. BOLA/IDOR authz matrix test for every resource endpoint
- [ ] 37. Swagger/api-docs disabled or authenticated in prod
- [ ] 38. Security headers at gateway (HSTS, CSP, X-Content-Type-Options…)
- [ ] 39. Kafka SASL/SCRAM + ACLs (or mTLS); no PLAINTEXT in prod
- [ ] 40. K8s NetworkPolicies: default-deny between namespaces/services
- [ ] 41. Field-level encryption for PAN/Aadhaar/bank account numbers
- [ ] 42. Dependency scanning (OWASP DC, pip-audit) + image scanning (Trivy) in CI
- [ ] 43. Pen test by external firm before real-money launch
- [ ] 44. Redis: noeviction/volatile-ttl for security keyspace; AUTH + TLS in prod

### Compliance (12)
- [ ] 45. SEBI/broker regulatory relationship + order audit trail sign-off
- [ ] 46. KYC vendor integration verified end-to-end (incl. failure states)
- [ ] 47. AML: sanctions/PEP screening + STR/CTR workflow + FIU-IND reporting owner
- [ ] 48. Audit logs to append-only store (WORM) with hash chaining
- [ ] 49. Data retention schedule implemented (SEBI 5–8y; DPDP deletion)
- [ ] 50. Consent capture + versioning (data, AI advice, communications)
- [ ] 51. TRAI DLT registration for SMS templates
- [ ] 52. DPDP: rights endpoints + grievance officer + privacy policy
- [ ] 53. Minor-user policy (college students may be <18) — block or guardian flow
- [ ] 54. AI advice records retained immutably; suitability check vs risk profile
- [ ] 55. Anthropic data-flow DPIA + data minimization (no PAN/Aadhaar to LLM)
- [ ] 56. Incident reporting procedure for SEBI/CERT-In timelines

### Infrastructure (12)
- [ ] 57. K8s deployments for user-service, wallet-service, fund-service
- [ ] 58. Immutable image tags (git SHA); ban `:latest`
- [ ] 59. securityContext: runAsNonRoot, readOnlyRootFilesystem, drop capabilities
- [ ] 60. External Secrets Operator + AWS Secrets Manager; K8s secret envelope encryption
- [ ] 61. Multi-AZ RDS Postgres; Elasticache Redis with replica; Mongo replica set
- [ ] 62. Kafka: 3 brokers, RF=3, min.insync.replicas=2, auto-create off, topics as code
- [ ] 63. PodDisruptionBudgets + topologySpreadConstraints for all services
- [ ] 64. Liveness (process-only) split from readiness (dependency-aware)
- [ ] 65. Resource requests/limits load-test-derived (JVM heap vs limit alignment)
- [ ] 66. Cluster autoscaler / Karpenter configured
- [ ] 67. Ingress: ≥2 replicas, TLS (ACM), WAF (AWS WAF) in front
- [ ] 68. Infra as code (Terraform) for AWS resources — none exists today

### Monitoring (12)
- [ ] 69. Prometheus metrics from every service (micrometer / fastapi-instrumentator)
- [ ] 70. Grafana dashboards: RED per service, JVM, Hikari, Kafka lag, Redis evictions, PG locks
- [ ] 71. Ledger-imbalance alarm (the money-integrity pager)
- [ ] 72. Kafka consumer-lag alert per money topic
- [ ] 73. OpenTelemetry tracing; correlation ID propagated into Kafka headers
- [ ] 74. Centralized logs (Fluent Bit → CloudWatch/OpenSearch) with PII masking
- [ ] 75. Alertmanager → PagerDuty/Opsgenie; on-call rota defined
- [ ] 76. SLOs: availability + p95 latency per critical endpoint; error budgets
- [ ] 77. Synthetic canary: login → quote → paper trade, every minute
- [ ] 78. OTP failure-rate & SMS delivery-rate alerts
- [ ] 79. Certificate & secret expiry monitoring
- [ ] 80. Status page (public or in-app banner hook)

### DevOps (10)
- [ ] 81. CI: build + unit + integration (Testcontainers) on every PR
- [ ] 82. CI: SAST (Semgrep), secret scan, dependency scan, image scan gates
- [ ] 83. CD to staging on merge; manual gate to prod
- [ ] 84. Staging environment, prod-shaped, masked data
- [ ] 85. Rollback runbook tested (image pin + compatible-migration policy)
- [ ] 86. GitOps (ArgoCD) or equivalent audit trail of deploys
- [ ] 87. Branch protection + mandatory review on services/wallet & trade
- [ ] 88. Helm/Kustomize per-env values; remove `<AWS_ACCOUNT_ID>` placeholders
- [ ] 89. Dockerfiles: multi-stage, non-root, pinned digests, .dockerignore (no target/)
- [ ] 90. Build provenance/SBOM (syft) retained per release

### Testing (8)
- [ ] 91. Wallet ledger unit suite incl. concurrent-idempotency race test
- [ ] 92. Trade order lifecycle integration test (Kafka end-to-end)
- [ ] 93. XIRR known-answer + non-convergence tests
- [ ] 94. AuthZ matrix tests (role × endpoint × ownership)
- [ ] 95. Contract tests for wallet↔trade events
- [ ] 96. Load test: deposit throughput (expose SYSTEM_FLOAT ceiling), quote fan-out, login storm
- [ ] 97. 24h soak with leak detection (heap, connections, fd)
- [ ] 98. DR restore drill from backups, timed against RTO

### Operations (8)
- [ ] 99. Runbooks: DB failover, Kafka outage + DLQ re-drive, Redis flush, stuck orders, ledger mismatch
- [ ] 100. Incident severity matrix + comms templates (incl. regulator notification)
- [ ] 101. Daily reconciliation: bank statement ↔ system float ↔ user balances
- [ ] 102. EOD settlement job + market-calendar handling (NSE/BSE holidays)
- [ ] 103. Capacity review cadence (monthly) with growth projections
- [ ] 104. Access reviews quarterly; break-glass procedure for prod DB
- [ ] 105. Change freeze policy around market hours for trade/wallet deploys
- [ ] 106. Backup verification job (automated restore-and-checksum weekly)

### Support & Risk Management (6)
- [ ] 107. Support tooling: order/transaction lookup with audit-logged access
- [ ] 108. User-facing incident messaging (app banner) wired to status
- [ ] 109. Fraud ops: review queue for ML-scoring flags; account freeze procedure
- [ ] 110. Risk register maintained (extend `SCALABILITY_AND_RISK_REGISTER.md`) with owners & dates
- [ ] 111. Insurance/indemnity & legal review of T&Cs for advisory liability
- [ ] 112. Go/no-go launch review with sign-offs: Eng, Security, Compliance, Ops

---

*Generated by architecture audit session, 2026-06-10. Re-run after P0 fixes land; scores should be re-baselined then.*
