#!/bin/bash
# ============================================================ #
# DESPLIEGUE EN RENDER - DONDE DAVID                           #
# ============================================================ #

set -e

echo "========================================"
echo "🚀 DESPLIEGUE EN RENDER - DONDE DAVID"
echo "========================================"

if ! command -v git &> /dev/null; then
    echo "❌ Git no está instalado"
    exit 1
fi

if ! git remote -v | grep -q "jm7777-afk/tesis-restaurante"; then
    echo "❌ Repositorio incorrecto"
    echo "   Ejecuta: git remote set-url origin https://github.com/jm7777-afk/tesis-restaurante.git"
    exit 1
fi

echo "📝 Haciendo commit de los cambios de producción..."
git add .
git commit -m "feat: preparación para producción y migración a PostgreSQL" || true

echo "📤 Subiendo a GitHub..."
git push origin main

echo ""
echo "========================================"
echo "✅ CÓDIGO SUBIDO A GITHUB"
echo "========================================"
echo ""
echo "📌 SIGUIENTES PASOS:"
echo "1. Ve a: https://render.com"
echo "2. Crea un nuevo Blueprint o Servicio Web"
echo "3. Selecciona tu repositorio: https://github.com/jm7777-afk/tesis-restaurante"
echo "4. Despliega automáticamente con render.yaml"
echo "========================================"
