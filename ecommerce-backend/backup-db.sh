#!/usr/bin/env bash
# Backup toàn bộ PostgreSQL trong container ecommerce-postgres (cả 7 database + roles).
# Cách dùng: ./backup-db.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)/backups"
mkdir -p "$DIR"
TS=$(date +%Y%m%d_%H%M%S)
OUT="$DIR/ecommerce_all_${TS}.sql.gz"

docker exec ecommerce-postgres pg_dumpall -U postgres | gzip > "$OUT"
echo "Backup xong: $OUT ($(du -h "$OUT" | cut -f1))"

# Giữ 14 bản gần nhất, xóa cũ hơn.
ls -1t "$DIR"/ecommerce_all_*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
