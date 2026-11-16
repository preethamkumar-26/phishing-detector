from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import register_exception_handlers
from app.services.model_service import model_service
from app.api.routes import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    model_service.load_model()
    logger.info(
        f"Model ready: engine='{model_service.engine_type}', "
        f"name='{model_service.model_name}', device='{model_service.device}'"
    )
    yield
    logger.info("Shutting down PhishGuard AI Backend...")
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "model_engine": model_service.engine_type,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_url": "/healthz",
    }


@app.get("/healthz", tags=["System"])
async def root_healthz():
    return {
        "status": "healthy" if model_service.is_ready else "initializing",
        "model_loaded": model_service.is_ready,
        "engine": model_service.engine_type,
        "model_name": model_service.model_name,
    }