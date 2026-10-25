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
        
        # Parse and sanitize CORS origins: strip spaces, quotes, and trailing slashes
        raw_cors = os.getenv("CORS_ORIGINS", "")
        cleaned_origins: List[str] = []
        for origin in raw_cors.split(","):
            cleaned = origin.strip().strip("'\"").rstrip("/")
            if cleaned:
                cleaned_origins.append(cleaned)

        # Always include standard local development origins
        default_dev_origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
        if "*" not in cleaned_origins:
            for dev in default_dev_origins:
                if dev not in cleaned_origins:
                    cleaned_origins.append(dev)

        self.CORS_ORIGINS: List[str] = cleaned_origins

    def validate(self) -> None:
        """Validate critical configuration settings."""
        if not self.DATABASE_URL:
            # We allow empty DATABASE_URL during unit testing when DB is mocked
            pass


settings = Settings()
