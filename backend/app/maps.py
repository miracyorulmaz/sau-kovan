"""Google walking previews. Missing credentials/confirmed pins never produce invented routes."""
import os
import secrets
import threading
import time
from collections import defaultdict, deque

import httpx

from .catalog import DORMS, MEETINGS
from .errors import DomainError

WALK_WARNING = "Google yürüyüş rotaları beta aşamasındadır; kaldırım veya yaya yolları eksik olabilir. Rota güvenlik değerlendirmesi değildir."


class MapsService:
    def __init__(self, repo, transport=None):
        self.repo, self.transport = repo, transport
        self.api_key = os.getenv("KOVAN_GOOGLE_MAPS_API_KEY", "")
        self.browser_key = os.getenv("KOVAN_GOOGLE_MAPS_BROWSER_KEY", "")
        self.cache, self.previews = {}, {}
        self.attempts = defaultdict(deque)
        self.lock = threading.RLock()

    def config(self):
        return {"routes_configured": bool(self.api_key), "browser_configured": bool(self.browser_key),
                "browser_key": self.browser_key, "points": self.repo.read()["map_points"], "warning": WALK_WARNING}

    def set_point(self, actor, point_id, command):
        if point_id not in MEETINGS and point_id not in DORMS:
            raise DomainError("LOCATION_NOT_ALLOWED", "Bu nokta pilot listesinde değil.", 422)
        if not command.confirmed:
            raise DomainError("POINT_CONFIRMATION_REQUIRED", "Noktanın doğru giriş olduğunu teyit edin.", 422)
        def change(state):
            point = {**command.model_dump(), "confirmed_by": actor["id"]}
            state["map_points"][point_id] = point
            return point
        return self.repo.mutate(actor["id"], "maps.point_confirmed", change)

    def preview(self, actor, meeting_id, dorm_id):
        if meeting_id not in MEETINGS or dorm_id not in DORMS:
            raise DomainError("LOCATION_NOT_ALLOWED", "Pilot listesinden nokta ve yurt seçin.", 422)
        if not self.api_key or not self.browser_key:
            raise DomainError("MAPS_NOT_CONFIGURED", "Google Maps için sunucu ve tarayıcı anahtarlarını yerel ayarlara ekleyin.", 503)
        points = self.repo.read()["map_points"]
        if not all(points.get(key, {}).get("confirmed") for key in (meeting_id, dorm_id)):
            raise DomainError("MAP_POINTS_REQUIRED", "Buluşma noktası ve yurt girişini demo panelinden haritada teyit edin.", 422)
        origin, destination = points[meeting_id], points[dorm_id]
        pair = (meeting_id, dorm_id, origin["latitude"], origin["longitude"], destination["latitude"], destination["longitude"])
        with self.lock:
            now = time.monotonic()
            self.cache = {key: item for key, item in self.cache.items() if item[0] > now}
            self.previews = {key: item for key, item in self.previews.items() if item[0] > now}
            cached = self.cache.get(pair)
            if cached:
                result = cached[1]
            else:
                attempts = self.attempts[actor["id"]]
                while attempts and attempts[0] < now - 60:
                    attempts.popleft()
                if len(attempts) >= 10:
                    raise DomainError("MAPS_RATE_LIMIT", "Rota sorgusu sınırına ulaşıldı; bir dakika sonra deneyin.", 429)
                attempts.append(now)
                waypoint = lambda point: {"location": {"latLng": {"latitude": point["latitude"], "longitude": point["longitude"]}}}
                try:
                    with httpx.Client(timeout=8, transport=self.transport) as client:
                        response = client.post("https://routes.googleapis.com/directions/v2:computeRoutes",
                            headers={"X-Goog-Api-Key": self.api_key, "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.warnings"},
                            json={"origin": waypoint(origin), "destination": waypoint(destination), "travelMode": "WALK", "languageCode": "tr-TR", "units": "METRIC"})
                    response.raise_for_status()
                    route = response.json()["routes"][0]
                    result = {"source": "GOOGLE_MAPS", "label": "GOOGLE_MAPS_PREVIEW", "meeting_point_id": meeting_id,
                              "destination_dorm_id": dorm_id, "duration_seconds": round(float(route["duration"].removesuffix("s"))),
                              "distance_m": route["distanceMeters"], "encoded_polyline": route["polyline"]["encodedPolyline"],
                              "origin": {key: origin[key] for key in ("latitude", "longitude")},
                              "destination": {key: destination[key] for key in ("latitude", "longitude")},
                              "warnings": [WALK_WARNING, *route.get("warnings", [])]}
                    if result["duration_seconds"] <= 0 or not result["encoded_polyline"]:
                        raise ValueError()
                except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
                    raise DomainError("MAPS_UNAVAILABLE", "Google rota yanıtı alınamadı. Anahtar, API izinleri ve harita noktalarını kontrol edin.", 502) from None
                self.cache[pair] = (time.monotonic() + 300, result)
            preview_id = secrets.token_urlsafe(18)
            self.previews[preview_id] = (time.monotonic() + 300, actor["id"], pair, result)
            return {**result, "preview_id": preview_id}

    def route_for_walk(self, actor, preview_id, pod):
        with self.lock:
            entry = self.previews.get(preview_id)
            if not entry or entry[0] <= time.monotonic() or entry[1] != actor["id"] or entry[2][:2] != (pod["meeting_point_id"], pod["destination_dorm_id"]):
                raise DomainError("MAPS_PREVIEW_EXPIRED", "Rota önizlemesini bu hesabın seçili yolculuğu için yenileyin.", 409)
            points = self.repo.read()["map_points"]
            origin, destination = points.get(entry[2][0], {}), points.get(entry[2][1], {})
            if tuple(point.get(axis) for point in (origin, destination) for axis in ("latitude", "longitude")) != entry[2][2:]:
                raise DomainError("MAPS_PREVIEW_EXPIRED", "Harita noktaları değişti; rota önizlemesini yenileyin.", 409)
            return entry[3].copy()
