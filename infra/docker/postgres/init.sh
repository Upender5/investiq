#!/bin/bash
# Creates one PostgreSQL database per service and enables required extensions.
# Runs automatically on first container start (docker-entrypoint-initdb.d).
set -euo pipefail

SERVICE_DBS=(
  investiq_auth
  investiq_users
  investiq_trades
  investiq_wallet
  investiq_market
  investiq_notifications
)

for db in "${SERVICE_DBS[@]}"; do
  echo "==> Creating database: $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -c "CREATE DATABASE $db;"

  echo "==> Enabling extensions on: $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-SQL
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL
done

echo "==> All service databases ready."
