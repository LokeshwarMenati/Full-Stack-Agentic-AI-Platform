from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Index
from sqlalchemy.orm import relationship

from app.persistence.database import Base


class AppointmentSlot(Base):
    __tablename__ = "appointment_slots"

    id = Column(String(64), primary_key=True)
    appointment_type = Column(String(100), nullable=False, default="Performance Review", index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    is_booked = Column(Boolean, default=False, nullable=False, index=True)
    booked_by_booking_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_slot_type_avail", "appointment_type", "is_booked"),
    )
