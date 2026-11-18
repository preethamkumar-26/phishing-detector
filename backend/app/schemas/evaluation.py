from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EvaluationScores(BaseModel):
    model_config = ConfigDict(extra="forbid")

    accuracy: float = Field(ge=0.0, le=1.0)
    precision: float = Field(ge=0.0, le=1.0)
    recall: float = Field(ge=0.0, le=1.0)
    f1_score: float = Field(ge=0.0, le=1.0)
    auc_roc: float = Field(ge=0.0, le=1.0)
    inference_latency_ms: float = Field(ge=0.0)


class EvaluationModelRanking(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_name: str = Field(min_length=1)
    rank: int = Field(ge=1)
    accuracy: float = Field(ge=0.0, le=1.0)
    precision: float = Field(ge=0.0, le=1.0)
    recall: float = Field(ge=0.0, le=1.0)
    f1_score: float = Field(ge=0.0, le=1.0)
    auc_roc: float = Field(ge=0.0, le=1.0)
    inference_latency_ms: float | None = Field(default=None, ge=0.0)


class EvaluationMetricsReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["available"] = "available"
    schema_version: Literal[1]
    model_name: str = Field(min_length=1)
    model_version: str = Field(min_length=1)
    dataset: str = Field(min_length=1)
    dataset_version: str = Field(min_length=1)
    split: str = Field(min_length=1)
    threshold: float = Field(ge=0.0, le=1.0)
    evaluated_at: datetime
    sample_count: int = Field(ge=1)
    metrics: EvaluationScores
    model_ranking: list[EvaluationModelRanking] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_ranking_contains_consistent_model(self) -> "EvaluationMetricsReport":
        model_name = self.model_name.casefold()
        names = [entry.model_name.casefold() for entry in self.model_ranking]
        if len(names) != len(set(names)):
            raise ValueError("Model ranking entries must have unique model names.")

        model_entry = next(
            (entry for entry in self.model_ranking if entry.model_name.casefold() == model_name),
            None,
        )
        if model_entry is None:
            raise ValueError("Model ranking must include the evaluated PAHF-Net model.")

        for metric in ("accuracy", "precision", "recall", "f1_score", "auc_roc"):
            if getattr(model_entry, metric) != getattr(self.metrics, metric):
                raise ValueError(f"PAHF-Net ranking {metric} must match the reported metrics.")
        return self


class EvaluationMetricsUnavailable(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["unavailable"] = "unavailable"
    reason: Literal["artifact_not_found"] = "artifact_not_found"
    artifact: Literal["evaluation_metrics.json"] = "evaluation_metrics.json"


EvaluationMetricsResponse = EvaluationMetricsReport | EvaluationMetricsUnavailable
