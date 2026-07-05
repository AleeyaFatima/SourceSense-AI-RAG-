import os
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select

from main import app
from app.core.db import get_session
from app.models.models import User, Document, Chunk
from app.core.security import get_password_hash

# Setup temporary test database engine
TEST_DATABASE_URL = "sqlite:///./test_sourcesense.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})

@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Pre-seed test admin user
        admin = User(
            email="admin@sourcesense.ai",
            name="Test Administrator",
            hashed_password=get_password_hash("password123")
        )
        session.add(admin)
        session.commit()
        session.refresh(admin)
        yield session
    SQLModel.metadata.drop_all(engine)
    # Remove database file
    if os.path.exists("./test_sourcesense.db"):
        try:
            os.remove("./test_sourcesense.db")
        except PermissionError:
            pass

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session
        
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_read_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_dashboard_analytics_mock(client: TestClient):
    # Tests that default metrics retrieve correctly without crash
    response = client.get("/api/analytics/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "system_status" in data
    assert "recent_queries" in data
    assert data["metrics"]["total_documents"] >= 0

def test_auth_me_default(client: TestClient):
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@sourcesense.ai"
    assert data["name"] == "Test Administrator"
