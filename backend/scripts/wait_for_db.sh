#!/bin/bash
# Wait for PostgreSQL to be ready, then load data

set -e

# Wait for PostgreSQL
until pg_isready -h "$DB_HOST" -U "$DB_USER"; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Load sample data
python3 scripts/load_sample_data.py

echo "Database setup complete!"
