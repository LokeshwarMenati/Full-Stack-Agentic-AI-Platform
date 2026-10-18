import pytest
import io
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_create_and_manage_voice_session():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create a voice session
        create_resp = await ac.post("/api/voice/sessions", json={
            "thread_id": "test_voice_thread_001",
            "mode": "live_conversation",
            "voice_preference": "Google US English"
        })
        assert create_resp.status_code == 201
        data = create_resp.json()
        assert "session_id" in data
        assert data["thread_id"] == "test_voice_thread_001"
        assert data["status"] == "active"
        session_id = data["session_id"]

        # 2. Get the voice session
        get_resp = await ac.get(f"/api/voice/sessions/{session_id}")
        assert get_resp.status_code == 200
        get_data = get_resp.json()
        assert get_data["session_id"] == session_id
        assert get_data["status"] == "active"

        # 3. End the voice session
        end_resp = await ac.post(f"/api/voice/sessions/{session_id}/end")
        assert end_resp.status_code == 200
        end_data = end_resp.json()
        assert end_data["session_id"] == session_id
        assert end_data["status"] == "ended"
        assert "duration_seconds" in end_data


@pytest.mark.asyncio
async def test_transcribe_audio_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("empty.webm", io.BytesIO(b"short"), "audio/webm")}
        resp = await ac.post("/api/voice/transcribe", files=files)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "empty"
        assert data["text"] == ""


@pytest.mark.asyncio
async def test_transcribe_audio_valid_payload():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create a mock webm audio payload > 500 bytes
        audio_content = b"RIFF" + (b"\x00" * 800)
        files = {"file": ("recording.webm", io.BytesIO(audio_content), "audio/webm")}
        resp = await ac.post("/api/voice/transcribe", files=files)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert len(data["text"]) > 0
        assert "engine" in data


@pytest.mark.asyncio
async def test_transcribe_audio_unsupported_media_type():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("test.pdf", io.BytesIO(b"%PDF-1.4" + (b"0" * 500)), "application/pdf")}
        resp = await ac.post("/api/voice/transcribe", files=files)
        assert resp.status_code == 415


@pytest.mark.asyncio
async def test_voice_speak_clean_formatting():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/voice/speak", json={
            "text": "### Confirmed!\nYour review with **Alex** is set. Visit [link](https://nexus.ai) for details."
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "###" not in data["clean_text"]
        assert "**" not in data["clean_text"]
        assert "https://nexus.ai" not in data["clean_text"]
        assert "Confirmed! Your review with Alex is set. Visit link for details." in data["clean_text"]
