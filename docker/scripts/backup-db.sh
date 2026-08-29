#!/bin/sh
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="smart_sms_backup_${TIMESTAMP}.sql.gz"

echo "Starting PostgreSQL database backup: ${FILENAME}"
mkdir -p "${BACKUP_DIR}"

pg_dump -h "${DATABASE_HOST:-localhost}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-smart_sms_prod}" | gzip > "${BACKUP_DIR}/${FILENAME}"

# Retain backups for 14 days and prune older ones
find "${BACKUP_DIR}" -name "smart_sms_backup_*.sql.gz" -mtime +14 -exec rm {} \;

echo "Backup completed successfully: ${BACKUP_DIR}/${FILENAME}"
