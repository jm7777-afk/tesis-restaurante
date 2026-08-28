#!/bin/bash
# ============================================================ #
# MONITOREO DE SERVICIO - DONDE DAVID                          #
# ============================================================ #

URL="https://donde-david-backend.onrender.com/health"
ALERT_EMAIL="admin@donde-david.com"
LOG_FILE="logs/monitor.log"

mkdir -p logs

send_alert() {
    echo "⚠️ ALERTA: $1" | mail -s "⚠️ Alerta DONDE DAVID" $ALERT_EMAIL 2>/dev/null || true
    echo "$(date) - ALERTA: $1" >> $LOG_FILE
}

echo "$(date) - Verificando servicio..."

if curl -f -s -o /dev/null $URL; then
    echo "✅ Servicio OK"
else
    send_alert "Servicio caído en $URL"
fi

if curl -f -s $URL | grep -q "status"; then
    echo "✅ Base de datos OK"
else
    send_alert "Base de datos no disponible"
fi
