from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import json
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from time import perf_counter
from collections import deque
from threading import Lock

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import register_exception_handlers
from app.services.model_service import model_service
from app.api.routes import router as api_router


def _detect_host_port() -> tuple[str, int]:
    """Detect the active Uvicorn host and port from CLI args or environment."""
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8000"))

    args = sys.argv
    for i, arg in enumerate(args):
        if arg == "--host" and i + 1 < len(args):
            host = args[i + 1]
        elif arg.startswith("--host="):
            host = arg.split("=", 1)[1]
        elif arg == "--port" and i + 1 < len(args):
            port = int(args[i + 1])
        elif arg.startswith("--port="):
            port = int(arg.split("=", 1)[1])

    # Browsers cannot connect to 0.0.0.0 directly; advertise 127.0.0.1 instead
    if host in ("0.0.0.0", "::"):
        host = "127.0.0.1"

    return host, port


def _resolve_frontend_public_dir() -> Path:
    """Locate the Next.js public/ folder automatically."""
    env_dir = os.getenv("FRONTEND_PUBLIC_DIR")
    if env_dir:
        path = Path(env_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    # backend/app/main.py -> parents[1] = backend/, parents[2] = repo root
    repo_root = Path(__file__).resolve().parents[2]
    candidates = [
        repo_root / "public",
        repo_root / "frontend" / "public",
        repo_root / "phishintel-ai" / "public",
        repo_root.parent / "phishintel-ai" / "public",
    ]
    for candidate in candidates:
        if candidate.exists() and candidate.is_dir():
            return candidate

    fallback = repo_root / "public"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def _write_runtime_backend_config() -> dict:
    host, port = _detect_host_port()
    base_url = f"http://{host}:{port}"
    api_prefix = settings.API_V1_STR.rstrip("/")
    payload = {
        "base_url": base_url,
        "analyze_endpoint": f"{base_url}{api_prefix}/analyze",
        "health_endpoint": f"{base_url}/health",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        public_dir = _resolve_frontend_public_dir()
        config_file = public_dir / "runtime-backend.json"
        config_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        logger.info(
            f"Auto-registered backend endpoint -> {config_file} ({payload['analyze_endpoint']})"
        )
    except Exception as exc:
        logger.warning(f"Could not write runtime-backend.json: {exc}")

    return payload


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    model_service.load_model()
    logger.info(
        f"Model ready: engine='{model_service.engine_type}', "
        f"name='{model_service.model_name}', device='{model_service.device}'"
    )
    app.state.runtime_config = _write_runtime_backend_config()
    yield
    logger.info("Shutting down PhishIntel Backend...")
    if torch_cuda_available():
        import torch
        torch.cuda.empty_cache()


def torch_cuda_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Explainable AI Phishing Detection & Multi-Signal Inference Engine",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


class SecurityAndProcessMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._buckets: dict[str, deque[float]] = {}
        self._lock = Lock()

    async def dispatch(self, request: Request, call_next):
        if int(request.headers.get("content-length", "0") or "0") > settings.MAX_REQUEST_BYTES:
            return JSONResponse(
                status_code=413,
                content={"success": False, "error": "PayloadTooLarge", "detail": "Request payload exceeds the 5 MB limit."},
            )

        path = request.url.path
        if request.method == "POST" and path.endswith("/analyze"):
            client_ip = request.client.host if request.client else "unknown"
            now = perf_counter()
            with self._lock:
                bucket = self._buckets.setdefault(client_ip, deque())
                cutoff = now - settings.RATE_LIMIT_WINDOW_SECONDS
                while bucket and bucket[0] <= cutoff:
                    bucket.popleft()
                if len(bucket) >= settings.RATE_LIMIT_REQUESTS:
                    return JSONResponse(
                        status_code=429,
                        content={"success": False, "error": "RateLimitExceeded", "detail": "Too many analysis requests. Retry later."},
                    )
                bucket.append(now)

        started = perf_counter()
        response = await call_next(request)
        elapsed_ms = (perf_counter() - started) * 1000
        if path.endswith("/analyze"):
            response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return response


app.add_middleware(SecurityAndProcessMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Mount under both /api/v1 and root /api for seamless frontend compatibility
app.include_router(api_router, prefix=settings.API_V1_STR, tags=["Phishing Inference"])
app.include_router(api_router, prefix="/api", tags=["Phishing Inference (Compat)"])


@app.get("/", tags=["Root"])
async def root():
    runtime_config = getattr(app.state, "runtime_config", {})
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "model_engine": model_service.engine_type,
        "analyze_endpoint": runtime_config.get("analyze_endpoint"),
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_url": "/healthz",
    }


@app.get("/health", tags=["System"])
@app.get("/healthz", tags=["System"])
async def root_healthz():
    runtime_config = getattr(app.state, "runtime_config", {})
    return {
        "status": "healthy" if model_service.is_ready else "initializing",
        "model_loaded": model_service.is_ready,
        "engine": model_service.engine_type,
        "model_name": model_service.model_name,
        "analyze_endpoint": runtime_config.get("analyze_endpoint"),
    }