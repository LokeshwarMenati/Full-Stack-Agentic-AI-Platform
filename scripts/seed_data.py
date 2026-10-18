#!/usr/bin/env python3
"""Helper script to re-seed demo appointment slots in NEXUS AI."""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.persistence.database import init_db, AsyncSessionLocal
from app.services.slot_service import seed_default_slots

async def main():
    print("Initializing database tables...")
    await init_db()
    async with AsyncSessionLocal() as session:
        print("Seeding demo appointment slots...")
        await seed_default_slots(session)
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(main())
