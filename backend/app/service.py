import secrets
from datetime import UTC, datetime, timedelta

from .catalog import DORMS, MEETINGS, catalog
from .engines.matching import propose_groups
from .engines.routing import demo_edges, find_route
from .errors import DomainError
from .repository import initial_state
from .models import AssistanceAction
from .privacy import masked_name
from .safety import SafetyService, fresh_location, queue_notification


def now_utc():
    return datetime.now(UTC)


def require_role(actor, *roles):
    if actor["role"] not in roles:
        raise DomainError("FORBIDDEN", "Bu işlem için yetkiniz yok.", 403)


def get_item(collection, key):
    item = collection.get(key)
    if not item:
        raise DomainError("NOT_FOUND", "Kayıt bulunamadı.", 404)
    return item


def check_version(item, expected):
    if item["version"] != expected:
        raise DomainError("VERSION_CONFLICT", "Kayıt değişti; güncel durumu alın.", 409)


def ensure_eligible(user, now):
    require_role(user, "student")
    membership = user["membership"]
    if membership["status"] != "APPROVED_PILOT":
        raise DomainError("MEMBERSHIP_NOT_APPROVED", "Üyeliğiniz onay bekliyor veya kullanım dışı.", 403)
    if not membership["expires_at"] or datetime.fromisoformat(membership["expires_at"]) <= now:
        raise DomainError("MEMBERSHIP_EXPIRED", "Üyelik onayınızı yenilemeniz gerekiyor.", 403)


class Service:
    def __init__(self, repository, safety=None):
        self.repo = repository
        self.safety = safety or SafetyService(repository)

    def envelope(self, data):
        state = self.repo.read()
        return {"revision": state["revision"], "server_time": now_utc().isoformat(), "run_id": state["run_id"],
                "environment": "demo", "data": data}

    def bootstrap(self, actor):
        state = self.repo.read()
        return {"user": state["users"][actor["id"]], "catalog": catalog(state["map_points"]), "edges": demo_edges(),
                "notice": "Yalnızca sentetik gösterim. Gerçek öğrenci doğrulaması ve güvenlik bağlantısı yok."}

    def state_for(self, actor):
        state = self.repo.read()
        user = state["users"][actor["id"]]
        role, uid = user["role"], user["id"]
        result = {"user": user, "pods": [], "walks": [], "assistances": [], "intents": [], "closed_edges": state["closed_edges"]}
        if role == "student":
            result.update(self.safety.for_user(user))
            result["intents"] = [item for item in state["intents"].values() if item["owner_id"] == uid]
            result["walks"] = [item for item in state["walks"].values() if item["owner_id"] == uid]
            own_walks = {item["id"] for item in result["walks"]}
            result["assistances"] = [item for item in state["assistances"].values() if item["walk_id"] in own_walks]
            for pod in state["pods"].values():
                if uid in pod["member_ids"]:
                    result["pods"].append(self.public_pod(pod, uid, state["users"]))
        elif role == "eligibility_reviewer":
            result["memberships"] = [{"user_id": u["id"], "display_name": u["display_name"], "is_synthetic": True,
                                      "membership": u["membership"]} for u in state["users"].values() if u["role"] == "student"]
        elif role == "guard":
            result["assistances"] = [item for item in state["assistances"].values() if item.get("assigned_unit_id") == uid]
            assigned_walks = {item["walk_id"] for item in result["assistances"]}
            result["walks"] = [item for item in state["walks"].values() if item["id"] in assigned_walks]
        elif role in ("dispatcher", "demo_admin"):
            for key in ("intents", "pods", "walks", "assistances"):
                result[key] = list(state[key].values())
            result["units"] = self.units(state)
            result["events"] = state["events"][-30:]
        if role in ("guard", "dispatcher", "demo_admin"):
            result["assistances"] = [dict(item, student_name=masked_name(state["users"].get(
                state["walks"][item["walk_id"]]["owner_id"], {}).get("display_name"))) for item in result["assistances"]]
        return result

    @staticmethod
    def public_pod(pod, uid, users):
        # A member gets only the shared meeting plan, not other members' private intents or homes.
        return {key: value for key, value in pod.items() if key != "intent_ids"} | {
            "you_accepted": uid in pod["accepted_member_ids"],
            "members": [{"id": member_id, "masked_name": masked_name(users.get(member_id, {}).get("display_name"))}
                        for member_id in pod["member_ids"]]}

    @staticmethod
    def units(state):
        busy = {item["assigned_unit_id"] for item in state["assistances"].values()
                if item.get("assigned_unit_id") and item["status"] not in ("RESOLVED", "CANCELLED")}
        return [{"id": user["id"], "display_name": user["display_name"], "availability": "BUSY" if user["id"] in busy else "AVAILABLE"}
                for user in state["users"].values() if user["role"] == "guard"]

    def review(self, actor, user_id, command):
        require_role(actor, "eligibility_reviewer")
        def change(state):
            user = get_item(state["users"], user_id)
            if user["role"] != "student" or not user["is_synthetic"]:
                raise DomainError("DEMO_ONLY", "Bu sürüm sadece sentetik test başvurusu değerlendirir.", 403)
            membership = user["membership"]
            check_version(membership, command.expected_version)
            if command.verified_dorm_id and command.verified_dorm_id not in DORMS:
                raise DomainError("DORM_NOT_ALLOWED", "Yurt pilot listesinde değil.", 422)
            if command.decision == "APPROVED_PILOT" and not (command.student_eligibility_checked and command.women_student_eligibility_checked):
                raise DomainError("ELIGIBILITY_CHECK_REQUIRED", "İki uygunluk kontrolü de yetkili inceleyici tarafından işaretlenmeli.", 422)
            membership.update(status=command.decision, method="DEMO_TEST", reviewer_id=actor["id"],
                              reviewed_at=now_utc().isoformat(), expires_at=(now_utc() + timedelta(days=1)).isoformat(),
                              verified_dorm_id=command.verified_dorm_id, version=membership["version"] + 1)
            return membership
        return self.repo.mutate(actor["id"], "membership.reviewed", change)

    def create_intent(self, actor, command):
        def change(state):
            ensure_eligible(state["users"][actor["id"]], now_utc())
            if command.meeting_point_id not in MEETINGS or command.destination_dorm_id not in DORMS:
                raise DomainError("LOCATION_NOT_ALLOWED", "Yalnızca pilot buluşma noktası ve kız yurdu seçilebilir.", 422)
            if command.latest_at <= now_utc() or command.earliest_at > now_utc() + timedelta(days=1):
                raise DomainError("INVALID_DEPARTURE_WINDOW", "Ayrılış aralığı güncel ve önümüzdeki 24 saat içinde olmalı.", 422)
            for intent in state["intents"].values():
                if intent["owner_id"] == actor["id"] and intent["status"] in ("WAITING", "PROPOSED") and datetime.fromisoformat(intent["latest_at"]) < now_utc():
                    intent.update(status="EXPIRED", version=intent["version"] + 1)
            if any(i["owner_id"] == actor["id"] and i["status"] in ("WAITING", "PROPOSED", "WALKING") for i in state["intents"].values()):
                raise DomainError("ACTIVE_INTENT_EXISTS", "Önce açık yürüyüş planınızı tamamlayın veya iptal edin.", 409)
            find_route(command.meeting_point_id, command.destination_dorm_id, state["closed_edges"])
            item = {"id": secrets.token_hex(8), "owner_id": actor["id"], **command.model_dump(mode="json"), "status": "WAITING", "version": 1}
            state["intents"][item["id"]] = item
            return item
        return self.repo.mutate(actor["id"], "intent.created", change)

    def cancel_intent(self, actor, intent_id, version):
        require_role(actor, "student")
        def change(state):
            item = get_item(state["intents"], intent_id)
            if item["owner_id"] != actor["id"]:
                raise DomainError("FORBIDDEN", "Başka bir öğrencinin planına erişemezsiniz.", 403)
            check_version(item, version)
            if item["status"] != "WAITING":
                raise DomainError("INVALID_TRANSITION", "Yalnızca bekleyen plan burada iptal edilebilir.", 409)
            item.update(status="CANCELLED", version=item["version"] + 1)
            return item
        return self.repo.mutate(actor["id"], "intent.cancelled", change)

    def match(self, actor):
        def change(state):
            ensure_eligible(state["users"][actor["id"]], now_utc())
            completed_pods = {walk["pod_id"] for walk in state["walks"].values()
                              if walk["owner_id"] == actor["id"] and walk["status"] == "COMPLETED"}
            walking_pods = {walk["pod_id"] for walk in state["walks"].values()
                            if walk["owner_id"] == actor["id"] and walk["status"] == "WALKING"}
            for pod in state["pods"].values():
                if (actor["id"] in pod["member_ids"] and pod["status"] in ("PROPOSED", "ACCEPTED", "WALKING")
                        and pod["id"] not in completed_pods
                        and (datetime.fromisoformat(pod["latest_departure_at"]) >= now_utc() or pod["id"] in walking_pods)):
                    return {"pod": self.public_pod(pod, actor["id"], state["users"]), "unmatched": []}
            eligible = []
            for intent in state["intents"].values():
                if intent["status"] == "WAITING":
                    try:
                        ensure_eligible(state["users"][intent["owner_id"]], now_utc())
                        find_route(intent["meeting_point_id"], intent["destination_dorm_id"], state["closed_edges"])
                        eligible.append(intent)
                    except DomainError:
                        continue
            result = propose_groups(eligible, now_utc())
            for group in result["groups"]:
                if actor["id"] in group["member_ids"]:
                    pod = {"id": secrets.token_hex(8), **group, "accepted_member_ids": [], "status": "PROPOSED", "version": 1}
                    state["pods"][pod["id"]] = pod
                    for intent_id in pod["intent_ids"]:
                        state["intents"][intent_id].update(status="PROPOSED", version=state["intents"][intent_id]["version"] + 1)
                    return {"pod": self.public_pod(pod, actor["id"], state["users"]), "unmatched": [], "algorithm": result["algorithm"]}
            own_ids = {item["id"] for item in state["intents"].values() if item["owner_id"] == actor["id"]}
            return {"pod": None, "unmatched": [item for item in result["unmatched"] if item["intent_id"] in own_ids]}
        return self.repo.mutate(actor["id"], "pod.proposed", change)

    def pod_action(self, actor, pod_id, version, accept=True):
        def change(state):
            ensure_eligible(state["users"][actor["id"]], now_utc())
            pod = get_item(state["pods"], pod_id)
            if actor["id"] not in pod["member_ids"]:
                raise DomainError("FORBIDDEN", "Bu grubun üyesi değilsiniz.", 403)
            check_version(pod, version)
            if pod["status"] != "PROPOSED" or datetime.fromisoformat(pod["latest_departure_at"]) < now_utc():
                raise DomainError("INVALID_TRANSITION", "Bu grup artık kabul beklemiyor veya süresi dolmuş.", 409)
            if not accept:
                pod["status"] = "CANCELLED"
                for intent_id in pod["intent_ids"]:
                    intent = state["intents"][intent_id]
                    intent.update(status="CANCELLED" if intent["owner_id"] == actor["id"] else "WAITING", version=intent["version"] + 1)
            else:
                if actor["id"] not in pod["accepted_member_ids"]:
                    pod["accepted_member_ids"].append(actor["id"])
                if set(pod["accepted_member_ids"]) == set(pod["member_ids"]):
                    pod["status"] = "ACCEPTED"
            pod["version"] += 1
            return self.public_pod(pod, actor["id"], state["users"])
        return self.repo.mutate(actor["id"], "pod.accepted" if accept else "pod.declined", change)

    def start_walk(self, actor, command, route_override=None):
        def change(state):
            ensure_eligible(state["users"][actor["id"]], now_utc())
            pod = get_item(state["pods"], command.pod_id)
            if actor["id"] not in pod["member_ids"]:
                raise DomainError("FORBIDDEN", "Bu grubun üyesi değilsiniz.", 403)
            if pod["status"] not in ("ACCEPTED", "WALKING") or set(pod["member_ids"]) != set(pod["accepted_member_ids"]):
                raise DomainError("GROUP_NOT_ACCEPTED", "Yürüyüş için tüm üyelerin kabulü gerekiyor.", 409)
            for member_id in pod["member_ids"]:
                ensure_eligible(state["users"][member_id], now_utc())
            if not datetime.fromisoformat(pod["departure_at"]) <= now_utc() <= datetime.fromisoformat(pod["latest_departure_at"]):
                raise DomainError("OUTSIDE_DEPARTURE_WINDOW", "Ortak ayrılış aralığında değilsiniz.", 409)
            if any(w["owner_id"] == actor["id"] and w["pod_id"] == pod["id"] for w in state["walks"].values()):
                raise DomainError("WALK_ALREADY_STARTED", "Bu yürüyüş zaten başlatıldı.", 409)
            route = route_override or find_route(pod["meeting_point_id"], pod["destination_dorm_id"], state["closed_edges"])
            now = now_utc()
            walk = {"id": secrets.token_hex(8), "owner_id": actor["id"], "pod_id": pod["id"],
                    "meeting_point_id": pod["meeting_point_id"], "destination_dorm_id": pod["destination_dorm_id"],
                    "route": route, "status": "WALKING", "tracking_status": "NOT_SHARED", "version": 1,
                    "arrival_check_enabled": command.arrival_check_enabled,
                    "arrival_due_at": (now + timedelta(seconds=command.estimated_duration_seconds)).isoformat(),
                    "grace_seconds": 60, "arrival_alert_id": None}
            state["walks"][walk["id"]] = walk
            pod.update(status="WALKING", version=pod["version"] + 1)
            for intent_id in pod["intent_ids"]:
                if state["intents"][intent_id]["owner_id"] == actor["id"]:
                    state["intents"][intent_id]["status"] = "WALKING"
            return walk
        return self.repo.mutate(actor["id"], "walk.started", change)

    def complete_walk(self, actor, walk_id, version):
        require_role(actor, "student")
        def change(state):
            walk = get_item(state["walks"], walk_id)
            if walk["owner_id"] != actor["id"]:
                raise DomainError("FORBIDDEN", "Başka bir öğrencinin yürüyüşüne erişemezsiniz.", 403)
            check_version(walk, version)
            if walk["status"] != "WALKING":
                raise DomainError("INVALID_TRANSITION", "Yürüyüş zaten tamamlanmış.", 409)
            walk.update(status="COMPLETED", tracking_status="STOPPED", version=walk["version"] + 1)
            pod = state["pods"][walk["pod_id"]]
            for intent_id in pod["intent_ids"]:
                if state["intents"][intent_id]["owner_id"] == actor["id"]:
                    state["intents"][intent_id]["status"] = "COMPLETED"
            walks = [w for w in state["walks"].values() if w["pod_id"] == pod["id"]]
            if len(walks) == len(pod["member_ids"]) and all(w["status"] == "COMPLETED" for w in walks):
                pod.update(status="COMPLETED", version=pod["version"] + 1)
            return walk
        return self.repo.mutate(actor["id"], "walk.completed", change)

    @staticmethod
    def new_assistance(state, walk_id, reason, at):
        item = {"id": secrets.token_hex(8), "walk_id": walk_id, "reason": reason, "status": "CREATED", "version": 1,
                "operator_id": None, "assigned_unit_id": None, "created_at": at.isoformat(),
                "escalation_state": "NONE", "resolution": None, "history": [{"status": "CREATED", "at": at.isoformat()}]}
        state["assistances"][item["id"]] = item
        return item

    def request_help(self, actor, command):
        require_role(actor, "student")
        def change(state):
            walk = get_item(state["walks"], command.walk_id)
            if walk["owner_id"] != actor["id"]:
                raise DomainError("FORBIDDEN", "Başka bir öğrencinin yürüyüşüne erişemezsiniz.", 403)
            key = actor["id"] + ":" + command.idempotency_key
            previous = state["idempotency"].get(key)
            if previous:
                item = state["assistances"][previous]
                if item["walk_id"] != command.walk_id or item["reason"] != command.reason:
                    raise DomainError("IDEMPOTENCY_CONFLICT", "Aynı anahtar farklı talep için kullanılmış.", 409)
                return item
            if walk["status"] != "WALKING":
                raise DomainError("INVALID_TRANSITION", "Yeni yürüyüş desteği yalnızca devam eden yürüyüşte istenebilir.", 409)
            item = self.new_assistance(state, command.walk_id, command.reason, now_utc())
            location, location_status = fresh_location(command)
            item.update(location=location, location_status=location_status)
            notification = queue_notification(state, state["users"][actor["id"]], item["id"], "CAMPUS_WALK", "Yürüyüşüm sırasında desteğe ihtiyacım var.", location, location_status)
            item["notification_id"] = notification["id"]
            state["idempotency"][key] = item["id"]
            return item
        return self.repo.mutate(actor["id"], "assistance.created", change)

    def assistance_action(self, actor, assistance_id, action: AssistanceAction, command):
        transitions = {"operator-ack": ("CREATED", "OPERATOR_ACKED"), "assign": ("OPERATOR_ACKED", "ASSIGNED"),
                       "arrive": ("ASSIGNED", "ARRIVED"), "resolve": ("ARRIVED", "RESOLVED")}
        if action not in transitions:
            raise DomainError("INVALID_ACTION", "Bilinmeyen görev işlemi.", 422)
        require_role(actor, "dispatcher" if action in ("operator-ack", "assign", "resolve") else "guard")
        def change(state):
            item = get_item(state["assistances"], assistance_id)
            check_version(item, command.expected_version)
            old, new = transitions[action]
            if item["status"] != old:
                raise DomainError("INVALID_TRANSITION", "İşlem mevcut durumdan yapılamaz.", 409)
            if action == "arrive" and item["assigned_unit_id"] != actor["id"]:
                raise DomainError("FORBIDDEN", "Yalnızca atanmış görevli işlem yapabilir.", 403)
            if action == "operator-ack":
                item["operator_id"] = actor["id"]
            if action == "assign":
                unit = next((u for u in self.units(state) if u["id"] == command.unit_id), None)
                if not unit or unit["availability"] != "AVAILABLE":
                    raise DomainError("UNIT_UNAVAILABLE", "Görevli bulunamadı veya başka görevi var.", 409)
                item["assigned_unit_id"] = command.unit_id
                item["assigned_at"] = now_utc().isoformat()
            if action == "resolve":
                item["resolution"] = command.resolution
            item.update(status=new, escalation_state="NONE", version=item["version"] + 1)
            item["history"].append({"status": new, "actor_id": actor["id"], "at": now_utc().isoformat()})
            return item
        return self.repo.mutate(actor["id"], "assistance." + action, change)

    def tick(self, at=None):
        at = at or now_utc()
        snapshot = self.repo.read()
        expired_pods = [p["id"] for p in snapshot["pods"].values() if p["status"] in ("PROPOSED", "ACCEPTED")
                        and datetime.fromisoformat(p["latest_departure_at"]) < at]
        due_walks = [w["id"] for w in snapshot["walks"].values() if w["status"] == "WALKING" and w["arrival_check_enabled"]
                     and not w["arrival_alert_id"] and datetime.fromisoformat(w["arrival_due_at"]) + timedelta(seconds=w["grace_seconds"]) <= at]
        due_items = []
        for item in snapshot["assistances"].values():
            if item["status"] == "CREATED" and item["escalation_state"] == "NONE" and (at - datetime.fromisoformat(item["created_at"])).total_seconds() >= 15:
                due_items.append((item["id"], "OPERATOR_OVERDUE"))
            elif item["status"] == "ASSIGNED" and item["escalation_state"] != "GUARD_OVERDUE" and (at - datetime.fromisoformat(item["assigned_at"])).total_seconds() >= 30:
                due_items.append((item["id"], "GUARD_OVERDUE"))
        if not due_walks and not due_items and not expired_pods:
            return
        def change(state):
            for pod_id in expired_pods:
                pod = state["pods"].get(pod_id)
                if pod and pod["status"] in ("PROPOSED", "ACCEPTED"):
                    pod.update(status="EXPIRED", version=pod["version"] + 1)
                    for intent_id in pod["intent_ids"]:
                        intent = state["intents"][intent_id]
                        intent.update(status="EXPIRED", version=intent["version"] + 1)
            for walk_id in due_walks:
                walk = state["walks"].get(walk_id)
                if walk and walk["status"] == "WALKING" and not walk["arrival_alert_id"]:
                    item = self.new_assistance(state, walk_id, "ARRIVAL_UNCONFIRMED", at)
                    walk.update(arrival_alert_id=item["id"], version=walk["version"] + 1)
            for item_id, flag in due_items:
                item = state["assistances"].get(item_id)
                if item and ((flag == "OPERATOR_OVERDUE" and item["status"] == "CREATED") or (flag == "GUARD_OVERDUE" and item["status"] == "ASSIGNED")):
                    item.update(escalation_state=flag, version=item["version"] + 1)
        self.repo.mutate("system", "deadlines.checked", change)

    def reset(self, actor, count):
        require_role(actor, "demo_admin")
        def change(state):
            fresh = initial_state()
            old_revision = state["revision"]
            settings = {key: state[key] for key in ("map_points", "emergency_contacts")}
            state.clear()
            state.update(fresh)
            state.update(settings)
            state["revision"] = old_revision
            now = now_utc()
            for index in range(1, count + 1):
                item = {"id": f"seed-{index:02}", "owner_id": f"student-{index:02}", "meeting_point_id": "meet_library",
                        "destination_dorm_id": list(DORMS)[((index - 1) // 5) % 4], "earliest_at": now.isoformat(),
                        "latest_at": (now + timedelta(minutes=10)).isoformat(), "status": "WAITING", "version": 1}
                state["intents"][item["id"]] = item
            return {"run_id": state["run_id"], "student_count": count}
        return self.repo.mutate(actor["id"], "demo.reset", change)

    def toggle_edge(self, actor, edge_id, closed):
        require_role(actor, "demo_admin")
        if edge_id not in {edge["id"] for edge in demo_edges()}:
            raise DomainError("UNKNOWN_EDGE", "Örnek ağ bağlantısı bulunamadı.", 404)
        def change(state):
            # Active route snapshots are intentionally immutable: changes affect future proposals only.
            edges = set(state["closed_edges"])
            if closed:
                edges.add(edge_id)
            else:
                edges.discard(edge_id)
            state["closed_edges"] = sorted(edges)
            return {"closed_edges": state["closed_edges"], "active_walks_changed": False}
        return self.repo.mutate(actor["id"], "demo.edge_changed", change)
