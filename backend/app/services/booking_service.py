from datetime import datetime, timezone
import random
import string
import uuid
from typing import List, Optional
import zoneinfo
from sqlalchemy import select, update, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.slot import AppointmentSlot
from app.schemas.booking import BookingCreate, BookingResponse, BookingCancelResponse
from app.core.exceptions import SlotUnavailableError, NotFoundError, ConflictError
from app.core.config import settings
from app.core.logging import logger


def get_app_timezone():
    try:
        return zoneinfo.ZoneInfo(settings.TIMEZONE)
    except Exception:
        return timezone(timedelta(hours=5, minutes=30))


class BookingService:
    @staticmethod
    def generate_reference() -> str:
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        year = datetime.now().year
        return f"NEX-{year}-{suffix}"

    @classmethod
    def _to_response(cls, booking: Booking, slot: Optional[AppointmentSlot] = None) -> BookingResponse:
        s_time = slot.start_time if slot else (booking.slot.start_time if booking.slot else None)
        e_time = slot.end_time if slot else (booking.slot.end_time if booking.slot else None)
        
        fmt_time = None
        if s_time:
            tz = get_app_timezone()
            loc_s = s_time.replace(tzinfo=timezone.utc).astimezone(tz)
            loc_e = e_time.replace(tzinfo=timezone.utc).astimezone(tz) if e_time else None
            fmt_time = f"{loc_s.strftime('%A, %b %d, %Y at %I:%M %p')}" + (f" - {loc_e.strftime('%I:%M %p')}" if loc_e else "")

        return BookingResponse(
            id=booking.id,
            booking_reference=booking.booking_reference,
            full_name=booking.full_name,
            email=booking.email,
            appointment_type=booking.appointment_type,
            slot_id=booking.slot_id,
            status=booking.status,
            thread_id=booking.thread_id,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            start_time=s_time,
            end_time=e_time,
            formatted_time=fmt_time
        )

    @classmethod
    async def create_booking(
        cls,
        session: AsyncSession,
        booking_in: BookingCreate
    ) -> BookingResponse:
        """Atomically reserve slot and create booking with concurrency and idempotency protection."""
        # 1. Idempotency Check: Did this thread already book this slot?
        if booking_in.thread_id:
            existing_query = select(Booking).where(
                Booking.thread_id == booking_in.thread_id,
                Booking.slot_id == booking_in.slot_id,
                Booking.status == "CONFIRMED"
            )
            existing_booking = (await session.execute(existing_query)).scalar_one_or_none()
            if existing_booking:
                logger.info(f"Idempotent booking hit for thread {booking_in.thread_id}: {existing_booking.booking_reference}")
                slot_query = select(AppointmentSlot).where(AppointmentSlot.id == booking_in.slot_id)
                slot = (await session.execute(slot_query)).scalar_one_or_none()
                return cls._to_response(existing_booking, slot)

        # 2. Atomic Slot Reservation using conditional update to prevent race conditions
        booking_id = str(uuid.uuid4())
        ref = cls.generate_reference()

        reserve_stmt = (
            update(AppointmentSlot)
            .where(
                AppointmentSlot.id == booking_in.slot_id,
                AppointmentSlot.is_booked == False
            )
            .values(
                is_booked=True,
                booked_by_booking_id=booking_id
            )
        )
        result = await session.execute(reserve_stmt)
        if result.rowcount == 0:
            logger.warning(f"Failed to reserve slot {booking_in.slot_id} - already booked or does not exist.")
            raise SlotUnavailableError(f"Slot {booking_in.slot_id} is unavailable or already booked.")

        # 3. Create the Booking Record
        booking = Booking(
            id=booking_id,
            booking_reference=ref,
            full_name=booking_in.full_name,
            email=booking_in.email,
            appointment_type=booking_in.appointment_type,
            slot_id=booking_in.slot_id,
            status="CONFIRMED",
            thread_id=booking_in.thread_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        session.add(booking)
        await session.commit()
        await session.refresh(booking)

        # Fetch slot for clean response
        slot_query = select(AppointmentSlot).where(AppointmentSlot.id == booking_in.slot_id)
        slot = (await session.execute(slot_query)).scalar_one_or_none()

        logger.info(f"Successfully committed booking {ref} for {booking.full_name} on slot {booking_in.slot_id}")
        return cls._to_response(booking, slot)

    @classmethod
    async def get_booking_by_id(cls, session: AsyncSession, booking_id: str) -> Optional[BookingResponse]:
        query = select(Booking).where(Booking.id == booking_id)
        result = await session.execute(query)
        booking = result.scalar_one_or_none()
        if not booking:
            return None
        slot_query = select(AppointmentSlot).where(AppointmentSlot.id == booking.slot_id)
        slot = (await session.execute(slot_query)).scalar_one_or_none()
        return cls._to_response(booking, slot)

    @classmethod
    async def get_booking_by_reference(cls, session: AsyncSession, reference: str) -> Optional[BookingResponse]:
        query = select(Booking).where(Booking.booking_reference == reference)
        result = await session.execute(query)
        booking = result.scalar_one_or_none()
        if not booking:
            return None
        slot_query = select(AppointmentSlot).where(AppointmentSlot.id == booking.slot_id)
        slot = (await session.execute(slot_query)).scalar_one_or_none()
        return cls._to_response(booking, slot)

    @classmethod
    async def get_user_bookings(
        cls,
        session: AsyncSession,
        email: Optional[str] = None,
        thread_id: Optional[str] = None
    ) -> List[BookingResponse]:
        query = select(Booking).order_by(Booking.created_at.desc())
        if email:
            query = query.where(Booking.email.ilike(email))
        elif thread_id:
            query = query.where(Booking.thread_id == thread_id)

        result = await session.execute(query)
        bookings = result.scalars().all()
        
        responses = []
        for b in bookings:
            slot_query = select(AppointmentSlot).where(AppointmentSlot.id == b.slot_id)
            slot = (await session.execute(slot_query)).scalar_one_or_none()
            responses.append(cls._to_response(b, slot))
        return responses

    @classmethod
    async def cancel_booking(cls, session: AsyncSession, booking_id: str) -> BookingCancelResponse:
        clean_id = (booking_id or "").strip()
        query = select(Booking).where(
            or_(
                Booking.id == clean_id,
                Booking.booking_reference == clean_id,
                Booking.booking_reference == clean_id.upper()
            )
        )
        result = await session.execute(query)
        booking = result.scalar_one_or_none()
        if not booking:
            raise NotFoundError(f"Booking with ID or reference '{booking_id}' not found.")

        if booking.status == "CANCELLED":
            return BookingCancelResponse(
                id=booking.id,
                booking_reference=booking.booking_reference,
                status="CANCELLED",
                message="Booking was already cancelled."
            )

        # Free the slot
        free_slot_stmt = (
            update(AppointmentSlot)
            .where(AppointmentSlot.id == booking.slot_id)
            .values(is_booked=False, booked_by_booking_id=None)
        )
        await session.execute(free_slot_stmt)

        # Update booking status
        booking.status = "CANCELLED"
        booking.updated_at = datetime.now(timezone.utc)
        await session.commit()

        logger.info(f"Cancelled booking {booking.booking_reference} and freed slot {booking.slot_id}")
        return BookingCancelResponse(
            id=booking.id,
            booking_reference=booking.booking_reference,
            status="CANCELLED",
            message=f"Booking {booking.booking_reference} has been successfully cancelled."
        )
