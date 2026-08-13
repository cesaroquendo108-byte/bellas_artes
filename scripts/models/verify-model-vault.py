#!/usr/bin/env python3
"""Verify every recorded file in a Bellas Artes model vault."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    failures: list[str] = []
    verified = 0
    for manifest_path in sorted((args.root / "manifests").glob("*.json")):
        record = json.loads(manifest_path.read_text(encoding="utf-8"))
        model_root = args.root / record["modelId"]
        for entry in record.get("files", []):
            path = model_root / entry["path"]
            if not path.is_file():
                failures.append(f"missing:{record['modelId']}:{entry['path']}")
                continue
            if path.stat().st_size != entry["bytes"]:
                failures.append(f"size:{record['modelId']}:{entry['path']}")
                continue
            if sha256_file(path) != entry["sha256"]:
                failures.append(f"sha256:{record['modelId']}:{entry['path']}")
                continue
            verified += 1
    print(json.dumps({"verifiedFiles": verified, "failures": failures}, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
