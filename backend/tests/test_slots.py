import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_slot_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Fetch available slots
        resp = await client.get("/api/slots")
        assert resp.status_code == 200
        slots = resp.json()
        assert isinstance(slots, list)
        assert len(slots) > 0

        first_slot = slots[0]
        assert "id" in first_slot
        assert "appointment_type" in first_slot
        assert "formatted_start" in first_slot
        assert first_slot["is_booked"] is False

        # 2. Filter by appointment type
        filter_resp = await client.get("/api/slots?appointment_type=Performance%20Review")
        assert filter_resp.status_code == 200
        filtered = filter_resp.json()
        assert all("Performance Review" in s["appointment_type"] for s in filtered)
