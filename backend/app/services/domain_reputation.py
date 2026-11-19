from __future__ import annotations

import csv
import gzip
import io
import logging
from pathlib import Path
import zipfile

logger = logging.getLogger(__name__)

# Minimal built-in fallback used ONLY when tranco_top1m.csv.gz is not present on disk.
# Once tranco_top1m.csv.gz is downloaded, all 1,000,000 Tranco domains are available offline.
FALLBACK_CORE_DOMAINS: dict[str, int] = {
    "google.com": 1, "youtube.com": 2, "microsoft.com": 3, "facebook.com": 4,
    "facebookmail.com": 2500, "apple.com": 5, "amazon.com": 10, "amazon.in": 45,
    "aws.com": 120, "linkedin.com": 15, "instagram.com": 18, "netflix.com": 25,
    "spotify.com": 35, "github.com": 40, "openai.com": 50, "claude.ai": 500,
    "claude.com": 1500, "reddit.com": 60, "redditmail.com": 3000, "pinterest.com": 70,
    "adobe.com": 80, "canva.com": 90, "cisco.com": 100, "samsung.com": 110,
    "dropbox.com": 130, "zoom.us": 140, "slack.com": 150, "uber.com": 160,
    "paypal.com": 170, "stripe.com": 180, "epicgames.com": 190, "marriott.com": 250,
    "hdfcbank.com": 800, "hdfcbank.net": 2500, "icicibank.com": 900,
    "sbi.co.in": 700, "sbimf.com": 4500, "axisbank.com": 950, "kotak.com": 1800,
    "flipkart.com": 300, "myntra.com": 1200, "swiggy.in": 1400, "zomato.com": 1300,
    "bookmyshow.com": 1600, "paytm.com": 1100, "bigbasket.com": 2200,
    "jiomart.com": 2400, "ajio.in": 2600, "easemytrip.com": 3500, "naukri.com": 1500,
    "leetcode.com": 1700, "kaggle.com": 1900, "w3schools.com": 400, "codepen.io": 2100,
    "codechef.com": 4000, "perplexity.ai": 900, "coca-cola.com": 2800, "puma.com": 2900,
    "lge.com": 3200, "unstop.com": 5000, "razorpay.com": 2700, "chase.com": 350,
    "bankofamerica.com": 360, "wellsfargo.com": 370, "citi.com": 380, "hsbc.com": 420,
    "barclays.co.uk": 600, "walmart.com": 220, "ebay.com": 210, "airbnb.com": 230,
}


class LocalDomainReputation:
    """Strictly offline in-memory domain reputation store (Tranco snapshot + optional local blocklist)."""

    def __init__(self, max_rank: int = 1_000_000) -> None:
        self.max_rank = max_rank
        self.tranco_ranks: dict[str, int] = dict(FALLBACK_CORE_DOMAINS)
        self.blocked_domains: set[str] = set()
        self.tranco_loaded_from_disk: bool = False
        self.tranco_count: int = len(self.tranco_ranks)
        self.blocked_count: int = 0

    def load_from_directory(
        self,
        model_dir: Path,
        tranco_filename: str = "tranco_top1m.csv.gz",
        blocklist_filename: str = "offline_phish_domains.txt",
    ) -> None:
        """Load offline reputation artifacts from disk once at startup. Never makes network calls."""
        candidates = [
            model_dir / tranco_filename,
            model_dir / "tranco_top1m.csv",
            model_dir / "top-1m.csv.zip",
            model_dir / "top-1m.csv",
        ]
        for path in candidates:
            if path.is_file():
                loaded = self._load_tranco_file(path)
                if loaded > 0:
                    self.tranco_loaded_from_disk = True
                    self.tranco_count = len(self.tranco_ranks)
                    logger.info("Loaded %d offline Tranco domains from %s", loaded, path.name)
                    break

        if not self.tranco_loaded_from_disk:
            logger.warning(
                "Offline Tranco snapshot not found in %s; using %d built-in fallback domains. "
                "Run backend/scripts/fetch_tranco_snapshot.py once to enable full Top-1M offline lookup.",
                model_dir,
                len(self.tranco_ranks),
            )

        block_path = model_dir / blocklist_filename
        if block_path.is_file():
            self._load_blocklist_file(block_path)
            logger.info("Loaded %d offline blocked domains from %s", self.blocked_count, block_path.name)

    def _load_tranco_file(self, path: Path) -> int:
        ranks: dict[str, int] = {}
        suffix = path.suffix.lower()

        def _consume_lines(text_stream: io.TextIOBase) -> int:
            count = 0
            reader = csv.reader(text_stream)
            for row in reader:
                if len(row) < 2:
                    continue
                try:
                    rank = int(row[0].strip())
                except ValueError:
                    continue
                if rank > self.max_rank:
                    break
                domain = row[1].strip().lower().rstrip(".")
                if domain:
                    ranks[domain] = rank
                    count += 1
            return count

        try:
            if suffix == ".gz":
                with gzip.open(path, "rt", encoding="utf-8", errors="ignore") as f:
                    loaded = _consume_lines(f)
            elif suffix == ".zip":
                with zipfile.ZipFile(path, "r") as zf:
                    csv_name = next((n for n in zf.namelist() if n.endswith(".csv")), None)
                    if not csv_name:
                        return 0
                    with zf.open(csv_name, "r") as raw:
                        loaded = _consume_lines(io.TextIOWrapper(raw, encoding="utf-8", errors="ignore"))
            else:
                with path.open("rt", encoding="utf-8", errors="ignore") as f:
                    loaded = _consume_lines(f)
        except Exception as exc:
            logger.error("Failed to read offline Tranco snapshot %s: %s", path, exc)
            return 0

        if loaded > 0:
            # Keep fallback entries for any domain missing from the snapshot, letting snapshot ranks win.
            merged = dict(FALLBACK_CORE_DOMAINS)
            merged.update(ranks)
            self.tranco_ranks = merged
        return loaded

    def _load_blocklist_file(self, path: Path) -> None:
        blocked: set[str] = set()
        try:
            with path.open("rt", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    entry = line.strip().lower().rstrip(".")
                    if entry and not entry.startswith("#"):
                        blocked.add(entry)
        except Exception as exc:
            logger.error("Failed to read offline blocklist %s: %s", path, exc)
            return
        self.blocked_domains = blocked
        self.blocked_count = len(blocked)

    def get_tranco_rank(self, domain: str) -> int | None:
        if not domain:
            return None
        return self.tranco_ranks.get(domain.strip().lower().rstrip("."))

    def is_tranco_ranked(self, domain: str, max_rank: int | None = None) -> bool:
        rank = self.get_tranco_rank(domain)
        if rank is None:
            return False
        limit = self.max_rank if max_rank is None else max_rank
        return rank <= limit

    def is_locally_blocked(self, host: str, registrable_domain: str) -> bool:
        if not self.blocked_domains:
            return False
        h = host.strip().lower().rstrip(".")
        r = registrable_domain.strip().lower().rstrip(".")
        return h in self.blocked_domains or r in self.blocked_domains


# Default singleton (populated at startup by ModelService.load_model())
default_reputation = LocalDomainReputation()