from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Verify that the /api/health endpoint returns status healthy."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Coffee & Milk Tea Shop API" in data["app"]
    assert data["version"] == "1.0.0"

def test_root():
    """Verify that the root endpoint returns API links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["health"] == "/api/health"

