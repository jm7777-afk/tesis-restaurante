from sqlalchemy.orm import Session
from backend.app.models.carrito import Carrito
from backend.app.models.configuracion import Configuracion

class CarritoService:
    def __init__(self, db: Session):
        self.db = db

    def _get_tasa_cambio(self) -> float:
        tasa_config = self.db.query(Configuracion).filter(Configuracion.clave == "tasa_cambio_bs").first()
        return float(tasa_config.valor) if tasa_config else 00.00

    def obtener_o_crear_carrito(self, usuario_id: int) -> Carrito:
        carrito = self.db.query(Carrito).filter(Carrito.usuario_id == usuario_id).first()
        if not carrito:
            carrito = Carrito(usuario_id=usuario_id, items=[], total_usd=0.0, total_bs=0.0)
            self.db.add(carrito)
            self.db.commit()
            self.db.refresh(carrito)
        return carrito

    def recalcular_totales(self, carrito: Carrito) -> Carrito:
        total_usd = 0.0
        tasa = self._get_tasa_cambio()

        for item in carrito.items:
            qty = item.get("cantidad", 1)
            precio = float(item.get("precio", 0.0))
            total_usd += (precio * qty)

        carrito.total_usd = round(total_usd, 2)
        carrito.total_bs = round(total_usd * tasa, 2)
        self.db.commit()
        self.db.refresh(carrito)
        return carrito

    def agregar_item(self, usuario_id: int, item_data: dict) -> Carrito:
        carrito = self.obtener_o_crear_carrito(usuario_id)
        items = list(carrito.items)

        found = False
        for it in items:
            if it.get("producto_id") == item_data.get("producto_id") and it.get("opciones") == item_data.get("opciones"):
                it["cantidad"] = it.get("cantidad", 1) + item_data.get("cantidad", 1)
                it["subtotal"] = round(it["cantidad"] * float(it.get("precio", 0.0)), 2)
                found = True
                break

        if not found:
            items.append(item_data)

        carrito.items = items
        return self.recalcular_totales(carrito)

    def eliminar_item(self, usuario_id: int, item_index: int) -> Carrito:
        carrito = self.obtener_o_crear_carrito(usuario_id)
        items = list(carrito.items)
        if 0 <= item_index < len(items):
            items.pop(item_index)
            carrito.items = items
            return self.recalcular_totales(carrito)
        return carrito

    def vaciar_carrito(self, usuario_id: int) -> Carrito:
        carrito = self.obtener_o_crear_carrito(usuario_id)
        carrito.items = []
        carrito.total_usd = 0.0
        carrito.total_bs = 0.0
        self.db.commit()
        self.db.refresh(carrito)
        return carrito
