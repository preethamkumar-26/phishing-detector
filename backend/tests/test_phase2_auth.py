import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import HTTPException
from supabase_auth.errors import AuthApiError

from app.auth import (
    AuthenticatedUser,
    get_current_user,
    verify_supabase_token,
    get_user_supabase_client,
    get_base_client,
)
from app.main import app
from app.services.model_service import model_service


MOCK_SCAN_RESULT = {
    "success": True,
    "scan_id": "SCN-TEST-1001",
    "is_phishing": True,
    "verdict": "Malicious",
    "confidence_score": 0.94,
    "risk_score": 94.0,
    "p_phish": 0.94,
    "indicators": [
        {"title": "Deceptive URL", "severity": "high", "description": "Suspicious login domain"}
    ],
    "explainability": {
        "summary": "High linguistic and URL risk detected.",
        "feature_contributions": {"text": 0.5, "url": 0.4, "headers": 0.1},
    },
}


class TestPhase2UnauthenticatedAccess(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_analyze_rejects_missing_auth(self):
        res = self.client.post("/api/v1/analyze", json={"content": "urgent verify account"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("Authentication required", res.json()["detail"])

    def test_scan_alias_rejects_missing_auth(self):
        res = self.client.post("/api/v1/scan", json={"content": "urgent verify account"})
        self.assertEqual(res.status_code, 401)

    def test_scans_list_rejects_missing_auth(self):
        res = self.client.get("/api/v1/scans")
        self.assertEqual(res.status_code, 401)

    def test_scans_detail_rejects_missing_auth(self):
        res = self.client.get("/api/v1/scans/SCN-TEST-1001")
        self.assertEqual(res.status_code, 401)

    def test_scans_delete_rejects_missing_auth(self):
        res = self.client.delete("/api/v1/scans/SCN-TEST-1001")
        self.assertEqual(res.status_code, 401)

    def test_malformed_auth_header_rejected(self):
        # Empty bearer token
        res = self.client.post(
            "/api/v1/analyze",
            headers={"Authorization": "Bearer   "},
            json={"content": "urgent"},
        )
        self.assertEqual(res.status_code, 401)

        # Invalid token scheme
        res_basic = self.client.post(
            "/api/v1/analyze",
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
            json={"content": "urgent"},
        )
        self.assertEqual(res_basic.status_code, 401)


class TestPhase2TokenValidation(unittest.TestCase):
    @patch("app.auth.get_base_client")
    def test_invalid_or_expired_token_returns_401(self, mock_get_base):
        mock_auth = MagicMock()
        mock_auth.get_user.side_effect = AuthApiError("Invalid JWT: token has expired", 401, "invalid_jwt")
        mock_client = MagicMock()
        mock_client.auth = mock_auth
        mock_get_base.return_value = mock_client

        with self.assertRaises(HTTPException) as ctx:
            verify_supabase_token("expired-jwt-token-xyz")
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid or expired authentication token", ctx.exception.detail)

    @patch("app.auth.get_base_client")
    def test_valid_token_returns_authenticated_user(self, mock_get_base):
        mock_user = MagicMock()
        mock_user.id = "usr_valid_uuid_0001"
        mock_user.email = "analyst@phishintel.test"
        mock_user.role = "authenticated"

        mock_response = MagicMock()
        mock_response.user = mock_user

        mock_auth = MagicMock()
        mock_auth.get_user.return_value = mock_response

        mock_client = MagicMock()
        mock_client.auth = mock_auth
        mock_get_base.return_value = mock_client

        auth_user = verify_supabase_token("valid-jwt-token-123")
        self.assertEqual(auth_user.id, "usr_valid_uuid_0001")
        self.assertEqual(auth_user.email, "analyst@phishintel.test")
        self.assertEqual(auth_user.role, "authenticated")
        self.assertEqual(auth_user.token, "valid-jwt-token-123")


class TestPhase2ScanExecutionAndUserIdDerivation(unittest.TestCase):
    def test_backend_strictly_derives_user_id_ignoring_body(self):
        """
        Verify that even if the request body or query specifies a foreign user_id,
        the backend assigns ownership strictly from the verified JWT identity.
        """
        legitimate_user_id = "00000000-0000-0000-0000-000000000001"
        spoofed_attacker_id = "99999999-9999-9999-9999-999999999999"

        authenticated_user = AuthenticatedUser(
            id=legitimate_user_id,
            email="victim@phishintel.test",
            role="authenticated",
            token="legitimate-token-abc",
        )

        app.dependency_overrides[get_current_user] = lambda: authenticated_user

        try:
            with (
                patch.object(model_service, "load_model"),
                patch.object(model_service, "is_ready", True),
                patch.object(model_service, "predict", return_value=MOCK_SCAN_RESULT) as predict_mock,
                patch("app.api.routes.get_user_supabase_client") as mock_user_client_factory,
                TestClient(app) as client,
            ):
                mock_table = MagicMock()
                mock_upsert = MagicMock()
                mock_upsert.execute.return_value = MagicMock(data=[])
                mock_table.upsert.return_value = mock_upsert

                mock_client_instance = MagicMock()
                mock_client_instance.table.return_value = mock_table
                mock_user_client_factory.return_value = mock_client_instance

                # Client attempts to spoof user_id in the payload
                payload = {
                    "subject": "Phishing Attempt",
                    "content": "Click here to claim your refund immediately.",
                    "sender": "spoofer@evil.test",
                    "user_id": spoofed_attacker_id,  # Spoof attempt
                }

                response = client.post(
                    "/api/v1/analyze",
                    headers={"Authorization": "Bearer legitimate-token-abc"},
                    json=payload,
                )

                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertEqual(data["scan_id"], "SCN-TEST-1001")
                self.assertTrue(data["is_phishing"])
                self.assertEqual(data["verdict"], "Malicious")

                # Verify PAHF-Net model was called
                predict_mock.assert_called_once()

                # Verify Supabase was called with legitimate user_id, NOT spoofed_attacker_id
                mock_user_client_factory.assert_called_once_with("legitimate-token-abc")
                mock_table.upsert.assert_called_once()
                saved_record = mock_table.upsert.call_args[0][0]
                self.assertEqual(saved_record["user_id"], legitimate_user_id)
                self.assertNotEqual(saved_record["user_id"], spoofed_attacker_id)

        finally:
            app.dependency_overrides.clear()


class TestPhase2UserIsolation(unittest.TestCase):
    def test_user_a_cannot_read_or_delete_user_b_scan(self):
        user_a = AuthenticatedUser(
            id="user-a-1111",
            email="user_a@test.com",
            role="authenticated",
            token="token-user-a",
        )

        app.dependency_overrides[get_current_user] = lambda: user_a

        try:
            with (
                patch("app.api.routes.get_user_supabase_client") as mock_user_client_factory,
                TestClient(app) as client,
            ):
                # Simulate Postgres RLS filtering: User A querying a scan belonging to User B
                # results in empty data because auth.uid() != user_b
                mock_select_builder = MagicMock()
                mock_select_builder.eq.return_value.execute.return_value = MagicMock(data=[])
                mock_table = MagicMock()
                mock_table.select.return_value = mock_select_builder

                # Delete returns empty data when RLS filters it out
                mock_delete_builder = MagicMock()
                mock_delete_builder.eq.return_value.execute.return_value = MagicMock(data=[])
                mock_table.delete.return_value = mock_delete_builder

                mock_client_instance = MagicMock()
                mock_client_instance.table.return_value = mock_table
                mock_user_client_factory.return_value = mock_client_instance

                # 1. User A tries to GET User B's scan
                res_get = client.get(
                    "/api/v1/scans/SCN-USER-B-SECRET",
                    headers={"Authorization": "Bearer token-user-a"},
                )
                self.assertEqual(res_get.status_code, 404)
                self.assertIn("Scan record not found or access denied", res_get.json()["detail"])

                # 2. Verify get_user_supabase_client received user A's token
                mock_user_client_factory.assert_called_with("token-user-a")

        finally:
            app.dependency_overrides.clear()


class TestPhase2RequestScopedClientIsolation(unittest.TestCase):
    def test_request_scoped_supabase_client_isolation(self):
        """
        Verify that get_user_supabase_client creates client instances with user JWT
        and does not mutate global base client headers.
        """
        token_a = "jwt-user-alice"
        token_b = "jwt-user-bob"

        client_a = get_user_supabase_client(token_a)
        client_b = get_user_supabase_client(token_b)

        # Ensure both are independent instances with their respective authorization headers
        header_a = client_a.postgrest.headers.get("Authorization") or client_a.postgrest.headers.get("authorization")
        header_b = client_b.postgrest.headers.get("Authorization") or client_b.postgrest.headers.get("authorization")

        self.assertEqual(header_a, f"Bearer {token_a}")
        self.assertEqual(header_b, f"Bearer {token_b}")
        self.assertNotEqual(header_a, header_b)

        # Base client remains clean
        base = get_base_client()
        base_header = base.postgrest.headers.get("Authorization") or base.postgrest.headers.get("authorization")
        # Base client has publishable/anon key authorization, NOT user's JWT
        self.assertNotIn(token_a, str(base_header))
        self.assertNotIn(token_b, str(base_header))


if __name__ == "__main__":
    unittest.main()
