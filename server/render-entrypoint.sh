#!/bin/sh
set -e

# Render provides DATABASE_URL as a full postgres connection string:
# postgres://user:password@host:port/dbname
# Nakama expects: user:password@host:port/dbname
DB_ADDR=$(echo "$DATABASE_URL" | sed 's|postgres://||')

echo "Starting Nakama with database: $DB_ADDR"

# Run migrations first
/nakama/nakama migrate up --database.address "$DB_ADDR"

# Start Nakama
exec /nakama/nakama \
  --config /nakama/data/local.yml \
  --database.address "$DB_ADDR"
