from pathlib import Path
from typing import Any, List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "PhishIntel Backend"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    MODEL_TYPE: str = "auto"
    MODEL_DIR: str = "saved_models"
    MODEL_FILENAME: str = "pahf_net.pt"
    VECTORIZER_FILENAME: str = "vectorizer.pkl"

    TRANCO_SNAPSHOT_FILENAME: str = "tranco_top1m.csv.gz"
    TRANCO_MAX_RANK: int = 1_000_000
    OFFLINE_PHISH_LIST_FILENAME: str = "offline_phish_domains.txt"

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"]
    MAX_REQUEST_BYTES: int = 5 * 1024 * 1024
    MAX_EMAIL_CHARS: int = 1_000_000
    MAX_SUBJECT_CHARS: int = 998
    MAX_SENDER_CHARS: int = 2048
    MAX_HEADERS_CHARS: int = 100_000
    RATE_LIMIT_REQUESTS: int = 30
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    SUPABASE_URL: str = "https://ujulxbzyornwmqhtlley.supabase.co"
    SUPABASE_PUBLISHABLE_KEY: str = "sb_publishable_ZS8sBglkzRUv3C0zlJzXfA_PXygXPcI"
    SUPABASE_ANON_KEY: str = ""

    @property
    def resolved_supabase_key(self) -> str:
        return self.SUPABASE_PUBLISHABLE_KEY or self.SUPABASE_ANON_KEY

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                return json.loads(value)
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def model_dir_path(self) -> Path:
        path = Path(self.MODEL_DIR)
        if not path.is_absolute():
            path = BASE_DIR / path
        path.mkdir(parents=True, exist_ok=True)
        return path

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()