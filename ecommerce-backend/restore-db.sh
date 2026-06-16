#!/usr/bin/env bash
# Restore PostgreSQL từ file backup do backup-db.sh tạo.
# Cách dùng: ./restore-db.sh backups/ecommerce_all_YYYYMMDD_HHMMSS.sql.gz
set -euo pipefail

FILE="${1:-}"
[ -z "$FILE" ] && { echo "Dùng: $0 <file.sql.gz>"; exit 1; }
[ -f "$FILE" ] || { echo "Không thấy file: $FILE"; exit 1; }

gunzip -c "$FILE" | docker exec -i ecommerce-postgres psql -U postgres
echo "Restore xong từ $FILE"
