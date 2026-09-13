import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.pedido import Pedido
from backend.app.models.detalle_pedido import DetallePedido
from backend.app.models.producto import Producto
from backend.app.core.exceptions import EntityNotFoundException, DomainException

class PedidoService:
    @staticmethod
    def crear_pedido(db: Session, data: Dict[str, Any], usuario_id: int = None) -> Pedido:
        detalles_data = data.get("detalles", [])
        if not detalles_data:
            raise DomainException("El pedido debe contener al menos un producto.")

        subtotal_acumulado = 0.0
        detalles_instancias = []

        for item in detalles_data:
            prod_id = item.get("producto_id")
            cantidad = item.get("cantidad", 1)
            producto = db.query(Producto).filter(Producto.id == prod_id, Producto.activo == True).first()
            if not producto:
                raise EntityNotFoundException("Producto", prod_id)

            precio_unitario = float(producto.precio)
            subtotal_linea = round(precio_unitario * cantidad, 2)
            subtotal_acumulado += subtotal_linea

            personalizaciones_str = json.dumps(item.get("personalizaciones")) if item.get("personalizaciones") else None

            detalle = DetallePedido(
                producto_id=producto.id,
                cantidad=cantidad,
                precio_unitario=precio_unitario,
                subtotal=subtotal_linea,
                personalizaciones=personalizaciones_str,
                observaciones=item.get("observaciones"),
                estado="PENDIENTE"
            )
            detalles_instancias.append(detalle)

        impuesto = round(subtotal_acumulado * 0.16, 2)
        total = round(subtotal_acumulado + impuesto, 2)

        nuevo_pedido = Pedido(
            numero_mesa=str(data.get("numero_mesa", "Mostrador")),
            codigo_qr=data.get("codigo_qr"),
            tipo=data.get("tipo", "mesa"),
            modo_pago=data.get("modo_pago", "PAGAR_ANTES"),
            estado="PENDIENTE",
            subtotal=subtotal_acumulado,
            impuesto=impuesto,
            descuento=0.0,
            total=total,
            observaciones=data.get("observaciones"),
            nombre_cliente_delivery=data.get("nombre_cliente_delivery"),
            telefono_delivery=data.get("telefono_delivery"),
            direccion_delivery=data.get("direccion_delivery"),
            usuario_id=usuario_id,
            detalles=detalles_instancias
        )

        db.add(nuevo_pedido)
        db.commit()
        db.refresh(nuevo_pedido)
        return nuevo_pedido
