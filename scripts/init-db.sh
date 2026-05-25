#!/bin/bash
set -e

# Create the Keycloak database alongside the app database.
# POSTGRES_DB (the app db) is created automatically by the postgres image.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE ${POSTGRES_DB_KEYCLOAK}'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_DB_KEYCLOAK}')\gexec
EOSQL
