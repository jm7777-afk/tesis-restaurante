-- ============================================================ #
-- DONDE DAVID - ESQUEMA POSTGRESQL                             #
-- ============================================================ #

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================ #
-- TABLA: USUARIOS                                               #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
    contraseña_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_nombre_usuario ON usuarios(nombre_usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- ============================================================ #
-- TABLA: CATEGORIAS                                             #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion VARCHAR(255),
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categorias_nombre ON categorias(nombre);

-- ============================================================ #
-- TABLA: PRODUCTOS                                              #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_usd DECIMAL(10,2) NOT NULL,
    precio_promocion_usd DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    imagen_url VARCHAR(255),
    tiempo_preparacion INTEGER DEFAULT 15,
    personalizable BOOLEAN DEFAULT TRUE,
    ingredientes JSONB,
    activo BOOLEAN DEFAULT TRUE,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);

-- ============================================================ #
-- TABLA: TURNOS                                                 #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS turnos (
    id SERIAL PRIMARY KEY,
    numero_turno INTEGER NOT NULL,
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP,
    monto_apertura_usd DECIMAL(10,2) DEFAULT 0.00,
    monto_cierre_usd DECIMAL(10,2),
    total_ventas_usd DECIMAL(10,2) DEFAULT 0.00,
    total_pedidos INTEGER DEFAULT 0,
    tasa_cambio_apertura DECIMAL(10,2),
    tasa_cambio_cierre DECIMAL(10,2),
    diferencia DECIMAL(10,2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT TRUE,
    usuario_caja_id INTEGER NOT NULL REFERENCES usuarios(id),
    usuario_cierre_id INTEGER REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_turnos_activo ON turnos(activo);
CREATE INDEX IF NOT EXISTS idx_turnos_numero ON turnos(numero_turno);

-- ============================================================ #
-- TABLA: PEDIDOS                                                #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    numero_mesa VARCHAR(10),
    codigo_qr VARCHAR(50),
    tipo VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    total_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_bs DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    impuesto_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descuento_usd DECIMAL(10,2) DEFAULT 0.00,
    tasa_cambio_aplicada DECIMAL(10,2),
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP,
    fecha_entrega TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id),
    turno_id INTEGER REFERENCES turnos(id),
    mesa_original VARCHAR(10)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_turno ON pedidos(turno_id);

-- ============================================================ #
-- TABLA: DETALLES_PEDIDO                                        #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS detalles_pedido (
    id SERIAL PRIMARY KEY,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario_usd DECIMAL(10,2) NOT NULL,
    subtotal_usd DECIMAL(10,2) NOT NULL,
    personalizaciones JSONB,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP,
    fecha_listo TIMESTAMP,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_detalles_pedido ON detalles_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_detalles_estado ON detalles_pedido(estado);

-- ============================================================ #
-- TABLA: CONFIGURACIONES                                        #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS configuraciones (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor VARCHAR(500) NOT NULL,
    descripcion VARCHAR(255),
    fecha_actualizacion TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_configuraciones_clave ON configuraciones(clave);

-- ============================================================ #
-- TABLA: FACTURAS                                               #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS facturas (
    id SERIAL PRIMARY KEY,
    numero_factura VARCHAR(20) UNIQUE NOT NULL,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
    subtotal_usd DECIMAL(10,2) NOT NULL,
    subtotal_bs DECIMAL(10,2) NOT NULL,
    iva_porcentaje DECIMAL(5,2) NOT NULL,
    iva_usd DECIMAL(10,2) NOT NULL,
    iva_bs DECIMAL(10,2) NOT NULL,
    total_usd DECIMAL(10,2) NOT NULL,
    total_bs DECIMAL(10,2) NOT NULL,
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_caja_id INTEGER REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha_emision);

-- ============================================================ #
-- TABLA: PAGOS                                                  #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
    metodo VARCHAR(30) NOT NULL,
    monto_usd DECIMAL(10,2) NOT NULL,
    monto_bs DECIMAL(10,2) NOT NULL,
    monto_recibido DECIMAL(10,2),
    referencia VARCHAR(50),
    banco VARCHAR(50),
    fecha_pago TIMESTAMP,
    cedula VARCHAR(20),
    estado VARCHAR(20) DEFAULT 'confirmado',
    contexto VARCHAR(20),
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);

-- ============================================================ #
-- TABLA: TASA_CAMBIO_HISTORIAL                                  #
-- ============================================================ #
CREATE TABLE IF NOT EXISTS tasa_cambio_historial (
    id SERIAL PRIMARY KEY,
    tasa_usd_bs DECIMAL(10,2) NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_actualizo_id INTEGER REFERENCES usuarios(id)
);

-- ============================================================ #
-- DATOS INICIALES                                               #
-- ============================================================ #

-- Usuario admin (contraseña: admin123)
INSERT INTO usuarios (nombre, apellido, email, nombre_usuario, contraseña_hash, rol) 
VALUES (
    'Administrador',
    'Sistema',
    'admin@donde-david.com',
    'admin',
    '$2b$12$KIXpTyRkMpIgHEK.GZnz6elK5RAGVHJnRwExrFzFw4Qq8sUbYt6Z6',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Configuraciones iniciales
INSERT INTO configuraciones (clave, valor, descripcion) VALUES
('TASA_CAMBIO_USD_BS', '42.50', 'Tasa de cambio oficial del Dólar a Bolívares'),
('IVA_PORCENTAJE', '16.00', 'Porcentaje de Impuesto al Valor Agregado'),
('TIEMPO_PREPARACION_BASE', '15', 'Tiempo base de preparación en minutos'),
('HORA_APERTURA', '08:00', 'Hora de apertura del restaurante'),
('HORA_CIERRE', '22:00', 'Hora de cierre del restaurante')
ON CONFLICT (clave) DO NOTHING;
