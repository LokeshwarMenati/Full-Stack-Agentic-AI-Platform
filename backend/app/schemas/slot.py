from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SlotResponse(BaseModel):
    id: str
    appointment_type: str
    start_time: datetime
    end_time: datetime
    is_booked: bool
    booked_by_booking_id: Optional[str] = None
    formatted_start: Optional[str] = None
    formatted_end: Optional[str] = None
    timezone: str = "Asia/Kolkata"
