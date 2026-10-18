from datetime import datetime, timedelta, timezone
from typing import List, Optional
import zoneinfo
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.slot import AppointmentSlot
from app.schemas.slot import SlotResponse
from app.core.config import settings
from app.core.logging import logger


def get_app_timezone():
    try:
        return zoneinfo.ZoneInfo(settings.TIMEZONE)
    except Exception:
        return timezone(timedelta(hours=5, minutes=30))


class SlotService:
    @staticmethod
    def _to_response(slot: AppointmentSlot) -> SlotResponse:
        tz = get_app_timezone()
        local_start = slot.start_time.replace(tzinfo=timezone.utc).astimezone(tz)
        local_end = slot.end_time.replace(tzinfo=timezone.utc).astimezone(tz)

        return SlotResponse(
            id=slot.id,
            appointment_type=slot.appointment_type,
            start_time=slot.start_time,
            end_time=slot.end_time,
            is_booked=slot.is_booked,
            booked_by_booking_id=slot.booked_by_booking_id,
            formatted_start=local_start.strftime("%A, %b %d at %I:%M %p"),
            formatted_end=local_end.strftime("%I:%M %p"),
            timezone=settings.TIMEZONE
        )

    @classmethod
    async def get_available_slots(
        cls,
        session: AsyncSession,
        appointment_type: Optional[str] = None
    ) -> List[SlotResponse]:
        query = select(AppointmentSlot).where(AppointmentSlot.is_booked == False)
        if appointment_type:
            query = query.where(AppointmentSlot.appointment_type.ilike(f"%{appointment_type}%"))
        query = query.order_by(AppointmentSlot.start_time.asc())

        result = await session.execute(query)
        slots = result.scalars().all()
        return [cls._to_response(s) for s in slots]

    @classmethod
    async def get_all_slots(cls, session: AsyncSession) -> List[SlotResponse]:
        query = select(AppointmentSlot).order_by(AppointmentSlot.start_time.asc())
        result = await session.execute(query)
        slots = result.scalars().all()
        return [cls._to_response(s) for s in slots]

    @classmethod
    async def get_slot_by_id(cls, session: AsyncSession, slot_id: str) -> Optional[AppointmentSlot]:
        query = select(AppointmentSlot).where(AppointmentSlot.id == slot_id)
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @classmethod
    async def seed_demo_slots(cls, session: AsyncSession) -> int:
        """Seed realistic future appointment slots starting from the nearest upcoming Friday."""
        # Check if slots already exist
        check_query = select(AppointmentSlot)
        existing = (await session.execute(check_query)).scalars().first()
        if existing:
            logger.info("Slots already seeded. Skipping initial seed.")
            return 0

        now = datetime.now(timezone.utc)
        # Calculate days until next Friday (4 is Friday)
        days_ahead = (4 - now.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        next_friday = (now + timedelta(days=days_ahead)).replace(hour=5, minute=0, second=0, microsecond=0)  # 5:00 UTC = 10:30 AM IST

        types = [
            "Performance Review",
            "PTO & Benefits Discussion",
            "General HR Inquiry"
        ]

        # Seed specific schedule including Friday 10:30 AM IST (assessment requirement)
        sample_slots = [
            # Friday Slots (IST: 10:30 AM, 02:00 PM, 04:30 PM)
            (next_friday, next_friday + timedelta(minutes=45), "Performance Review", "slot_fri_1030"),
            (next_friday.replace(hour=8, minute=30), next_friday.replace(hour=9, minute=15), "Performance Review", "slot_fri_1400"),
            (next_friday.replace(hour=11, minute=0), next_friday.replace(hour=11, minute=45), "PTO & Benefits Discussion", "slot_fri_1630"),
            
            # Next Monday Slots (IST: 10:00 AM, 02:30 PM, 04:00 PM)
            (next_friday + timedelta(days=3, hours=4, minutes=30), next_friday + timedelta(days=3, hours=5, minutes=15), "Performance Review", "slot_mon_1000"),
            (next_friday + timedelta(days=3, hours=9), next_friday + timedelta(days=3, hours=9, minutes=45), "General HR Inquiry", "slot_mon_1430"),
            (next_friday + timedelta(days=3, hours=10, minutes=30), next_friday + timedelta(days=3, hours=11, minutes=15), "PTO & Benefits Discussion", "slot_mon_1600"),

            # Next Tuesday Slots
            (next_friday + timedelta(days=4, hours=5), next_friday + timedelta(days=4, hours=5, minutes=45), "Performance Review", "slot_tue_1030"),
            (next_friday + timedelta(days=4, hours=8, minutes=30), next_friday + timedelta(days=4, hours=9, minutes=15), "Performance Review", "slot_tue_1400"),
        ]

        created_count = 0
        for start_t, end_t, appt_type, slot_id in sample_slots:
            slot = AppointmentSlot(
                id=slot_id,
                appointment_type=appt_type,
                start_time=start_t,
                end_time=end_t,
                is_booked=False
            )
            session.add(slot)
            created_count += 1

        await session.commit()
        logger.info(f"Successfully seeded {created_count} demo appointment slots.")
        return created_count

    @classmethod
    async def match_slot_by_text(
        cls,
        session: AsyncSession,
        user_text: str,
        appointment_type: Optional[str] = None
    ) -> Optional[AppointmentSlot]:
        """Resolves natural language requests like 'Friday at 10:30 AM' or 'slot_fri_1030' to actual available slots."""
        available_slots = await cls.get_available_slots(session, appointment_type)
        if not available_slots:
            return None

        clean_text = user_text.lower().strip()

        # Direct slot ID check
        for s in available_slots:
            if s.id.lower() == clean_text or s.id.lower() in clean_text:
                return await cls.get_slot_by_id(session, s.id)

        # Keyword matching on formatted string
        # e.g., 'friday' and '10:30'
        for s in available_slots:
            fmt = (s.formatted_start or "").lower()
            # If user mentioned weekday and time
            if "friday" in clean_text and ("10:30" in clean_text or "10:30 am" in clean_text):
                if "friday" in fmt and "10:30" in fmt:
                    return await cls.get_slot_by_id(session, s.id)
            if "monday" in clean_text and ("10:00" in clean_text or "10:00 am" in clean_text):
                if "monday" in fmt and "10:00" in fmt:
                    return await cls.get_slot_by_id(session, s.id)
            if "tuesday" in clean_text and ("10:30" in clean_text or "10:30 am" in clean_text):
                if "tuesday" in fmt and "10:30" in fmt:
                    return await cls.get_slot_by_id(session, s.id)

        # Partial time match
        for s in available_slots:
            fmt = (s.formatted_start or "").lower()
            if "10:30" in clean_text and "10:30" in fmt:
                return await cls.get_slot_by_id(session, s.id)
            if "2:00" in clean_text and "02:00" in fmt:
                return await cls.get_slot_by_id(session, s.id)
            if "4:30" in clean_text and "04:30" in fmt:
                return await cls.get_slot_by_id(session, s.id)

        # If user explicitly wrote "first slot" or "option 1"
        if "option 1" in clean_text or "first" in clean_text:
            return await cls.get_slot_by_id(session, available_slots[0].id)
        if len(available_slots) > 1 and ("option 2" in clean_text or "second" in clean_text):
            return await cls.get_slot_by_id(session, available_slots[1].id)

        return None
