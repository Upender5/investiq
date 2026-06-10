# InvestIQ :: Backup & Disaster Recovery Plan
## Part 12 of Enterprise DB Architecture

---

## RPO / RTO Targets

| Tier | Database | RPO | RTO |
|------|----------|-----|-----|
| Critical | PostgreSQL (wallet, trade) | **5 minutes** | **15 minutes** |
| High | PostgreSQL (auth, user) | 15 minutes | 30 minutes |
| Standard | PostgreSQL (market, notifications) | 1 hour | 2 hours |
| Analytics | MongoDB | 1 hour | 4 hours |
| Cache | Redis | N/A (rebuildable) | 5 minutes |
| Events | Kafka | 30 minutes | 1 hour |

---

## 1. PostgreSQL Backup Strategy (AWS RDS + Custom)

### Continuous WAL Archiving (primary recovery method)
```bash
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://investiq-wal-archive/investiq-db/%f --sse aws:kms'
archive_timeout = 60       # Archive incomplete WAL segment every 60 sec (6-min RPO)
max_wal_senders = 5
wal_keep_size = 2048       # Keep 2 GB WAL locally as buffer

# Recovery target (pitr.conf)
restore_command = 'aws s3 cp s3://investiq-wal-archive/investiq-db/%f %p'
```

### Automated Snapshot Schedule (AWS RDS)
```yaml
rds_backup_config:
  automated_backup:
    enabled: true
    retention_days: 35          # 35-day retention
    backup_window: "01:00-02:00 UTC"   # 6:30–7:30 AM IST (off-peak)
    
  manual_snapshots:
    weekly:
      schedule: "Every Sunday 00:00 UTC"
      retention: 90 days
      name_pattern: "investiq-weekly-{YYYY-MM-DD}"
    
    monthly:
      schedule: "1st of each month 00:00 UTC"
      retention: 2 years
      name_pattern: "investiq-monthly-{YYYY-MM}"
    
    pre_release:
      trigger: "Before each production deployment"
      retention: 30 days
      automated: true   # via CI/CD pipeline step

  cross_region_copy:
    source: ap-south-1          # Mumbai
    destinations:
      - ap-southeast-1          # Singapore (active DR)
      - us-east-1               # US (compliance archive)
    copy_tags: true
    kms_key_id: "${DR_KMS_KEY_ID}"
```

### pg_basebackup (bare-metal / self-managed option)
```bash
#!/bin/bash
# /scripts/pg_backup.sh — runs via cron on DB server
set -euo pipefail

BACKUP_DIR="/mnt/efs/postgres-backups"
S3_BUCKET="s3://investiq-db-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="investiq_full_${DATE}"

echo "[$(date)] Starting full base backup: $BACKUP_NAME"

# Create encrypted base backup
pg_basebackup \
  --host=localhost \
  --port=5432 \
  --username=investiq_backup \
  --pgdata="$BACKUP_DIR/$BACKUP_NAME" \
  --format=tar \
  --gzip \
  --compress=9 \
  --checkpoint=fast \
  --wal-method=stream \
  --progress \
  --verbose

# Encrypt with KMS before S3 upload
aws kms encrypt \
  --key-id "${DB_BACKUP_KMS_KEY}" \
  --plaintext fileb://"$BACKUP_DIR/$BACKUP_NAME/base.tar.gz" \
  --output text \
  --query CiphertextBlob \
  | base64 --decode \
  > "$BACKUP_DIR/$BACKUP_NAME/base.tar.gz.enc"

# Upload to S3
aws s3 sync "$BACKUP_DIR/$BACKUP_NAME" "$S3_BUCKET/$BACKUP_NAME/" \
  --sse aws:kms \
  --storage-class INTELLIGENT_TIERING

# Cleanup local
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

echo "[$(date)] Backup $BACKUP_NAME uploaded to S3 successfully"
```

---

## 2. Point-in-Time Recovery (PITR) Runbook

```bash
#!/bin/bash
# PITR Runbook — restore to specific timestamp
# Usage: ./pitr_restore.sh "2026-06-09 14:30:00 UTC"

TARGET_TIME="$1"
RESTORE_INSTANCE="investiq-db-restore-$(date +%Y%m%d)"

echo "⚠️  PITR Restore initiated — Target: $TARGET_TIME"
echo "⚠️  This creates a NEW instance; production is unaffected"

# 1. Find the latest snapshot before target time
SNAPSHOT_ID=$(aws rds describe-db-snapshots \
  --db-instance-identifier investiq-db-prod \
  --query "DBSnapshots[?SnapshotCreateTime<='$TARGET_TIME'] | sort_by(@, &SnapshotCreateTime)[-1].DBSnapshotIdentifier" \
  --output text)

echo "✅ Base snapshot: $SNAPSHOT_ID"

# 2. Restore RDS snapshot
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier investiq-db-prod \
  --target-db-instance-identifier "$RESTORE_INSTANCE" \
  --restore-time "$TARGET_TIME" \
  --db-instance-class db.r7g.2xlarge \
  --publicly-accessible false \
  --no-multi-az \
  --tags Key=Purpose,Value=PITR Key=TargetTime,Value="$TARGET_TIME"

# 3. Wait for restore to complete (typically 15-45 min)
echo "⏳ Waiting for restore instance to become available..."
aws rds wait db-instance-available \
  --db-instance-identifier "$RESTORE_INSTANCE"

echo "✅ PITR instance $RESTORE_INSTANCE is ready"
echo "📋 Next steps:"
echo "   1. Validate data integrity at target time"
echo "   2. Export required tables if partial recovery"
echo "   3. Promote instance if full failover needed"
echo "   4. Update connection strings via AWS Route53 DNS"
```

---

## 3. MongoDB Backup (Atlas)

```yaml
mongodb_atlas_backup:
  continuous_cloud_backup:
    enabled: true
    pit_window_days: 7          # 7-day point-in-time window
    
  scheduled_snapshots:
    hourly:
      retention_days: 2
    daily:
      retention_days: 14
      time: "02:00 UTC"
    weekly:
      retention_weeks: 8
    monthly:
      retention_months: 6
  
  cross_region_copy:
    enabled: true
    destination: ap-southeast-1
    
  restore_test:
    schedule: monthly
    destination: staging-cluster
    validation_script: "/scripts/mongo_backup_validate.js"
```

---

## 4. Redis Backup

```yaml
# elasticache.conf
redis_backup:
  rdb_snapshots:
    enabled: true
    frequency: "Every 12 hours"
    retention_days: 5
    s3_bucket: "investiq-redis-backups"
    
  note: |
    Redis is NOT a source of truth — it's a cache.
    Recovery = restart Redis + services rebuild cache from PostgreSQL/MongoDB.
    RTO for Redis: 5 minutes (restart + warm-up).
    No data loss risk for business data.
```

---

## 5. Multi-Region Replication Architecture

```
                   ┌─────────────────────────────────┐
                   │   AWS ap-south-1 (Mumbai) PRIMARY │
                   │                                   │
                   │  RDS PostgreSQL (Multi-AZ)        │
                   │  ┌───────────┐  ┌─────────────┐  │
                   │  │ Primary   │  │  Standby    │  │
                   │  │ (AZ-a)    │──│  (AZ-b)     │  │
                   │  └─────┬─────┘  └─────────────┘  │
                   │        │ Sync replication          │
                   │  ElastiCache (Multi-AZ)           │
                   │  MSK Kafka (3 brokers AZ a/b/c)   │
                   │  MongoDB Atlas (M30, 3-node RS)   │
                   └─────────────┬───────────────────┘
                                 │
                  Async WAL streaming (< 30 sec lag)
                                 │
                   ┌─────────────▼───────────────────┐
                   │  AWS ap-southeast-1 (Singapore) DR│
                   │                                   │
                   │  RDS Read Replica → promote-able  │
                   │  Redis Cluster (warm standby)     │
                   │  MSK Mirror Maker 2               │
                   │  MongoDB Atlas Global Cluster     │
                   └─────────────────────────────────┘
```

---

## 6. Failover Runbook (RTO: 15 min for critical DBs)

```bash
#!/bin/bash
# FAILOVER RUNBOOK — Run only after approval from CTO + DBA Lead
# Estimated time: 10-15 minutes

echo "🚨 FAILOVER INITIATED — $(date)"
echo "🔴 Reason: $INCIDENT_REASON"

# STEP 1: Confirm primary is unreachable (2 min)
echo "Step 1: Confirming primary failure..."
aws rds describe-db-instances \
  --db-instance-identifier investiq-db-prod \
  --query 'DBInstances[0].DBInstanceStatus'

# STEP 2: Promote RDS Read Replica in Singapore (3 min)
echo "Step 2: Promoting Singapore read replica..."
aws rds promote-read-replica \
  --db-instance-identifier investiq-db-dr-sg \
  --backup-retention-period 7
aws rds wait db-instance-available --db-instance-identifier investiq-db-dr-sg

# STEP 3: Update DNS (Route53 weighted routing → DR) (1 min)
echo "Step 3: Updating DNS to DR endpoint..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "${HOSTED_ZONE_ID}" \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "db.internal.investiq.in",
        "Type": "CNAME",
        "TTL": 30,
        "ResourceRecords": [{"Value": "'"${DR_RDS_ENDPOINT}"'"}]
      }
    }]
  }'

# STEP 4: Restart application pods (3 min)
echo "Step 4: Rolling restart of all services..."
kubectl rollout restart deployment -n investiq

# STEP 5: Verify
echo "Step 5: Running smoke tests..."
curl -sf https://api.investiq.in/actuator/health | jq '.components.db.status'

echo "✅ FAILOVER COMPLETE — $(date)"
echo "📋 Post-failover: Create incident report, monitor lag, plan failback"
```

---

## 7. Backup Validation (Monthly)

```bash
#!/bin/bash
# /scripts/validate_backup.sh — Run monthly in staging

LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime)[-1].DBSnapshotIdentifier' \
  --output text)

echo "Restoring $LATEST_SNAPSHOT to validation instance..."
# Restore → run validation queries → verify row counts → alert

VALIDATION_QUERIES=(
    "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'"
    "SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '7 days'"
    "SELECT SUM(balance) FROM wallets WHERE wallet_type = 'USER'"
    "SELECT MAX(event_time) FROM audit_logs"
)

for query in "${VALIDATION_QUERIES[@]}"; do
    result=$(PGPASSWORD=$RESTORE_DB_PASS psql -h $RESTORE_HOST -U investiq_readonly -d investiq_wallet -tAc "$query")
    echo "✅ $query → $result"
done

echo "📧 Sending validation report to dba-team@investiq.in"
```

---

## 8. Data Retention Policy (SEBI / RBI / GDPR)

| Data Category | Retention Period | Storage | Auto-Archive |
|---|---|---|---|
| Audit logs (financial) | **7 years** (SEBI mandatory) | S3 Glacier | Year 3+ |
| Trade records | **7 years** | S3 Intelligent-Tiering | Year 3+ |
| KYC documents | **10 years** | S3 Glacier Deep Archive | Year 5+ |
| User profiles (active) | Lifetime + 7 years post-deletion | RDS | Never |
| Payment records | **7 years** (RBI) | RDS → S3 | Year 3+ |
| Session / OTP logs | **1 year** | RDS → delete | Year 1 |
| Market price ticks | **3 years** | TimescaleDB → S3 | Year 1 |
| Analytics events | **2 years** | MongoDB → S3 | Year 2 |
| GDPR erasure | Within **72 hours** of request | All systems | Automated |
| Legal holds | Until hold lifted | Immutable S3 | Never |
