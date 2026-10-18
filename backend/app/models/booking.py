from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.persistence.database import Base
import app.models.conversation  # noqa: F401
import app.models.slot          # noqa: F401


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    booking_reference = Column(String(32), unique=True, nullable=False, index=True)
    full_name = Column(String(128), nullable=False)
    email = Column(String(128), nullable=False, index=True)
    appointment_type = Column(String(100), nullable=False)
    slot_id = Column(String(64), ForeignKey("appointment_slots.id"), nullable=False, index=True)
    status = Column(String(24), default="CONFIRMED", nullable=False, index=True)  # CONFIRMED, CANCELLED, PENDING
    thread_id = Column(String(128), ForeignKey("conversations.thread_id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    conversation = relationship("Conversation", back_populates="bookings")
    slot = relationship("AppointmentSlot")
