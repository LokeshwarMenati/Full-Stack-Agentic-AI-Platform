from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.database import get_db
from app.schemas.booking import BookingCreate, BookingResponse, BookingCancelResponse
from app.services.booking_service import BookingService
from app.core.exceptions import SlotUnavailableError, NotFoundError

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


@router.get("", response_model=List[BookingResponse])
async def list_bookings(
    email: Optional[str] = Query(None, description="Filter by user email"),
    thread_id: Optional[str] = Query(None, description="Filter by conversation thread ID"),
    db: AsyncSession = Depends(get_db)
):
    return await BookingService.get_user_bookings(db, email=email, thread_id=thread_id)


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str, db: AsyncSession = Depends(get_db)):
    booking = await BookingService.get_booking_by_id(db, booking_id)
    if not booking:
        booking = await BookingService.get_booking_by_reference(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
    return booking


@router.post("", response_model=BookingResponse)
async def create_booking(booking_in: BookingCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await BookingService.create_booking(db, booking_in)
    except SlotUnavailableError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{booking_id}/cancel", response_model=BookingCancelResponse)
async def cancel_booking(booking_id: str, db: AsyncSession = Depends(get_db)):
    try:
        return await BookingService.cancel_booking(db, booking_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
