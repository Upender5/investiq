from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    JWT_SECRET: str = "change-me"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "investiq_analytics"
    KAFKA_BOOTSTRAP: str = "localhost:9094"
    KAFKA_GROUP_ID: str = "analytics-service"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
