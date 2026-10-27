import hashlib
import hmac
import json
import time
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app.errors import DomainError
from app.main import create_app
from app.repository import Repository


@pytest.fixture
def local_demo(tmp_path, monkeypatch):
    monkeypatch.setenv("KOVAN_NOTIFICATION_MODE", "DEMO")
    application = create_app(tmp_path, demo_controls=True)
    with TestClient(application, base_url="http://127.0.0.1:8000", client=("127.0.0.1", 41000)) as client:
        codes = json.loads((tmp_path / "demo-access.json").read_text(encoding="utf-8"))
        def login(uid):
            response = client.post("/api/auth/demo-session", json={"access_code": codes[uid]})
            assert response.status_code == 200
            return response.json()["data"]["user"]
        login("student-01")
        yield client, application, login, codes


def plan(hours=0):
    start = datetime.now(UTC) + timedelta(hours=hours)
    return {"meeting_point_id": "meet_cinaralti", "destination_dorm_id": "dorm_sabahattin_zaim", "earliest_at": start.isoformat(), "latest_at": (start + timedelta(minutes=10)).isoformat()}


def contact(client):
    response = client.put("/api/emergency-contact", json={"name": "Demo Yakını", "phone_e164": "+905550000001", "consent_confirmed": True, "share_location_on_help": True})
    assert response.status_code == 200


def emergency(client, key="emergency-key-0001", **extra):
    response = client.post("/api/emergencies", json={"idempotency_key": key, **extra})
    assert response.status_code == 201, response.text
    return response.json()["data"]


def drain(application):
    for _ in range(100):
        application.state.safety.process_pending()
        jobs = application.state.repo.read()["notifications"]
        if all(item["status"] not in ("QUEUED", "SENDING") for item in jobs.values()):
            return jobs
        time.sleep(.01)
    raise AssertionError("Outbox did not finish")


@pytest.mark.parametrize("hours", [3, 10])
def test_manual_departure_several_hours_later_is_supported(local_demo, hours):
    client, _, _, _ = local_demo
    response = client.post("/api/intents", json=plan(hours))
    assert response.status_code == 201
    assert datetime.fromisoformat(response.json()["data"]["earliest_at"]) > datetime.now(UTC) + timedelta(hours=hours - .1)


def test_departure_after_24_hours_is_rejected(local_demo):
    assert local_demo[0].post("/api/intents", json=plan(25)).status_code == 422


def test_local_demo_button_accepts_only_peers_and_is_repeatable(local_demo):
    client, app, _, _ = local_demo
    assert client.post("/api/intents", json=plan(10)).status_code == 201
    pod = client.post("/api/demo/companions", json={}).json()["data"]["pod"]
    assert len(pod["member_ids"]) == 3
    assert len(pod["accepted_member_ids"]) == 2
    assert "student-01" not in pod["accepted_member_ids"]
    again = client.post("/api/demo/companions", json={}).json()["data"]["pod"]
    assert again["id"] == pod["id"]
    assert len(app.state.repo.read()["intents"]) == 3
    assert client.post(f"/api/pods/{pod['id']}/accept", json={"expected_version": pod["version"]}).status_code == 200
    assert client.post("/api/walks/start", json={"pod_id": pod["id"]}).status_code == 409
    now_pod = client.post("/api/demo/companions", json={"immediate": True}).json()["data"]["pod"]
    assert now_pod["id"] != pod["id"]
    assert now_pod["meeting_point_id"] == pod["meeting_point_id"]
    assert now_pod["destination_dorm_id"] == pod["destination_dorm_id"]
    assert "student-01" not in now_pod["accepted_member_ids"]
    assert not app.state.repo.read()["walks"]


@pytest.mark.parametrize("enabled,host", [(False, "127.0.0.1"), (True, "203.0.113.8")])
def test_demo_controls_require_opt_in_and_loopback(tmp_path, enabled, host):
    app = create_app(tmp_path, demo_controls=enabled)
    with TestClient(app, base_url="http://127.0.0.1:8000", client=(host, 4000)) as client:
        codes = json.loads((tmp_path / "demo-access.json").read_text())
        client.post("/api/auth/demo-session", json={"access_code": codes["student-01"]})
        assert client.post("/api/demo/companions", json={}).status_code == 403
        assert client.get("/api/demo/control").status_code == 403
        assert client.get("/api/bootstrap").json()["data"]["capabilities"]["local_demo_controls"] is False


def test_demo_operator_actions_keep_student_session_and_use_real_transitions(local_demo):
    client, _, login, _ = local_demo
    client.post("/api/intents", json=plan())
    pod = client.post("/api/demo/companions", json={}).json()["data"]["pod"]
    client.post(f"/api/pods/{pod['id']}/accept", json={"expected_version": pod["version"]})
    walk = client.post("/api/walks/start", json={"pod_id": pod["id"]}).json()["data"]
    item = client.post("/api/assistances", json={"walk_id": walk["id"], "idempotency_key": "demo-help-001"}).json()["data"]
    assert client.post(f"/api/demo/assistances/{item['id']}/arrive", json={"expected_version": 1}).status_code == 409
    for action in ("operator-ack", "assign", "guard-accept", "arrive", "resolve"):
        response = client.post(f"/api/demo/assistances/{item['id']}/{action}", json={"expected_version": item["version"], "unit_id": "guard-01"})
        assert response.status_code == 200
        item = response.json()["data"]
    assert item["status"] == "RESOLVED"
    assert client.get("/api/state").json()["data"]["user"]["id"] == "student-01"
    login("student-06")
    assert client.post(f"/api/demo/assistances/{item['id']}/operator-ack", json={"expected_version": item["version"]}).status_code == 403


def test_contact_requires_consent_and_is_private(local_demo):
    client, _, login, _ = local_demo
    assert client.put("/api/emergency-contact", json={"name": "Yakını", "phone_e164": "+905550000001", "consent_confirmed": False}).status_code == 422
    contact(client)
    login("student-02")
    assert client.get("/api/state").json()["data"]["emergency_contact"] is None
    assert client.get("/api/demo/control").json()["data"]["notifications"] == []


def test_outside_campus_help_needs_no_walk_and_demo_never_calls_provider(local_demo):
    client, app, _, _ = local_demo
    contact(client)
    def no_network(request):
        raise AssertionError("DEMO must never contact WhatsApp")
    app.state.safety.transport = httpx.MockTransport(no_network)
    incident = emergency(client, location_status="DENIED")
    same = emergency(client, location_status="DENIED")
    assert same["id"] == incident["id"]
    jobs = drain(app)
    assert len(jobs) == 1
    job = next(iter(jobs.values()))
    assert job["status"] == "SIMULATED" and job["network_sent"] is False
    assert job["location"] is None and job["location_status"] == "DENIED"
    public = client.get("/api/state").json()["data"]["notifications"][0]
    assert "recipient_phone" not in public
    assert public["recipient_masked"] == "••••0001"
    assert not app.state.repo.read()["walks"]


def test_stale_location_is_not_sent_as_current(local_demo):
    client, app, _, _ = local_demo
    contact(client)
    emergency(client, location={"latitude": 40.7, "longitude": 30.3, "accuracy_m": 10, "captured_at": (datetime.now(UTC) - timedelta(hours=1)).isoformat()})
    job = next(iter(drain(app).values()))
    assert job["location"] is None and job["location_status"] == "STALE"


def live_provider(app, monkeypatch, handler):
    monkeypatch.setenv("KOVAN_NOTIFICATION_MODE", "WHATSAPP")
    safety = app.state.safety
    safety.token, safety.phone_id, safety.api_version, safety.template = "fake-secret", "12345", "v25.0", "kovan_alert"
    safety.transport = httpx.MockTransport(handler)
    return safety


def test_whatsapp_acceptance_is_not_delivery_and_webhook_is_signed(local_demo, monkeypatch):
    client, app, _, _ = local_demo
    seen = []
    def send(request):
        body = json.loads(request.content)
        assert body["type"] == "template" and body["to"] == "905550000001"
        assert len(body["template"]["components"][0]["parameters"]) == 4
        seen.append(request)
        return httpx.Response(200, json={"messages": [{"id": "wamid.test"}]})
    safety = live_provider(app, monkeypatch, send)
    safety.app_secret, safety.verify_token = "test-app-secret", "test-verify-token"
    contact(client)
    emergency(client)
    job = next(iter(drain(app).values()))
    assert job["status"] == "PROVIDER_ACCEPTED" and len(seen) == 1
    drain(app)
    assert len(seen) == 1
    for status in ("delivered", "read", "sent"):
        payload = json.dumps({"entry": [{"changes": [{"value": {"statuses": [{"id": "wamid.test", "status": status, "timestamp": "123"}]}}]}]}).encode()
        assert client.post("/api/webhooks/whatsapp", content=payload).status_code == 403
        signature = "sha256=" + hmac.new(safety.app_secret.encode(), payload, hashlib.sha256).hexdigest()
        assert client.post("/api/webhooks/whatsapp", content=payload, headers={"x-hub-signature-256": signature}).status_code == 200
    assert app.state.repo.read()["notifications"][job["id"]]["status"] == "READ"
    response = client.get("/api/webhooks/whatsapp", params={"hub.mode": "subscribe", "hub.verify_token": safety.verify_token, "hub.challenge": "challenge"})
    assert response.status_code == 200 and response.text == "challenge"


def test_unknown_provider_result_is_not_automatically_resent(local_demo, monkeypatch):
    client, app, _, _ = local_demo
    calls = []
    def timeout(request):
        calls.append(request)
        raise httpx.ReadTimeout("No confirmed response", request=request)
    live_provider(app, monkeypatch, timeout)
    contact(client); emergency(client)
    assert next(iter(drain(app).values()))["status"] == "DELIVERY_UNKNOWN"
    drain(app)
    assert len(calls) == 1


def test_missing_maps_keys_never_create_a_fake_estimate(local_demo):
    client, app, _, _ = local_demo
    app.state.maps.api_key = ""
    response = client.get("/api/maps/preview", params={"meeting_point_id": "meet_library", "destination_dorm_id": "dorm_esentepe"})
    assert response.status_code == 503 and response.json()["code"] == "MAPS_NOT_CONFIGURED"
    assert "duration_seconds" not in response.text


def test_maps_uses_walking_confirmed_points_caches_and_binds_preview(local_demo):
    client, app, login, _ = local_demo
    maps = app.state.maps
    maps.api_key, maps.browser_key = "server-secret", "restricted-browser-key"
    assert client.put("/api/demo/maps/points/meet_library", json={"latitude": 40.7, "longitude": 30.3, "confirmed": False}).status_code == 422
    for point_id, longitude in (("meet_library", 30.3), ("dorm_esentepe", 30.31)):
        assert client.put(f"/api/demo/maps/points/{point_id}", json={"latitude": 40.7, "longitude": longitude, "confirmed": True}).status_code == 200
    calls = []
    def compute(request):
        assert json.loads(request.content)["travelMode"] == "WALK"
        assert request.headers["X-Goog-FieldMask"] != "*"
        calls.append(request)
        return httpx.Response(200, json={"routes": [{"duration": "603s", "distanceMeters": 800, "polyline": {"encodedPolyline": "_p~iF~ps|U_ulLnnqC_mqNvxq`@"}}]})
    maps.transport = httpx.MockTransport(compute)
    query = {"meeting_point_id": "meet_library", "destination_dorm_id": "dorm_esentepe"}
    first = client.get("/api/maps/preview", params=query).json()["data"]
    second = client.get("/api/maps/preview", params=query).json()["data"]
    assert first["duration_seconds"] == 603 and len(calls) == 1
    assert first["preview_id"] != second["preview_id"] and "server-secret" not in json.dumps(first)
    other = login("student-02")
    with pytest.raises(DomainError) as error:
        maps.route_for_walk(other, first["preview_id"], query)
    assert error.value.code == "MAPS_PREVIEW_EXPIRED"


def test_existing_database_is_upgraded_without_losing_accounts(tmp_path):
    repo = Repository(tmp_path)
    run_id = repo.read()["run_id"]
    repo.mutate("test", "legacy", lambda state: [state.pop(key) for key in ("map_points", "emergency_contacts", "emergencies", "notifications")])
    repo.close()
    upgraded = Repository(tmp_path)
    assert upgraded.read()["run_id"] == run_id
    assert upgraded.read()["users"]["student-01"]["role"] == "student"
    assert upgraded.read()["notifications"] == {}
    upgraded.close()


def test_expired_demo_accounts_can_be_reused(local_demo):
    client, app, _, _ = local_demo
    expired = plan(-1)
    def occupy(state):
        for index in range(2, 61):
            key = f"student-{index:02}"
            state["intents"][key] = {"id": key, "owner_id": key, **expired, "status": "WAITING", "version": 1}
    app.state.repo.mutate("test", "old.demo.plans", occupy)
    client.post("/api/intents", json=plan())
    response = client.post("/api/demo/companions", json={})
    assert response.status_code == 200
    assert len(response.json()["data"]["pod"]["accepted_member_ids"]) == 2


def test_demo_location_never_reaches_live_whatsapp(local_demo, monkeypatch):
    client, app, _, _ = local_demo
    def no_network(request):
        raise AssertionError("Demo coordinates must never be sent to a real recipient")
    live_provider(app, monkeypatch, no_network)
    contact(client)
    emergency(client, location={"latitude": 0, "longitude": 0, "accuracy_m": 10, "captured_at": datetime.now(UTC).isoformat(), "source": "DEMO"})
    job = next(iter(drain(app).values()))
    assert job["status"] == "FAILED" and job["network_sent"] is False
