from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from starlette.concurrency import run_in_threadpool

from app.auth import AuthenticatedUser, get_current_user, get_user_supabase_client
from app.core.logging import logger
from app.schemas.evaluation import EvaluationMetricsResponse
from app.schemas.scan import EmailScanRequest, ScanResponse
from app.services.evaluation_service import EvaluationArtifactError, evaluation_service
from app.services.model_service import model_service

router = APIRouter()

@router.get("/health")
async def api_health():
    if not model_service.is_ready:
        raise HTTPException(status_code=503, detail="Model is not ready.")
    return {"status": "healthy", "model_loaded": True}


@router.post("/analyze", response_model=ScanResponse)
@router.post("/scan", response_model=ScanResponse)
async def analyze_email(
    payload: EmailScanRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
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

    # Build scan record scoped to the verified authenticated user
    # user_id is derived strictly from the validated Supabase Auth identity
    verified_user_id = user.id
    scan_id = result.get("scan_id")
    p_phish = result.get("p_phish", 0.0)
    risk_score = result.get("risk_score", 0.0)
    is_phishing = result.get("is_phishing", False)
    verdict = result.get("verdict", "Safe")

    decision = "PHISHING" if is_phishing else ("SUSPICIOUS" if verdict.lower() == "suspicious" else "SAFE")
    risk = "High" if is_phishing else ("Medium" if risk_score >= 40 else "Low")

    headers_str = ""
    if isinstance(payload.headers, dict):
        headers_str = "\n".join(f"{k}: {v}" for k, v in payload.headers.items())
    elif isinstance(payload.headers, str):
        headers_str = payload.headers

    urls_list = []
    if isinstance(payload.urls, list):
        urls_list = payload.urls
    elif isinstance(payload.urls, str):
        urls_list = [u.strip() for u in payload.urls.split() if u.strip()]

    now_iso = datetime.now(timezone.utc).isoformat()

    scan_record = {
        "id": scan_id,
        "user_id": str(verified_user_id),
        "created_at": now_iso,
        "subject": payload.subject or "Untitled Email",
        "from_email": payload.sender or "",
        "reply_to": payload.reply_to or "",
        "body": payload.content or "",
        "headers": headers_str,
        "urls": urls_list,
        "decision": decision,
        "risk": risk,
        "risk_score": risk_score,
        "p_value": p_phish,
        "threshold": 0.5,
        "model_version": "PAHF-Net",
        "indicators": result.get("indicators", []),
        "modalities": result.get("explainability", {}).get("feature_contributions", {}),
        "gate_weights": result.get("explainability", {}).get("feature_contributions", {}),
        "raw_payload": result,
    }

    # Persist via user-scoped Supabase client so Postgres RLS enforces user ownership
    try:
        user_client = get_user_supabase_client(user.token)
        user_client.table("scans").upsert(scan_record, on_conflict="id").execute()
    except Exception as exc:
        logger.warning(f"Could not persist scan record to Supabase public.scans: {exc}")

    return ScanResponse.model_validate(result)

@router.get("/scans")
async def list_user_scans(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Fetch scans belonging strictly to the authenticated user.
    Uses the user's JWT so Postgres RLS restricts rows to auth.uid() = user_id.
    """
    try:
        user_client = get_user_supabase_client(user.token)
        response = user_client.table("scans").select("*").order("created_at", desc=True).limit(100).execute()
        return {"success": True, "scans": response.data or []}
    except Exception as exc:
        logger.error(f"Failed to query scans for user {user.id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to query scans: {str(exc)}")

@router.get("/scans/{scan_id}")
async def get_user_scan(scan_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Retrieve a specific scan record for the authenticated user.
    """
    try:
        user_client = get_user_supabase_client(user.token)
        response = user_client.table("scans").select("*").eq("id", scan_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Scan record not found or access denied.")
        return {"success": True, "scan": response.data[0]}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to query scan {scan_id} for user {user.id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to query scan: {str(exc)}")

@router.delete("/scans/{scan_id}")
async def delete_user_scan(scan_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Delete a specific scan record belonging to the authenticated user.
    """
    try:
        user_client = get_user_supabase_client(user.token)
        user_client.table("scans").delete().eq("id", scan_id).execute()
        return {"success": True, "deleted": scan_id}
    except Exception as exc:
        logger.error(f"Failed to delete scan {scan_id} for user {user.id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to delete scan: {str(exc)}")

@router.get("/models")
async def get_model_status():
    return {
        "success": True,
        "is_ready": model_service.is_ready,
        "engine_type": model_service.engine_type,
        "model_name": model_service.model_name,
        "device": str(model_service.device)
    }


@router.get("/evaluation-metrics", response_model=EvaluationMetricsResponse)
async def get_evaluation_metrics():
    try:
        return evaluation_service.get_metrics()
    except EvaluationArtifactError as exc:
        raise HTTPException(
            status_code=500,
            detail="The evaluation metrics artifact is invalid or unreadable.",
        ) from exc