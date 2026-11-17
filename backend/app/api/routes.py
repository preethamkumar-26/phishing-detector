from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool

from app.schemas.scan import EmailScanRequest, ScanResponse
from app.services.model_service import model_service

router = APIRouter()

@router.post("/analyze", response_model=ScanResponse)
@router.post("/scan", response_model=ScanResponse)
async def analyze_email(payload: EmailScanRequest):
    if not model_service.is_ready:
        raise HTTPException(status_code=503, detail="Model weights are not loaded.")

    result = await run_in_threadpool(
        model_service.predict,
        text=payload.content,
        subject=payload.subject,
        sender=payload.sender,
        reply_to=payload.reply_to,
        urls=payload.urls,
        headers=payload.headers,
    )
    return ScanResponse.model_validate(result)

@router.get("/models")
async def get_model_status():
    return {
        "success": True,
        "is_ready": model_service.is_ready,
        "engine_type": model_service.engine_type,
        "model_name": model_service.model_name,
        "device": str(model_service.device)
    }