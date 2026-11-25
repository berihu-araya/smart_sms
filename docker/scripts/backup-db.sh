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

# Optional Off-Site Cloud Sync (AWS S3 / Cloudflare R2 / MinIO)
if [ -n "${S3_BACKUP_BUCKET}" ]; then
  echo "Syncing backup to off-site cloud storage: s3://${S3_BACKUP_BUCKET}/db-backups/"
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://${S3_BACKUP_BUCKET}/db-backups/${FILENAME}"
    echo "Off-site S3 cloud backup completed successfully."
  else
    echo "Notice: aws CLI tool not found on host. Backup saved locally in ${BACKUP_DIR}."
  fi
fi

echo "Backup completed successfully: ${BACKUP_DIR}/${FILENAME}"
