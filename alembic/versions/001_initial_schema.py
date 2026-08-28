"""Initial database schema migration

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-28 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Usuarios
    op.create_table(
        'usuarios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('apellido', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('telefono', sa.String(length=50), nullable=True),
        sa.Column('nombre_usuario', sa.String(length=50), nullable=False),
        sa.Column('contraseña_hash', sa.String(length=255), nullable=False),
        sa.Column('rol', sa.String(length=30), nullable=False, server_default='cliente'),
        sa.Column('puntos_fidelidad', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('activo', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('ultimo_acceso', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('nombre_usuario')
    )
    op.create_index(op.f('ix_usuarios_id'), 'usuarios', ['id'], unique=False)

    # 2. Categorías
    op.create_table(
        'categorias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('descripcion', sa.String(length=255), nullable=True),
        sa.Column('imagen_url', sa.String(length=255), nullable=True),
        sa.Column('orden', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('activo', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )
    op.create_index(op.f('ix_categorias_id'), 'categorias', ['id'], unique=False)

    # 3. Productos
    op.create_table(
        'productos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('precio', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('precio_promocion', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('stock', sa.Integer(), nullable=True, server_default='100'),
        sa.Column('stock_minimo', sa.Integer(), nullable=True, server_default='5'),
        sa.Column('imagen_url', sa.String(length=255), nullable=True),
        sa.Column('tiempo_preparacion', sa.Integer(), nullable=True, server_default='15'),
        sa.Column('personalizable', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('ingredientes_json', sa.Text(), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('categoria_id', sa.Integer(), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['categoria_id'], ['categorias.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_productos_id'), 'productos', ['id'], unique=False)

    # 4. Turnos
    op.create_table(
        'turnos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('numero_turno', sa.Integer(), nullable=False),
        sa.Column('fecha_apertura', sa.DateTime(), nullable=True),
        sa.Column('fecha_cierre', sa.DateTime(), nullable=True),
        sa.Column('monto_apertura', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00'),
        sa.Column('monto_cierre', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('total_ventas', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00'),
        sa.Column('total_pedidos', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('efectivo_declarado', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('diferencia', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00'),
        sa.Column('activo', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('usuario_caja_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['usuario_caja_id'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_turnos_id'), 'turnos', ['id'], unique=False)

    # 5. Mesas
    op.create_table(
        'mesas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('numero_mesa', sa.Integer(), nullable=False),
        sa.Column('estado', sa.String(length=30), nullable=True, server_default='LIBRE'),
        sa.Column('codigo_qr', sa.String(length=200), nullable=True),
        sa.Column('capacidad', sa.Integer(), nullable=True, server_default='4'),
        sa.Column('cliente_actual', sa.String(length=100), nullable=True),
        sa.Column('tiempo_ocupacion_min', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('pedido_activo_id', sa.Integer(), nullable=True),
        sa.Column('subtotal_acumulado', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('numero_mesa')
    )
    op.create_index(op.f('ix_mesas_id'), 'mesas', ['id'], unique=False)

    # 6. Pedidos
    op.create_table(
        'pedidos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('numero_mesa', sa.String(length=50), nullable=False),
        sa.Column('codigo_qr', sa.String(length=100), nullable=True),
        sa.Column('tipo', sa.String(length=30), nullable=True, server_default='mesa'),
        sa.Column('modo_pago', sa.String(length=30), nullable=True, server_default='PAGAR_ANTES'),
        sa.Column('estado', sa.String(length=30), nullable=True, server_default='PENDIENTE'),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('impuesto', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('costo_empaque', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00'),
        sa.Column('descuento', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00'),
        sa.Column('total', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('nombre_cliente_delivery', sa.String(length=150), nullable=True),
        sa.Column('telefono_delivery', sa.String(length=50), nullable=True),
        sa.Column('direccion_delivery', sa.Text(), nullable=True),
        sa.Column('codigo_otp', sa.String(length=10), nullable=True),
        sa.Column('otp_verificado', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_entrega', sa.DateTime(), nullable=True),
        sa.Column('metodo_pago', sa.String(length=50), nullable=True),
        sa.Column('monto_recibido', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('cambio', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('factura_numero', sa.String(length=50), nullable=True),
        sa.Column('nit_cliente', sa.String(length=50), nullable=True, server_default='CF'),
        sa.Column('nombre_factura', sa.String(length=100), nullable=True, server_default='Consumidor Final'),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('turno_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['turno_id'], ['turnos.id'], ),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pedidos_id'), 'pedidos', ['id'], unique=False)

    # 7. Detalles Pedido
    op.create_table(
        'detalles_pedido',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pedido_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('cantidad', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('precio_unitario', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('personalizaciones', sa.Text(), nullable=True),
        sa.Column('estado', sa.String(length=30), nullable=True, server_default='PENDIENTE'),
        sa.Column('observaciones', sa.String(length=255), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_listo', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['pedido_id'], ['pedidos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_detalles_pedido_id'), 'detalles_pedido', ['id'], unique=False)

    # 8. Configuraciones
    op.create_table(
        'configuraciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('clave', sa.String(length=100), nullable=False),
        sa.Column('valor', sa.Text(), nullable=False),
        sa.Column('descripcion', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('clave')
    )
    op.create_index(op.f('ix_configuraciones_id'), 'configuraciones', ['id'], unique=False)

    # 9. Insumos
    op.create_table(
        'insumos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('stock_actual', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('stock_minimo', sa.Float(), nullable=False, server_default='5.0'),
        sa.Column('unidad_medida', sa.String(length=20), nullable=False, server_default='un'),
        sa.Column('estado', sa.String(length=20), nullable=True, server_default='NORMAL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )
    op.create_index(op.f('ix_insumos_id'), 'insumos', ['id'], unique=False)

    # 10. Promociones
    op.create_table(
        'promociones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('titulo', sa.String(length=150), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('descuento_pct', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('codigo_cupon', sa.String(length=50), nullable=False),
        sa.Column('banner_url', sa.String(length=255), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=True, server_default='true'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('codigo_cupon')
    )
    op.create_index(op.f('ix_promociones_id'), 'promociones', ['id'], unique=False)

    # 11. Carritos
    op.create_table(
        'carritos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('items_json', sa.Text(), nullable=True),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00'),
        sa.Column('total', sa.Numeric(precision=12, scale=2), nullable=True, server_default='0.00'),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_carritos_id'), 'carritos', ['id'], unique=False)


def downgrade() -> None:
    op.drop_table('carritos')
    op.drop_table('promociones')
    op.drop_table('insumos')
    op.drop_table('configuraciones')
    op.drop_table('detalles_pedido')
    op.drop_table('pedidos')
    op.drop_table('mesas')
    op.drop_table('turnos')
    op.drop_table('productos')
    op.drop_table('categorias')
    op.drop_table('usuarios')
