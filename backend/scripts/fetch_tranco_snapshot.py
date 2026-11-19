"""
One-time offline preparation script.
Downloads the official Tranco Top-1M list once and saves a compact gzipped snapshot
to backend/saved_models/tranco_top1m.csv.gz so PhishIntel runs 100% offline at runtime.
"""
from __future__ import annotations

import gzip
import io
from pathlib import Path
import urllib.request
import zipfile

TRANCO_ZIP_URL = "https://tranco-list.eu/top-1m.csv.zip"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "saved_models" / "tranco_top1m.csv.gz"


def fetch_tranco_snapshot(output_path: Path = OUTPUT_PATH, max_rows: int = 1_000_000) -> int:
    print(f"Downloading Tranco Top-1M archive from {TRANCO_ZIP_URL} ...")
    req = urllib.request.Request(
        TRANCO_ZIP_URL,
        headers={"User-Agent": "PhishIntel-Offline-Snapshot/2.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw_zip = resp.read()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    written = 0

    with zipfile.ZipFile(io.BytesIO(raw_zip)) as zf:
        csv_name = next((n for n in zf.namelist() if n.endswith(".csv")), None)
        if not csv_name:
            raise RuntimeError("No CSV file found inside Tranco ZIP archive.")

        with zf.open(csv_name, "r") as src, gzip.open(output_path, "wt", encoding="utf-8", compresslevel=6) as dst:
            for raw_line in src:
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line or "," not in line:
                    continue
                dst.write(line + "\n")
                written += 1
                if written >= max_rows:
                    break

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"Saved {written:,} domains to {output_path} ({size_mb:.2f} MB).")
    return written


if __name__ == "__main__":
    fetch_tranco_snapshot()