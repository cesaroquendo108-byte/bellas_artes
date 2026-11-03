#!/usr/bin/env python3
"""
NodeWatch CLI: Auditor de Salud de Dependencias para Flujos de ComfyUI.
Inspecciona grafos JSON de ComfyUI y alerta sobre nodos de paquetes no mantenidos (>12 meses)
o que han sido absorbidos por el núcleo nativo de ComfyUI.
"""

import argparse
import json
import os
import sys
from typing import Dict, Any, List

CATALOG = {
    # ComfyUI Native Core
    "LoadImage": {"cat": "core", "pack": "ComfyUI-Core"},
    "SaveImage": {"cat": "core", "pack": "ComfyUI-Core"},
    "SaveVideo": {"cat": "core", "pack": "ComfyUI-Core"},
    "CreateVideo": {"cat": "core", "pack": "ComfyUI-Core"},
    "VAEDecode": {"cat": "core", "pack": "ComfyUI-Core"},
    "VAEEncode": {"cat": "core", "pack": "ComfyUI-Core"},
    "UNETLoader": {"cat": "core", "pack": "ComfyUI-Core"},
    "CLIPLoader": {"cat": "core", "pack": "ComfyUI-Core"},
    "VAELoader": {"cat": "core", "pack": "ComfyUI-Core"},
    "CheckpointLoaderSimple": {"cat": "core", "pack": "ComfyUI-Core"},
    "LoraLoaderModelOnly": {"cat": "core", "pack": "ComfyUI-Core"},
    "KSampler": {"cat": "core", "pack": "ComfyUI-Core"},
    "KSamplerSelect": {"cat": "core", "pack": "ComfyUI-Core"},
    "SamplerCustomAdvanced": {"cat": "core", "pack": "ComfyUI-Core"},
    "RandomNoise": {"cat": "core", "pack": "ComfyUI-Core"},
    "BasicGuider": {"cat": "core", "pack": "ComfyUI-Core"},
    "BasicScheduler": {"cat": "core", "pack": "ComfyUI-Core"},
    "CLIPTextEncode": {"cat": "core", "pack": "ComfyUI-Core"},
    "MaskComposite": {"cat": "core", "pack": "ComfyUI-Core"},
    "PreviewImage": {"cat": "core", "pack": "ComfyUI-Core"},
    "PrimitiveStringMultiline": {"cat": "core", "pack": "ComfyUI-Core"},
    "PrimitiveFloat": {"cat": "core", "pack": "ComfyUI-Core"},
    "PrimitiveBoolean": {"cat": "core", "pack": "ComfyUI-Core"},
    "ModelAttentionBackend": {"cat": "core", "pack": "ComfyUI-Core"},
    "BlockSparseAttention": {"cat": "core", "pack": "ComfyUI-Core"},

    # Verified Active Community Extensions
    "VHS_LoadVideo": {"cat": "verified_active", "pack": "ComfyUI-VideoHelperSuite"},
    "VHS_VideoCombine": {"cat": "verified_active", "pack": "ComfyUI-VideoHelperSuite"},
    "SCAIL2_Recast": {"cat": "verified_active", "pack": "ComfyUI-SCAIL2"},
    "SAM3_Multiplex": {"cat": "verified_active", "pack": "ComfyUI-SAM3"},
    "MiniMaxH3ReferenceToVideo": {"cat": "verified_active", "pack": "ComfyUI-MiniMax-H3"},
    "MiniMaxH3SigmaShift": {"cat": "verified_active", "pack": "ComfyUI-MiniMax-H3"},
    "ResolutionSelector": {"cat": "verified_active", "pack": "ComfyUI-Essentials"},

    # Absorbed / Obsolete
    "CR_ImageInputSwitch": {"cat": "absorbed_obsolete", "pack": "Comfyroll", "rep": "Native ComfyUI Switch"},
    "CR_Aspect_Ratio": {"cat": "absorbed_obsolete", "pack": "Comfyroll", "rep": "ResolutionSelector"},

    # Abandoned (>365 days)
    "Was_Image_Save": {"cat": "abandoned_danger", "pack": "WAS-Node-Suite", "rep": "SaveImage"},
    "Efficiency_Loader": {"cat": "abandoned_danger", "pack": "efficiency-nodes", "rep": "UNETLoader + CLIPLoader + VAELoader"},
    "ComfyMathExpression": {"cat": "stale_risk", "pack": "ComfyUI-Custom-Scripts", "rep": "PrimitiveFloat"},
}


def classify(class_type: str) -> Dict[str, Any]:
    if class_type in CATALOG:
        return {"class_type": class_type, **CATALOG[class_type]}
    if class_type.startswith(("Save", "Load", "VAE", "CLIP", "KSampler", "Basic", "Sampler", "Random")):
        return {"class_type": class_type, "cat": "core", "pack": "ComfyUI-Core (Inferred)"}
    if class_type.startswith(("VHS_", "WanVideo_", "SAM3_")):
        return {"class_type": class_type, "cat": "verified_active", "pack": "Verified Pack"}
    return {
        "class_type": class_type,
        "cat": "stale_risk",
        "pack": "Unknown / Unverified",
        "rep": "Validar mantenimiento en GitHub",
    }


def audit_file(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    breakdown = {
        "core": 0,
        "verified_active": 0,
        "stale_risk": 0,
        "absorbed_obsolete": 0,
        "abandoned_danger": 0,
    }
    flagged: List[Dict[str, Any]] = []
    nodes = 0

    for nid, ndata in data.items():
        if not isinstance(ndata, dict):
            continue
        ct = ndata.get("class_type")
        if not ct:
            continue
        nodes += 1
        c = classify(ct)
        breakdown[c["cat"]] += 1
        if c["cat"] in ("stale_risk", "absorbed_obsolete", "abandoned_danger"):
            flagged.append({"node_id": nid, **c})

    penalty = (
        breakdown["stale_risk"] * 5
        + breakdown["absorbed_obsolete"] * 15
        + breakdown["abandoned_danger"] * 30
    )
    score = max(0, min(100, 100 - penalty))

    status = "HEALTHY"
    if breakdown["abandoned_danger"] > 0 or score < 50:
        status = "CRITICAL_ROT"
    elif breakdown["stale_risk"] > 0 or breakdown["absorbed_obsolete"] > 0 or score < 85:
        status = "CAUTION"

    return {
        "file": path,
        "total_nodes": nodes,
        "health_score": score,
        "status": status,
        "breakdown": breakdown,
        "flagged_nodes": flagged,
    }


def main():
    parser = argparse.ArgumentParser(description="Auditor de Dependencias de ComfyUI (NodeWatch)")
    parser.add_argument("path", help="Ruta al archivo JSON del workflow o directorio a auditar")
    parser.add_argument("--json", action="store_true", help="Salida en formato JSON estructurado")
    parser.add_argument("--strict", action="store_true", help="Falla (exit 1) si status != HEALTHY")
    args = parser.parse_args()

    if not os.path.exists(args.path):
        print(f"Error: Ruta no encontrada: {args.path}", file=sys.stderr)
        sys.exit(1)

    files_to_audit = []
    if os.path.isfile(args.path):
        files_to_audit.append(args.path)
    else:
        for root, _, files in os.walk(args.path):
            for file in files:
                if file.endswith((".json", ".api.json")):
                    files_to_audit.append(os.path.join(root, file))

    reports = [audit_file(f) for f in files_to_audit]

    if args.json:
        print(json.dumps(reports, indent=2))
    else:
        for r in reports:
            print(f"\n--- Auditoría NodeWatch: {r['file']} ---")
            print(f"Estado: {r['status']} | Puntaje de Salud: {r['health_score']}/100 | Nodos Totales: {r['total_nodes']}")
            print(f"Desglose: Core: {r['breakdown']['core']} | Verificados: {r['breakdown']['verified_active']} | Riesgo: {r['breakdown']['stale_risk']} | Obsoletos: {r['breakdown']['absorbed_obsolete']} | Abandonados: {r['breakdown']['abandoned_danger']}")
            if r["flagged_nodes"]:
                print("Nodos Señalados:")
                for fn in r["flagged_nodes"]:
                    rep = f" -> Sugerencia: {fn.get('rep')}" if fn.get("rep") else ""
                    print(f"  [ID {fn['node_id']}] {fn['class_type']} ({fn['cat']}) - Paquete: {fn['pack']}{rep}")

    if args.strict and any(r["status"] != "HEALTHY" for r in reports):
        sys.exit(1)


if __name__ == "__main__":
    main()
