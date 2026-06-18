from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://localhost/jobpilot"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: Optional[str] = None
    APIFY_API_KEY: Optional[str] = None
    DISCORD_WEBHOOK_URL: Optional[str] = None
    SLACK_WEBHOOK_URL: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
