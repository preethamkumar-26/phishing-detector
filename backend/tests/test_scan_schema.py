import unittest

from pydantic import ValidationError

from app.schemas.scan import EmailScanRequest, ScanResponse


class EmailScanRequestTests(unittest.TestCase):
    def test_uses_next_nonempty_body_alias(self) -> None:
        request = EmailScanRequest.model_validate(
            {"content": "   ", "body": "  Email body  "}
        )

        self.assertEqual(request.content, "Email body")

    def test_rejects_empty_content_without_subject(self) -> None:
        with self.assertRaises(ValidationError):
            EmailScanRequest.model_validate({"content": "   "})

    def test_normalizes_frontend_aliases(self) -> None:
        request = EmailScanRequest.model_validate(
            {
                "body": "  Email body  ",
                "from": " sender@example.test ",
                "emailSubject": " Subject ",
                "headers": "X-Source: client",
                "replyTo": "reply@example.test",
                "urls": ["https://example.test"],
            }
        )

        self.assertEqual(request.content, "Email body")
        self.assertEqual(request.sender, " sender@example.test ")
        self.assertEqual(request.subject, " Subject ")
        self.assertEqual(request.reply_to, "reply@example.test")
        self.assertEqual(request.urls, ["https://example.test"])
        self.assertEqual(request.headers, "X-Source: client")

    def test_accepts_subject_only_scan(self) -> None:
        request = EmailScanRequest.model_validate({"subject": "Subject only"})

        self.assertEqual(request.content, "")

    def test_scan_response_has_only_standard_contract_fields(self) -> None:
        response = ScanResponse.model_validate(
            {
                "success": True,
                "scan_id": "scan-123",
                "is_phishing": False,
                "verdict": "Safe",
                "confidence_score": 0.1,
                "risk_score": 10,
                "p_phish": 0.1,
                "indicators": [],
                "explainability": {"summary": "No threats detected"},
            }
        )

        self.assertEqual(
            set(response.model_dump()),
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


if __name__ == "__main__":
    unittest.main()
