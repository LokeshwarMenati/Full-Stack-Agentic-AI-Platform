from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field


class BookingCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=128)
    email: EmailStr
    appointment_type: str = Field(..., min_length=2, max_length=100)
    slot_id: str = Field(..., min_length=1)
    thread_id: Optional[str] = None


class BookingResponse(BaseModel):
    id: str
    booking_reference: str
    full_name: str
    email: str
    appointment_type: str
    slot_id: str
    status: Literal["CONFIRMED", "CANCELLED", "PENDING"]
    thread_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    formatted_time: Optional[str] = None


class BookingCancelResponse(BaseModel):
    id: str
    booking_reference: str
    status: Literal["CANCELLED"]
    message: str
