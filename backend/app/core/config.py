import os
from typing import List

class Settings:
    PROJECT_NAME: str = "Donde David Restaurant Management System"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", os.getenv("ENV", "development"))
    SECRET_KEY: str = os.getenv("SECRET_KEY", "donde_david_super_secret_jwt_key_2026_tesis_restaurante")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours
    
    _raw_db_url: str = os.getenv("DATABASE_URL", "sqlite:///./restaurante.db")

    @property
    def DATABASE_URL(self) -> str:
        url = self._raw_db_url.strip()
        # Normalizar el esquema postgres:// a postgresql:// para compatibilidad con SQLAlchemy 2.0
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS", 
        os.getenv("CORS_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000,https://donde-david.com,https://adondedavid-com.onrender.com")
    )

    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        if not self.ALLOWED_ORIGINS or self.ALLOWED_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
