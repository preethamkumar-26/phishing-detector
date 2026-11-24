import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.evaluation import (
    EvaluationMetricsReport,
    EvaluationMetricsUnavailable,
    PAHFNetEvaluationReport,
)
from app.services.evaluation_service import EvaluationArtifactError, EvaluationService
from app.services.model_service import model_service


def valid_artifact() -> dict:
    return {
        "schema_version": 1,
        "model_name": "PAHF-Net",
        "model_version": "pahf-net-test",
        "dataset": "Phishing benchmark",
        "dataset_version": "1.0",
        "split": "test",
        "threshold": 0.5,
        "evaluated_at": "2026-11-18T10:00:00Z",
        "sample_count": 100,
        "metrics": {
            "accuracy": 0.91,
            "precision": 0.9,
            "recall": 0.92,
            "f1_score": 0.91,
            "auc_roc": 0.96,
            "inference_latency_ms": 132.0,
        },
        "model_ranking": [
            {
                "model_name": "PAHF-Net",
                "rank": 1,
                "accuracy": 0.91,
                "precision": 0.9,
                "recall": 0.92,
                "f1_score": 0.91,
                "auc_roc": 0.96,
                "inference_latency_ms": 132.0,
            },
            {
                "model_name": "Logistic Regression",
                "rank": 2,
                "accuracy": 0.84,
                "precision": 0.82,
                "recall": 0.8,
                "f1_score": 0.81,
                "auc_roc": 0.88,
            },
        ],
    }


class EvaluationServiceTests(unittest.TestCase):
    def test_missing_artifact_is_reported_as_unavailable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            response = EvaluationService(
                Path(directory) / "evaluation_metrics.json"
            ).get_metrics()

        self.assertIsInstance(response, EvaluationMetricsUnavailable)
        self.assertEqual(response.status, "unavailable")

    def test_valid_artifact_is_loaded_and_validated(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            artifact_path = Path(directory) / "evaluation_metrics.json"
            artifact_path.write_text(json.dumps(valid_artifact()), encoding="utf-8")

            response = EvaluationService(artifact_path).get_metrics()

        assert isinstance(response, EvaluationMetricsReport)
        self.assertEqual(response.metrics.inference_latency_ms, 132.0)
        self.assertEqual(len(response.model_ranking), 2)

    def test_artifact_rejects_inconsistent_pahf_ranking(self) -> None:
        artifact = valid_artifact()
        artifact["model_ranking"][0]["f1_score"] = 0.5

        with tempfile.TemporaryDirectory() as directory:
            artifact_path = Path(directory) / "evaluation_metrics.json"
            artifact_path.write_text(json.dumps(artifact), encoding="utf-8")

            with self.assertRaises(EvaluationArtifactError):
                EvaluationService(artifact_path).get_metrics()

    def test_pahfnet_artifact_is_loaded_and_validated(self) -> None:
        raw_pahfnet = {
            "model": "PAHF-Net",
            "evaluation": {
                "status": "completed_successfully",
                "total_samples": 14294,
                "class_support": {"Legitimate": 9070, "Phishing": 5224},
                "summary_metrics": {
                    "accuracy": 0.992444,
                    "balanced_accuracy": 0.992658,
                    "precision": 0.988728,
                    "recall": 0.99062,
                    "f1_score": 0.989673,
                    "roc_auc": 0.9984,
                    "pr_auc": 0.9975,
                },
                "classification_report": {
                    "Legitimate": {"precision": 0.9946, "recall": 0.9935, "f1_score": 0.994, "support": 9070},
                    "Phishing": {"precision": 0.9887, "recall": 0.9906, "f1_score": 0.9897, "support": 5224},
                    "accuracy": {"value": 0.9924, "support": 14294},
                    "macro_avg": {"precision": 0.9917, "recall": 0.9921, "f1_score": 0.9919, "support": 14294},
                    "weighted_avg": {"precision": 0.9924, "recall": 0.9924, "f1_score": 0.9924, "support": 14294},
                },
                "confusion_matrix": {
                    "values": [[9011, 59], [49, 5175]],
                    "label_order": ["Legitimate", "Phishing"],
                    "row_axis": "actual",
                    "column_axis": "predicted",
                },
            },
            "data_notes": ["Transcribed from evaluation run"],
        }
        with tempfile.TemporaryDirectory() as directory:
            artifact_path = Path(directory) / "evaluation_metrics.json"
            artifact_path.write_text(json.dumps(raw_pahfnet), encoding="utf-8")

            response = EvaluationService(artifact_path).get_metrics()

        self.assertIsInstance(response, PAHFNetEvaluationReport)
        self.assertEqual(response.status, "available")
        self.assertEqual(response.model, "PAHF-Net")
        self.assertEqual(response.evaluation.total_samples, 14294)
        self.assertEqual(response.evaluation.summary_metrics.accuracy, 0.992444)
        self.assertEqual(response.evaluation.summary_metrics.balanced_accuracy, 0.992658)
        self.assertEqual(response.evaluation.summary_metrics.precision, 0.988728)
        self.assertEqual(response.evaluation.summary_metrics.recall, 0.99062)
        self.assertEqual(response.evaluation.summary_metrics.f1_score, 0.989673)
        self.assertEqual(response.evaluation.summary_metrics.roc_auc, 0.9984)
        self.assertEqual(response.evaluation.summary_metrics.pr_auc, 0.9975)
        self.assertEqual(response.evaluation.confusion_matrix.values, [[9011, 59], [49, 5175]])

    def test_default_service_loads_deployed_artifact(self) -> None:
        response = EvaluationService().get_metrics()
        self.assertIsInstance(response, PAHFNetEvaluationReport)
        self.assertEqual(response.evaluation.total_samples, 14294)


class EvaluationMetricsApiTests(unittest.TestCase):
    def test_endpoint_returns_unavailable_contract_without_loading_model_per_request(self) -> None:
        with (
            patch.object(model_service, "load_model") as load_model,
            patch(
                "app.api.routes.evaluation_service.get_metrics",
                return_value=EvaluationMetricsUnavailable(),
            ),
            TestClient(app) as client,
        ):
            response = client.get("/api/v1/evaluation-metrics")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "unavailable",
                "reason": "artifact_not_found",
                "artifact": "evaluation_metrics.json",
            },
        )
        load_model.assert_called_once()

    def test_endpoint_returns_validated_ranking_report(self) -> None:
        report = EvaluationMetricsReport.model_validate(valid_artifact())
        with (
            patch.object(model_service, "load_model"),
            patch(
                "app.api.routes.evaluation_service.get_metrics",
                return_value=report,
            ),
            TestClient(app) as client,
        ):
            response = client.get("/api/v1/evaluation-metrics")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "available")
        self.assertEqual(response.json()["metrics"]["f1_score"], 0.91)
        self.assertEqual(response.json()["model_ranking"][1]["model_name"], "Logistic Regression")

    def test_endpoint_returns_pahfnet_evaluation_report(self) -> None:
        with (
            patch.object(model_service, "load_model"),
            TestClient(app) as client,
        ):
            response = client.get("/api/v1/evaluation-metrics")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "available")
        self.assertEqual(data["model"], "PAHF-Net")
        self.assertIn("evaluation", data)
        self.assertEqual(data["evaluation"]["summary_metrics"]["accuracy"], 0.992444)
        self.assertEqual(data["evaluation"]["summary_metrics"]["balanced_accuracy"], 0.992658)
        self.assertEqual(data["evaluation"]["summary_metrics"]["roc_auc"], 0.9984)
        self.assertEqual(data["evaluation"]["summary_metrics"]["pr_auc"], 0.9975)


if __name__ == "__main__":
    unittest.main()
