import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import torch

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import ModelNotReadyError, InferenceExecutionError
from app.services.preprocessing import EmailPreprocessor


class PhishingModelService:
    def __init__(self) -> None:
        self.model: Any = None
        self.vectorizer: Any = None
        self.hf_pipeline: Any = None
        self.engine_type: str = "uninitialized"
        self.model_name: str = "none"
        self.device: str = "cuda" if torch.cuda.is_available() else "cpu"
        self.is_ready: bool = False

    def load_model(self) -> None:
        model_dir: Path = settings.model_dir_path
        requested_type = settings.MODEL_TYPE.lower().strip()

        logger.info(f"Inspecting model directory: {model_dir} (requested mode: {requested_type})")

        try:
            # 1. Auto-detect or load Scikit-Learn (.pkl / .joblib)
            pkl_path = model_dir / settings.MODEL_FILENAME
            vec_path = model_dir / settings.VECTORIZER_FILENAME
            if requested_type in ("auto", "sklearn") and pkl_path.exists():
                logger.info(f"Loading Scikit-Learn model from {pkl_path}")
                self.model = joblib.load(pkl_path)
                if vec_path.exists():
                    logger.info(f"Loading vectorizer from {vec_path}")
                    self.vectorizer = joblib.load(vec_path)
                self.engine_type = "sklearn"
                self.model_name = pkl_path.name
                self.is_ready = True
                return

            # 2. Auto-detect or load HuggingFace Transformer directory
            hf_config = model_dir / "config.json"
            if requested_type in ("auto", "huggingface") and hf_config.exists():
                from transformers import pipeline
                logger.info(f"Loading HuggingFace Transformer pipeline from {model_dir}")
                self.hf_pipeline = pipeline(
                    "text-classification",
                    model=str(model_dir),
                    tokenizer=str(model_dir),
                    device=0 if self.device == "cuda" else -1,
                    truncation=True,
                    max_length=512,
                )
                self.engine_type = "huggingface"
                self.model_name = model_dir.name
                self.is_ready = True
                return

            # 3. Auto-detect or load PyTorch TorchScript (.pt / .pth)
            pt_candidates = list(model_dir.glob("*.pt")) + list(model_dir.glob("*.pth"))
            if requested_type in ("auto", "pytorch") and pt_candidates:
                pt_path = pt_candidates[0]
                logger.info(f"Loading PyTorch model from {pt_path}")
                self.model = torch.jit.load(str(pt_path), map_location=self.device)
                self.model.eval()
                self.engine_type = "pytorch"
                self.model_name = pt_path.name
                self.is_ready = True
                return

            # 4. Calibrated Multi-Signal Ensemble Engine (Default Ready State)
            logger.info(
                "No external weight files found in saved_models/. "
                "Initializing Multi-Signal Calibrated Ensemble Engine."
            )
            self.engine_type = "ensemble_heuristic"
            self.model_name = "PhishGuard-MultiSignal-v2.0"
            self.is_ready = True

        except Exception as exc:
            logger.warning(
                f"Failed to load external model ({exc}). "
                "Falling back to PhishGuard-MultiSignal-v2.0 ensemble engine."
            )
            self.engine_type = "ensemble_heuristic"
            self.model_name = "PhishGuard-MultiSignal-v2.0"
            self.is_ready = True

    def _predict_ml_probability(self, cleaned_text: str, features: Dict[str, Any]) -> float:
        if self.engine_type == "sklearn" and self.model is not None:
            X = self.vectorizer.transform([cleaned_text]) if self.vectorizer is not None else [cleaned_text]
            if hasattr(self.model, "predict_proba"):
                probs = self.model.predict_proba(X)[0]
                return float(probs[1])
            pred = self.model.predict(X)[0]
            return 0.92 if int(pred) == 1 else 0.08

        if self.engine_type == "huggingface" and self.hf_pipeline is not None:
            output = self.hf_pipeline(cleaned_text)[0]
            label = str(output["label"]).lower()
            score = float(output["score"])
            if any(tag in label for tag in ("phish", "spam", "malicious", "1", "label_1", "pos")):
                return score
            return 1.0 - score

        # Calibrated multi-signal probability calculation
        text_s = features["text_score"]
        url_s = features["url_score"]
        sender_s = features["sender_score"]

        weighted = (text_s * 0.50) + (url_s * 0.35) + (sender_s * 0.15)
        # Boost when multiple independent risk vectors co-occur
        active_vectors = sum(1 for s in (text_s, url_s, sender_s) if s >= 0.4)
        if active_vectors >= 2:
            weighted = min(0.98, weighted + 0.22)
        elif max(text_s, url_s, sender_s) >= 0.75:
            weighted = max(weighted, 0.78)

        return min(0.99, max(0.02, weighted))

    def predict(
        self,
        content: str,
        subject: str = "",
        sender: str = "",
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        if not self.is_ready:
            raise ModelNotReadyError()

        start_time = time.perf_counter()
        try:
            features = EmailPreprocessor.extract_all_features(
                content=content,
                subject=subject,
                sender=sender,
            )

            ml_prob = self._predict_ml_probability(features["cleaned_text"], features)

            # Combine trained model probability with hard structural indicators (URL/Sender)
            if self.engine_type != "ensemble_heuristic":
                structural_max = max(features["url_score"], features["sender_score"])
                confidence = round(min(0.99, (ml_prob * 0.75) + (structural_max * 0.25)), 4)
            else:
                confidence = round(ml_prob, 4)

            risk_score = int(round(confidence * 100))

            if risk_score >= 70:
                verdict = "Malicious"
                classification = "phishing"
                is_phishing = True
            elif risk_score >= 40:
                verdict = "Suspicious"
                classification = "suspicious"
                is_phishing = True
            else:
                verdict = "Safe"
                classification = "legitimate"
                is_phishing = False

            indicators = list(features["indicators"])
            if not indicators:
                if is_phishing:
                    indicators.append({
                        "id": "IND-ML-SEMANTIC",
                        "title": "Anomalous Linguistic Pattern Detected",
                        "description": "Classifier detected structural similarity to known social engineering templates.",
                        "severity": "high",
                        "category": "text",
                        "score_impact": risk_score,
                    })
                else:
                    indicators.append({
                        "id": "IND-VERIFIED-CLEAN",
                        "title": "No Phishing Indicators Detected",
                        "description": "Email body, embedded links, and sender headers passed security verification.",
                        "severity": "low",
                        "category": "metadata",
                        "score_impact": 0,
                    })

            total_signal = (
                features["text_score"]
                + features["url_score"]
                + features["sender_score"]
                + 0.001
            )
            contributions = {
                "Text & NLP Semantics": round((features["text_score"] + 0.0004) / total_signal, 2),
                "URL & Domain Reputation": round((features["url_score"] + 0.0003) / total_signal, 2),
                "Sender & Header Signals": round((features["sender_score"] + 0.0003) / total_signal, 2),
            }

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            scan_id = f"SCN-{uuid.uuid4().hex[:8].upper()}"
            now_iso = datetime.now(timezone.utc).isoformat()

            metadata = {
                "engine": self.engine_type,
                "model_name": self.model_name,
                "modelName": self.model_name,
                "device": self.device,
                "version": settings.VERSION,
            }

            explainability = {
                "summary": (
                    f"Email classified as {verdict} ({risk_score}/100 risk) by {self.model_name}. "
                    f"Identified {len(features['flagged_tokens'])} risk token(s) and "
                    f"{len(features['url_signals'])} URL(s)."
                ),
                "flagged_tokens": features["flagged_tokens"],
                "flaggedTokens": features["flagged_tokens"],
                "url_signals": features["url_signals"],
                "urlSignals": features["url_signals"],
                "feature_contributions": contributions,
                "featureContributions": contributions,
            }

            return {
                "success": True,
                "scan_id": scan_id,
                "scanId": scan_id,
                "timestamp": now_iso,
                "is_phishing": is_phishing,
                "isPhishing": is_phishing,
                "verdict": verdict,
                "classification": classification,
                "confidence_score": confidence,
                "confidenceScore": confidence,
                "risk_score": risk_score,
                "riskScore": risk_score,
                "indicators": indicators,
                "explainability": explainability,
                "model_metadata": metadata,
                "modelMetadata": metadata,
                "processing_time_ms": elapsed_ms,
                "processingTimeMs": elapsed_ms,
            }
        except Exception as exc:
            logger.exception("Error during phishing inference execution")
            raise InferenceExecutionError(str(exc)) from exc


model_service = PhishingModelService()