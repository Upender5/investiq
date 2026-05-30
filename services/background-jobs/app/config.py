from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9094"
    MARKET_DATA_SERVICE_URL: str = "http://market-data-service:8085"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8086"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
