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
    parser.add_argument("--model", action="append", default=[], help="Verifica sólo este modelId; puede repetirse.")
    parser.add_argument("--progress", action="store_true", help="Publica avance por modelo en stderr.")
    args = parser.parse_args()
    failures: list[str] = []
    verified = 0
    records = [
        (manifest_path, json.loads(manifest_path.read_text(encoding="utf-8")))
        for manifest_path in sorted((args.root / "manifests").glob("*.json"))
    ]
    requested = set(args.model)
    available = {record["modelId"] for _, record in records}
    unknown = sorted(requested - available)
    if unknown:
        parser.error(f"modelId sin manifest: {', '.join(unknown)}")
    selected = [(path, record) for path, record in records if not requested or record["modelId"] in requested]
    verified_models: list[str] = []
    for index, (_, record) in enumerate(selected, start=1):
        model_id = record["modelId"]
        if args.progress:
            print(f"[{index}/{len(selected)}] verificando {model_id}", file=sys.stderr, flush=True)
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
        verified_models.append(model_id)
        if args.progress:
            print(f"[{index}/{len(selected)}] terminado {model_id}", file=sys.stderr, flush=True)
    print(json.dumps({"verifiedModels": verified_models, "verifiedFiles": verified, "failures": failures}, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
