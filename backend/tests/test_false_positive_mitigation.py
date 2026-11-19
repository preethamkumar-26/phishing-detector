import unittest

from app.services.domain_reputation import LocalDomainReputation
from app.services.verification import (
    detect_brand_impersonation,
    extract_registrable_domain,
    fuse_risk,
    normalize_url_for_analysis,
    verify_email,
)


class TestOfflineTrackAV2(unittest.TestCase):
    THR_LOW = 0.2872
    THR_HIGH = 0.50

    def setUp(self):
        self.rep = LocalDomainReputation()
        self.rep.blocked_domains = {"known-phish-example.com"}

    def test_domain_extraction_and_tracking_strip(self):
        self.assertEqual(extract_registrable_domain("info@digital.axisbankmail.bank.in"), "axisbankmail.bank.in")
        self.assertEqual(extract_registrable_domain("https://www.amazon.in/gp/goldbox"), "amazon.in")
        self.assertEqual(extract_registrable_domain("https://online.sbi.co.in/login"), "sbi.co.in")
        self.assertIsNone(detect_brand_impersonation("www.amazon.in", self.rep))
        self.assertIsNone(detect_brand_impersonation("digital.axisbankmail.bank.in", self.rep))
        self.assertEqual(detect_brand_impersonation("hdfc-verify-login.xyz", self.rep), "hdfc")

        clean = normalize_url_for_analysis(
            "https://www.spotify.com/in-en/family/?utm_source=email&utm_campaign=upgrade&plan=family"
        )
        self.assertEqual(clean, "https://www.spotify.com/in-en/family/?plan=family")

    # --- REAL-WORLD LEGITIMATE CASES (must NOT be flagged as Phishing) ---

    def test_axis_bank_bank_in_mailer_to_axisbank_com_is_safe(self):
        v = verify_email(
            sender='"Axis Bank" <info@digital.axisbankmail.bank.in>',
            subject="Your Monthly Account Statement is Ready",
            body="View your statement online: https://www.axisbank.com/statements",
            reputation=self.rep,
        )
        self.assertFalse(v.has_hard_red_flags)
        d = fuse_risk(p_content=0.999, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Safe")
        self.assertFalse(d.is_phishing)

    def test_hdfc_bank_statement_is_safe(self):
        v = verify_email(
            sender="alerts@hdfcbank.com",
            subject="Your Monthly Account Statement is Ready",
            body="Sign in to NetBanking: https://www.hdfcbank.com/personal/ways-to-bank/netbanking",
            reputation=self.rep,
        )
        d = fuse_risk(p_content=0.9987, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Safe")
        self.assertFalse(d.is_phishing)

    def test_facebook_and_marriott_dedicated_mailers_are_safe(self):
        for sender, url in [
            ("notification@priority.facebookmail.com", "https://www.facebook.com/notifications"),
            ("marriottbonvoy@email-marriott.com", "https://www.marriott.com/loyalty/offers"),
            ("noreply@unstop.news", "https://unstop.com/competitions"),
            ("no-reply@rmp.flipkart.com", "https://www.flipkart.com/offers"),
            ("deals@amazon.in", "https://www.amazon.in/gp/goldbox?utm_medium=email&ref=promo_123"),
        ]:
            v = verify_email(
                sender=sender,
                subject="Claim your exclusive reward and discount today",
                body=f"Check out this offer: {url}",
                reputation=self.rep,
            )
            self.assertFalse(v.has_hard_red_flags, f"Unexpected red flag for {sender}: {v.hard_red_flags}")
            d = fuse_risk(p_content=0.999, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
            self.assertEqual(d.verdict, "Safe", f"Expected Safe for {sender}")
            self.assertFalse(d.is_phishing)

    def test_legitimate_unranked_xyz_startup_is_suspicious_not_malicious(self):
        v = verify_email(
            sender="no-reply@banza.xyz",
            subject="Earn cashback rewards on your account",
            body="Explore your rewards at https://banza.xyz/rewards",
            reputation=self.rep,
        )
        self.assertFalse(v.has_hard_red_flags)
        d = fuse_risk(p_content=0.99, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Suspicious")
        self.assertFalse(d.is_phishing)

    def test_unranked_xyz_startup_with_passing_auth_headers_is_safe(self):
        v = verify_email(
            sender="no-reply@banza.xyz",
            subject="Earn cashback rewards on your account",
            body="Explore your rewards at https://banza.xyz/rewards",
            headers={
                "Authentication-Results": "mx.google.com; spf=pass; dkim=pass; dmarc=pass",
                "List-Unsubscribe": "<mailto:unsubscribe@banza.xyz>",
            },
            reputation=self.rep,
        )
        d = fuse_risk(p_content=0.99, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Safe")
        self.assertFalse(d.is_phishing)

    # --- REAL PHISHING CASES (must STAY Malicious — zero bypass) ---

    def test_self_aligned_brand_spoof_remains_malicious(self):
        v = verify_email(
            sender="alerts@hdfc-verify-login.xyz",
            subject="Your Monthly Account Statement is Ready",
            body="Sign in now: https://hdfc-verify-login.xyz/netbanking",
            reputation=self.rep,
        )
        self.assertTrue(v.has_hard_red_flags)
        d = fuse_risk(p_content=0.99, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Malicious")
        self.assertTrue(d.is_phishing)

    def test_spoofed_from_linking_to_abused_cloud_form_remains_malicious(self):
        v = verify_email(
            sender="alerts@hdfcbank.com",
            subject="Update your KYC details",
            body="Submit KYC form immediately: https://docs.google.com/forms/d/e/1FAIpQLFake/viewform",
            reputation=self.rep,
        )
        self.assertTrue(v.has_hard_red_flags)
        d = fuse_risk(p_content=0.99, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Malicious")
        self.assertTrue(d.is_phishing)

    def test_spoofed_from_with_untrusted_url_mismatch_remains_malicious(self):
        v = verify_email(
            sender="alerts@hdfcbank.com",
            subject="Your Monthly Account Statement is Ready",
            body="View statement: https://secure-portal-update.xyz/hdfc",
            reputation=self.rep,
        )
        self.assertTrue(v.has_hard_red_flags)
        d = fuse_risk(p_content=0.99, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Malicious")
        self.assertTrue(d.is_phishing)

    def test_failed_auth_headers_always_malicious(self):
        v = verify_email(
            sender="alerts@hdfcbank.com",
            subject="Your Monthly Account Statement is Ready",
            body="View statement: https://www.hdfcbank.com/personal/ways-to-bank/netbanking",
            headers="Authentication-Results: mx.google.com; spf=fail; dkim=fail; dmarc=fail",
            reputation=self.rep,
        )
        self.assertTrue(v.auth_failed)
        d = fuse_risk(p_content=0.99, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Malicious")
        self.assertTrue(d.is_phishing)

    def test_freemail_with_shortener_remains_malicious(self):
        v = verify_email(
            sender="hdfc.alerts@gmail.com",
            subject="Account KYC alert",
            body="Verify now: https://bit.ly/3fakekyc",
            reputation=self.rep,
        )
        d = fuse_risk(p_content=0.99, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Malicious")
        self.assertTrue(d.is_phishing)

    def test_offline_blocklist_hit_is_malicious(self):
        v = verify_email(
            sender="offers@known-phish-example.com",
            subject="Discount offer",
            body="Visit https://known-phish-example.com/claim",
            reputation=self.rep,
        )
        self.assertTrue(v.has_hard_red_flags)
        d = fuse_risk(p_content=0.95, verification=v, threshold_low=self.THR_LOW, threshold_high=self.THR_HIGH)
        self.assertEqual(d.verdict, "Malicious")
        self.assertTrue(d.is_phishing)


if __name__ == "__main__":
    unittest.main()