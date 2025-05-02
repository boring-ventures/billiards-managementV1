#!/bin/bash

# Setup script for admin features
# This script creates the required database tables and functions for admin operations

# Load environment variables
source .env

# Check if the required variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing required environment variables."
  echo "Please make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file."
  exit 1
fi

echo "=== Setting up admin features ==="
echo "This script will create the required database tables and functions for admin operations."

# Extract database connection string
DB_HOST=$(echo $DIRECT_URL | sed -E 's/.*@([^:]+):.*/\1/')
DB_PORT=$(echo $DIRECT_URL | sed -E 's/.*:([0-9]+)\/.*/\1/')
DB_USER=$(echo $DIRECT_URL | sed -E 's/.*:\/\/([^:]+):.*/\1/')
DB_NAME=$(echo $DIRECT_URL | sed -E 's/.*\/([^?]+).*/\1/')

echo "Using database: $DB_NAME on $DB_HOST:$DB_PORT"

# Create admin audit logs table
echo "Creating admin audit logs table..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/create-admin-audit-logs.sql

# Create admin stored procedures
echo "Creating admin stored procedures..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/create-admin-stored-procedures.sql

echo "=== Database setup completed ==="
echo "Now migrating user metadata to JWT claims..."

# Run the user metadata migration script
npx tsx scripts/migrate-user-metadata.ts

echo "=== Setup completed ==="
echo "Admin features are now ready to use!" 