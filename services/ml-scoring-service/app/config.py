from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    JWT_SECRET: str = "change-me"
    KAFKA_BOOTSTRAP: str = "localhost:9094"
    KAFKA_GROUP_ID: str = "ml-scoring-service"

    # Score thresholds
    HIGH_RISK_THRESHOLD: int = 70
    MEDIUM_RISK_THRESHOLD: int = 40
    FRAUD_ALERT_THRESHOLD: float = 0.75

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
