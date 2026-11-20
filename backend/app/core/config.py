from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SmartDelivery API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://smartdelivery:change-me@localhost:5432/smartdelivery"
    jwt_secret_key: str 
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    password_reset_minutes: int = 30
    recovery_token_in_response: bool = False
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    async_notifications: bool = False
    rabbitmq_url: str = "amqp://smartdelivery:change-me@localhost:5672/%2F"
    event_poll_seconds: float = 2.0
    admin_email: str | None = None
    admin_password: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()
