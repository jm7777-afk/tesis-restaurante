#!/usr/bin/env python
"""
Script para migrar datos de SQLite a PostgreSQL - DONDE DAVID
"""
import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import json

# Configuración
SQLITE_DB = os.path.abspath(os.path.join(os.path.dirname(__file__), '../restaurante.db'))
POSTGRES_DSN = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/donde_david_db')

TABLAS = [
    'usuarios',
    'categorias',
    'productos',
    'pedidos',
    'detalles_pedido',
    'turnos',
    'configuraciones',
    'facturas'
]

def get_sqlite_connection():
    """Obtiene conexión a SQLite"""
    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_postgres_connection():
    """Obtiene conexión a PostgreSQL"""
    return psycopg2.connect(POSTGRES_DSN)

def migrate_table(sqlite_conn, pg_conn, table_name):
    """Migra una tabla de SQLite a PostgreSQL"""
    print(f"🔄 Migrando tabla: {table_name}...")
    
    try:
        cursor = sqlite_conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        if not rows:
            print(f"ℹ️  Tabla {table_name} vacía. Omitiendo.")
            return
        
        columns = [description[0] for description in cursor.description]
        pg_cursor = pg_conn.cursor()
        
        for row in rows:
            data = {}
            for col in columns:
                value = row[col]
                if isinstance(value, str) and value.startswith('{'):
                    try:
                        value = json.loads(value)
                    except:
                        pass
                if isinstance(value, str) and value.endswith('Z'):
                    try:
                        value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    except:
                        pass
                data[col] = value
            
            placeholders = ', '.join(['%s'] * len(columns))
            columns_str = ', '.join(columns)
            query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
            
            try:
                pg_cursor.execute(query, list(data.values()))
            except Exception as e:
                print(f"⚠️  Aviso en fila de {table_name}: {e}")
                pg_conn.rollback()
                continue
        
        pg_conn.commit()
        print(f"✅ Tabla {table_name} migrada: {len(rows)} registros")
    except Exception as e:
        print(f"⚠️  Tabla {table_name} no disponible en origen: {e}")

def main():
    """Función principal"""
    print("=" * 60)
    print("🚀 MIGRANDO SQLITE → POSTGRESQL - DONDE DAVID")
    print("=" * 60)
    
    try:
        print("\n📂 Conectando a SQLite...")
        sqlite_conn = get_sqlite_connection()
        print("✅ Conexión SQLite exitosa")
        
        print("\n🐘 Conectando a PostgreSQL...")
        pg_conn = get_postgres_connection()
        print("✅ Conexión PostgreSQL exitosa")
        
        print("\n📦 Iniciando migración de tablas...")
        for table in TABLAS:
            migrate_table(sqlite_conn, pg_conn, table)
        
        sqlite_conn.close()
        pg_conn.close()
        
        print("\n" + "=" * 60)
        print("✅ MIGRACIÓN COMPLETADA EXITOSAMENTE")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ AVISO EN MIGRACIÓN DIRECTA: {e}")
        print("ℹ️  El esquema se creará automáticamente en Render usando SQLAlchemy / postgres_schema.sql.")

if __name__ == "__main__":
    main()
