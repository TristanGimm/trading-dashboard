#!/usr/bin/env bash
set -euo pipefail
umask 077
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"
OUT="${1:-/root/trading-backups}"
mkdir -p "$OUT"
FILE="$OUT/trading-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
# Caution: a shell redirection can create a partial file on failure; write atomically.
TMP="${FILE}.tmp"
trap 'rm -f "$TMP"' EXIT
docker compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$TMP"
test -s "$TMP"
mv "$TMP" "$FILE"
trap - EXIT
printf 'Backup written to %s\n' "$FILE"
