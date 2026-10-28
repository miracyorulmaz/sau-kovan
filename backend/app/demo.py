"""Explicit local-demo coordination, never part of normal student authorization."""
from datetime import datetime, timedelta

from .errors import DomainError
from .models import Assignment, IntentCreate, Resolution, VersionCommand
from .service import ensure_eligible, now_utc


class DemoCoordinator:
    def __init__(self, service):
        self.service, self.repo = service, service.repo

    @staticmethod
    def synthetic(user):
        if user["role"] != "student" or not user.get("is_synthetic") or user["membership"].get("method") != "DEMO_TEST":
            raise DomainError("DEMO_ONLY", "Bu kontrol yalnızca sentetik demo öğrencileri içindir.", 403)

    def companions(self, actor, immediate=False):
        self.synthetic(actor)
        ensure_eligible(actor, now_utc())
        with self.repo.lock:
            state = self.repo.read()
            if any(walk["owner_id"] == actor["id"] and walk["status"] == "WALKING" for walk in state["walks"].values()):
                raise DomainError("WALK_ALREADY_STARTED", "Önce mevcut yürüyüşünü tamamla.", 409)
            waiting = next((item for item in reversed(list(state["intents"].values())) if item["owner_id"] == actor["id"] and item["status"] == "WAITING"), None)
            pod = self.service.match(actor)["pod"]
            if immediate:
                source = pod or waiting
                if not source:
                    raise DomainError("PLAN_REQUIRED", "Önce buluşma noktası ve yurt seçerek plan oluştur.", 409)
                peers = [uid for uid in pod["member_ids"] if uid != actor["id"]] if pod else []
                for uid in peers:
                    self.synthetic(state["users"][uid])
                if pod:
                    if pod["status"] == "WALKING":
                        raise DomainError("INVALID_TRANSITION", "Bir üyenin yürüyüşü başladı; grubun saatini değiştiremezsin.", 409)
                    def retire(current):
                        current["pods"][pod["id"]].update(status="CANCELLED", version=pod["version"] + 1)
                        for intent_id in current["pods"][pod["id"]]["intent_ids"]:
                            item = current["intents"][intent_id]
                            item.update(status="CANCELLED", version=item["version"] + 1)
                    self.repo.mutate(actor["id"], "demo.group_replanned", retire)
                elif waiting:
                    self.service.cancel_intent(actor, waiting["id"], waiting["version"])
                now = now_utc()
                plan = IntentCreate(meeting_point_id=source["meeting_point_id"], destination_dorm_id=source["destination_dorm_id"], earliest_at=now, latest_at=now + timedelta(minutes=10))
                for uid in [actor["id"], *peers]:
                    self.service.create_intent(state["users"][uid], plan)
                waiting = plan.model_dump(mode="json")
                pod = self.service.match(actor)["pod"]
            if not pod:
                if not waiting or datetime.fromisoformat(waiting["latest_at"]) <= now_utc():
                    raise DomainError("PLAN_REQUIRED", "Önce güncel bir yolculuk planı oluştur.", 409)
                state = self.repo.read()
                occupied = {item["owner_id"] for item in state["intents"].values() if item["status"] == "WALKING"
                            or item["status"] in ("WAITING", "PROPOSED") and datetime.fromisoformat(item["latest_at"]) > now_utc()}
                available = [user for user in state["users"].values() if user["role"] == "student" and user["id"] != actor["id"] and user["id"] not in occupied
                             and user["membership"]["status"] == "APPROVED_PILOT" and user.get("is_synthetic") and user["membership"].get("method") == "DEMO_TEST"
                             and datetime.fromisoformat(user["membership"]["expires_at"]) > now_utc()]
                if len(available) < 2:
                    raise DomainError("DEMO_ACCOUNTS_BUSY", "İki boş demo hesabı bulunamadı.", 409)
                plan = IntentCreate(**{key: waiting[key] for key in ("meeting_point_id", "destination_dorm_id", "earliest_at", "latest_at")})
                for peer in available[:2]:
                    self.service.create_intent(peer, plan)
                pod = self.service.match(actor)["pod"]
                if not pod:
                    raise DomainError("NO_COMPATIBLE_GROUP", "Ortak grup bulunamadı. Planı yenileyin.", 409)
            for uid in pod["member_ids"]:
                if uid == actor["id"] or uid in pod["accepted_member_ids"]:
                    continue
                peer = self.repo.read()["users"][uid]
                self.synthetic(peer)
                pod = self.service.pod_action(peer, pod["id"], pod["version"])
            return {"pod": pod, "note": "Diğer sentetik üyeler kabul verdi. Kendi katılımını ve yürüyüşünü sen başlatırsın."}

    def state(self, actor):
        snapshot = self.service.state_for(actor)
        return {"assistances": snapshot["assistances"], "walks": snapshot["walks"], "pods": snapshot["pods"],
                "units": self.service.units(self.repo.read()), **self.service.safety.for_user(actor)}

    def assistance_action(self, actor, item_id, action, command):
        state = self.repo.read()
        item = state["assistances"].get(item_id)
        if not item or state["walks"][item["walk_id"]]["owner_id"] != actor["id"]:
            raise DomainError("FORBIDDEN", "Bu demo kontrolü yalnızca kendi talebin içindir.", 403)
        if action in ("operator-ack", "assign", "resolve"):
            agent = state["users"]["operator"]
        elif action == "arrive":
            agent = state["users"].get(item["assigned_unit_id"])
            if not agent:
                raise DomainError("UNIT_UNAVAILABLE", "Önce bir demo görevlisi ata.", 409)
        else:
            raise DomainError("INVALID_ACTION", "Bilinmeyen demo işlemi.", 422)
        body = Assignment(expected_version=command.expected_version, unit_id=command.unit_id) if action == "assign" else Resolution(expected_version=command.expected_version, resolution="DEMO_COMPLETED") if action == "resolve" else VersionCommand(expected_version=command.expected_version)
        return self.service.assistance_action(agent, item_id, action, body)
