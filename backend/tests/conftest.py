import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def demo(tmp_path):
    application = create_app(tmp_path)
    with TestClient(application) as client:
        codes = json.loads((tmp_path / "demo-access.json").read_text(encoding="utf-8"))

        def login(user_id):
            response = client.post("/api/auth/demo-session", json={"access_code": codes[user_id]})
            assert response.status_code == 200
            return response.json()["data"]["user"]

        yield client, application, login, codes


def prepare_walk(demo, arrival=False):
    client, application, login, _ = demo
    login("presenter")
    assert client.post("/api/demo/reset", json={"student_count": 3}).status_code == 200
    login("student-01")
    pod = client.post("/api/matches/preview").json()["data"]["pod"]
    for user_id in pod["member_ids"]:
        login(user_id)
        response = client.post(f"/api/pods/{pod['id']}/accept", json={"expected_version": pod["version"]})
        assert response.status_code == 200
        pod = response.json()["data"]
    login("student-01")
    response = client.post("/api/walks/start", json={"pod_id": pod["id"], "arrival_check_enabled": arrival, "estimated_duration_seconds": 60})
    assert response.status_code == 201, response.text
    return response.json()["data"]
