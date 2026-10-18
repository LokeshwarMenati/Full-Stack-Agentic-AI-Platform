import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_booking_workflow_and_double_booking_prevention():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Fetch available slots
        slots_resp = await client.get("/api/slots")
        slots = slots_resp.json()
        target_slot = slots[-1]  # Pick the last available slot for this test
        slot_id = target_slot["id"]

        thread_id = str(uuid.uuid4())
        booking_payload = {
            "full_name": "Sarah Connor",
            "email": "sarah.connor@example.com",
            "appointment_type": "Performance Review",
            "slot_id": slot_id,
            "thread_id": thread_id
        }

        # 2. Create Booking
        book_resp = await client.post("/api/bookings", json=booking_payload)
        assert book_resp.status_code == 200
        booking_data = book_resp.json()
        assert booking_data["status"] == "CONFIRMED"
        assert booking_data["booking_reference"].startswith("NEX-")
        booking_ref = booking_data["booking_reference"]
        booking_id = booking_data["id"]

        # 3. Double Booking Prevention: Another user attempts to book the same slot
        competitor_payload = {
            "full_name": "John Connor",
            "email": "john.connor@example.com",
            "appointment_type": "Performance Review",
            "slot_id": slot_id,
            "thread_id": str(uuid.uuid4())
        }
        conflict_resp = await client.post("/api/bookings", json=competitor_payload)
        assert conflict_resp.status_code == 409
        assert "unavailable or already booked" in conflict_resp.json()["detail"]

        # 4. Idempotency: Same thread retrying the exact same booking
        retry_resp = await client.post("/api/bookings", json=booking_payload)
        assert retry_resp.status_code == 200
        assert retry_resp.json()["booking_reference"] == booking_ref

        # 5. Cancellation
        cancel_resp = await client.post(f"/api/bookings/{booking_id}/cancel")
        assert cancel_resp.status_code == 200
        assert cancel_resp.json()["status"] == "CANCELLED"

        # 6. Verify slot is freed after cancellation
        freed_slot_resp = await client.get("/api/slots")
        freed_slots = freed_slot_resp.json()
        assert any(s["id"] == slot_id and not s["is_booked"] for s in freed_slots)


@pytest.mark.asyncio
async def test_chat_booking_and_cancellation():
    """Verify booking through chat and subsequent cancellation in chat."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        thread_id = f"thread_cancel_test_{uuid.uuid4().hex[:8]}"

        # Turn 1: Initiate booking
        t1 = await client.post("/api/chat", json={
            "thread_id": thread_id,
            "message": "I want to schedule a performance review. My name is Alice Vance, alice.vance@example.com."
        })
        assert t1.status_code == 200

        # Turn 2: Pick slot
        t2 = await client.post("/api/chat", json={
            "thread_id": thread_id,
            "message": "Friday at 10:30 AM works for me."
        })
        assert t2.status_code == 200

        # Turn 3: Confirm booking
        t3 = await client.post("/api/chat", json={
            "thread_id": thread_id,
            "message": "Yes, please confirm."
        })
        assert t3.status_code == 200
        t3_data = t3.json()
        assert t3_data.get("booking_confirmed") is not None
        ref = t3_data["booking_confirmed"]["booking_reference"]
        slot_id = t3_data["booking_confirmed"]["slot_id"]

        # Turn 4: Cancel the booking in chat
        t4 = await client.post("/api/chat", json={
            "thread_id": thread_id,
            "message": "Cancel the booking"
        })
        assert t4.status_code == 200
        t4_data = t4.json()
        assert "Booking Cancelled" in t4_data["content"]
        assert "Booking Confirmed" not in t4_data["content"]
        assert ref in t4_data["content"]

        # Verify in DB via /api/bookings
        bookings_resp = await client.get(f"/api/bookings?email=alice.vance@example.com")
        assert bookings_resp.status_code == 200
        b_list = bookings_resp.json()
        matching = [b for b in b_list if b["booking_reference"] == ref]
        assert len(matching) == 1
        assert matching[0]["status"] == "CANCELLED"

        # Verify slot freed
        slots_resp = await client.get("/api/slots")
        slots = slots_resp.json()
        assert any(s["id"] == slot_id and not s["is_booked"] for s in slots)
