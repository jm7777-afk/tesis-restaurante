import os

class Settings:
    PROJECT_NAME: str = "FastFood Restaurant Automation"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fastfood_super_secret_jwt_key_2026_tesis_restaurante")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Database: Default to SQLite for easy local dev, configurable to MySQL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./restaurante.db"
    )

settings = Settings()
