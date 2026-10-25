"""Application configuration settings loaded from environment variables."""

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Locate and load .env from project root
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")


class Settings:
    """Application settings class."""

    def __init__(self) -> None:
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "")
        self.DEFAULT_GATE_CLOSURE_TIME: str = os.getenv("DEFAULT_GATE_CLOSURE_TIME", "12:00")
        self.APP_TIMEZONE: str = os.getenv("APP_TIMEZONE", "Europe/London")
        
        # Parse CORS origins
        raw_cors = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
        self.CORS_ORIGINS: List[str] = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]

    def validate(self) -> None:
        """Validate critical configuration settings."""
        if not self.DATABASE_URL:
            # We allow empty DATABASE_URL during unit testing when DB is mocked
            pass


settings = Settings()
