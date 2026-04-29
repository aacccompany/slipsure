from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Slipsure API"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./slipsure.db"
    
    # KBank Configuration
    KBANK_CLIENT_ID: str = ""
    KBANK_CLIENT_SECRET: str = ""
    KBANK_API_URL: str = "https://openapi-sandbox.kasikornbank.com"
    USE_MOCK: bool = True
    
    # Line Configuration
    LINE_CHANNEL_SECRET: str = ""
    LINE_CHANNEL_ACCESS_TOKEN: str = ""
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
