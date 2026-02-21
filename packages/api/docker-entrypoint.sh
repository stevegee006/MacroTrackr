#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/api
npx prisma migrate deploy

echo "Starting API server..."
cd /app
exec node packages/api/dist/index.js
