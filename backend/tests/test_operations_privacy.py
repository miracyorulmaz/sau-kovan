import json

import pytest

from app.privacy import masked_name
from conftest import prepare_walk


@pytest.mark.parametrize("name,expected", [
    ("Miraç Burak Yorulmaz", "M**** B**** Y*******"),
    ("  Elif   Naz  Öztürk ", "E*** N** Ö*****"),
    ("ipek ışıl", "İ*** I***"),
    ("A", "A*"), ("", "Öğrenci"), (None, "Öğrenci"),
])
def test_name_masking(name, expected):
    assert masked_name(name) == expected


def test_group_members_receive_masked_names_in_rest_and_websocket_only(demo):
    client, app, login, _ = demo
    login("presenter")
    client.post("/api/demo/reset", json={"student_count": 3})
    names = {"student-01": "Miraç Burak Yorulmaz", "student-02": "Elif Naz Öztürk", "student-03": "Zeynep Yılmaz"}
    app.state.repo.mutate("test", "names", lambda state: [state["users"][key].update(display_name=name) for key, name in names.items()])
    login("student-01")
    pod = client.post("/api/matches/preview").json()["data"]["pod"]
    expected = [{"id": uid, "masked_name": masked_name(names[uid])} for uid in pod["member_ids"]]
    assert pod["members"] == expected and "intent_ids" not in pod
    for uid in pod["member_ids"]:
        login(uid)
        payloads = [client.get("/api/state").json(), client.post("/api/matches/preview").json()]
        response = client.post(f"/api/pods/{pod['id']}/accept", json={"expected_version": pod["version"]})
        assert response.status_code == 200
        pod = response.json()["data"]
        assert pod["members"] == expected
        payloads.append(response.json())
        with client.websocket_connect("/api/events", headers={"origin": "http://127.0.0.1:8000"}) as socket:
            message = socket.receive_json()
            assert message["data"]["pods"][0]["members"] == expected
            payloads.append(message)
        for payload in payloads:
            serialized = json.dumps(payload, ensure_ascii=False)
            assert all(full not in serialized for key, full in names.items() if key != uid)
    login("student-04")
    assert client.get("/api/state").json()["data"]["pods"] == []
    assert client.post(f"/api/pods/{pod['id']}/accept", json={"expected_version": pod["version"]}).status_code == 403


def test_guard_sees_only_own_dispatch_and_masked_requester(demo):
    client, app, login, _ = demo
    walk = prepare_walk(demo)
    app.state.repo.mutate("test", "name", lambda state: state["users"]["student-01"].update(display_name="Elif Naz Öztürk"))
    task = client.post("/api/assistances", json={"walk_id": walk["id"], "idempotency_key": "operations-privacy"}).json()["data"]
    login("guard-01")
    assert client.get("/api/state").json()["data"]["assistances"] == []
    login("operator")
    before = client.get("/api/state").json()["data"]
    assert before["assistances"][0]["student_name"] == "E*** N** Ö*****"
    assert len(before["units"]) == 2
    task = client.post(f"/api/assistances/{task['id']}/operator-ack", json={"expected_version": task["version"]}).json()["data"]
    task = client.post(f"/api/assistances/{task['id']}/assign", json={"expected_version": task["version"], "unit_id": "guard-01"}).json()["data"]
    login("guard-02")
    assert client.get("/api/state").json()["data"]["assistances"] == []
    login("guard-01")
    assigned = client.get("/api/state").json()["data"]
    assert assigned["assistances"][0]["student_name"] == "E*** N** Ö*****"
    assert assigned["walks"][0]["meeting_point_id"] == "meet_library"
    assert "Elif Naz Öztürk" not in json.dumps(assigned, ensure_ascii=False)
    response = client.post(f"/api/assistances/{task['id']}/arrive", json={"expected_version": task["version"]})
    assert response.status_code == 200 and response.json()["data"]["status"] == "ARRIVED"
