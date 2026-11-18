import json
from pathlib import Path

from pydantic import ValidationError

from app.core.config import settings
from app.core.logging import logger
from app.schemas.evaluation import (
    EvaluationMetricsReport,
    EvaluationMetricsResponse,
    EvaluationMetricsUnavailable,
)


class EvaluationArtifactError(Exception):
    pass


class EvaluationService:
    def __init__(self, artifact_path: Path | None = None) -> None:
        self.artifact_path = artifact_path or (
            settings.model_dir_path / "evaluation_metrics.json"
        )

    def get_metrics(self) -> EvaluationMetricsResponse:
        if not self.artifact_path.exists():
            return EvaluationMetricsUnavailable()
        if not self.artifact_path.is_file():
            raise EvaluationArtifactError(
                f"Evaluation artifact is not a file: {self.artifact_path.name}"
            )

        try:
            with self.artifact_path.open(encoding="utf-8") as artifact_file:
                artifact = json.load(artifact_file)
            return EvaluationMetricsReport.model_validate(artifact)
        except (OSError, ValueError, ValidationError) as exc:
            logger.error(
                f"Could not load evaluation artifact {self.artifact_path.name}: {exc}"
            )
            raise EvaluationArtifactError(
                f"Evaluation artifact {self.artifact_path.name} is invalid or unreadable."
            ) from exc


evaluation_service = EvaluationService()
