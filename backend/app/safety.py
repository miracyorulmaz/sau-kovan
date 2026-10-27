"""Persistent personal emergency contacts and WhatsApp outbox; DEMO never sends."""
import hashlib
import hmac
import os
import re
import secrets
import threading
from datetime import UTC, datetime

import httpx

from .errors import DomainError


def fresh_location(command):
    if command.location is None:
        return None, command.location_status
    age = (datetime.now(UTC) - command.location.captured_at).total_seconds()
    if age > 120 or age < -30:
        return None, "STALE"
    return command.location.model_dump(mode="json"), "AVAILABLE"


def queue_notification(state, user, incident_id, scope, message, location, location_status):
    # Queue and incident commit in the same SQLite transaction, including idempotent retries.
    contact = state["emergency_contacts"].get(user["id"])
    mode = "WHATSAPP" if os.getenv("KOVAN_NOTIFICATION_MODE", "DEMO").upper() == "WHATSAPP" else "DEMO"
    status = "QUEUED" if contact and contact["consent_confirmed"] and contact["notify_on_help"] else "NO_CONTACT"
    if contact and not contact["notify_on_help"]:
        status = "DISABLED"
    item = {"id": secrets.token_hex(8), "owner_id": user["id"], "incident_id": incident_id, "scope": scope,
            "status": status, "mode": mode, "created_at": datetime.now(UTC).isoformat(), "version": 1,
            "recipient_phone": contact["phone_e164"] if contact else None, "recipient_name": contact["name"] if contact else None,
            "student_name": user["display_name"], "message": message, "location": location,
            "location_status": location_status, "provider_message_id": None, "delivery_events": []}
    state["notifications"][item["id"]] = item
    return item


class SafetyService:
    def __init__(self, repo, transport=None):
        self.repo, self.transport = repo, transport
        self.processing = threading.Lock()
        self.token = os.getenv("KOVAN_WHATSAPP_TOKEN", "")
        self.phone_id = os.getenv("KOVAN_WHATSAPP_PHONE_NUMBER_ID", "")
        self.api_version = os.getenv("KOVAN_WHATSAPP_API_VERSION", "")
        self.template = os.getenv("KOVAN_WHATSAPP_TEMPLATE_NAME", "")
        self.language = os.getenv("KOVAN_WHATSAPP_TEMPLATE_LANGUAGE", "tr")
        self.app_secret = os.getenv("KOVAN_WHATSAPP_APP_SECRET", "")
        self.verify_token = os.getenv("KOVAN_WHATSAPP_VERIFY_TOKEN", "")

    def config(self):
        ready = bool(self.token and re.fullmatch(r"\d+", self.phone_id) and re.fullmatch(r"v\d+\.\d+", self.api_version) and re.fullmatch(r"[a-z0-9_]+", self.template))
        return {"mode": "WHATSAPP" if os.getenv("KOVAN_NOTIFICATION_MODE", "DEMO").upper() == "WHATSAPP" else "DEMO",
                "whatsapp_configured": ready, "delivery_webhook_configured": bool(self.app_secret and self.verify_token)}

    @staticmethod
    def public_notification(item):
        return {key: value for key, value in item.items() if key != "recipient_phone"} | {
            "recipient_masked": ("••••" + item["recipient_phone"][-4:]) if item.get("recipient_phone") else None}

    def for_user(self, user):
        state = self.repo.read()
        return {"emergency_contact": state["emergency_contacts"].get(user["id"]),
                "emergencies": [item for item in state["emergencies"].values() if item["owner_id"] == user["id"]],
                "notifications": [self.public_notification(item) for item in state["notifications"].values() if item["owner_id"] == user["id"]]}

    def save_contact(self, actor, command):
        if actor["role"] != "student":
            raise DomainError("FORBIDDEN", "Yalnızca kendi öğrenci hesabınızın kişisini kaydedebilirsiniz.", 403)
        if not command.consent_confirmed:
            raise DomainError("CONTACT_CONSENT_REQUIRED", "Bildirim alacak kişinin bu kullanımdan haberdar olduğunu teyit edin.", 422)
        def change(state):
            previous = state["emergency_contacts"].get(actor["id"], {})
            item = {**command.model_dump(), "owner_id": actor["id"], "channel": "WHATSAPP", "version": previous.get("version", 0) + 1}
            state["emergency_contacts"][actor["id"]] = item
            return item
        return self.repo.mutate(actor["id"], "emergency_contact.saved", change)

    def delete_contact(self, actor):
        def change(state):
            state["emergency_contacts"].pop(actor["id"], None)
            return {"deleted": True}
        return self.repo.mutate(actor["id"], "emergency_contact.deleted", change)

    def create_emergency(self, actor, command):
        def change(state):
            key = "emergency:" + actor["id"] + ":" + command.idempotency_key
            if key in state["idempotency"]:
                return state["emergencies"][state["idempotency"][key]]
            recent = [item for item in state["emergencies"].values() if item["owner_id"] == actor["id"] and (datetime.now(UTC) - datetime.fromisoformat(item["created_at"])).total_seconds() < 60]
            if len(recent) >= 5:
                raise DomainError("EMERGENCY_RATE_LIMIT", "Açık talebinizi takip edin; tekrar gönderim sınırına ulaşıldı.", 429)
            location, location_status = fresh_location(command)
            item = {"id": secrets.token_hex(8), "owner_id": actor["id"], "scope": "OUTSIDE_CAMPUS", "status": "CREATED",
                    "version": 1, "message": command.message, "created_at": datetime.now(UTC).isoformat(),
                    "location": location, "location_status": location_status}
            state["emergencies"][item["id"]] = item
            state["idempotency"][key] = item["id"]
            notification = queue_notification(state, actor, item["id"], "OUTSIDE_CAMPUS", command.message, location, location_status)
            item["notification_id"] = notification["id"]
            return item
        return self.repo.mutate(actor["id"], "personal_emergency.created", change)

    def resolve_emergency(self, actor, item_id, version):
        def change(state):
            item = state["emergencies"].get(item_id)
            if not item or item["owner_id"] != actor["id"]:
                raise DomainError("FORBIDDEN", "Yalnızca kendi talebinizi kapatabilirsiniz.", 403)
            if item["version"] != version:
                raise DomainError("VERSION_CONFLICT", "Talep değişti; güncel durumu alın.", 409)
            item.update(status="RESOLVED", version=item["version"] + 1)
            # A resolved incident must not produce a delayed initial alert.
            job = state["notifications"].get(item["notification_id"])
            if job and job["status"] == "QUEUED":
                job.update(status="CANCELLED", version=job["version"] + 1)
            return item
        return self.repo.mutate(actor["id"], "personal_emergency.resolved", change)

    def recover_sending(self):
        if not any(item["status"] == "SENDING" for item in self.repo.read()["notifications"].values()):
            return
        def change(state):
            for item in state["notifications"].values():
                if item["status"] == "SENDING":
                    item.update(status="DELIVERY_UNKNOWN", version=item["version"] + 1)
        self.repo.mutate("system", "notification.recovered_unknown", change)

    def process_pending(self):
        if not self.processing.acquire(blocking=False):
            return
        try:
            pending = [item for item in self.repo.read()["notifications"].values() if item["status"] == "QUEUED"][:5]
            for job in pending:
                def claim(state):
                    item = state["notifications"][job["id"]]
                    if item["status"] != "QUEUED":
                        return None
                    contact = state["emergency_contacts"].get(item["owner_id"])
                    if not contact or not contact["consent_confirmed"] or not contact["notify_on_help"] or contact["phone_e164"] != item["recipient_phone"]:
                        item.update(status="CANCELLED", version=item["version"] + 1)
                        return None
                    item.update(status="SENDING", version=item["version"] + 1)
                    return item.copy()
                item = self.repo.mutate("system", "notification.claimed", claim)
                if not item:
                    continue
                result = self.deliver(item)
                def finish(state):
                    current = state["notifications"][item["id"]]
                    current.update(**result, version=current["version"] + 1)
                self.repo.mutate("system", "notification.processed", finish)
        finally:
            self.processing.release()

    def wait_idle(self):
        with self.processing:
            pass

    @staticmethod
    def location_text(item):
        location = item.get("location")
        if not location:
            return "Konum alınamadı veya paylaşılmadı."
        prefix = "ÖRNEK KONUM: " if location["source"] == "DEMO" else ""
        return f"{prefix}https://www.google.com/maps/search/?api=1&query={location['latitude']},{location['longitude']} (yaklaşık doğruluk {round(location['accuracy_m'])} m; {location['captured_at']})"

    def deliver(self, item):
        if item["mode"] == "DEMO":
            return {"status": "SIMULATED", "preview_text": f"DEMO — {item['student_name']}: {item['message']} {self.location_text(item)}", "network_sent": False}
        if not self.config()["whatsapp_configured"]:
            return {"status": "NOT_CONFIGURED", "network_sent": False}
        if item.get("location") and item["location"].get("source") == "DEMO":
            return {"status": "FAILED", "failure_code": "DEMO_LOCATION_NOT_SENDABLE", "network_sent": False}
        parameters = [item["student_name"], item["message"], self.location_text(item), item["created_at"]]
        payload = {"messaging_product": "whatsapp", "to": item["recipient_phone"].lstrip("+"), "type": "template",
                   "template": {"name": self.template, "language": {"code": self.language},
                                "components": [{"type": "body", "parameters": [{"type": "text", "text": value} for value in parameters]}]}}
        try:
            with httpx.Client(timeout=8, transport=self.transport) as client:
                response = client.post(f"https://graph.facebook.com/{self.api_version}/{self.phone_id}/messages",
                                       headers={"Authorization": f"Bearer {self.token}"}, json=payload)
            if response.status_code >= 400:
                return {"status": "FAILED", "failure_code": "PROVIDER_RATE_LIMIT" if response.status_code == 429 else "PROVIDER_REJECTED", "network_sent": True}
            message_id = response.json()["messages"][0]["id"]
            return {"status": "PROVIDER_ACCEPTED", "provider_message_id": message_id, "network_sent": True}
        except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
            return {"status": "DELIVERY_UNKNOWN", "failure_code": "RESPONSE_NOT_CONFIRMED", "network_sent": True}

    def verify_signature(self, body, signature):
        if not self.app_secret:
            return False
        expected = "sha256=" + hmac.new(self.app_secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature or "")

    def delivery_webhook(self, payload):
        statuses = [status for entry in payload.get("entry", []) for change in entry.get("changes", [])
                    for status in change.get("value", {}).get("statuses", [])]
        known = {item["provider_message_id"] for item in self.repo.read()["notifications"].values() if item.get("provider_message_id")}
        statuses = [status for status in statuses if status.get("id") in known and status.get("status") in {"sent", "delivered", "read", "failed"}]
        if not statuses:
            return
        def change(state):
            rank = {"PROVIDER_ACCEPTED": 0, "SENT": 1, "DELIVERED": 2, "READ": 3}
            for status in statuses:
                item = next(item for item in state["notifications"].values() if item.get("provider_message_id") == status["id"])
                target = status["status"].upper()
                event = {"status": target, "timestamp": status.get("timestamp")}
                if event in item["delivery_events"]:
                    continue
                item["delivery_events"].append(event)
                if target == "FAILED" and item["status"] not in {"DELIVERED", "READ"} or rank.get(target, -1) > rank.get(item["status"], -1):
                    item["status"] = target
                item["version"] += 1
        self.repo.mutate("whatsapp", "notification.delivery_updated", change)
