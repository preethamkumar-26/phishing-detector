from typing import Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class EmailScanRequest(BaseModel):
    content: Optional[str] = Field(default=None, description="Primary email body content")
    body: Optional[str] = Field(default=None, description="Alias for email body content")
    text: Optional[str] = Field(default=None, description="Alias for raw email text")
    emailText: Optional[str] = Field(default=None, description="CamelCase alias for email text")
    subject: Optional[str] = Field(default="", description="Email subject line")
    sender: Optional[str] = Field(default="", description="Sender email address or header")
    headers: Optional[Dict[str, str]] = Field(default_factory=dict, description="Optional raw email headers")

    @model_validator(mode="after")
    def resolve_email_body(self) -> "EmailScanRequest":
        resolved = next(
            (
                candidate.strip()
                for candidate in (self.content, self.body, self.text, self.emailText)
                if candidate and candidate.strip()
            ),
            "",
        )
        if not resolved and not (self.subject or "").strip():
            raise ValueError("Email content (content, body, text, or subject) cannot be empty.")
        self.content = resolved
        return self


class FlaggedTokenSchema(BaseModel):
    token: str
    weight: float = Field(..., ge=0.0, le=1.0)
    category: str
    reason: str


class UrlSignalSchema(BaseModel):
    url: str
    domain: str
    is_suspicious: bool
    isSuspicious: bool
    risk_score: int = Field(..., ge=0, le=100)
    riskScore: int = Field(..., ge=0, le=100)
    reasons: List[str]


class RiskIndicatorSchema(BaseModel):
    id: str
    title: str
    description: str
    severity: str  # "low" | "medium" | "high" | "critical"
    category: str  # "text" | "url" | "sender" | "metadata"
    score_impact: int


class ExplainabilitySchema(BaseModel):
    summary: str
    flagged_tokens: List[FlaggedTokenSchema]
    flaggedTokens: List[FlaggedTokenSchema]
    url_signals: List[UrlSignalSchema]
    urlSignals: List[UrlSignalSchema]
    feature_contributions: Dict[str, float]
    featureContributions: Dict[str, float]


class ModelMetadataSchema(BaseModel):
    engine: str
    model_name: str
    modelName: str
    device: str
    version: str


class EmailScanResponse(BaseModel):
    success: bool = True
    scan_id: str
    scanId: str
    timestamp: str
    is_phishing: bool
    isPhishing: bool
    verdict: str  # "Safe" | "Suspicious" | "Malicious"
    classification: str  # "legitimate" | "suspicious" | "phishing"
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    confidenceScore: float = Field(..., ge=0.0, le=1.0)
    risk_score: int = Field(..., ge=0, le=100)
    riskScore: int = Field(..., ge=0, le=100)
    indicators: List[RiskIndicatorSchema]
    explainability: ExplainabilitySchema
    model_metadata: ModelMetadataSchema
    modelMetadata: ModelMetadataSchema
    processing_time_ms: float
    processingTimeMs: float

    