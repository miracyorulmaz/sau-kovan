import hashlib
import json
import secrets
import sqlite3
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path

from .catalog import CATALOG_VERSION, DORMS, MEETINGS, default_map_points
from .errors import DomainError


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def initial_state():
    now = datetime.now(UTC)
    users = {}
    for index in range(1, 61):
        key = f"student-{index:02}"
        users[key] = {"id": key, "display_name": f"Demo Öğrenci {index:02}", "role": "student", "is_synthetic": True,
                      "membership": {"status": "APPROVED_PILOT", "method": "DEMO_TEST", "version": 1,
                                     "expires_at": (now + timedelta(days=1)).isoformat(),
                                     "verified_dorm_id": list(DORMS)[(index - 1) % 4]}}
    users["student-pending"] = {"id": "student-pending", "display_name": "Demo Başvuru", "role": "student", "is_synthetic": True,
                                "membership": {"status": "PENDING_REVIEW", "method": None, "version": 1, "expires_at": None, "verified_dorm_id": None}}
    for key, role in (("reviewer", "eligibility_reviewer"), ("operator", "dispatcher"), ("guard-01", "guard"),
                      ("guard-02", "guard"), ("presenter", "demo_admin")):
        users[key] = {"id": key, "display_name": key, "role": role, "is_synthetic": True}
    return {"run_id": secrets.token_hex(8), "revision": 1, "users": users, "intents": {}, "pods": {}, "walks": {},
            "assistances": {}, "events": [], "closed_edges": [], "idempotency": {},
            "emergency_contacts": {}, "emergencies": {}, "notifications": {},
            "map_points": default_map_points(), "catalog_version": CATALOG_VERSION}


def upgrade_catalog(state):
    """Seed missing pins, preserve custom pins and immutable walking/history records."""
    changed = False
    points = state["map_points"]
    for key, preset in default_map_points().items():
        if key not in points:
            points[key] = preset
            changed = True
        elif all(points[key].get(axis) == preset[axis] for axis in ("latitude", "longitude")):
            for field, value in preset.items():
                if field not in points[key]:
                    points[key][field] = value
                    changed = True
    if state.get("catalog_version") != CATALOG_VERSION:
        allowed = set(MEETINGS) | set(DORMS)
        for key in set(points) - allowed:
            del points[key]
        walking_pods = {w["pod_id"] for w in state["walks"].values() if w["status"] == "WALKING"}
        protected_intents = set()
        for pod in state["pods"].values():
            if pod["status"] == "WALKING" or pod["id"] in walking_pods:
                protected_intents.update(pod["intent_ids"])
            elif pod["meeting_point_id"] not in MEETINGS and pod["status"] in ("PROPOSED", "ACCEPTED"):
                pod.update(status="CANCELLED", version=pod["version"] + 1, cancellation_reason="CATALOG_CHANGED")
        for intent in state["intents"].values():
            if intent["id"] not in protected_intents and intent["meeting_point_id"] not in MEETINGS and intent["status"] in ("WAITING", "PROPOSED"):
                intent.update(status="CANCELLED", version=intent["version"] + 1, cancellation_reason="CATALOG_CHANGED")
        state["catalog_version"] = CATALOG_VERSION
        changed = True
    if changed:
        state["revision"] += 1
        state["events"].append({"id": secrets.token_hex(8), "actor_id": "system", "type": "catalog.updated",
                                "at": datetime.now(UTC).isoformat(), "revision": state["revision"]})
    return changed


def upgrade_assistance_flow(state):
    """Normalize formerly accepted tasks to dispatched, preserving their audit history."""
    changed = False
    at = datetime.now(UTC).isoformat()
    for item in state["assistances"].values():
        if item["status"] == "GUARD_ACCEPTED":
            item.update(status="ASSIGNED", version=item["version"] + 1)
            item.setdefault("assigned_at", item["created_at"])
            item["history"].append({"status": "ASSIGNED", "actor_id": "system", "at": at, "reason": "WORKFLOW_UPDATED"})
            changed = True
    if changed:
        state["revision"] += 1
        state["events"].append({"id": secrets.token_hex(8), "actor_id": "system", "type": "assistance.workflow_updated",
                                "at": at, "revision": state["revision"]})
    return changed


class Repository:
    """Single-instance demo store: serialized SQLite state, durable sessions and atomic commands."""

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        data_dir.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.db = sqlite3.connect(data_dir / "kovan.sqlite3", check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS sessions (digest TEXT PRIMARY KEY, actor_id TEXT NOT NULL, expires_at TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS access_codes (digest TEXT PRIMARY KEY, actor_id TEXT NOT NULL)")
        row = self.db.execute("SELECT payload FROM state WHERE id=1").fetchone()
        if not row:
            state = initial_state()
            self.db.execute("INSERT INTO state VALUES (1,?)", (json.dumps(state, ensure_ascii=False),))
            codes = {user_id: secrets.token_urlsafe(24) for user_id in state["users"]}
            self.db.executemany("INSERT INTO access_codes VALUES (?,?)", [(digest(code), user_id) for user_id, code in codes.items()])
            (data_dir / "demo-access.json").write_text(json.dumps(codes, ensure_ascii=False, indent=2), encoding="utf-8")
        else:
            state = json.loads(row[0])
            changed = False
            for key in ("emergency_contacts", "emergencies", "notifications", "map_points"):
                if key not in state:
                    state[key] = {}
                    changed = True
            changed = upgrade_catalog(state) or changed
            changed = upgrade_assistance_flow(state) or changed
            if changed:
                self.db.execute("UPDATE state SET payload=? WHERE id=1", (json.dumps(state, ensure_ascii=False),))
        self.db.commit()

    def read(self):
        with self.lock:
            return json.loads(self.db.execute("SELECT payload FROM state WHERE id=1").fetchone()[0])

    def mutate(self, actor_id, event_type, function):
        with self.lock:
            try:
                self.db.execute("BEGIN IMMEDIATE")
                state = json.loads(self.db.execute("SELECT payload FROM state WHERE id=1").fetchone()[0])
                result = function(state)
                state["revision"] += 1
                state["events"].append({"id": secrets.token_hex(8), "actor_id": actor_id, "type": event_type,
                                        "at": datetime.now(UTC).isoformat(), "revision": state["revision"]})
                state["events"] = state["events"][-500:]
                self.db.execute("UPDATE state SET payload=? WHERE id=1", (json.dumps(state, ensure_ascii=False),))
                self.db.commit()
                return result
            except Exception:
                self.db.rollback()
                raise

    def login(self, code):
        with self.lock:
            row = self.db.execute("SELECT actor_id FROM access_codes WHERE digest=?", (digest(code),)).fetchone()
            if not row:
                raise DomainError("INVALID_ACCESS_CODE", "Erişim kodu geçersiz.", 401)
            token = secrets.token_urlsafe(32)
            expiry = datetime.now(UTC) + timedelta(hours=8)
            self.db.execute("DELETE FROM sessions WHERE expires_at<=?", (datetime.now(UTC).isoformat(),))
            self.db.execute("INSERT INTO sessions VALUES (?,?,?)", (digest(token), row[0], expiry.isoformat()))
            self.db.commit()
            return token, self.read()["users"][row[0]]

    def actor(self, token):
        if not token:
            raise DomainError("LOGIN_REQUIRED", "Oturum açmanız gerekiyor.", 401)
        with self.lock:
            row = self.db.execute("SELECT actor_id, expires_at FROM sessions WHERE digest=?", (digest(token),)).fetchone()
            if not row or datetime.fromisoformat(row[1]) <= datetime.now(UTC):
                raise DomainError("SESSION_EXPIRED", "Oturum geçersiz veya sona ermiş.", 401)
            return self.read()["users"][row[0]]

    def close(self):
        with self.lock:
            self.db.close()

    def logout(self, token):
        with self.lock:
            self.db.execute("DELETE FROM sessions WHERE digest=?", (digest(token or ""),))
            self.db.commit()
