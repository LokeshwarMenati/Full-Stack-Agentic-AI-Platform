from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import NexusException
from app.persistence.database import init_db, AsyncSessionLocal
from app.services.slot_service import SlotService
from app.rag.vector_store import vector_store
from app.rag.ingest import run_ingestion

# Import routers
from app.api.routes.health import router as health_router
from app.api.routes.chat import router as chat_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.slots import router as slots_router
from app.api.routes.bookings import router as bookings_router
from app.api.routes.knowledge import router as knowledge_router
from app.api.routes.activity import router as activity_router
from app.api.routes.voice import router as voice_router
from app.api.routes.tasks import router as tasks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing NEXUS AI Enterprise Assistant backend...")

    # 1. Initialize DB schema
    await init_db()

    # 2. Seed development appointment slots
    async with AsyncSessionLocal() as session:
        await SlotService.seed_demo_slots(session)

    # 3. Ensure knowledge base is indexed
    if not vector_store.chunks:
        logger.info("Vector store not initialized on startup. Running auto-ingestion of documents...")
        run_ingestion()

    logger.info(f"NEXUS AI backend successfully started on port {settings.APP_PORT} (Env: {settings.APP_ENV}, LLM: {settings.LLM_PROVIDER})")
    yield
    logger.info("Shutting down NEXUS AI backend...")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Full-Stack Agentic AI Platform with LangGraph Orchestration, RAG Knowledge Retrieval, and Transactional Booking",
    lifespan=lifespan
)

def _cors_origins() -> list[str]:
    extras = [origin.strip() for origin in settings.FRONTEND_ORIGIN.split(",") if origin.strip()]
    defaults = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    return list(dict.fromkeys(defaults + extras))


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NexusException)
async def nexus_exception_handler(request: Request, exc: NexusException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details
        }
    )


# Include Routers
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(conversations_router)
app.include_router(slots_router)
app.include_router(bookings_router)
app.include_router(knowledge_router)
app.include_router(activity_router)
app.include_router(voice_router)
app.include_router(tasks_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
