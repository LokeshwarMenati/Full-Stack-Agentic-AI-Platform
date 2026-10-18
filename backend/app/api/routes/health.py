from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.persistence.database import get_db
from app.rag.vector_store import vector_store
from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "llm_provider": settings.LLM_PROVIDER,
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "timezone": settings.TIMEZONE
    }


@router.get("/api/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    knowledge_status = vector_store.get_status()

    is_ready = db_ok and knowledge_status.is_indexed
    return {
        "ready": is_ready,
        "database": "connected" if db_ok else "unreachable",
        "vector_store": "indexed" if knowledge_status.is_indexed else "not_indexed",
        "indexed_chunks": knowledge_status.total_chunks,
        "llm_provider": settings.LLM_PROVIDER
    }
