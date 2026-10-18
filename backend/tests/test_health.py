import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # /health
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "NEXUS AI" in data["app"]

        # /api/health/ready
        ready_resp = await client.get("/api/health/ready")
        assert ready_resp.status_code == 200
        ready_data = ready_resp.json()
        assert ready_data["ready"] is True
        assert ready_data["database"] == "connected"
        assert ready_data["vector_store"] == "indexed"
