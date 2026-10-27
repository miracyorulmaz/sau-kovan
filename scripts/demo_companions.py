"""Add synthetic companions to an existing local student plan without resetting it."""
import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlsplit

import httpx


def run(base_url, student_id, immediate=False):
    address = urlsplit(base_url)
    if address.hostname not in {"127.0.0.1", "localhost"} or address.scheme != "http" or address.username or address.password:
        raise RuntimeError("Bu yardımcı yalnızca yerel HTTP demo sunucusunda kullanılabilir.")
    root = Path(__file__).resolve().parents[1]
    codes = json.loads((root / ".local/demo-access.json").read_text(encoding="utf-8"))
    clients = {}
    try:
        def client_for(user_id):
            if user_id not in clients:
                client = httpx.Client(base_url=base_url, timeout=10)
                clients[user_id] = client
                response = client.post("/api/auth/demo-session", json={"access_code": codes[user_id]})
                response.raise_for_status()
            return clients[user_id]

        def get(user_id, path):
            response = client_for(user_id).get(path)
            response.raise_for_status()
            return response.json()

        def post(user_id, path, body=None):
            response = client_for(user_id).post(path, json=body) if body is not None else client_for(user_id).post(path)
            response.raise_for_status()
            return response.json()["data"]

        def require_synthetic_student(user_id):
            bootstrap = get(user_id, "/api/bootstrap")
            user = bootstrap["data"]["user"]
            if bootstrap["environment"] != "demo" or user["role"] != "student" or not user["is_synthetic"] or user["membership"]["method"] != "DEMO_TEST":
                raise RuntimeError("Yalnızca sentetik demo öğrenci hesapları kullanılabilir.")

        require_synthetic_student(student_id)
        envelope = get(student_id, "/api/state")
        state = envelope["data"]
        if any(walk["status"] == "WALKING" for walk in state["walks"]):
            print("Öğrencinin yürüyüşü zaten açık; yeni hesap veya plan eklenmedi.")
            return
        waiting = next((item for item in reversed(state["intents"]) if item["status"] == "WAITING"), None)
        pod = post(student_id, "/api/matches/preview")["pod"]
        if immediate:
            source = pod or waiting
            if not source:
                raise RuntimeError("Önce öğrenci ekranında buluşma noktası ve yurt seçerek bir plan oluşturun.")
            peers = [key for key in pod["member_ids"] if key != student_id] if pod else []
            for peer in peers:
                require_synthetic_student(peer)
            if pod:
                if pod["status"] != "PROPOSED":
                    raise RuntimeError("Herkesin kabul ettiği grubun saati bu yardımcıyla değiştirilemez.")
                post(student_id, f"/api/pods/{pod['id']}/decline", {"expected_version": pod["version"]})
                for peer in peers:
                    peer_state = get(peer, "/api/state")["data"]
                    for item in peer_state["intents"]:
                        if item["status"] == "WAITING" and item["meeting_point_id"] == source["meeting_point_id"] and item["destination_dorm_id"] == source["destination_dorm_id"]:
                            post(peer, f"/api/intents/{item['id']}/cancel", {"expected_version": item["version"]})
            elif waiting:
                post(student_id, f"/api/intents/{waiting['id']}/cancel", {"expected_version": waiting["version"]})
            now = datetime.fromisoformat(get(student_id, "/api/state")["server_time"])
            plan = {key: source[key] for key in ("meeting_point_id", "destination_dorm_id")}
            plan.update(earliest_at=now.isoformat(), latest_at=(now + timedelta(minutes=10)).isoformat())
            for person in [student_id, *peers]:
                post(person, "/api/intents", plan)
            waiting = plan
            pod = post(student_id, "/api/matches/preview")["pod"]
        if not pod:
            if not waiting or datetime.fromisoformat(waiting["latest_at"]) <= datetime.fromisoformat(envelope["server_time"]):
                raise RuntimeError("Önce öğrenci ekranından güncel bir yolculuk planı oluşturun.")
            all_state = get("presenter", "/api/state")["data"]
            occupied = {item["owner_id"] for item in all_state["intents"] if item["status"] in {"WAITING", "PROPOSED", "WALKING"}}
            occupied.update(walk["owner_id"] for walk in all_state["walks"] if walk["status"] == "WALKING")
            available = [key for key in codes if key.startswith("student-") and key != "student-pending" and key not in occupied and key != student_id]
            if len(available) < 2:
                raise RuntimeError("İki boş demo hesabı bulunamadı. Mevcut planlar değiştirilmedi.")
            for peer in available[:2]:
                require_synthetic_student(peer)
                post(peer, "/api/intents", {key: waiting[key] for key in ("meeting_point_id", "destination_dorm_id", "earliest_at", "latest_at")})
            pod = post(student_id, "/api/matches/preview")["pod"]
            if not pod:
                raise RuntimeError("Planlar oluşturuldu fakat ortak grup bulunamadı; öğrenci ekranından yeniden arayın.")

        for peer in pod["member_ids"]:
            if peer == student_id:
                continue
            require_synthetic_student(peer)
            for attempt in range(3):
                latest = next(item for item in get(peer, "/api/state")["data"]["pods"] if item["id"] == pod["id"])
                if peer in latest["accepted_member_ids"]:
                    break
                response = client_for(peer).post(f"/api/pods/{pod['id']}/accept", json={"expected_version": latest["version"]})
                if response.status_code == 409 and response.json().get("code") == "VERSION_CONFLICT" and attempt < 2:
                    continue
                response.raise_for_status()
                break
        latest = next(item for item in get(student_id, "/api/state")["data"]["pods"] if item["id"] == pod["id"])
        print(f"{len(latest['member_ids'])} kişilik demo grup hazır. Kabul: {len(latest['accepted_member_ids'])}/{len(latest['member_ids'])}.")
        print("Öğrenci adına kabul verilmedi ve yürüyüş başlatılmadı.")
        print("Öğrenci ekranında gerekirse Gruba katıl, ardından Yürüyüşü başlat düğmesini kullanın.")
        print(f"Çıkış aralığı: {latest['departure_at']} — {latest['latest_departure_at']}")
    finally:
        for client in clients.values():
            client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--student", default="student-01")
    parser.add_argument("--now", action="store_true", help="Seçili nokta ve yurdu koruyup demo planını şimdiye alır; henüz tüm üyeler kabul etmemiş olmalıdır.")
    options = parser.parse_args()
    try:
        run(options.base_url, options.student, options.now)
    except (RuntimeError, httpx.HTTPError, KeyError, StopIteration) as error:
        parser.exit(1, f"Demo grubu hazırlanamadı: {error}\n")
