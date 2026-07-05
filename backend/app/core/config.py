import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SourceSense AI"
    API_V1_STR: str = "/api"
    
    # Database Settings
    # If not provided, fallback to sqlite in the current directory
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sourcesense.db")
    
    # Qdrant Vector DB Settings
    QDRANT_URL: Optional[str] = os.getenv("QDRANT_URL", None)
    QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY", None)
    QDRANT_PATH: str = os.getenv("QDRANT_PATH", "./qdrant_db")
    
    # LLM & Embedding Settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY", None)
    
    # EMBEDDING_MODEL can be 'local' (sentence-transformers) or 'openai' (text-embedding-3-small)
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "local")  # "local" or "openai"
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
    
    # Reranker Model
    RERANKER_PROVIDER: str = os.getenv("RERANKER_PROVIDER", "local")  # "local" or "none"
    RERANKER_MODEL_NAME: str = os.getenv("RERANKER_MODEL_NAME", "ms-marco-MiniLM-L-6-v2")
    
    # Authentication (Simple JWT for portfolio demo)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-for-sourcesense-ai-portfolio-project-development-12345")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    class Config:
        case_sensitive = True

settings = Settings()
