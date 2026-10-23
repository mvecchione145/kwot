#!/bin/bash
# Creates the application and Keycloak databases, each with its own owner.
# Runs once, on first start of an empty Postgres volume.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-SQL
  CREATE USER ${APP_DB_USER} WITH PASSWORD '${APP_DB_PASSWORD}';
  CREATE DATABASE ${APP_DB_NAME} OWNER ${APP_DB_USER};
  CREATE USER ${KC_DB_USER} WITH PASSWORD '${KC_DB_PASSWORD}';
  CREATE DATABASE ${KC_DB_NAME} OWNER ${KC_DB_USER};
SQL
