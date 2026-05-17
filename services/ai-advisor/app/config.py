from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ai-advisor"
    debug: bool = False

    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-6"

    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str = ""
    cache_ttl_seconds: int = 21600  # 6 hours

    jwt_secret: str


@lru_cache
def get_settings() -> Settings:
    return Settings()
