import unittest

from pydantic import ValidationError

from app.schemas.scan import EmailScanRequest


class EmailScanRequestTests(unittest.TestCase):
    def test_uses_next_nonempty_body_alias(self) -> None:
        request = EmailScanRequest.model_validate(
            {"content": "   ", "body": "  Email body  "}
        )

        self.assertEqual(request.content, "Email body")

    def test_rejects_empty_content_without_subject(self) -> None:
        with self.assertRaises(ValidationError):
            EmailScanRequest.model_validate({"content": "   "})


if __name__ == "__main__":
    unittest.main()
