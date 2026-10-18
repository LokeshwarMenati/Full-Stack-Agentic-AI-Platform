from pathlib import Path
import pytest_asyncio
from sqlalchemy import text
from app.persistence.database import init_db, AsyncSessionLocal
from app.services.slot_service import SlotService
from app.rag.vector_store import vector_store
from app.rag.ingest import run_ingestion
from app.core.config import settings


@pytest_asyncio.fixture(autouse=True)
async def setup_test_environment():
    # 1. Initialize schema
    await init_db()

    # 2. Reset database state before each test for test isolation
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM bookings"))
        await session.execute(text("DELETE FROM activity_events"))
        await session.execute(text("DELETE FROM messages"))
        await session.execute(text("DELETE FROM conversations"))
        await session.execute(text("UPDATE appointment_slots SET is_booked = 0, booked_by_booking_id = NULL"))
        await session.commit()
        await SlotService.seed_demo_slots(session)

    # 3. Clean checkpoints database for test isolation
    chk_path = Path(settings.CHECKPOINT_DATABASE_PATH)
    if chk_path.exists():
        try:
            chk_path.unlink()
        except Exception:
            pass

    # 4. Ensure vector store is loaded
    if not vector_store.chunks:
        run_ingestion()

    yield
