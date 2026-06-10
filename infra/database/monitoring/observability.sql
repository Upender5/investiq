-- ============================================================
-- InvestIQ :: Database Observability & Monitoring
-- Part 13 of Enterprise DB Architecture
-- Slow queries, deadlocks, replication lag, index usage
-- ============================================================

-- ─────────────────────────────────────────────
-- SLOW QUERY ANALYSIS
-- ─────────────────────────────────────────────

-- Top 20 slowest queries (requires pg_stat_statements)
SELECT
    LEFT(query, 100)                        AS query_snippet,
    calls,
    ROUND((total_exec_time / calls)::NUMERIC, 2) AS avg_ms,
    ROUND(total_exec_time::NUMERIC, 2)      AS total_ms,
    ROUND(mean_exec_time::NUMERIC, 2)       AS mean_ms,
    ROUND(stddev_exec_time::NUMERIC, 2)     AS stddev_ms,
    rows,
    ROUND((rows / NULLIF(calls, 0))::NUMERIC, 1) AS avg_rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_pct,
    shared_blks_read                        AS disk_reads
FROM pg_stat_statements
WHERE calls > 10
ORDER BY avg_ms DESC
LIMIT 20;

-- Queries causing most I/O (buffer hits vs disk)
SELECT
    LEFT(query, 100) AS query_snippet,
    calls,
    shared_blks_read AS disk_reads,
    shared_blks_hit  AS cache_hits,
    ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_pct
FROM pg_stat_statements
WHERE shared_blks_read > 0
ORDER BY disk_reads DESC
LIMIT 20;

-- Long-running queries (currently executing > 5 seconds)
SELECT
    pid,
    usename,
    application_name,
    state,
    wait_event_type,
    wait_event,
    EXTRACT(EPOCH FROM (NOW() - query_start))::INT AS duration_sec,
    LEFT(query, 200) AS query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '5 seconds'
ORDER BY duration_sec DESC;

-- ─────────────────────────────────────────────
-- LOCK & DEADLOCK MONITORING
-- ─────────────────────────────────────────────

-- Waiting queries (blocked by locks)
SELECT
    blocked.pid               AS blocked_pid,
    blocked.usename           AS blocked_user,
    blocked.query             AS blocked_query,
    blocker.pid               AS blocker_pid,
    blocker.usename           AS blocker_user,
    blocker.query             AS blocker_query,
    now() - blocked.query_start AS wait_duration
FROM pg_stat_activity AS blocked
JOIN pg_stat_activity AS blocker
    ON blocker.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;

-- Lock contention by table
SELECT
    t.relname              AS table_name,
    l.mode,
    l.granted,
    COUNT(*)               AS count
FROM pg_locks l
JOIN pg_class t ON t.oid = l.relation
WHERE t.relnamespace = 'public'::regnamespace
GROUP BY t.relname, l.mode, l.granted
ORDER BY count DESC;

-- ─────────────────────────────────────────────
-- REPLICATION LAG
-- ─────────────────────────────────────────────

-- Primary: check replica status
SELECT
    application_name,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes,
    EXTRACT(EPOCH FROM write_lag)::INT     AS write_lag_sec,
    EXTRACT(EPOCH FROM flush_lag)::INT     AS flush_lag_sec,
    EXTRACT(EPOCH FROM replay_lag)::INT    AS replay_lag_sec
FROM pg_stat_replication
ORDER BY replay_lag_sec DESC;

-- Replica: check lag from primary (run on replica)
SELECT
    now() - pg_last_xact_replay_timestamp() AS replay_lag,
    pg_is_in_recovery()                      AS is_replica,
    pg_last_wal_receive_lsn()                AS receive_lsn,
    pg_last_wal_replay_lsn()                 AS replay_lsn;

-- ─────────────────────────────────────────────
-- CONNECTION POOL METRICS
-- ─────────────────────────────────────────────

-- Active connection count by application
SELECT
    application_name,
    state,
    COUNT(*) AS connections
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name, state
ORDER BY connections DESC;

-- Connection usage vs max_connections
SELECT
    (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) AS active,
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') AS max_connections,
    ROUND(100.0 * (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database())
          / (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections'), 2) AS pct_used;

-- ─────────────────────────────────────────────
-- INDEX USAGE & BLOAT
-- ─────────────────────────────────────────────

-- Unused indexes (waste disk + slow writes)
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan                                      AS times_used
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Index efficiency (hit rate per index)
SELECT
    t.tablename,
    i.indexname,
    i.idx_scan       AS scans,
    i.idx_tup_read   AS tuples_read,
    i.idx_tup_fetch  AS tuples_fetched,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS size
FROM pg_stat_user_indexes i
JOIN pg_stat_user_tables t ON t.relid = i.relid
ORDER BY i.idx_scan DESC
LIMIT 30;

-- Index bloat estimate
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS current_size,
    ROUND(100 * (relpages - (reltuples * 8 / 8192.0)) / relpages, 2) AS bloat_pct
FROM pg_stat_user_indexes i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE relpages > 100
ORDER BY bloat_pct DESC;

-- ─────────────────────────────────────────────
-- TABLE BLOAT & AUTOVACUUM
-- ─────────────────────────────────────────────

-- Tables with most dead tuples (need VACUUM)
SELECT
    relname                                 AS table_name,
    n_live_tup                              AS live_rows,
    n_dead_tup                              AS dead_rows,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
    last_autovacuum,
    last_autoanalyze,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
ORDER BY dead_pct DESC NULLS LAST
LIMIT 20;

-- ─────────────────────────────────────────────
-- CACHE HIT RATIO  (target > 99%)
-- ─────────────────────────────────────────────
SELECT
    datname,
    blks_hit,
    blks_read,
    ROUND(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 4) AS cache_hit_pct,
    tup_fetched,
    tup_returned
FROM pg_stat_database
WHERE datname = current_database();

-- Table-level cache hit
SELECT
    relname,
    heap_blks_hit,
    heap_blks_read,
    ROUND(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) AS hit_pct
FROM pg_statio_user_tables
ORDER BY heap_blks_read DESC
LIMIT 20;

-- ─────────────────────────────────────────────
-- STORAGE GROWTH
-- ─────────────────────────────────────────────

-- Top 20 tables by size
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename))       AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)
        - pg_relation_size(schemaname || '.' || tablename))                AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;

-- Partition sizes for partitioned tables
SELECT
    parent.relname          AS parent_table,
    child.relname           AS partition_name,
    pg_size_pretty(pg_relation_size(child.oid)) AS size,
    pg_stat_user_tables.n_live_tup AS live_rows
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child  ON pg_inherits.inhrelid  = child.oid
LEFT JOIN pg_stat_user_tables ON pg_stat_user_tables.relname = child.relname
WHERE parent.relname IN ('orders','transactions','payments','audit_logs','trades','notifications')
ORDER BY parent.relname, child.relname;

-- ─────────────────────────────────────────────
-- PROMETHEUS METRICS EXPOSED (via postgres_exporter)
-- ─────────────────────────────────────────────
-- Key metrics to scrape from pg_stat_*:
--
-- pg_stat_activity_count{state="active"}
-- pg_stat_activity_count{state="idle_in_transaction"}
-- pg_stat_database_blks_hit_rate
-- pg_stat_database_tup_fetched
-- pg_stat_replication_lag_bytes
-- pg_stat_replication_replay_lag_seconds
-- pg_stat_user_tables_n_dead_tup
-- pg_stat_user_tables_last_autovacuum
-- pg_settings_max_connections
-- pg_locks_count{mode="ExclusiveLock"}

-- ─────────────────────────────────────────────
-- ALERT THRESHOLDS (Grafana Alert Rules)
-- ─────────────────────────────────────────────
/*
CRITICAL:
  - Replication lag > 30 seconds            → Page on-call DBA
  - Connection usage > 85%                  → Scale PgBouncer
  - Cache hit rate < 95%                    → Increase shared_buffers
  - Long-running query > 30 seconds         → Kill + investigate
  - Active locks > 50                       → Deadlock risk
  - Dead tuple pct > 20%                    → Force VACUUM

WARNING:
  - Replication lag > 5 seconds
  - Slow query avg > 100ms (top-20 queries)
  - Index bloat > 30%
  - Table size growth > 10 GB/day
  - Autovacuum not run in 2 days
  - Failed login attempts spike > 100/min

INFO:
  - New partition needed in 30 days
  - Unused index found
  - Cache hit rate < 99%
*/
