from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Migtool API"
    database_url: str = "mysql+pymysql://migtool:migtool@db:3306/migtool"


settings = Settings()
