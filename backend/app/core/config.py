import os
from pathlib import Path
from pydantic import BaseModel

# Base directory for backend project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

def get_cors_origins() -> list[str]:
    """Parse CORS origins from environment variable or fallback to standard dev ports."""
    origins_str = os.getenv("CORS_ORIGINS")
    if origins_str:
        return [origin.strip() for origin in origins_str.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

class Settings(BaseModel):
    PROJECT_NAME: str = "Coffee & Milk Tea Shop API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # SQLite Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR}/coffee_shop.db"
    )
    
    # Allowed CORS Origins (Frontend Dev Server)
    CORS_ORIGINS: list[str] = get_cors_origins()

settings = Settings()
