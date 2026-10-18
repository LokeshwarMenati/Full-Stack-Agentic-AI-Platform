from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.database import get_db
from app.schemas.slot import SlotResponse
from app.services.slot_service import SlotService

router = APIRouter(prefix="/api/slots", tags=["Slots"])


@router.get("", response_model=List[SlotResponse])
async def get_available_slots(
    appointment_type: Optional[str] = Query(None, description="Filter by appointment type"),
    include_booked: bool = Query(False, description="Whether to include booked slots"),
    db: AsyncSession = Depends(get_db)
):
    if include_booked:
        return await SlotService.get_all_slots(db)
    return await SlotService.get_available_slots(db, appointment_type=appointment_type)


@router.post("/seed")
async def seed_slots(db: AsyncSession = Depends(get_db)):
    count = await SlotService.seed_demo_slots(db)
    return {"message": f"Seeded {count} appointment slots.", "count": count}
