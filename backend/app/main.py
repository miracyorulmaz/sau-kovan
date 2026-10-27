import asyncio
import contextlib
import logging
import os
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .engines.routing import find_route
from .errors import DomainError
from .models import (Assignment, AssistanceCreate, DemoReset, EdgeOverride, IntentCreate,
                     Login, Resolution, Review, VersionCommand, WalkStart)
from .repository import Repository
from .service import Service
from .settings import load_local_environment


def create_app(data_dir=None, allowed_origins=None, secure_cookie=None):
    root = Path(__file__).resolve().parents[2]
    load_local_environment(root)
    folder = Path(data_dir) if data_dir is not None else root / os.getenv("KOVAN_DATA_DIR", ".local")
    origins = {value.strip() for value in (allowed_origins or os.getenv("KOVAN_ALLOWED_ORIGINS", "http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:5173,http://localhost:5173").split(",")) if value.strip()}
    secure = secure_cookie if secure_cookie is not None else os.getenv("KOVAN_COOKIE_SECURE", "false").lower() == "true"
    attempts = defaultdict(deque)

    @asynccontextmanager
    async def lifespan(app):
        repo = Repository(folder)
        app.state.repo, app.state.service = repo, Service(repo)

        async def monitor():
            while True:
                await asyncio.sleep(1)
                try:
                    app.state.service.tick()
                except Exception:
                    logging.getLogger("kovan").exception("Demo deadline monitor failed")

        task = asyncio.create_task(monitor())
        try:
            yield
        finally:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
            repo.close()

    app = FastAPI(title="Kovan Pilot API", version="0.1.0", lifespan=lifespan,
                  description="Sentetik gösterim backend'i. Gerçek güvenlik ve e-Devlet bağlantısı yok.")

    @app.middleware("http")
    async def origin_and_headers(request: Request, call_next):
        origin = request.headers.get("origin")
        if request.method not in ("GET", "HEAD", "OPTIONS") and origin and origin not in origins:
            return JSONResponse({"code": "ORIGIN_NOT_ALLOWED", "message": "Bu kaynaktan işlem kabul edilmiyor."}, status_code=403)
        length = request.headers.get("content-length", "0")
        if not length.isdigit() or int(length) > 65536:
            return JSONResponse({"code": "BODY_TOO_LARGE", "message": "İstek boyutu sınırı aşıldı."}, status_code=413)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    @app.exception_handler(DomainError)
    async def domain_error(request, error):
        return JSONResponse({"code": error.code, "message": error.message, "details": {}}, status_code=error.status)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        # Never echo request values: an invalid login or uploaded identity material must not leak back.
        fields = [{"field": ".".join(str(part) for part in item["loc"]), "type": item["type"]} for item in error.errors()]
        return JSONResponse({"code": "VALIDATION_ERROR", "message": "İstek alanlarını kontrol edin.", "details": fields}, status_code=422)

    def service(request: Request):
        return request.app.state.service

    def actor(request: Request):
        return request.app.state.repo.actor(request.cookies.get("kovan_session"))

    @app.get("/api/health")
    def health():
        return {"status": "ok", "environment": "demo", "real_security_connected": False}

    @app.post("/api/auth/demo-session")
    def login(command: Login, request: Request, response: Response):
        address = request.client.host if request.client else "unknown"
        events = attempts[address]
        cutoff = time.monotonic() - 60
        while events and events[0] < cutoff:
            events.popleft()
        if len(events) >= 10:
            raise DomainError("LOGIN_RATE_LIMIT", "Çok fazla deneme; biraz sonra tekrar deneyin.", 429)
        # Only failed attempts consume the limit, permitting legitimate multi-user local demos.
        try:
            token, user = request.app.state.repo.login(command.access_code)
        except DomainError:
            events.append(time.monotonic())
            raise
        response.set_cookie("kovan_session", token, httponly=True, secure=secure, samesite="lax", max_age=8 * 3600)
        return request.app.state.service.envelope({"user": user})

    @app.post("/api/auth/logout")
    def logout(request: Request, response: Response, user=Depends(actor)):
        request.app.state.repo.logout(request.cookies.get("kovan_session"))
        response.delete_cookie("kovan_session")
        return {"logged_out": True}

    @app.get("/api/bootstrap")
    def bootstrap(user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.bootstrap(user))

    @app.get("/api/state")
    def state(user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.state_for(user))

    @app.post("/api/memberships/{user_id}/review")
    def review(user_id: str, command: Review, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.review(user, user_id, command))

    @app.post("/api/intents", status_code=201)
    def create_intent(command: IntentCreate, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.create_intent(user, command))

    @app.post("/api/intents/{intent_id}/cancel")
    def cancel_intent(intent_id: str, command: VersionCommand, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.cancel_intent(user, intent_id, command.expected_version))

    @app.post("/api/matches/preview")
    def match(user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.match(user))

    @app.post("/api/pods/{pod_id}/accept")
    def accept_pod(pod_id: str, command: VersionCommand, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.pod_action(user, pod_id, command.expected_version))

    @app.post("/api/pods/{pod_id}/decline")
    def decline_pod(pod_id: str, command: VersionCommand, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.pod_action(user, pod_id, command.expected_version, accept=False))

    @app.get("/api/routes")
    def routes(meeting_point_id: str, destination_dorm_id: str, user=Depends(actor), svc=Depends(service)):
        closed = svc.repo.read()["closed_edges"]
        return svc.envelope({"shortest": find_route(meeting_point_id, destination_dorm_id, closed, False),
                             "lighting_first": find_route(meeting_point_id, destination_dorm_id, closed, True)})

    @app.post("/api/walks/start", status_code=201)
    def start_walk(command: WalkStart, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.start_walk(user, command))

    @app.post("/api/walks/{walk_id}/complete")
    def complete_walk(walk_id: str, command: VersionCommand, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.complete_walk(user, walk_id, command.expected_version))

    @app.post("/api/assistances", status_code=201)
    def request_help(command: AssistanceCreate, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.request_help(user, command))

    def transition_handler(action, body_type):
        # Concrete annotation makes each action independently visible and validated in OpenAPI.
        def handler(assistance_id: str, command: body_type, user=Depends(actor), svc=Depends(service)):
            return svc.envelope(svc.assistance_action(user, assistance_id, action, command))
        handler.__name__ = "assistance_" + action.replace("-", "_")
        return handler

    for action, body in (("operator-ack", VersionCommand), ("assign", Assignment), ("guard-accept", VersionCommand),
                         ("arrive", VersionCommand), ("resolve", Resolution)):
        app.post("/api/assistances/{assistance_id}/" + action)(transition_handler(action, body))

    @app.post("/api/demo/reset")
    def reset(command: DemoReset, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.reset(user, command.student_count))

    @app.post("/api/demo/edges/{edge_id}")
    def edge_override(edge_id: str, command: EdgeOverride, user=Depends(actor), svc=Depends(service)):
        return svc.envelope(svc.toggle_edge(user, edge_id, command.closed))

    @app.websocket("/api/events")
    async def events(websocket: WebSocket):
        if websocket.headers.get("origin") not in origins:
            await websocket.close(code=1008)
            return
        try:
            request_actor = websocket.app.state.repo.actor(websocket.cookies.get("kovan_session"))
        except DomainError:
            await websocket.close(code=1008)
            return
        await websocket.accept()
        last_revision = -1
        try:
            while True:
                # Re-check expiry on every tick; do not retain revoked login sessions forever.
                current_actor = websocket.app.state.repo.actor(websocket.cookies.get("kovan_session"))
                svc = websocket.app.state.service
                envelope = svc.envelope(svc.state_for(current_actor))
                if envelope["revision"] != last_revision:
                    await websocket.send_json({"type": "state.snapshot", **envelope})
                    last_revision = envelope["revision"]
                try:
                    await asyncio.wait_for(websocket.receive_text(), timeout=0.5)
                except TimeoutError:
                    pass
        except (WebSocketDisconnect, DomainError):
            with contextlib.suppress(RuntimeError):
                await websocket.close(code=1008)

    return app


app = create_app()
