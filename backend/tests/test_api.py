import json
import sys
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"


def run_tests() -> None:
    print("=== Running PhishIntel Backend Verification Suite ===")

    # 1. Test /healthz
    with urllib.request.urlopen(f"{BASE_URL}/healthz") as res:
        data = json.loads(res.read().decode("utf-8"))
        assert res.status == 200 and data["model_loaded"] is True, "Health check failed!"
        print(f"[PASS] /healthz -> status={data['status']}, engine={data['engine']}")

    # 2. Test Phishing Email Prediction
    phish_payload = json.dumps({
        "subject": "URGENT: Your PayPal account has been suspended",
        "sender": "security@paypa1-verification.xyz",
        "content": (
            "Unauthorized login attempt detected. Verify your account immediately "
            "within 24 hours by clicking http://192.168.10.25/login to confirm your password."
        ),
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/v1/analyze",
        data=phish_payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as res:
        result = json.loads(res.read().decode("utf-8"))
        assert result["is_phishing"] is True, "Expected phishing=True!"
        assert result["risk_score"] >= 70, f"Expected high risk score, got {result['risk_score']}"
        print(
            f"[PASS] Phishing Email Test -> verdict={result['verdict']}, "
            f"risk_score={result['risk_score']}, tokens_flagged={len(result['explainability']['flagged_tokens'])}"
        )

    # 3. Test Legitimate Safe Email Prediction
    safe_payload = json.dumps({
        "subject": "Weekly Engineering Standup Notes",
        "sender": "teammate@company.com",
        "content": "Hi team, attached are the notes from Tuesday's sprint retrospective. See you tomorrow at 10 AM.",
    }).encode("utf-8")

    req_safe = urllib.request.Request(
        f"{BASE_URL}/api/v1/analyze",
        data=safe_payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req_safe) as res:
        result_safe = json.loads(res.read().decode("utf-8"))
        assert result_safe["is_phishing"] is False, "Expected phishing=False for safe email!"
        print(
            f"[PASS] Safe Email Test -> verdict={result_safe['verdict']}, "
            f"risk_score={result_safe['risk_score']}"
        )

    # 4. Test Validation Error Handling (Empty Email)
    empty_payload = json.dumps({"content": "   "}).encode("utf-8")
    req_empty = urllib.request.Request(
        f"{BASE_URL}/api/v1/analyze",
        data=empty_payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req_empty)
        print("[FAIL] Empty email should have returned HTTP 422")
        sys.exit(1)
    except urllib.error.HTTPError as err:
        assert err.code == 422, f"Expected 422, got {err.code}"
        print("[PASS] Validation Error Test -> Properly rejected empty payload with HTTP 422")

    print("\n=== ALL BACKEND TESTS PASSED SUCCESSFULLY! ===")


if __name__ == "__main__":
    run_tests()