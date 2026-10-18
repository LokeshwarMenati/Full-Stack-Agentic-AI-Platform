import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_invalid_email_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Invalid email in booking
        payload = {
            "full_name": "Test User",
            "email": "not-an-email",
            "appointment_type": "Performance Review",
            "slot_id": "slot_fri_1030",
            "thread_id": str(uuid.uuid4())
        }
        resp = await client.post("/api/bookings", json=payload)
        assert resp.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_nonexistent_booking_returns_404():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/bookings/non_existent_id_12345")
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_chat_sse_stream():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        thread_id = str(uuid.uuid4())
        req = {
            "message": "What does the handbook say about workplace safety?",
            "thread_id": thread_id
        }
        async with client.stream("POST", "/api/chat/stream", json=req) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")

            events = []
            async for line in response.aiter_lines():
                if line.startswith("event:"):
                    events.append(line.replace("event:", "").strip())

            assert "status" in events
            assert "agent_event" in events
            assert "citations" in events
            assert "token" in events
            assert "complete" in events


@pytest.mark.asyncio
async def test_unrelated_handbook_question_does_not_corrupt_booking_or_slots():
    """Verify that greetings or questions during pending booking never overwrite booking name or infer wrong slots."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        thread_id = f"thread_guard_{uuid.uuid4().hex[:8]}"

        # Step 1: User says "I want to schedule an appointment. My name is Alex Chen"
        r1 = await client.post("/api/chat", json={
            "thread_id": thread_id,
            "message": "I want to schedule an appointment. My name is Alex Chen."
        })
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["pending_booking"] is not None
        assert d1["pending_booking"]["full_name"] == "Alex Chen"

        # Step 2: User asks an FAQ question mentioning "good morning" or policy
        r2 = await client.post("/api/chat", json={
            "thread_id": thread_id,
            "message": "Good morning, how does the handbook describe the workplace safety procedures?"
        })
        assert r2.status_code == 200
        d2 = r2.json()

        # The name must remain Alex Chen, not 'Good morning' or question text!
        assert d2["pending_booking"] is not None
        assert d2["pending_booking"]["full_name"] == "Alex Chen"
        assert "Good morning" not in d2["pending_booking"]["full_name"]
        # Slot must still be unselected
        assert d2["pending_booking"].get("slot_id") is None

