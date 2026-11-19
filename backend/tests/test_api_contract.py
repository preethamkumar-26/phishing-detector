import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.model_service import ModelService, model_service


SCAN_RESPONSE = {
    "success": True,
    "scan_id": "SCN-12345678",
    "is_phishing": True,
    "verdict": "Malicious",
    "confidence_score": 0.91,
    "risk_score": 91.0,
    "p_phish": 0.91,
    "indicators": [{"title": "Suspicious link", "severity": "high"}],
    "explainability": {"summary": "Model output"},
}


class AnalyzeApiContractTests(unittest.TestCase):
    def test_analyze_returns_standard_scan_response_for_frontend_aliases(self) -> None:
        with (
            patch.object(model_service, "load_model"),
            patch.object(model_service, "is_ready", True),
            patch.object(model_service, "predict", return_value=SCAN_RESPONSE) as predict,
            TestClient(app) as client,
        ):
            response = client.post(
                "/api/v1/analyze",
                json={
                    "body": "Email body",
                    "subject": "Email subject",
                    "from": "sender@example.test",
                    "replyTo": "reply@example.test",
                    "urls": ["https://example.test"],
                    "headers": "X-Source: client",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), SCAN_RESPONSE)
        self.assertEqual(
            set(response.json()),
            {
                "success",
                "scan_id",
                "is_phishing",
                "verdict",
                "confidence_score",
                "risk_score",
                "p_phish",
                "indicators",
                "explainability",
            },
        )
        predict.assert_called_once_with(
            text="Email body",
            subject="Email subject",
            sender="sender@example.test",
            reply_to="reply@example.test",
            urls=["https://example.test"],
            headers="X-Source: client",
        )


class ModelServiceEmailTextTests(unittest.TestCase):
    def test_deberta_config_preserves_checkpoint_architecture_options(self) -> None:
        config = ModelService._create_encoder_config()

        self.assertEqual(config.position_buckets, 256)
        self.assertEqual(config.norm_rel_ebd, "layer_norm")
        self.assertTrue(config.share_att_key)

    def test_existing_body_urls_are_not_appended_twice(self) -> None:
        body = "Visit https://example.test/path."

        result = ModelService._email_text(
            body,
            "",
            ["https://example.test/path", "https://second.example.test"],
        )

        self.assertEqual(
            result,
            f"{body}\nhttps://second.example.test",
        )


if __name__ == "__main__":
    unittest.main()
