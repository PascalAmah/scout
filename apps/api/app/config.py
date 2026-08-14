from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    app_name: str = "Scout API"

    database_url: str = "postgresql+psycopg://scout:scout@localhost:5432/scout"
    redis_url: str = "redis://localhost:6379/0"

    jwt_access_secret: str = "dev-only-access-secret-change-me-please-32b"
    jwt_refresh_secret: str = "dev-only-refresh-secret-change-me-please-32b"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    resend_api_key: str = ""
    email_from: str = "Scout <hello@yourdomain.com>"
    web_app_url: str = "http://localhost:5173"

    # --- Phase 2: embeddings (consumed by the worker, not the API runtime) ---
    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-large"
    embedding_dim: int = 1536


settings = Settings()
