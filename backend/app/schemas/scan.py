import html
import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EmailScanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    content: str = Field(default="", max_length=1_000_000)
    subject: str = Field(default="", max_length=998)
    sender: str = Field(default="", max_length=2048)
    reply_to: str = Field(default="", max_length=2048)
    urls: list[str] | str | None = None
    headers: dict[str, Any] | str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_frontend_aliases(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value

        payload = value.copy()
        content = next(
            (
                candidate.strip()
                for name in ("content", "body", "text", "emailText", "email_text", "email_body")
                if isinstance(candidate := payload.get(name), str) and candidate.strip()
            ),
            "",
        )
        if content:
            payload["content"] = content

        if not str(payload.get("sender") or "").strip():
            payload["sender"] = payload.get("from") or payload.get("emailFrom") or ""

        if not str(payload.get("subject") or "").strip():
            payload["subject"] = payload.get("emailSubject") or ""

        if not str(payload.get("reply_to") or "").strip():
            payload["reply_to"] = payload.get("replyTo") or ""

        if "headers" not in payload:
            payload["headers"] = payload.get("emailHeaders")

        return payload

    @model_validator(mode="after")
    def require_email_content_or_subject(self) -> "EmailScanRequest":
        if not self.content.strip() and not self.subject.strip():
            raise ValueError("Email content or subject cannot be empty.")
        if len(self.content) > 1_000_000:
            raise ValueError("Email content exceeds the 1,000,000 character limit.")
        if isinstance(self.headers, str) and len(self.headers) > 100_000:
            raise ValueError("Email headers exceed the 100,000 character limit.")
        if isinstance(self.headers, dict):
            rendered = "\n".join(f"{key}: {value}" for key, value in self.headers.items())
            if len(rendered) > 100_000:
                raise ValueError("Email headers exceed the 100,000 character limit.")
        if isinstance(self.urls, list):
            if len(self.urls) > 100:
                raise ValueError("Email URL list exceeds 100 entries.")
            if any(not isinstance(url, str) or len(url) > 2048 for url in self.urls):
                raise ValueError("Email URL entries must be strings of at most 2048 characters.")
        self.content = re.sub(
            r"<(script|style)\b[^>]*>.*?</\1\s*>",
            "[removed]",
            html.unescape(self.content),
            flags=re.IGNORECASE | re.DOTALL,
        )
        self.subject = re.sub(r"<[^>]*>", "", html.unescape(self.subject))
        return self


class ScanResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    scan_id: str
    is_phishing: bool
    verdict: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    risk_score: float = Field(ge=0.0, le=100.0)
    p_phish: float = Field(ge=0.0, le=1.0)
    indicators: list[dict[str, Any]] = Field(default_factory=list)
    explainability: dict[str, Any] = Field(default_factory=dict)
