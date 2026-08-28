#!/bin/bash
# ============================================================ #
# BACKUP AUTOMÁTICO - DONDE DAVID                               #
# ============================================================ #

BACKUP_DIR="/var/backups/donde-david"
DB_NAME="donde_david_db"
DB_USER="postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

echo "📦 Realizando backup de $DB_NAME..."
pg_dump -U $DB_USER -F c -b -v -f $BACKUP_FILE $DB_NAME

gzip $BACKUP_FILE

if [ -f "$BACKUP_FILE.gz" ]; then
    echo "✅ Backup creado: $BACKUP_FILE.gz"
    echo "📊 Tamaño: $(du -h $BACKUP_FILE.gz | cut -f1)"
else
    echo "❌ Error al crear backup"
    exit 1
fi

echo "🧹 Eliminando backups con más de $RETENTION_DAYS días..."
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Proceso de backup completado"
