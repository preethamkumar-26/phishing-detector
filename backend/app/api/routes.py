import asyncio
from fastapi import APIRouter
from app.schemas.scan import EmailScanRequest, EmailScanResponse
from app.services.model_service import model_service

router = APIRouter()


@router.post("/analyze", response_model=EmailScanResponse, summary="Analyze Email for Phishing")
@router.post("/scan", response_model=EmailScanResponse, summary="Alias for Email Scan")
async def analyze_email_endpoint(payload: EmailScanRequest) -> EmailScanResponse:
    result = await asyncio.to_thread(
        model_service.predict,
        content=payload.content or "",
        subject=payload.subject or "",
        sender=payload.sender or "",
        headers=payload.headers,
    )
    return EmailScanResponse(**result)


@router.get("/models", summary="Get Active Model Metadata")
async def get_model_status():
    return {
        "success": True,
        "is_ready": model_service.is_ready,
        "engine_type": model_service.engine_type,
        "model_name": model_service.model_name,
        "device": model_service.device,
    }


@router.get("/healthz", summary="Service Health Check")
async def api_health_check():
    return {
        "status": "healthy" if model_service.is_ready else "initializing",
        "model_loaded": model_service.is_ready,
        "engine": model_service.engine_type,
    }