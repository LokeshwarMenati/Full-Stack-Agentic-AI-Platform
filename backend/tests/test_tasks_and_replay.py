import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.slot_service import SlotService
from app.persistence.database import AsyncSessionLocal


@pytest.mark.asyncio
async def test_tasks_api_lifecycle_and_input_editing():
    async with AsyncSessionLocal() as session:
        await SlotService.seed_demo_slots(session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        thread_id = "test_thread_task_lifecycle_101"

        # 1. Check initial task state
        res = await ac.get(f"/api/tasks/{thread_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["thread_id"] == thread_id
        assert "structured_task" in data
        assert data["structured_task"]["execution_status"] in ["planned", "in_progress"]

        # 2. Edit inputs on Execution Surface
        edit_payload = {
            "full_name": "Jordan Vance",
            "email": "jordan.vance@example.com",
            "slot_id": "slot_fri_1030",
            "appointment_type": "Performance Review"
        }
        edit_res = await ac.post(f"/api/tasks/{thread_id}/edit-inputs", json=edit_payload)
        assert edit_res.status_code == 200
        edit_data = edit_res.json()
        assert edit_data["status"] == "success"
        assert edit_data["pending_booking"]["full_name"] == "Jordan Vance"
        assert edit_data["pending_booking"]["email"] == "jordan.vance@example.com"
        assert edit_data["pending_booking"]["slot_id"] == "slot_fri_1030"
        assert edit_data["approval_gate"]["required"] is True
        assert len(edit_data["state_diffs"]) >= 1

        # 3. Retrieve updated task state via GET
        get_res = await ac.get(f"/api/tasks/{thread_id}")
        assert get_res.status_code == 200
        updated = get_res.json()
        assert updated["approval_gate"]["required"] is True
        assert updated["approval_gate"]["attendee_name"] == "Jordan Vance"


@pytest.mark.asyncio
async def test_workflow_replay_simulation_safety():
    async with AsyncSessionLocal() as session:
        await SlotService.seed_demo_slots(session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        thread_id = "test_thread_replay_sim_202"

        # First record a turn in the thread
        chat_res = await ac.post("/api/chat", json={
            "thread_id": thread_id,
            "message": "What is the policy on performance reviews and schedule a review for Alex Morgan alex.m@corp.com"
        })
        assert chat_res.status_code == 200

        # Now trigger isolated replay simulation
        replay_res = await ac.post(f"/api/tasks/{thread_id}/replay", json={
            "thread_id": thread_id,
            "dry_run": True
        })
        assert replay_res.status_code == 200
        replay_data = replay_res.json()
        assert replay_data["is_simulation"] is True
        assert replay_data["status"] == "SUCCESS"
        assert replay_data["replayed_turns_count"] >= 1
        assert len(replay_data["side_effects_prevented"]) >= 1
        assert "Zero database alterations" in replay_data["comparison"]["side_effects_safeguard"]
