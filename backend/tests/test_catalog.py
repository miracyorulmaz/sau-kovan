import json
from itertools import product

import httpx

from app.catalog import CATALOG_VERSION, DEFAULT_MAP_POINTS, DORMS, MEETINGS
from app.maps import MapsService
from app.repository import Repository


def test_revised_catalog_exposes_sourced_pins_and_rejects_retired_starts(demo):
    client, _, login, _ = demo
    login("student-01")
    catalog = client.get("/api/bootstrap").json()["data"]["catalog"]
    assert {p["id"] for p in catalog["meeting_points"]} == {
        "meet_library", "meet_adibahce", "meet_campus_gate", "meet_final_stop"}
    assert catalog["version"] == CATALOG_VERSION
    assert all(p["coordinates"]["source_url"].startswith("https://www.google.com/maps/")
               and p["field_check"] == "PENDING" for p in catalog["meeting_points"])
    for retired in ("meet_cinaralti", "meet_campus_market"):
        response = client.get("/api/routes", params={"meeting_point_id": retired, "destination_dorm_id": "dorm_esentepe"})
        assert response.status_code == 422


def test_all_sixteen_pairs_use_distinct_seeded_coordinates(tmp_path):
    repo = Repository(tmp_path)
    maps = MapsService(repo)
    maps.api_key, maps.browser_key = "server-test", "browser-test"
    calls = []
    def compute(request):
        body = json.loads(request.content)
        assert body["travelMode"] == "WALK"
        calls.append((body["origin"]["location"]["latLng"], body["destination"]["location"]["latLng"]))
        return httpx.Response(200, json={"routes": [{"duration": "600s", "distanceMeters": 700,
                                                    "polyline": {"encodedPolyline": "test"}}]})
    maps.transport = httpx.MockTransport(compute)
    for index, (meeting, dorm) in enumerate(product(MEETINGS, DORMS)):
        actor = repo.read()["users"][f"student-{index // 8 + 1:02}"]
        route = maps.preview(actor, meeting, dorm)
        expected = DEFAULT_MAP_POINTS[meeting], DEFAULT_MAP_POINTS[dorm]
        assert calls[-1] == tuple({axis: point[axis] for axis in ("latitude", "longitude")} for point in expected)
        assert route["duration_seconds"] == 600
    assert len(calls) == 16
    assert len({json.dumps(pair) for pair in calls}) == 16
    repo.close()


def test_upgrade_preserves_custom_points_and_walking_history(tmp_path):
    repo = Repository(tmp_path)
    token, _ = repo.login(json.loads((tmp_path / "demo-access.json").read_text())["student-01"])
    def legacy(state):
        state.pop("catalog_version")
        state["map_points"] = {"meet_library": {"latitude": 40.74, "longitude": 30.33, "confirmed": True, "confirmed_by": "operator"},
                               "meet_cinaralti": {"latitude": 40.7, "longitude": 30.3}}
        state["intents"] = {key: {"id": key, "meeting_point_id": "meet_cinaralti", "version": 3, "status": status}
                            for key, status in (("waiting", "WAITING"), ("proposed", "PROPOSED"), ("walking", "WALKING"), ("done", "COMPLETED"))}
        state["pods"] = {key: {"id": key, "meeting_point_id": "meet_cinaralti", "version": 4, "status": status, "intent_ids": intents}
                         for key, status, intents in (("pending", "ACCEPTED", ["proposed"]), ("active", "WALKING", ["walking"]))}
        state["walks"] = {"walk": {"id": "walk", "pod_id": "active", "status": "WALKING", "route_snapshot": {"origin": "meet_cinaralti"}}}
    repo.mutate("test", "legacy", legacy)
    original = repo.read()
    repo.close()
    upgraded = Repository(tmp_path)
    state = upgraded.read()
    assert upgraded.actor(token)["id"] == "student-01"
    assert state["run_id"] == original["run_id"]
    assert state["map_points"]["meet_library"] == original["map_points"]["meet_library"]
    assert set(state["map_points"]) == set(MEETINGS) | set(DORMS)
    assert state["pods"]["pending"]["status"] == "CANCELLED"
    assert state["intents"]["waiting"]["cancellation_reason"] == "CATALOG_CHANGED"
    assert state["intents"]["proposed"]["version"] == 4
    assert state["pods"]["active"] == original["pods"]["active"]
    assert state["intents"]["done"] == original["intents"]["done"]
    assert state["walks"] == original["walks"]
    revision = state["revision"]
    upgraded.close()
    reopened = Repository(tmp_path)
    assert reopened.read()["revision"] == revision
    reopened.close()


def test_reset_keeps_all_pins_and_custom_adjustments(demo):
    client, app, login, _ = demo
    login("presenter")
    assert len(app.state.repo.read()["map_points"]) == 8
    app.state.repo.mutate("test", "adjust", lambda state: state["map_points"]["meet_library"].update(latitude=40.74))
    assert client.post("/api/demo/reset", json={"student_count": 3}).status_code == 200
    assert len(app.state.repo.read()["map_points"]) == 8
    assert app.state.repo.read()["map_points"]["meet_library"]["latitude"] == 40.74
