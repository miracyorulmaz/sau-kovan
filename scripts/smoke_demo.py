"""Real HTTP demo against localhost; resets synthetic demo state. Never prints access codes."""
import argparse
import json
from pathlib import Path

import httpx


def run(base_url):
    root = Path(__file__).resolve().parents[1]
    codes = json.loads((root / ".local" / "demo-access.json").read_text(encoding="utf-8"))
    clients = {}
    try:
        def client_for(user_id):
            if user_id not in clients:
                client = httpx.Client(base_url=base_url, timeout=10)
                response = client.post("/api/auth/demo-session", json={"access_code": codes[user_id]})
                response.raise_for_status()
                clients[user_id] = client
            return clients[user_id]

        def post(user_id, path, body=None):
            response = client_for(user_id).post(path, json=body) if body is not None else client_for(user_id).post(path)
            response.raise_for_status()
            return response.json()["data"]

        post("presenter", "/api/demo/reset", {"student_count": 3})
        print("1. Üç sentetik çıkış niyeti oluşturuldu.")
        pod = post("student-01", "/api/matches/preview")["pod"]
        assert pod and len(pod["member_ids"]) == 3
        for member_id in pod["member_ids"]:
            pod = post(member_id, f"/api/pods/{pod['id']}/accept", {"expected_version": pod["version"]})
        print("2. Grup üç ayrı oturumdan kabul edildi.")
        walk = post("student-01", "/api/walks/start", {"pod_id": pod["id"]})
        item = post("student-01", "/api/assistances", {"walk_id": walk["id"], "reason": "HELP_REQUEST", "idempotency_key": "smoke-demo-request"})
        for user_id, action, fields in (
            ("operator", "operator-ack", {}), ("operator", "assign", {"unit_id": "guard-01"}),
            ("guard-01", "guard-accept", {}), ("guard-01", "arrive", {}),
            ("operator", "resolve", {"resolution": "DEMO_COMPLETED"}),
        ):
            item = post(user_id, f"/api/assistances/{item['id']}/{action}", {"expected_version": item["version"], **fields})
            print(f"3. Görev durumu: {item['status']}")
        post("student-01", f"/api/walks/{walk['id']}/complete", {"expected_version": walk["version"]})
        print("4. Yürüyüş tamamlandı. Gerçek HTTP akışı başarılı; güvenlik hizmeti çağrılmadı.")
    finally:
        for client in clients.values():
            client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    arguments = parser.parse_args()
    if not arguments.base_url.startswith(("http://127.0.0.1:", "http://localhost:")):
        parser.error("Bu gösterim yalnızca localhost içindir.")
    run(arguments.base_url)
