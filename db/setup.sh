#!/usr/bin/env bash
# One-command database setup. Run this once:
#   bash db/setup.sh

set -euo pipefail
DB="techstore"

echo "→ Creating database '$DB' (skips if it already exists)..."
createdb "$DB" 2>/dev/null && echo "  Created." || echo "  Already exists, continuing."

echo "→ Applying schema..."
psql "$DB" -f "$(dirname "$0")/schema.sql"

echo "→ Seeding sample data..."
psql "$DB" -f "$(dirname "$0")/seed.sql"

echo "✓ Done. Database '$DB' is ready."
echo ""
echo "  Quick check:"
psql "$DB" -c "SELECT COUNT(*) AS customers FROM customers;"
psql "$DB" -c "SELECT COUNT(*) AS orders FROM orders;"
psql "$DB" -c "SELECT COUNT(*) AS kb_articles FROM knowledge_base;"
