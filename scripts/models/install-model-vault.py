#!/usr/bin/env python3
"""Install pinned Bellas Artes model artifacts without embedding credentials."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = REPO_ROOT / "infra/models/model-vault.json"


def run(command: list[str], *, cwd: Path | None = None) -> None:
    subprocess.run(command, cwd=cwd, check=True)


def safe_name(value: str) -> str:
    return value.replace("/", "--").replace(" ", "-")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def inventory(path: Path) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for file in sorted(item for item in path.rglob("*") if item.is_file() and ".git" not in item.parts):
        entries.append({
            "path": str(file.relative_to(path)),
            "bytes": file.stat().st_size,
            "sha256": sha256_file(file),
        })
    return entries


def install_git(package: dict[str, Any], destination: Path) -> None:
    target = destination / "repositories" / safe_name(package["url"].removesuffix(".git").split("github.com/")[-1])
    target.parent.mkdir(parents=True, exist_ok=True)
    if not (target / ".git").exists():
        run(["git", "clone", "--filter=blob:none", "--no-checkout", package["url"], str(target)])
    run(["git", "fetch", "--depth", "1", "origin", package["revision"]], cwd=target)
    run(["git", "checkout", "--detach", package["revision"]], cwd=target)


def install_huggingface(package: dict[str, Any], destination: Path) -> None:
    target = destination / "weights" / safe_name(package["repo"])
    target.mkdir(parents=True, exist_ok=True)
    token = os.environ.get("HF_TOKEN")

    try:
        from huggingface_hub import hf_hub_download
        has_hf_hub = True
    except ImportError:
        has_hf_hub = False

    api_url = (
        f"https://huggingface.co/api/models/{quote(package['repo'], safe='/')}"
        f"/tree/{package['revision']}?recursive=true&limit=1000"
    )
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    with urlopen(Request(api_url, headers=headers), timeout=60) as response:
        entries = json.load(response)
    patterns = package.get("include", [])
    files = [
        entry["path"]
        for entry in entries
        if entry.get("type") == "file"
        and (not patterns or any(fnmatch.fnmatch(entry["path"], pattern) for pattern in patterns))
    ]
    if not files:
        raise RuntimeError(f"Ningún archivo coincide con los patrones de {package['repo']}")
    for relative_path in files:
        output = target / relative_path
        output.parent.mkdir(parents=True, exist_ok=True)

        if has_hf_hub:
            try:
                hf_hub_download(
                    repo_id=package["repo"],
                    filename=relative_path,
                    revision=package["revision"],
                    local_dir=str(target),
                    token=token,
                )
                continue
            except Exception as e:
                print(f"hf_hub_download falló para {relative_path}, usando fallback con curl: {e}", file=sys.stderr)

        url = (
            f"https://huggingface.co/{quote(package['repo'], safe='/')}"
            f"/resolve/{package['revision']}/{quote(relative_path, safe='/')}?download=true"
        )
        command = [
            "curl", "--fail", "--location", "--retry", "4", "--retry-all-errors",
            "--continue-at", "-", "--output", str(output), url,
        ]
        if token:
            # Pass the authorization header over stdin so it never appears in
            # process listings, exceptions, logs, or shell history.
            command.extend(["--config", "-"])
            subprocess.run(command, check=True, input=f'header = "Authorization: Bearer {token}"\n', text=True)
        else:
            run(command)


def install_url(package: dict[str, Any], destination: Path) -> None:
    target = destination / "weights" / package["filename"]
    target.parent.mkdir(parents=True, exist_ok=True)
    run([
        "curl", "--fail", "--location", "--retry", "4", "--retry-all-errors",
        "--continue-at", "-", "--output", str(target), package["url"],
    ])


def install_gdrive(package: dict[str, Any], destination: Path) -> None:
    if shutil.which("gdown") is None:
        raise RuntimeError("Falta gdown en el entorno de herramientas.")
    target = destination / "weights" / package["filename"]
    target.parent.mkdir(parents=True, exist_ok=True)
    # gdown >= 6 accepts a Drive id as the positional url_or_id argument.
    run(["gdown", "--continue", package["fileId"], "--output", str(target)])


def install_modelscope(package: dict[str, Any], destination: Path) -> None:
    if shutil.which("modelscope") is None:
        raise RuntimeError("Falta modelscope en el entorno de herramientas.")
    target = destination / "weights" / safe_name(package["repo"])
    target.mkdir(parents=True, exist_ok=True)
    command = [
        "modelscope", "download", package["repo"],
        "--revision", package["revision"],
        "--local-dir", str(target),
        "--max-workers", "1",
    ]
    if package.get("include"):
        command.append("--include")
        command.extend(package["include"])
    run(command)


def install_model(model: dict[str, Any], root: Path) -> dict[str, Any]:
    model_root = root / model["id"]
    model_root.mkdir(parents=True, exist_ok=True)
    started = datetime.now(timezone.utc).isoformat()
    status = "installed"
    error: str | None = None
    try:
        for package in model["packages"]:
            match package["type"]:
                case "git":
                    install_git(package, model_root)
                case "huggingface":
                    install_huggingface(package, model_root)
                case "url":
                    install_url(package, model_root)
                case "gdrive":
                    install_gdrive(package, model_root)
                case "modelscope":
                    install_modelscope(package, model_root)
                case other:
                    raise RuntimeError(f"Tipo de paquete no soportado: {other}")
    except Exception as exc:  # keep --all progressing and record the exact blocker
        status = "blocked"
        error = str(exc)
    files = inventory(model_root)
    record = {
        "modelId": model["id"],
        "name": model["name"],
        "access": model["access"],
        "status": status,
        "startedAt": started,
        "finishedAt": datetime.now(timezone.utc).isoformat(),
        "bytes": sum(item["bytes"] for item in files),
        "files": files,
        "error": error,
    }
    state_dir = root / "manifests"
    state_dir.mkdir(parents=True, exist_ok=True)
    (state_dir / f"{model['id']}.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return record


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--model", action="append", default=[])
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--public-only", action="store_true")
    parser.add_argument("--plan", action="store_true")
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    models = manifest["models"]
    selected = models if args.all else [model for model in models if model["id"] in set(args.model)]
    if args.public_only:
        selected = [model for model in selected if model["access"] in {"public", "community"}]
    if not selected:
        parser.error("Selecciona --all o al menos un --model válido.")

    estimated_gb = sum(float(model["estimatedInstallGb"]) for model in selected)
    free_gb = shutil.disk_usage(args.root.parent if not args.root.exists() else args.root).free / 1_000_000_000
    summary = {
        "models": [model["id"] for model in selected],
        "estimatedGb": estimated_gb,
        "freeGb": round(free_gb, 2),
        "hfTokenPresent": bool(os.environ.get("HF_TOKEN")),
    }
    print(json.dumps(summary, indent=2))
    if args.plan:
        return 0
    if free_gb < estimated_gb * 1.1:
        raise SystemExit(f"Espacio insuficiente: se requieren ~{estimated_gb * 1.1:.1f} GB con margen.")

    args.root.mkdir(parents=True, exist_ok=True)
    results = [install_model(model, args.root) for model in selected]
    print(json.dumps({"results": [{"modelId": item["modelId"], "status": item["status"], "bytes": item["bytes"], "error": item["error"]} for item in results]}, indent=2))
    return 1 if any(result["status"] != "installed" for result in results) else 0


if __name__ == "__main__":
    sys.exit(main())
