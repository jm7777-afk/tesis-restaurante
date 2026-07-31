from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, create_access_token, get_current_user, get_password_hash
from backend.app.models.usuario import Usuario
from backend.app.schemas.schemas import LoginRequest, Token, UsuarioOut

router = APIRouter(prefix="/auth", tags=["Autenticación"])

class RegisterRequest(BaseModel):
    nombre: str
    apellido: str
    email: str
    telefono: str
    nombre_usuario: str
    password: str

class RecoverPasswordRequest(BaseModel):
    email_o_telefono: str

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(
        (Usuario.nombre_usuario == login_data.nombre_usuario) | (Usuario.email == login_data.nombre_usuario),
        Usuario.activo == True
    ).first()
    
    if not user or not verify_password(login_data.password, user.contraseña_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.nombre_usuario, "rol": user.rol})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": {
            "id": user.id,
            "nombre": user.nombre,
            "apellido": user.apellido,
            "nombre_usuario": user.nombre_usuario,
            "email": user.email,
            "telefono": user.telefono,
            "rol": user.rol,
            "puntos_fidelidad": user.puntos_fidelidad,
            "pedidos_count": user.pedidos_count,
            "total_gastado": user.total_gastado
        }
    }

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.nombre_usuario == data.nombre_usuario).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado.")
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")

    nuevo = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        telefono=data.telefono,
        nombre_usuario=data.nombre_usuario,
        contraseña_hash=get_password_hash(data.password),
        rol="cliente",
        puntos_fidelidad=50 # Bonus de bienvenida (50 pts)
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    token = create_access_token(data={"sub": nuevo.nombre_usuario, "rol": nuevo.rol})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": nuevo.id,
            "nombre": nuevo.nombre,
            "apellido": nuevo.apellido,
            "email": nuevo.email,
            "nombre_usuario": nuevo.nombre_usuario,
            "rol": nuevo.rol,
            "puntos_fidelidad": nuevo.puntos_fidelidad
        }
    }

@router.post("/recuperar-password")
def recuperar_password(data: RecoverPasswordRequest):
    return {"mensaje": f"Se han enviado las instrucciones de recuperación a: {data.email_o_telefono}"}

@router.get("/me", response_model=UsuarioOut)
def read_current_user(current_user: Usuario = Depends(get_current_user)):
    return current_user
