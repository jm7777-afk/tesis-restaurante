from fastapi import Request, status
from fastapi.responses import JSONResponse

class DomainException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

class EntityNotFoundException(DomainException):
    def __init__(self, entity_name: str, entity_id: str | int = ""):
        detail = f"{entity_name} no encontrado." if not entity_id else f"{entity_name} #{entity_id} no encontrado."
        super().__init__(detail, status_code=status.HTTP_404_NOT_FOUND)

class InsufficientPaymentException(DomainException):
    def __init__(self, total_requerido: float, monto_recibido: float):
        detail = f"Monto recibido (${monto_recibido:.2f}) es insuficiente para cubrir el total (${total_requerido:.2f})."
        super().__init__(detail, status_code=status.HTTP_400_BAD_REQUEST)

class ShiftClosedException(DomainException):
    def __init__(self, detail: str = "No hay ningún turno de caja activo para procesar la operación."):
        super().__init__(detail, status_code=status.HTTP_400_BAD_REQUEST)

def register_exception_handlers(app):
    @app.exception_handler(DomainException)
    async def domain_exception_handler(request: Request, exc: DomainException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message}
        )
