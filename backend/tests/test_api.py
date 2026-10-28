import json
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.main import create_app
from app.models import Assignment, AssistanceCreate, VersionCommand
from app.errors import DomainError
from app.repository import Repository
from app.service import Service
from conftest import prepare_walk


def window():
    now = datetime.now(UTC)
    return {"meeting_point_id": "meet_library", "destination_dorm_id": "dorm_esentepe",
            "earliest_at": now.isoformat(), "latest_at": (now + timedelta(minutes=10)).isoformat()}


def help_request(client, walk, key="request-0001"):
    response = client.post("/api/assistances", json={"walk_id": walk["id"], "reason": "HELP_REQUEST", "idempotency_key": key})
    assert response.status_code == 201
    return response.json()["data"]


def test_catalog_has_only_four_selected_dorms(demo):
    client, _, login, _ = demo
    login("student-01")
    catalog = client.get("/api/bootstrap").json()["data"]["catalog"]
    assert {d["id"] for d in catalog["dormitories"]} == {"dorm_esentepe", "dorm_sabahattin_zaim", "dorm_rahime_sultan", "dorm_ayse_humeyra_okten"}
    assert len(catalog["meeting_points"]) == 4
    assert all(d["entrance_coordinates"] is None and not d["physical_route_verified"] for d in catalog["dormitories"])


def test_anonymous_access_denied(demo):
    client, *_ = demo
    assert client.get("/api/state").status_code == 401


def test_pending_member_cannot_create_intent_or_self_approve(demo):
    client, _, login, _ = demo
    login("student-pending")
    assert client.post("/api/intents", json=window()).json()["code"] == "MEMBERSHIP_NOT_APPROVED"
    assert client.post("/api/memberships/student-pending/review", json={"expected_version": 1, "decision": "APPROVED_PILOT"}).status_code == 403


def test_review_requires_both_eligibility_checks_and_is_demo_labelled(demo):
    client, _, login, _ = demo
    login("reviewer")
    payload = {"expected_version": 1, "decision": "APPROVED_PILOT"}
    assert client.post("/api/memberships/student-pending/review", json=payload).status_code == 422
    payload.update(student_eligibility_checked=True, women_student_eligibility_checked=True)
    approved = client.post("/api/memberships/student-pending/review", json=payload)
    assert approved.status_code == 200
    assert approved.json()["data"]["method"] == "DEMO_TEST"
    login("student-pending")
    assert client.post("/api/intents", json=window()).status_code == 201


def test_unlisted_or_arbitrary_destination_rejected(demo):
    client, _, login, _ = demo
    login("student-01")
    payload = window() | {"destination_dorm_id": "unlisted_dorm"}
    assert client.post("/api/intents", json=payload).status_code == 422
    payload = window() | {"meeting_point_id": "my_house"}
    assert client.post("/api/intents", json=payload).status_code == 422
    assert client.post("/api/intents", json=window() | {"lat": 40.7, "gender": "female"}).status_code == 422


def test_expired_member_denied_and_duplicate_intent_prevented(demo):
    client, app, login, _ = demo
    login("student-01")
    assert client.post("/api/intents", json=window()).status_code == 201
    assert client.post("/api/intents", json=window()).status_code == 409
    app.state.repo.mutate("test", "expire", lambda s: s["users"]["student-02"]["membership"].update(expires_at=(datetime.now(UTC) - timedelta(seconds=1)).isoformat()))
    login("student-02")
    assert client.post("/api/intents", json=window()).json()["code"] == "MEMBERSHIP_EXPIRED"


def test_all_members_must_accept_and_outsider_cannot_accept(demo):
    client, _, login, _ = demo
    login("presenter")
    client.post("/api/demo/reset", json={"student_count": 3})
    login("student-01")
    pod = client.post("/api/matches/preview").json()["data"]["pod"]
    assert client.post("/api/walks/start", json={"pod_id": pod["id"]}).status_code == 409
    login("student-04")
    assert client.post(f"/api/pods/{pod['id']}/accept", json={"expected_version": 1}).status_code == 403
    assert client.get("/api/state").json()["data"]["pods"] == []


def test_decline_releases_other_intents(demo):
    client, app, login, _ = demo
    login("presenter")
    client.post("/api/demo/reset", json={"student_count": 3})
    login("student-01")
    pod = client.post("/api/matches/preview").json()["data"]["pod"]
    response = client.post(f"/api/pods/{pod['id']}/decline", json={"expected_version": 1})
    assert response.json()["data"]["status"] == "CANCELLED"
    assert app.state.repo.read()["intents"]["seed-02"]["status"] == "WAITING"


def test_closed_edge_recalculates_routes(demo):
    client, _, login, _ = demo
    login("student-01")
    query = {"meeting_point_id": "meet_library", "destination_dorm_id": "dorm_sabahattin_zaim"}
    before = client.get("/api/routes", params=query).json()["data"]
    assert before["shortest"]["edge_ids"] != before["lighting_first"]["edge_ids"]
    login("presenter")
    client.post("/api/demo/edges/main-spine", json={"closed": True})
    after = client.get("/api/routes", params=query).json()["data"]
    assert "main-spine" not in after["lighting_first"]["edge_ids"]
    client.post("/api/demo/edges/start-0", json={"closed": True})
    assert client.get("/api/routes", params=query).json()["code"] == "NO_ROUTE"


def test_student_privacy_and_reviewer_scope(demo):
    client, _, login, _ = demo
    walk = prepare_walk(demo)
    login("student-02")
    assert client.get("/api/state").json()["data"]["walks"] == []
    assert client.post(f"/api/walks/{walk['id']}/complete", json={"expected_version": 1}).status_code == 403
    assert client.post("/api/assistances", json={"walk_id": walk["id"], "idempotency_key": "someone-elses"}).status_code == 403
    login("reviewer")
    state = client.get("/api/state").json()["data"]
    assert state["walks"] == [] and "memberships" in state


def test_assistance_lifecycle_separates_operator_and_guard(demo):
    client, _, login, _ = demo
    walk = prepare_walk(demo)
    item = help_request(client, walk)
    login("guard-01")
    assert client.post(f"/api/assistances/{item['id']}/arrive", json={"expected_version": item["version"]}).status_code == 409
    login("operator")
    assert client.post(f"/api/assistances/{item['id']}/assign", json={"expected_version": 1, "unit_id": "guard-01"}).status_code == 409
    for action, extra, expected_state in (("operator-ack", {}, "OPERATOR_ACKED"), ("assign", {"unit_id": "guard-01"}, "ASSIGNED")):
        response = client.post(f"/api/assistances/{item['id']}/{action}", json={"expected_version": item["version"], **extra})
        assert response.status_code == 200
        item = response.json()["data"]
        assert item["status"] == expected_state
    assert client.post(f"/api/assistances/{item['id']}/arrive", json={"expected_version": item["version"]}).status_code == 403
    login("guard-02")
    assert client.post(f"/api/assistances/{item['id']}/arrive", json={"expected_version": item["version"]}).status_code == 403
    login("guard-01")
    visible = client.get("/api/state").json()["data"]["assistances"]
    assert len(visible) == 1 and visible[0]["status"] == "ASSIGNED"
    assert client.post(f"/api/assistances/{item['id']}/guard-accept", json={"expected_version": item["version"]}).status_code == 404
    assert client.post(f"/api/assistances/{item['id']}/arrive", json={"expected_version": item["version"] - 1}).status_code == 409
    response = client.post(f"/api/assistances/{item['id']}/arrive", json={"expected_version": item["version"]})
    assert response.status_code == 200
    item = response.json()["data"]
    assert item["status"] == "ARRIVED"
    assert client.post(f"/api/assistances/{item['id']}/arrive", json={"expected_version": item["version"]}).status_code == 409
    login("operator")
    response = client.post(f"/api/assistances/{item['id']}/resolve", json={"expected_version": item["version"], "resolution": "DEMO_COMPLETED"})
    assert response.json()["data"]["status"] == "RESOLVED"
    assert [event["status"] for event in response.json()["data"]["history"]] == ["CREATED", "OPERATOR_ACKED", "ASSIGNED", "ARRIVED", "RESOLVED"]


def test_help_idempotency_and_entity_conflict(demo):
    client, _, login, _ = demo
    walk = prepare_walk(demo)
    first = help_request(client, walk)
    second = help_request(client, walk)
    assert first["id"] == second["id"]
    changed = client.post("/api/assistances", json={"walk_id": walk["id"], "reason": "ESCORT_REQUEST", "idempotency_key": "request-0001"})
    assert changed.status_code == 409
    login("operator")
    response = client.post(f"/api/assistances/{first['id']}/operator-ack", json={"expected_version": 999})
    assert response.status_code == 409


def test_concurrent_assignments_cannot_claim_same_guard(demo):
    client, app, login, _ = demo
    walk = prepare_walk(demo)
    items = [help_request(client, walk, f"request-{index:04}") for index in range(2)]
    actor = login("operator")
    service = app.state.service
    items = [service.assistance_action(actor, i["id"], "operator-ack", VersionCommand(expected_version=i["version"])) for i in items]
    def assign(item):
        try:
            service.assistance_action(actor, item["id"], "assign", Assignment(expected_version=item["version"], unit_id="guard-01"))
            return "OK"
        except DomainError as error:
            return error.code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(assign, items)) == ["OK", "UNIT_UNAVAILABLE"]


def test_arrival_timer_creates_one_review_and_cancelled_timer_stays_closed(demo):
    client, app, login, _ = demo
    walk = prepare_walk(demo, arrival=True)
    future = datetime.fromisoformat(walk["arrival_due_at"]) + timedelta(seconds=61)
    app.state.service.tick(future)
    app.state.service.tick(future)
    state = app.state.repo.read()
    assert len([a for a in state["assistances"].values() if a["reason"] == "ARRIVAL_UNCONFIRMED"]) == 1
    current = state["walks"][walk["id"]]
    client.post(f"/api/walks/{walk['id']}/complete", json={"expected_version": current["version"]})
    app.state.service.tick(future + timedelta(minutes=1))
    assert len(app.state.repo.read()["assistances"]) == 1


def test_disabled_arrival_timer_and_completed_walk_have_no_alert(demo):
    client, app, _, _ = demo
    walk = prepare_walk(demo, arrival=False)
    future = datetime.fromisoformat(walk["arrival_due_at"]) + timedelta(hours=1)
    app.state.service.tick(future)
    assert app.state.repo.read()["assistances"] == {}
    assert client.post(f"/api/walks/{walk['id']}/complete", json={"expected_version": walk["version"]}).status_code == 200
    app.state.service.tick(future)
    assert app.state.repo.read()["assistances"] == {}


def test_completed_student_can_search_again_without_rejoining_old_walking_group(demo):
    client, _, _, _ = demo
    walk = prepare_walk(demo)
    assert client.post(f"/api/walks/{walk['id']}/complete", json={"expected_version": walk["version"]}).status_code == 200
    assert client.post("/api/intents", json=window()).status_code == 201
    response = client.post("/api/matches/preview")
    assert response.status_code == 200
    assert response.json()["data"]["pod"] is None


def test_student_who_missed_departure_can_replan_without_stopping_a_peers_walk(demo):
    client, app, login, _ = demo
    walk = prepare_walk(demo)
    past = (datetime.now(UTC) - timedelta(minutes=1)).isoformat()
    def miss_departure(state):
        state["pods"][walk["pod_id"]]["latest_departure_at"] = past
        for intent in state["intents"].values():
            if intent["owner_id"] == "student-02":
                intent["latest_at"] = past
    app.state.repo.mutate("test", "miss.departure", miss_departure)
    login("student-02")
    assert client.post("/api/intents", json=window()).status_code == 201
    assert client.post("/api/matches/preview").json()["data"]["pod"] is None
    assert app.state.repo.read()["walks"][walk["id"]]["status"] == "WALKING"


def test_late_operator_can_ack_and_status_not_falsely_dispatched(demo):
    client, app, login, _ = demo
    walk = prepare_walk(demo)
    item = help_request(client, walk)
    app.state.service.tick(datetime.fromisoformat(item["created_at"]) + timedelta(seconds=16))
    item = app.state.repo.read()["assistances"][item["id"]]
    assert item["status"] == "CREATED" and item["escalation_state"] == "OPERATOR_OVERDUE"
    login("operator")
    response = client.post(f"/api/assistances/{item['id']}/operator-ack", json={"expected_version": item["version"]})
    assert response.json()["data"]["status"] == "OPERATOR_ACKED"


def test_unrelated_global_revision_does_not_invalidate_entity_version(demo):
    client, _, login, _ = demo
    walk = prepare_walk(demo)
    item = help_request(client, walk)
    help_request(client, walk, "another-request")
    login("operator")
    response = client.post(f"/api/assistances/{item['id']}/operator-ack", json={"expected_version": item["version"]})
    assert response.status_code == 200


def test_origin_restriction_and_student_cannot_reset(demo):
    client, _, login, _ = demo
    login("student-01")
    assert client.post("/api/demo/reset", json={"student_count": 3}).status_code == 403
    assert client.post("/api/intents", json=window(), headers={"origin": "https://untrusted.example"}).status_code == 403


def test_logout_invalidates_cookie_session(demo):
    client, _, login, _ = demo
    login("student-01")
    token = client.cookies.get("kovan_session")
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/state", headers={"cookie": f"kovan_session={token}"}).status_code == 401


def test_websocket_snapshot_is_authorized_and_scoped(demo):
    client, _, login, _ = demo
    login("student-01")
    with client.websocket_connect("/api/events", headers={"origin": "http://127.0.0.1:8000"}) as socket:
        message = socket.receive_json()
        assert message["type"] == "state.snapshot"
        assert message["data"]["user"]["id"] == "student-01"
        assert "memberships" not in message["data"]


def test_vite_origin_accepts_login_and_websocket_but_not_foreign_origin(demo):
    client, _, _, codes = demo
    origin = "http://127.0.0.1:5173"
    response = client.post("/api/auth/demo-session", json={"access_code": codes["student-01"]}, headers={"origin": origin})
    assert response.status_code == 200
    with client.websocket_connect("/api/events", headers={"origin": origin}) as socket:
        message = socket.receive_json()
        assert message["data"]["user"]["id"] == "student-01"
    assert client.post("/api/auth/demo-session", json={"access_code": codes["student-01"]}, headers={"origin": "https://foreign.example"}).status_code == 403


def test_database_survives_restart(tmp_path):
    app = create_app(tmp_path)
    with TestClient(app) as client:
        codes = json.loads((tmp_path / "demo-access.json").read_text(encoding="utf-8"))
        client.post("/api/auth/demo-session", json={"access_code": codes["student-01"]})
        assert client.post("/api/intents", json=window()).status_code == 201
    with TestClient(create_app(tmp_path)) as client:
        client.post("/api/auth/demo-session", json={"access_code": codes["student-01"]})
        assert len(client.get("/api/state").json()["data"]["intents"]) == 1


def test_route_snapshot_unchanged_after_demo_edge_override(demo):
    client, app, login, _ = demo
    walk = prepare_walk(demo)
    old_route = walk["route"]
    login("presenter")
    assert client.post("/api/demo/edges/main-spine", json={"closed": True}).json()["data"]["active_walks_changed"] is False
    assert app.state.repo.read()["walks"][walk["id"]]["route"] == old_route


def test_expired_unstarted_pod_releases_members_for_new_intents(demo):
    client, app, login, _ = demo
    login("presenter")
    client.post("/api/demo/reset", json={"student_count": 3})
    login("student-01")
    pod = client.post("/api/matches/preview").json()["data"]["pod"]
    app.state.service.tick(datetime.fromisoformat(pod["latest_departure_at"]) + timedelta(seconds=1))
    assert app.state.repo.read()["pods"][pod["id"]]["status"] == "EXPIRED"
    assert client.post("/api/intents", json=window()).status_code == 201


def test_guard_overdue_waits_for_arrival_and_allows_late_arrival(demo):
    client, app, login, _ = demo
    walk = prepare_walk(demo)
    item = help_request(client, walk)
    login("operator")
    item = client.post(f"/api/assistances/{item['id']}/operator-ack", json={"expected_version": item["version"]}).json()["data"]
    item = client.post(f"/api/assistances/{item['id']}/assign", json={"expected_version": item["version"], "unit_id": "guard-01"}).json()["data"]
    app.state.service.tick(datetime.fromisoformat(item["assigned_at"]) + timedelta(seconds=31))
    current = app.state.repo.read()["assistances"][item["id"]]
    assert current["status"] == "ASSIGNED" and current["escalation_state"] == "GUARD_OVERDUE"
    login("guard-01")
    response = client.post(f"/api/assistances/{item['id']}/arrive", json={"expected_version": current["version"]})
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "ARRIVED"
    assert response.json()["data"]["escalation_state"] == "NONE"


def test_openapi_has_distinct_role_commands(demo):
    client, *_ = demo
    paths = client.get("/openapi.json").json()["paths"]
    assert "/api/assistances/{assistance_id}/operator-ack" in paths
    assert "/api/assistances/{assistance_id}/guard-accept" not in paths
    assert "/api/assistances/{assistance_id}/arrive" in paths
    assert "/api/incidents/{id}/transition" not in paths
    demo_action = next(p for p in paths["/api/demo/assistances/{item_id}/{action}"]["post"]["parameters"] if p["name"] == "action")
    assert set(demo_action["schema"]["enum"]) == {"operator-ack", "assign", "arrive", "resolve"}


def test_existing_accepted_task_upgrades_to_assigned_and_can_arrive(tmp_path):
    repo = Repository(tmp_path)
    at = datetime.now(UTC).isoformat()
    legacy = {"id": "old-task", "status": "GUARD_ACCEPTED", "version": 4, "assigned_unit_id": "guard-01",
              "assigned_at": at, "created_at": at, "escalation_state": "NONE", "history": [{"status": "GUARD_ACCEPTED", "at": at}]}
    repo.mutate("test", "legacy", lambda state: state["assistances"].update({legacy["id"]: legacy}))
    repo.close()
    upgraded = Repository(tmp_path)
    current = upgraded.read()["assistances"][legacy["id"]]
    assert current["status"] == "ASSIGNED" and current["version"] == 5
    assert current["history"][0] == legacy["history"][0]
    assert current["assigned_at"] == at and current["assigned_unit_id"] == "guard-01"
    upgraded.close()
    reopened = Repository(tmp_path)
    assert reopened.read()["assistances"][legacy["id"]] == current
    guard = reopened.read()["users"]["guard-01"]
    arrived = Service(reopened).assistance_action(guard, legacy["id"], "arrive", VersionCommand(expected_version=5))
    assert arrived["status"] == "ARRIVED"
    reopened.close()


def test_invalid_login_body_does_not_echo_secret(demo):
    client, *_ = demo
    response = client.post("/api/auth/demo-session", json={"access_code": "short-secret", "role": "dispatcher"})
    assert response.status_code == 422
    assert "short-secret" not in response.text
