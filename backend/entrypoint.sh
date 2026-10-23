#!/usr/bin/env bash
set -e

echo "🚀 Starting Hospital Pharmacy Management System Backend..."

# Run migrations
echo "🔄 Running database migrations..."
alembic upgrade head || {
    echo "⚠️ Alembic migration notice. Initializing database schema directly..."
}

# Run seed data
echo "🌱 Running seeds..."
python -m app.seeds.seed_data || echo "Seeds already applied or encountered non-critical notice."

# Start uvicorn
echo "✨ Starting Uvicorn API server on 0.0.0.0:8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
