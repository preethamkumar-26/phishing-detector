import re
from email.utils import parseaddr
from typing import Any, Dict, List
from urllib.parse import urlparse

from app.services.domain_reputation import default_reputation
from app.services.verification import (
    ABUSIVE_TLDS,
    BRAND_OFFICIAL_DOMAINS,
    ELEVATED_RISK_TLDS,
    URL_SHORTENERS,
    detect_brand_impersonation,
    extract_registrable_domain,
    is_abused_hosting,
    is_trusted_domain,
    normalize_url_for_analysis,
)

URGENCY_LEXICON: Dict[str, float] = {
    "immediately": 0.84,
    "urgent": 0.86,
    "action required": 0.82,
    "account suspended": 0.94,
    "suspended": 0.88,
    "verify your account": 0.95,
    "confirm your identity": 0.91,
    "unauthorized login": 0.90,
    "unusual activity": 0.85,
    "within 24 hours": 0.83,
    "within 48 hours": 0.79,
    "security alert": 0.78,
    "final notice": 0.87,
    "restricted": 0.80,
    "locked": 0.82,
}

CREDENTIAL_FINANCIAL_LEXICON: Dict[str, float] = {
    "password": 0.78,
    "login credentials": 0.92,
    "credit card": 0.89,
    "bank account": 0.86,
    "social security": 0.95,
    "ssn": 0.95,
    "wire transfer": 0.91,
    "gift card": 0.90,
    "invoice attached": 0.76,
    "payment declined": 0.87,
    "billing information": 0.84,
    "update your payment": 0.90,
    "click the link below": 0.81,
    "reset your password": 0.85,
}


class EmailPreprocessor:
    @staticmethod
    def clean_text(text: str) -> str:
        if not text:
            return ""
        # Strip HTML tags while keeping inner text
        cleaned = re.sub(r"<[^>]+>", " ", text)
        # Collapse multiple whitespaces
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    @staticmethod
    def extract_urls(text: str) -> List[str]:
        if not text:
            return []
        pattern = r"(?:https?://|www\.)[^\s<>\"'\)\]]+"
        matches = re.findall(pattern, text, flags=re.IGNORECASE)
        seen: List[str] = []
        for match in matches:
            trimmed = match.rstrip(".,;:!?)")
            if trimmed not in seen:
                seen.append(trimmed)
        return seen

    @classmethod
    def analyze_urls(cls, urls: List[str]) -> List[Dict[str, Any]]:
        url_signals: List[Dict[str, Any]] = []
        for raw_url in urls:
            with_scheme = (
                raw_url
                if raw_url.lower().startswith(("http://", "https://"))
                else f"http://{raw_url}"
            )
            clean_url = normalize_url_for_analysis(with_scheme)
            parsed = urlparse(clean_url)
            raw_netloc = (parsed.netloc or "").lower()
            domain = (parsed.hostname or "").lower().rstrip(".")
            reg_domain = extract_registrable_domain(domain)
            trusted = is_trusted_domain(domain, reg_domain, default_reputation)
            tld = reg_domain.rsplit(".", 1)[-1] if "." in reg_domain else ""

            reasons: List[str] = []
            risk = 10

            if re.match(r"^\d{1,3}(?:\.\d{1,3}){3}$", domain):
                reasons.append("Uses raw IPv4 address instead of a domain name")
                risk += 65

            if "xn--" in domain:
                reasons.append("Uses punycode internationalized domain encoding")
                risk += 50

            if reg_domain in URL_SHORTENERS or any(
                domain == short or domain.endswith(f".{short}") for short in URL_SHORTENERS
            ):
                reasons.append("Uses URL shortening service to mask destination")
                risk += 45

            if is_abused_hosting(domain, reg_domain):
                reasons.append(f"Hosted on shared platform '{domain}' frequently abused for phishing")
                risk += 40

            if tld in ABUSIVE_TLDS:
                reasons.append(f"Uses high-abuse top-level domain (.{tld})")
                risk += 45
            elif tld in ELEVATED_RISK_TLDS and not trusted:
                reasons.append(f"Uses elevated-risk unranked top-level domain (.{tld})")
                risk += 20

            # Only flag '@' in the authority/netloc section (not benign '?email=user@example.com' params)
            if "@" in raw_netloc:
                reasons.append("Contains '@' credential-redirect obfuscation in URL authority")
                risk += 55

            if not trusted and reg_domain.split(".", 1)[0].count("-") >= 2:
                reasons.append("Multiple hyphens in unverified domain typical of deceptive spoofing")
                risk += 25

            impersonated_brand = detect_brand_impersonation(domain, default_reputation)
            if impersonated_brand:
                reasons.append(
                    f"Deceptive brand keyword '{impersonated_brand}' in untrusted domain '{domain}'"
                )
                risk += 55

            if clean_url.startswith("http://"):
                reasons.append("Unencrypted HTTP protocol")
                risk += 15

            final_risk = min(100, risk if reasons else 5)
            is_suspicious = final_risk >= 40

            url_signals.append({
                "url": raw_url,
                "domain": domain or "unknown",
                "is_suspicious": is_suspicious,
                "isSuspicious": is_suspicious,
                "risk_score": final_risk,
                "riskScore": final_risk,
                "reasons": reasons if reasons else ["Standard domain structure"],
            })
        return url_signals

    @classmethod
    def analyze_sender(cls, sender: str) -> Dict[str, Any]:
        if not sender or "@" not in sender:
            return {"sender_risk": 0.0, "indicators": []}

        indicators: List[Dict[str, Any]] = []
        # ModelService may pass "sender\nreply_to"; inspect the primary sender line first
        primary_sender = sender.splitlines()[0].strip()
        display_name, parsed_addr = parseaddr(primary_sender)
        display_lower = display_name.lower().strip()

        email_match = re.search(
            r"([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})",
            (parsed_addr or primary_sender).lower(),
        )
        address = email_match.group(1) if email_match else primary_sender.lower()
        domain = address.split("@")[-1].strip(">").lower().rstrip(".")
        reg_domain = extract_registrable_domain(domain)
        reg_label = reg_domain.split(".", 1)[0] if reg_domain else ""
        tld = reg_domain.rsplit(".", 1)[-1] if "." in reg_domain else ""
        trusted = is_trusted_domain(domain, reg_domain, default_reputation)

        risk = 0.0

        # Check numeric homograph substitutions only on unverified domains (avoids w3schools.com, apollo247.com, g2.com)
        if not trusted and reg_label and any(ch.isdigit() for ch in reg_label):
            # Look for digits mixed directly inside alphabetic words (e.g., paypa1, amaz0n, micr0soft)
            if re.search(r"[a-z]\d[a-z]|[a-z][013457]\b", reg_label):
                risk = max(risk, 0.85)
                indicators.append({
                    "id": "IND-SENDER-HOMOGRAPH",
                    "title": "Suspected Typosquatted Sender Domain",
                    "description": f"Unverified sender domain '{reg_domain}' contains digit substitutions typical of brand impersonation.",
                    "severity": "high",
                    "category": "sender",
                    "score_impact": 30,
                })

        if tld in ABUSIVE_TLDS:
            risk = max(risk, 0.78)
            indicators.append({
                "id": "IND-SENDER-TLD",
                "title": "High-Risk Sender Top-Level Domain",
                "description": f"Sender address originates from a high-abuse TLD ({reg_domain}).",
                "severity": "high",
                "category": "sender",
                "score_impact": 25,
            })

        # Display name vs. official brand ecosystem check (allows e.g. "Amazon Web Services" <health@aws.com>)
        if display_lower:
            for brand, official_domains in BRAND_OFFICIAL_DOMAINS.items():
                if brand in display_lower and reg_domain not in official_domains and not trusted:
                    risk = max(risk, 0.90)
                    indicators.append({
                        "id": "IND-SENDER-MISMATCH",
                        "title": "Display Name vs. Return Domain Mismatch",
                        "description": f"Sender display name references '{brand.title()}' but originates from unverified domain '{reg_domain}'.",
                        "severity": "critical",
                        "category": "sender",
                        "score_impact": 35,
                    })
                    break

        return {"sender_risk": risk, "indicators": indicators}

    @classmethod
    def extract_all_features(cls, content: str, subject: str = "", sender: str = "") -> Dict[str, Any]:
        combined_raw = f"{subject} {content}".strip()
        cleaned_text = cls.clean_text(combined_raw)
        lower_text = cleaned_text.lower()

        flagged_tokens: List[Dict[str, Any]] = []
        indicators: List[Dict[str, Any]] = []

        # 1. Urgency & Coercion Lexicon Scan
        for phrase, weight in URGENCY_LEXICON.items():
            if phrase in lower_text:
                flagged_tokens.append({
                    "token": phrase,
                    "weight": weight,
                    "category": "urgency",
                    "reason": "Psychological urgency or account-threat trigger",
                })

        # 2. Credential & Financial Solicitation Scan
        for phrase, weight in CREDENTIAL_FINANCIAL_LEXICON.items():
            if phrase in lower_text:
                flagged_tokens.append({
                    "token": phrase,
                    "weight": weight,
                    "category": "credential",
                    "reason": "Solicitation of sensitive authentication or financial data",
                })

        if any(t["category"] == "urgency" for t in flagged_tokens):
            indicators.append({
                "id": "IND-TEXT-URGENCY",
                "title": "Urgency & Coercive Language Detected",
                "description": "Email employs high-pressure timelines or account suspension threats.",
                "severity": "high",
                "category": "text",
                "score_impact": 25,
            })

        if any(t["category"] == "credential" for t in flagged_tokens):
            indicators.append({
                "id": "IND-TEXT-CREDENTIAL",
                "title": "Credential Harvesting / Financial Request",
                "description": "Email requests passwords, identity verification, or payment updates.",
                "severity": "critical",
                "category": "text",
                "score_impact": 35,
            })

        # 3. URL Extraction & Inspection
        urls = cls.extract_urls(combined_raw)
        url_signals = cls.analyze_urls(urls)
        suspicious_urls = [u for u in url_signals if u["is_suspicious"]]

        for susp in suspicious_urls:
            flagged_tokens.append({
                "token": susp["url"],
                "weight": round(susp["risk_score"] / 100.0, 2),
                "category": "suspicious_link",
                "reason": "; ".join(susp["reasons"]),
            })

        if suspicious_urls:
            indicators.append({
                "id": "IND-URL-MALICIOUS",
                "title": "Suspicious or Obfuscated Embedded Links",
                "description": f"Detected {len(suspicious_urls)} high-risk URL(s) exhibiting spoofing or obfuscation.",
                "severity": "critical",
                "category": "url",
                "score_impact": 40,
            })

        # 4. Sender Analysis
        sender_analysis = cls.analyze_sender(sender)
        indicators.extend(sender_analysis["indicators"])

        # Sub-scores (0.0 to 1.0)
        text_tokens = [t["weight"] for t in flagged_tokens if t["category"] in ("urgency", "credential")]
        text_score = min(1.0, sum(text_tokens) / 2.2) if text_tokens else 0.05
        url_score = max((u["risk_score"] / 100.0 for u in url_signals), default=0.0)
        sender_score = sender_analysis["sender_risk"]

        return {
            "cleaned_text": cleaned_text,
            "flagged_tokens": flagged_tokens,
            "url_signals": url_signals,
            "indicators": indicators,
            "text_score": round(text_score, 4),
            "url_score": round(url_score, 4),
            "sender_score": round(sender_score, 4),
        }