import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_critical_end_to_end_context_interleaving():
    """
    Executes the comprehensive 20-step assessment scenario:
    Multi-turn conversation with pending booking, handbook FAQ interruption with page citations,
    resumption of pending booking without re-asking name/email, natural language slot selection,
    transactional confirmation, idempotency, and thread checkpoint isolation.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Step 1: Create a new thread ID
        thread_id = f"thread_interleave_{uuid.uuid4().hex[:8]}"

        # Step 2: Turn 1 - Ask to schedule a performance review
        turn1_resp = await client.post(
            "/api/chat",
            json={"thread_id": thread_id, "message": "I want to schedule a performance review."}
        )
        assert turn1_resp.status_code == 200
        t1_data = turn1_resp.json()

        # Step 3: Verify that assistant requests missing information (full name and email)
        assert t1_data["pending_booking"] is not None
        assert t1_data["pending_booking"]["appointment_type"] == "Performance Review"
        assert "full name" in t1_data["content"].lower() or "email" in t1_data["content"].lower()

        # Step 4, 5 & 6: Turn 2 - Submit name & email AND ask handbook question in same turn
        # "Alex Chen, alex.chen@example.com. Before continuing, how often are performance reviews conducted according to the handbook?"
        turn2_msg = (
            "Alex Chen, alex.chen@example.com. Before continuing, "
            "how often are performance reviews conducted according to the handbook?"
        )
        turn2_resp = await client.post(
            "/api/chat",
            json={"thread_id": thread_id, "message": turn2_msg}
        )
        assert turn2_resp.status_code == 200
        t2_data = turn2_resp.json()

        # Step 7 & 8: Verify the answer uses retrieved evidence and cites Page 4 of employee_handbook.pdf
        assert len(t2_data["citations"]) > 0
        top_citation = t2_data["citations"][0]
        assert top_citation["source"] == "employee_handbook.pdf"
        assert top_citation["page"] == 4
        assert "annually" in t2_data["content"].lower()

        # Step 9: Verify that the pending booking remains intact and does NOT re-ask for Alex Chen or email
        pending_b = t2_data["pending_booking"]
        assert pending_b is not None
        assert pending_b["full_name"] == "Alex Chen"
        assert pending_b["email"] == "alex.chen@example.com"
        assert "Alex Chen" in t2_data["content"]
        assert "alex.chen@example.com" in t2_data["content"]

        # Step 10: Verify available appointment slots are listed
        assert "slot_fri_1030" in t2_data["content"] or "available appointment slots" in t2_data["content"].lower()

        # Step 11 & 12: Turn 3 - Select a real available slot: "Friday at 10:30 AM works for me."
        turn3_resp = await client.post(
            "/api/chat",
            json={"thread_id": thread_id, "message": "Friday at 10:30 AM works for me."}
        )
        assert turn3_resp.status_code == 200
        t3_data = turn3_resp.json()

        # Verify assistant resolved to slot_fri_1030 and requested explicit confirmation
        assert t3_data["pending_booking"] is not None
        assert t3_data["pending_booking"]["slot_id"] == "slot_fri_1030"
        assert "confirm" in t3_data["content"].lower()

        # Step 13: Turn 4 - Confirm the booking
        turn4_resp = await client.post(
            "/api/chat",
            json={"thread_id": thread_id, "message": "Yes, please confirm."}
        )
        assert turn4_resp.status_code == 200
        t4_data = turn4_resp.json()

        # Step 14 & 15: Verify booking record committed transactionally and reference returned
        assert t4_data["booking_confirmed"] is not None
        ref = t4_data["booking_confirmed"]["booking_reference"]
        assert ref.startswith("NEX-")
        assert "Booking Confirmed" in t4_data["content"]
        assert ref in t4_data["content"]

        # Verify booking in database via /api/bookings
        db_bookings_resp = await client.get(f"/api/bookings?email=alex.chen@example.com")
        assert db_bookings_resp.status_code == 200
        user_bookings = db_bookings_resp.json()
        assert any(b["booking_reference"] == ref for b in user_bookings)

        # Step 16 & 17: Turn 5 - Retry confirmation request and verify idempotency
        turn5_resp = await client.post(
            "/api/chat",
            json={"thread_id": thread_id, "message": "Yes, confirm it."}
        )
        assert turn5_resp.status_code == 200
        
        # Verify no duplicate booking created in database
        db_bookings_after = (await client.get(f"/api/bookings?email=alex.chen@example.com")).json()
        matching_refs = [b for b in db_bookings_after if b["booking_reference"] == ref]
        assert len(matching_refs) == 1

        # Step 18 & 19: Restore thread in fresh request context
        restore_resp = await client.get(f"/api/conversations/{thread_id}")
        assert restore_resp.status_code == 200
        conv_data = restore_resp.json()
        assert len(conv_data["messages"]) >= 4

        # Step 20: Verify thread isolation - separate thread has fresh state
        isolated_thread_id = f"thread_isolated_{uuid.uuid4().hex[:8]}"
        isolated_turn = await client.post(
            "/api/chat",
            json={"thread_id": isolated_thread_id, "message": "Hello, what is my name?"}
        )
        assert isolated_turn.status_code == 200
        iso_data = isolated_turn.json()
        assert "Alex Chen" not in iso_data["content"]
        assert iso_data.get("booking_confirmed") is None


@pytest.mark.asyncio
async def test_faq_interruption_does_not_corrupt_booking_name():
    """
    Priority 1 Bug Verification Test:
    Ensures that when a user initiates a booking, supplies their name, and then interrupts
    with a handbook question ("How often are performance reviews conducted according to the handbook?"),
    the booking name is NEVER overwritten with the question text, and the next prompt requests ONLY
    the missing email address.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        thread_id = f"thread_bugfix_{uuid.uuid4().hex[:8]}"

        # Turn 1: Initiate booking
        r1 = await client.post("/api/chat", json={"thread_id": thread_id, "message": "I would like to schedule a performance review."})
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["pending_booking"] is not None
        assert d1["pending_booking"]["appointment_type"] == "Performance Review"

        # Turn 2: Provide name only
        r2 = await client.post("/api/chat", json={"thread_id": thread_id, "message": "My name is Alex Chen."})
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["pending_booking"] is not None
        assert d2["pending_booking"]["full_name"] == "Alex Chen"
        assert not d2["pending_booking"].get("email")

        # Turn 3: Intervene with handbook question
        question_text = "How often are performance reviews conducted according to the handbook?"
        r3 = await client.post("/api/chat", json={"thread_id": thread_id, "message": question_text})
        assert r3.status_code == 200
        d3 = r3.json()

        # CRITICAL ASSERTIONS:
        # 1. Name must still be Alex Chen, NEVER the question text!
        assert d3["pending_booking"] is not None
        assert d3["pending_booking"]["full_name"] == "Alex Chen"
        assert d3["pending_booking"]["full_name"] != question_text
        assert "How often" not in d3["pending_booking"]["full_name"]

        # 2. Email is still missing
        assert not d3["pending_booking"].get("email")

        # 3. Grounded citations must be returned for the question
        assert len(d3["citations"]) > 0
        assert d3["citations"][0]["page"] == 4

        # 4. Response should acknowledge Alex Chen and ask only for email
        assert "Alex Chen" in d3["content"]
        assert "email" in d3["content"].lower()

        # Turn 4: Provide email
        r4 = await client.post("/api/chat", json={"thread_id": thread_id, "message": "alex.chen@example.com"})
        assert r4.status_code == 200
        d4 = r4.json()
        assert d4["pending_booking"]["full_name"] == "Alex Chen"
        assert d4["pending_booking"]["email"] == "alex.chen@example.com"
        assert "slot_fri_1030" in d4["content"] or "available appointment slots" in d4["content"].lower()
