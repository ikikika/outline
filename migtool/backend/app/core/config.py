from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Migtool API"
    database_url: str = "mysql+pymysql://migtool:migtool@db:3306/migtool"

    # Comma-separated origins, e.g. "http://localhost:3000,http://127.0.0.1:5500"
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5500",
    ]

    session_cookie_name: str = "migtool_session"
    session_max_age_seconds: int = 60 * 60 * 24 * 7  # 7 days
    session_remember_max_age_seconds: int = 60 * 60 * 24 * 30  # 30 days
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
