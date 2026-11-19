from __future__ import annotations

from dataclasses import dataclass, field
from email.utils import parseaddr
import ipaddress
import re
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from app.services.domain_reputation import LocalDomainReputation, default_reputation

URL_RE = re.compile(r"https?://[^\s<>'\"()\[\]]+", re.IGNORECASE)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# Multi-part public suffixes (includes RBI-mandated .bank.in and .fin.in)
MULTI_PART_TLDS: set[str] = {
    "bank.in", "fin.in",
    "co.in", "org.in", "net.in", "gov.in", "nic.in", "ac.in", "edu.in", "firm.in", "gen.in", "ind.in",
    "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk",
    "com.au", "net.au", "org.au", "edu.au", "gov.au",
    "co.jp", "ne.jp", "or.jp", "go.jp",
    "com.sg", "org.sg", "gov.sg",
    "com.br", "org.br", "gov.br",
    "co.nz", "co.za", "com.mx", "com.hk", "com.tw", "com.my", "co.id", "com.tr", "com.cn",
}

# Strictly vetted institutional suffixes (public attackers cannot freely register these)
TRUSTED_INSTITUTIONAL_SUFFIXES: tuple[str, ...] = (
    ".bank.in", ".fin.in", ".gov.in", ".nic.in", ".ac.in", ".edu.in",
    ".gov", ".gov.uk", ".ac.uk", ".edu", ".mil",
)

# Benign marketing / analytics query parameters to strip before URL inspection
TRACKING_QUERY_PARAMS: set[str] = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
    "ref", "ref_", "referrer", "fbclid", "gclid", "dclid", "msclkid", "yclid",
    "mc_cid", "mc_eid", "igshid", "trk", "trkcampaign", "spm", "source", "campaign",
}

# Protected high-target brands + their official domain ecosystems (used for spoofing detection)
BRAND_OFFICIAL_DOMAINS: dict[str, set[str]] = {
    "hdfc": {"hdfcbank.com", "hdfcbank.net", "hdfc.com", "hdfcsec.com", "hdfc.bank.in", "hdfcbank.bank.in"},
    "icici": {"icicibank.com", "icicidirect.com", "icicilombard.com", "icici.bank.in", "icicibank.bank.in"},
    "sbi": {"sbi.co.in", "onlinesbi.sbi", "sbicard.com", "sbigeneral.in", "sbimf.com", "sbi.bank.in"},
    "axis": {"axisbank.com", "axisbank.co.in", "axis.bank.in", "axisbank.bank.in", "axisbankmail.bank.in"},
    "kotak": {"kotak.com", "kotakbank.com", "kotak.bank.in"},
    "chase": {"chase.com", "jpmorgan.com"},
    "bankofamerica": {"bankofamerica.com", "bofa.com"},
    "wellsfargo": {"wellsfargo.com"},
    "citibank": {"citi.com", "citibank.com", "citibank.co.in"},
    "hsbc": {"hsbc.com", "hsbc.co.in", "hsbc.co.uk"},
    "barclays": {"barclays.co.uk", "barclays.com"},
    "paypal": {"paypal.com", "paypal.me"},
    "amazon": {
        "amazon.com", "amazon.in", "amazon.co.uk", "amazon.de", "amazon.ca",
        "amazon.com.au", "amazon.co.jp", "amazon.fr", "aws.com",
    },
    "microsoft": {"microsoft.com", "live.com", "outlook.com", "office.com", "office365.com"},
    "apple": {"apple.com", "icloud.com"},
    "google": {"google.com", "google.co.in", "gmail.com", "youtube.com"},
    "netflix": {"netflix.com"},
    "spotify": {"spotify.com"},
    "facebook": {"facebook.com", "facebookmail.com", "meta.com"},
    "instagram": {"instagram.com"},
    "linkedin": {"linkedin.com"},
    "flipkart": {"flipkart.com"},
    "paytm": {"paytm.com"},
    "marriott": {"marriott.com", "email-marriott.com"},
    "reddit": {"reddit.com", "redditmail.com"},
}

# Known sibling domain pairs whose names do not share an obvious stem
SIBLING_BRAND_GROUPS: list[set[str]] = [
    {"amazon.com", "amazon.in", "amazon.co.uk", "aws.com"},
    {"sbi.co.in", "onlinesbi.sbi", "sbicard.com", "sbimf.com", "sbi.bank.in"},
    {"lge.com", "lg.com"},
    {"bankofamerica.com", "bofa.com"},
    {"chase.com", "jpmorgan.com"},
    {"openai.com", "chatgpt.com"},
    {"anthropic.com", "claude.ai", "claude.com"},
    {"facebook.com", "facebookmail.com", "meta.com"},
    {"google.com", "youtube.com", "google.co.in"},
]

# Free webmail providers: ranked high in Tranco, but heavily abused by phishers
FREE_WEBMAIL_DOMAINS: set[str] = {
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in",
    "outlook.com", "hotmail.com", "live.com", "aol.com", "icloud.com",
    "protonmail.com", "proton.me", "rediffmail.com", "gmx.com",
    "mail.com", "yandex.com", "zohomail.in",
}

# High-rank cloud/form/static platforms frequently abused to host phishing pages.
# Never grant these a Tranco "trusted destination" pass.
ABUSED_HOSTING_EXACT_HOSTS: set[str] = {
    "docs.google.com", "drive.google.com", "sites.google.com", "forms.gle",
    "forms.office.com", "1drv.ms", "storage.googleapis.com", "s3.amazonaws.com",
    "dropboxusercontent.com", "linktr.ee", "typeform.com", "jotform.com",
}
ABUSED_HOSTING_REGISTRABLE: set[str] = {
    "firebaseapp.com", "web.app", "appspot.com", "github.io", "gitlab.io",
    "vercel.app", "netlify.app", "pages.dev", "workers.dev", "herokuapp.com",
    "azurewebsites.net", "blogspot.com", "wixsite.com", "weebly.com",
    "notion.site", "canva.site", "ngrok-free.app", "trycloudflare.com",
}

URL_SHORTENERS: set[str] = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "rb.gy", "cutt.ly", "shorturl.at", "rebrand.ly", "tiny.cc",
}

# Strictly abusive TLDs -> hard red flag
ABUSIVE_TLDS: set[str] = {"tk", "ml", "ga", "cf", "gq", "zip", "mov"}

# Elevated-risk TLDs -> soft signal alone (so legit startups like banza.xyz are not auto-Malicious),
# escalated to hard red flag when combined with brand spoofing or lure keywords.
ELEVATED_RISK_TLDS: set[str] = {"xyz", "top", "click", "work", "buzz", "icu", "monster", "loan", "cam", "rest"}

SUSPICIOUS_DOMAIN_TOKENS: set[str] = {
    "verify", "secure", "login", "signin", "account", "update", "confirm",
    "billing", "support", "unlock", "suspend", "alert", "wallet", "kyc",
    "netbanking", "webmail", "recover", "auth", "validate", "claim", "reward",
    "prize", "portal",
}

MAILER_AFFIX_RE = re.compile(
    r"(?:^|-|_)(?:e?mail(?:er|s)?|news|alerts?|info|updates?|notify|msg|promo|offers?|digital|in)(?=$|-|_)"
    r"|(?:e?mail(?:er|s)?|alerts?|updates?|notify)$",
    re.IGNORECASE,
)

COERCION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "ACCOUNT_SUSPENSION_THREAT",
        re.compile(
            r"\b(?:account|card|access)\s+(?:has\s+been|will\s+be|is\s+being)\s+"
            r"(?:suspended|locked|deactivated|blocked|terminated|restricted)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "CREDENTIAL_HARVEST_REQUEST",
        re.compile(
            r"\b(?:enter|verify|confirm|share|provide|update)\s+(?:your\s+)?"
            r"(?:password|otp|one[-\s]?time\s+password|cvv|atm\s+pin|pin|passcode|kyc\s+immediately)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "UNAUTHORIZED_PANIC_LURE",
        re.compile(
            r"\bunauthorized\s+(?:login|sign[-\s]?in|access|transaction)\b.*\b(?:verify|click|immediately|24\s+hours)\b",
            re.IGNORECASE | re.DOTALL,
        ),
    ),
    (
        "URGENT_WIRE_OR_GIFT_CARD",
        re.compile(
            r"\b(?:urgent\s+wire\s+transfer|purchase\s+gift\s+cards?\s+immediately)\b",
            re.IGNORECASE,
        ),
    ),
]


@dataclass
class VerificationResult:
    sender_email: str = ""
    sender_domain: str = ""
    sender_tranco_rank: int | None = None
    sender_is_trusted: bool = False
    reply_to_domain: str = ""
    url_domains: list[str] = field(default_factory=list)
    trusted_url_domains: list[str] = field(default_factory=list)
    untrusted_url_domains: list[str] = field(default_factory=list)
    domains_aligned: bool = False
    all_urls_trusted: bool = False
    auth_spf: str = "none"
    auth_dkim: str = "none"
    auth_dmarc: str = "none"
    auth_passed: bool = False
    auth_failed: bool = False
    has_list_unsubscribe: bool = False
    hard_red_flags: list[dict[str, Any]] = field(default_factory=list)
    soft_warnings: list[dict[str, Any]] = field(default_factory=list)
    positive_signals: list[dict[str, Any]] = field(default_factory=list)
    offline_reputation_loaded: bool = False

    @property
    def has_hard_red_flags(self) -> bool:
        return len(self.hard_red_flags) > 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": "strictly_offline",
            "offline_reputation_loaded": self.offline_reputation_loaded,
            "sender_domain": self.sender_domain or None,
            "sender_tranco_rank": self.sender_tranco_rank,
            "sender_is_trusted": self.sender_is_trusted,
            "reply_to_domain": self.reply_to_domain or None,
            "url_domains": self.url_domains,
            "trusted_url_domains": self.trusted_url_domains,
            "untrusted_url_domains": self.untrusted_url_domains,
            "domains_aligned": self.domains_aligned,
            "all_urls_trusted": self.all_urls_trusted,
            "authentication": {
                "spf": self.auth_spf,
                "dkim": self.auth_dkim,
                "dmarc": self.auth_dmarc,
                "passed": self.auth_passed,
                "failed": self.auth_failed,
            },
            "has_list_unsubscribe": self.has_list_unsubscribe,
            "hard_red_flag_count": len(self.hard_red_flags),
            "soft_warning_count": len(self.soft_warnings),
            "positive_signal_count": len(self.positive_signals),
        }


@dataclass
class FusionDecision:
    p_content: float
    p_final: float
    verdict: str          # "Safe" | "Suspicious" | "Malicious"
    is_phishing: bool
    decision_basis: str


def extract_email_address(raw: str | None) -> str:
    if not raw:
        return ""
    _, addr = parseaddr(raw.strip())
    candidate = addr or raw.strip()
    match = EMAIL_RE.search(candidate)
    return match.group(0).lower() if match else ""


def extract_hostname(value: str | None) -> str:
    if not value:
        return ""
    cleaned = value.strip().lower()
    if "@" in cleaned and "://" not in cleaned:
        email = extract_email_address(cleaned)
        return email.split("@", 1)[1].rstrip(".") if email else ""
    candidate = cleaned if "://" in cleaned else f"https://{cleaned}"
    try:
        return (urlparse(candidate).hostname or "").strip().lower().rstrip(".")
    except ValueError:
        return ""


def is_ip_host(host: str) -> bool:
    if not host:
        return False
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def extract_registrable_domain(value: str | None) -> str:
    host = extract_hostname(value)
    if not host or is_ip_host(host):
        return host
    parts = [p for p in host.split(".") if p]
    if len(parts) <= 2:
        return ".".join(parts)
    last_two = ".".join(parts[-2:])
    if last_two in MULTI_PART_TLDS and len(parts) >= 3:
        return ".".join(parts[-3:])
    return last_two


def is_institutional_domain(domain: str) -> bool:
    d = domain.strip().lower().rstrip(".")
    return bool(d) and any(d.endswith(sfx) for sfx in TRUSTED_INSTITUTIONAL_SUFFIXES)


def is_abused_hosting(host: str, reg_domain: str) -> bool:
    h = host.strip().lower().rstrip(".")
    r = reg_domain.strip().lower().rstrip(".")
    return h in ABUSED_HOSTING_EXACT_HOSTS or r in ABUSED_HOSTING_REGISTRABLE


def normalize_url_for_analysis(url: str) -> str:
    """Strip benign marketing tracking params (utm_*, ref, fbclid, etc.) without mutating domain/path."""
    try:
        parsed = urlparse(url.strip())
        if not parsed.scheme or not parsed.netloc:
            return url.strip()
        filtered = [
            (k, v)
            for k, v in parse_qsl(parsed.query, keep_blank_values=True)
            if k.lower() not in TRACKING_QUERY_PARAMS and not k.lower().startswith("utm_")
        ]
        return urlunparse(parsed._replace(query=urlencode(filtered)))
    except ValueError:
        return url.strip()


def extract_all_urls(text: str, explicit_urls: list[str] | None = None) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for raw in URL_RE.findall(text or "") + list(explicit_urls or []):
        cleaned = raw.strip().rstrip(".,;:!?)\"'<>]")
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            found.append(cleaned)
    return found


def _core_brand_stem(reg_domain: str) -> str:
    """Reduce mailer variants like 'facebookmail.com', 'email-marriott.com', 'axisbankmail.bank.in' to a stem."""
    if not reg_domain:
        return ""
    label = reg_domain.split(".", 1)[0].lower()
    cleaned = MAILER_AFFIX_RE.sub("", label)
    cleaned = re.sub(r"[^a-z0-9]", "", cleaned)
    return cleaned if len(cleaned) >= 4 else re.sub(r"[^a-z0-9]", "", label)


def domains_are_related(domain_a: str, domain_b: str) -> bool:
    """True if two registrable domains are identical, known siblings, or mailer/site variants of the same brand."""
    if not domain_a or not domain_b:
        return False
    a, b = domain_a.lower(), domain_b.lower()
    if a == b:
        return True
    for group in SIBLING_BRAND_GROUPS:
        if a in group and b in group:
            return True
    stem_a, stem_b = _core_brand_stem(a), _core_brand_stem(b)
    if len(stem_a) >= 4 and len(stem_b) >= 4 and stem_a == stem_b:
        return True
    return False


def is_trusted_domain(
    host: str,
    reg_domain: str,
    reputation: LocalDomainReputation,
) -> bool:
    if not reg_domain or is_ip_host(host):
        return False
    if reputation.is_locally_blocked(host, reg_domain):
        return False
    if reg_domain in FREE_WEBMAIL_DOMAINS or is_abused_hosting(host, reg_domain):
        return False
    if is_institutional_domain(reg_domain):
        return True
    return reputation.is_tranco_ranked(reg_domain)


def detect_brand_impersonation(
    domain_or_host: str,
    reputation: LocalDomainReputation | None = None,
) -> str | None:
    """
    Return impersonated brand name if an unverified domain embeds a protected brand keyword.
    Avoids false positives on institutional (.bank.in), official regional (.in/.co.uk), and Tranco-ranked domains.
    """
    rep = reputation or default_reputation
    host = extract_hostname(domain_or_host)
    reg = extract_registrable_domain(host)
    if not reg or is_institutional_domain(reg):
        return None
    if rep.is_tranco_ranked(reg, max_rank=500_000) and not is_abused_hosting(host, reg):
        return None

    for brand, official_domains in BRAND_OFFICIAL_DOMAINS.items():
        if reg in official_domains:
            return None
        if brand in host:
            return brand
    return None


def parse_auth_headers(headers: dict[str, Any] | str | None) -> tuple[str, str, str, bool]:
    if not headers:
        return "none", "none", "none", False

    header_text = (
        "\n".join(f"{k}: {v}" for k, v in headers.items())
        if isinstance(headers, dict)
        else str(headers)
    )
    lower = header_text.lower()

    def _extract_mech(mech: str) -> str:
        match = re.search(rf"\b{mech}\s*=\s*(pass|fail|softfail|permerror|temperror|neutral|none)\b", lower)
        if match:
            return match.group(1)
        if mech == "spf":
            rec_spf = re.search(r"received-spf\s*:\s*(pass|fail|softfail|neutral|none)\b", lower)
            if rec_spf:
                return rec_spf.group(1)
        return "none"

    spf = _extract_mech("spf")
    dkim = _extract_mech("dkim")
    dmarc = _extract_mech("dmarc")
    has_list_unsub = "list-unsubscribe:" in lower
    return spf, dkim, dmarc, has_list_unsub


def verify_email(
    *,
    subject: str,
    body: str,
    sender: str = "",
    reply_to: str = "",
    urls: list[str] | None = None,
    headers: dict[str, Any] | str | None = None,
    reputation: LocalDomainReputation | None = None,
) -> VerificationResult:
    rep = reputation or default_reputation
    result = VerificationResult(offline_reputation_loaded=rep.tranco_loaded_from_disk)
    combined_text = f"{subject or ''}\n{body or ''}"

    result.sender_email = extract_email_address(sender)
    sender_host = extract_hostname(result.sender_email or sender)
    result.sender_domain = extract_registrable_domain(sender_host)
    result.sender_tranco_rank = rep.get_tranco_rank(result.sender_domain)
    result.sender_is_trusted = is_trusted_domain(sender_host, result.sender_domain, rep)
    result.reply_to_domain = extract_registrable_domain(reply_to)

    # 1. Authentication headers (SPF / DKIM / DMARC / List-Unsubscribe)
    spf, dkim, dmarc, has_unsub = parse_auth_headers(headers)
    result.auth_spf, result.auth_dkim, result.auth_dmarc = spf, dkim, dmarc
    result.has_list_unsubscribe = has_unsub
    result.auth_passed = (spf == "pass" and (dkim == "pass" or dmarc == "pass")) or (
        dkim == "pass" and dmarc == "pass"
    )
    result.auth_failed = any(v in {"fail", "softfail", "permerror"} for v in (spf, dkim, dmarc))

    if result.auth_failed:
        result.hard_red_flags.append({
            "id": "IND-AUTH-FAIL",
            "title": "Email Authentication Failure",
            "description": f"Header authentication failed (SPF={spf}, DKIM={dkim}, DMARC={dmarc}).",
            "severity": "critical",
            "category": "headers",
            "score_impact": 45,
        })
    elif result.auth_passed:
        result.positive_signals.append({
            "id": "IND-AUTH-PASS",
            "title": "Authenticated Sender Headers",
            "description": f"Sender passed email authentication checks (SPF={spf}, DKIM={dkim}, DMARC={dmarc}).",
            "severity": "low",
            "category": "verification",
            "score_impact": 0,
        })

    # 2. Reply-To mismatch check (allow related sibling/mailer domains)
    if (
        result.sender_domain
        and result.reply_to_domain
        and not domains_are_related(result.sender_domain, result.reply_to_domain)
    ):
        result.hard_red_flags.append({
            "id": "IND-REPLYTO-MISMATCH",
            "title": "Sender and Reply-To Domain Mismatch",
            "description": f"Replies route to unrelated domain '{result.reply_to_domain}' instead of '{result.sender_domain}'.",
            "severity": "high",
            "category": "headers",
            "score_impact": 35,
        })

    # 3. Sender domain checks
    if result.sender_domain:
        if rep.is_locally_blocked(sender_host, result.sender_domain):
            result.hard_red_flags.append({
                "id": "IND-SENDER-BLOCKLIST",
                "title": "Sender Domain in Offline Phishing Blocklist",
                "description": f"Sender domain '{result.sender_domain}' matches local phishing blocklist.",
                "severity": "critical",
                "category": "sender",
                "score_impact": 55,
            })

        sender_spoof = detect_brand_impersonation(sender_host, rep)
        if sender_spoof:
            result.hard_red_flags.append({
                "id": "IND-SENDER-IMPERSONATION",
                "title": "Brand Impersonation in Sender Domain",
                "description": f"Unverified sender '{result.sender_domain}' embeds protected brand '{sender_spoof}'.",
                "severity": "critical",
                "category": "sender",
                "score_impact": 50,
            })

        sender_tld = result.sender_domain.rsplit(".", 1)[-1] if "." in result.sender_domain else ""
        if sender_tld in ABUSIVE_TLDS:
            result.hard_red_flags.append({
                "id": "IND-SENDER-ABUSIVE-TLD",
                "title": "High-Abuse Sender TLD",
                "description": f"Sender uses high-abuse TLD '.{sender_tld}' ({result.sender_domain}).",
                "severity": "high",
                "category": "sender",
                "score_impact": 35,
            })
        elif sender_tld in ELEVATED_RISK_TLDS and not result.sender_is_trusted:
            result.soft_warnings.append({
                "id": "IND-SENDER-ELEVATED-TLD",
                "title": "Unranked Non-Standard Sender TLD",
                "description": f"Sender '{result.sender_domain}' uses TLD '.{sender_tld}' and is not in offline Tranco Top-1M.",
                "severity": "medium",
                "category": "sender",
                "score_impact": 15,
            })

        if not result.sender_is_trusted and result.sender_domain not in FREE_WEBMAIL_DOMAINS:
            sender_label = result.sender_domain.split(".", 1)[0]
            matched_tokens = [tok for tok in SUSPICIOUS_DOMAIN_TOKENS if tok in sender_label]
            if matched_tokens and ("-" in sender_label or len(matched_tokens) >= 2):
                result.hard_red_flags.append({
                    "id": "IND-SENDER-LURE-DOMAIN",
                    "title": "Credential Lure Keywords in Unverified Sender Domain",
                    "description": f"Unverified sender '{result.sender_domain}' contains lure terms ({', '.join(matched_tokens[:3])}).",
                    "severity": "high",
                    "category": "sender",
                    "score_impact": 35,
                })

    # 4. URL inspection & destination reputation checks
    extracted_urls = extract_all_urls(combined_text, urls)
    url_domains_seen: list[str] = []
    trusted_url_domains: list[str] = []
    untrusted_url_domains: list[str] = []
    suspicious_mismatch_domains: list[str] = []

    for raw_url in extracted_urls:
        clean_url = normalize_url_for_analysis(raw_url)
        host = extract_hostname(clean_url)
        reg = extract_registrable_domain(host)

        if reg and reg not in url_domains_seen:
            url_domains_seen.append(reg)

        if rep.is_locally_blocked(host, reg):
            result.hard_red_flags.append({
                "id": "IND-URL-BLOCKLIST",
                "title": "Link Domain in Offline Phishing Blocklist",
                "description": f"Embedded link domain '{reg}' matches local phishing blocklist.",
                "severity": "critical",
                "category": "url",
                "score_impact": 55,
            })

        if is_ip_host(host):
            result.hard_red_flags.append({
                "id": "IND-URL-IP-LITERAL",
                "title": "IP-Address URL Detected",
                "description": f"Link points directly to raw IP address '{host}'.",
                "severity": "critical",
                "category": "url",
                "score_impact": 45,
            })

        if "xn--" in host:
            result.hard_red_flags.append({
                "id": "IND-URL-PUNYCODE",
                "title": "Punycode / Homograph Domain Detected",
                "description": f"Link host '{host}' uses punycode encoding.",
                "severity": "critical",
                "category": "url",
                "score_impact": 40,
            })

        if reg in URL_SHORTENERS:
            result.hard_red_flags.append({
                "id": "IND-URL-SHORTENER",
                "title": "Obfuscated URL Shortener",
                "description": f"Link conceals destination behind shortener '{reg}'.",
                "severity": "high",
                "category": "url",
                "score_impact": 30,
            })

        if is_abused_hosting(host, reg):
            result.hard_red_flags.append({
                "id": "IND-URL-ABUSED-CLOUD-HOST",
                "title": "Link Hosted on Commonly Abused Shared Platform",
                "description": f"Link uses shared/form hosting platform '{host}', frequently abused for credential harvesting.",
                "severity": "high",
                "category": "url",
                "score_impact": 35,
            })

        url_trusted = is_trusted_domain(host, reg, rep)
        if url_trusted:
            if reg not in trusted_url_domains:
                trusted_url_domains.append(reg)
        elif reg and reg not in untrusted_url_domains:
            untrusted_url_domains.append(reg)

        url_spoof = detect_brand_impersonation(host, rep)
        if url_spoof:
            result.hard_red_flags.append({
                "id": "IND-URL-BRAND-SPOOF",
                "title": "Deceptive Brand Keyword in Link Domain",
                "description": f"URL host '{host}' embeds protected brand '{url_spoof}' on an unverified domain '{reg}'.",
                "severity": "critical",
                "category": "url",
                "score_impact": 50,
            })

        url_tld = reg.rsplit(".", 1)[-1] if "." in reg else ""
        if url_tld in ABUSIVE_TLDS:
            result.hard_red_flags.append({
                "id": "IND-URL-ABUSIVE-TLD",
                "title": "High-Abuse Link TLD",
                "description": f"Link uses high-abuse TLD '.{url_tld}' ({reg}).",
                "severity": "high",
                "category": "url",
                "score_impact": 35,
            })

        if not url_trusted and reg:
            url_label = reg.split(".", 1)[0]
            matched_tokens = [tok for tok in SUSPICIOUS_DOMAIN_TOKENS if tok in url_label]
            if matched_tokens and ("-" in url_label or len(matched_tokens) >= 2):
                result.hard_red_flags.append({
                    "id": "IND-URL-LURE-DOMAIN",
                    "title": "Credential Keywords in Unverified Link Domain",
                    "description": f"Unverified link domain '{reg}' contains lure terms ({', '.join(matched_tokens[:3])}).",
                    "severity": "high",
                    "category": "url",
                    "score_impact": 35,
                })

        # Smart sender-to-URL mismatch check:
        # Allow legitimate mailer-to-website pairs (e.g. axisbankmail.bank.in -> axisbank.com,
        # facebookmail.com -> facebook.com) while catching spoofed senders linking to untrusted sites.
        if result.sender_domain and reg and not domains_are_related(result.sender_domain, reg):
            if not url_trusted:
                suspicious_mismatch_domains.append(reg)

    result.url_domains = url_domains_seen
    result.trusted_url_domains = trusted_url_domains
    result.untrusted_url_domains = untrusted_url_domains
    result.all_urls_trusted = bool(url_domains_seen) and len(untrusted_url_domains) == 0

    if suspicious_mismatch_domains:
        unique_mismatch = sorted(set(suspicious_mismatch_domains))
        result.hard_red_flags.append({
            "id": "IND-DOMAIN-MISMATCH",
            "title": "Sender and Unverified Link Domain Mismatch",
            "description": (
                f"Sender domain '{result.sender_domain}' links to unrelated unverified domain(s): "
                f"{', '.join(unique_mismatch[:3])}."
            ),
            "severity": "critical",
            "category": "url",
            "score_impact": 45,
        })

    # Freemail sender with links is never auto-trusted
    if result.sender_domain in FREE_WEBMAIL_DOMAINS and extracted_urls:
        result.hard_red_flags.append({
            "id": "IND-FREE-WEBMAIL-LURE",
            "title": "Free Webmail Sender With Actionable Links",
            "description": f"Message originates from personal webmail '{result.sender_domain}' while embedding external links.",
            "severity": "high",
            "category": "sender",
            "score_impact": 35,
        })

    # 5. Explicit credential-harvesting / panic coercion check
    for code, pattern in COERCION_PATTERNS:
        if pattern.search(combined_text):
            result.hard_red_flags.append({
                "id": f"IND-{code}",
                "title": "High-Risk Credential or Suspension Coercion",
                "description": "Email contains explicit account-suspension threat or direct password/OTP harvesting language.",
                "severity": "critical",
                "category": "content",
                "score_impact": 45,
            })
            break

    # 6. Positive alignment & offline trust signals
    if (
        result.sender_domain
        and result.sender_domain not in FREE_WEBMAIL_DOMAINS
        and not suspicious_mismatch_domains
        and (
            not url_domains_seen
            or all(domains_are_related(result.sender_domain, d) for d in url_domains_seen)
            or (result.sender_is_trusted and result.all_urls_trusted)
        )
    ):
        result.domains_aligned = True
        if url_domains_seen:
            result.positive_signals.append({
                "id": "IND-DOMAIN-ALIGNED",
                "title": "Aligned Sender and Link Domains",
                "description": f"Embedded links align cleanly with sender ecosystem '{result.sender_domain}'.",
                "severity": "low",
                "category": "verification",
                "score_impact": 0,
            })

    if result.sender_is_trusted and not result.has_hard_red_flags:
        basis = (
            "RBI/institutional verified domain suffix"
            if is_institutional_domain(result.sender_domain)
            else f"offline Tranco rank #{result.sender_tranco_rank:,}"
        )
        result.positive_signals.append({
            "id": "IND-OFFLINE-TRUSTED-SENDER",
            "title": "Recognized Sender Domain (Offline Reputation)",
            "description": f"Sender domain '{result.sender_domain}' verified via {basis}.",
            "severity": "low",
            "category": "verification",
            "score_impact": 0,
        })

    if result.all_urls_trusted and not result.has_hard_red_flags:
        result.positive_signals.append({
            "id": "IND-OFFLINE-TRUSTED-URLS",
            "title": "All Links Resolve to Trusted Destinations",
            "description": f"All embedded link domains ({', '.join(result.trusted_url_domains[:3])}) are verified offline.",
            "severity": "low",
            "category": "verification",
            "score_impact": 0,
        })

    if result.has_list_unsubscribe and not result.has_hard_red_flags:
        result.positive_signals.append({
            "id": "IND-LIST-UNSUBSCRIBE",
            "title": "Commercial List-Unsubscribe Header Present",
            "description": "Email includes a standard List-Unsubscribe header typical of legitimate subscriptions.",
            "severity": "low",
            "category": "verification",
            "score_impact": 0,
        })

    return result


def fuse_risk(
    *,
    p_content: float,
    verification: VerificationResult,
    threshold_low: float,
    threshold_high: float,
) -> FusionDecision:
    """
    Fuse PAHF-Net neural content probability with strictly offline verification signals.
    Never dampens risk when any hard red flag is present.
    """
    p_content = max(0.0, min(1.0, float(p_content)))

    # Rule 1: Any hard technical, blocklist, or coercion red flag -> preserve full neural risk.
    if verification.has_hard_red_flags:
        floor = 0.88 if len(verification.hard_red_flags) >= 2 else 0.0
        p_final = max(p_content, floor)
        verdict = "Malicious" if p_final >= threshold_high else ("Suspicious" if p_final >= threshold_low else "Safe")
        return FusionDecision(
            p_content=p_content,
            p_final=round(p_final, 6),
            verdict=verdict,
            is_phishing=(verdict == "Malicious"),
            decision_basis="neural_plus_red_flags",
        )

    # Rule 2: PAHF-Net already classifies content as benign.
    if p_content < threshold_low:
        return FusionDecision(
            p_content=p_content,
            p_final=round(p_content, 6),
            verdict="Safe",
            is_phishing=False,
            decision_basis="neural_benign",
        )

    # Rule 3: High commercial/financial content score, ZERO hard red flags, and strong offline trust:
    #   - Aligned/related sender + links AND (sender is offline-trusted OR all URLs are offline-trusted OR auth passed)
    #   - Also covers trusted senders with no links (e.g., plain-text bank transaction alert from hdfcbank.com)
    has_strong_trust = (
        verification.domains_aligned
        and (verification.auth_passed or verification.sender_is_trusted or verification.all_urls_trusted)
    )
    if has_strong_trust:
        if verification.auth_passed and (verification.sender_is_trusted or verification.all_urls_trusted):
            p_final = 0.06 + 0.08 * p_content  # ~0.14
        else:
            p_final = 0.10 + 0.11 * p_content  # ~0.21 (cleanly below thr_low=0.2872)
        p_final = min(p_final, max(0.05, threshold_low - 0.04))
        return FusionDecision(
            p_content=p_content,
            p_final=round(p_final, 6),
            verdict="Safe",
            is_phishing=False,
            decision_basis="offline_verified_aligned_commercial_or_transactional",
        )

    # Rule 4: Aligned unranked sender (e.g., startup like banza.xyz or local store) with ZERO hard red flags.
    if verification.domains_aligned:
        p_final = min(threshold_high - 0.05, max(threshold_low + 0.04, 0.30 + 0.10 * p_content))
        return FusionDecision(
            p_content=p_content,
            p_final=round(p_final, 6),
            verdict="Suspicious",
            is_phishing=False,
            decision_basis="aligned_unranked_needs_header_check",
        )

    # Rule 5: Missing sender context (body-only paste) and ZERO hard red flags.
    if not verification.sender_domain:
        base = 0.31 + 0.09 * p_content if verification.all_urls_trusted else 0.36 + 0.10 * p_content
        p_final = min(threshold_high - 0.02, max(threshold_low + 0.04, base))
        return FusionDecision(
            p_content=p_content,
            p_final=round(p_final, 6),
            verdict="Suspicious",
            is_phishing=False,
            decision_basis="missing_sender_context",
        )

    # Fallback: Unrelated sender + trusted URL without auth headers -> Suspicious (not auto-Safe).
    if verification.all_urls_trusted and not verification.has_hard_red_flags:
        p_final = min(threshold_high - 0.03, max(threshold_low + 0.05, 0.34 + 0.10 * p_content))
        return FusionDecision(
            p_content=p_content,
            p_final=round(p_final, 6),
            verdict="Suspicious",
            is_phishing=False,
            decision_basis="unrelated_sender_to_trusted_destination",
        )

    return FusionDecision(
        p_content=p_content,
        p_final=round(p_content, 6),
        verdict="Malicious" if p_content >= threshold_high else "Suspicious",
        is_phishing=(p_content >= threshold_high),
        decision_basis="neural_default",
    )