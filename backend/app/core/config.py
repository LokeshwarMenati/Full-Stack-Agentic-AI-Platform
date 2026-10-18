from pathlib import Path
from typing import Optional, Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_base_dir() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "backend").is_dir() and (parent / "frontend").is_dir():
            return parent
    return Path(__file__).resolve().parent.parent.parent


BASE_DIR = get_base_dir()
DATA_DIR = BASE_DIR / "data"
DOCUMENTS_PATH = DATA_DIR / "documents"
VECTOR_STORE_DIR = DATA_DIR / "vector_store"

DATA_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_PATH.mkdir(parents=True, exist_ok=True)
VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: Literal["development", "production", "test"] = "development"
    APP_NAME: str = "NEXUS AI — Enterprise Intelligent Assistant"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATA_DIR.as_posix()}/nexus.db"
    SYNC_DATABASE_URL: str = f"sqlite:///{DATA_DIR.as_posix()}/nexus.db"
    CHECKPOINT_DATABASE_PATH: str = str(DATA_DIR / "checkpoints.db")

    LLM_PROVIDER: Literal["mock", "groq", "gemini"] = "mock"
    LLM_MODEL: str = "nexus-dev-deterministic"
    GROQ_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None

    EMBEDDING_PROVIDER: Literal["local", "gemini"] = "local"
    EMBEDDING_MODEL: str = "tfidf-dense-normalized"
    DOCUMENTS_DIR: str = str(DOCUMENTS_PATH.as_posix())
    VECTOR_STORE_PATH: str = str(VECTOR_STORE_DIR.as_posix())
    PRIMARY_DOCUMENT_PATH: str = str((DOCUMENTS_PATH / "employee_handbook.pdf").as_posix())
    SECONDARY_DOCUMENT_PATH: str = str((DOCUMENTS_PATH / "Northwind_Standard_Benefits_Details.pdf").as_posix())

    TIMEZONE: str = "Asia/Kolkata"
    LOG_LEVEL: str = "INFO"

    @model_validator(mode="after")
    def resolve_relative_paths(self) -> "Settings":
        if self.DATABASE_URL.startswith("sqlite+aiosqlite:///./data"):
            rel = self.DATABASE_URL.replace("sqlite+aiosqlite:///./data", "").lstrip("/\\")
            self.DATABASE_URL = f"sqlite+aiosqlite:///{(DATA_DIR / rel).as_posix()}"
        if self.SYNC_DATABASE_URL.startswith("sqlite:///./data"):
            rel = self.SYNC_DATABASE_URL.replace("sqlite:///./data", "").lstrip("/\\")
            self.SYNC_DATABASE_URL = f"sqlite:///{(DATA_DIR / rel).as_posix()}"
        if self.CHECKPOINT_DATABASE_PATH.startswith("./data"):
            rel = self.CHECKPOINT_DATABASE_PATH.replace("./data", "").lstrip("/\\")
            self.CHECKPOINT_DATABASE_PATH = str(DATA_DIR / rel)
        if self.VECTOR_STORE_PATH.startswith("./data"):
            rel = self.VECTOR_STORE_PATH.replace("./data", "").lstrip("/\\")
            self.VECTOR_STORE_PATH = str(DATA_DIR / rel)
        if self.PRIMARY_DOCUMENT_PATH.startswith("./data"):
            rel = self.PRIMARY_DOCUMENT_PATH.replace("./data", "").lstrip("/\\")
            self.PRIMARY_DOCUMENT_PATH = str(DATA_DIR / rel)
        if self.SECONDARY_DOCUMENT_PATH.startswith("./data"):
            rel = self.SECONDARY_DOCUMENT_PATH.replace("./data", "").lstrip("/\\")
            self.SECONDARY_DOCUMENT_PATH = str(DATA_DIR / rel)
        return self


settings = Settings()
