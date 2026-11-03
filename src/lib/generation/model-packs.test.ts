import { describe, expect, it } from "vitest";
import {
  MODEL_PACKS,
  generateProvisioningScript,
  getModelPack,
  listModelPacks,
  validateModelPackInstallation,
} from "./model-packs";

describe("Model Packs Engine", () => {
  it("lists all available model packs", () => {
    const packs = listModelPacks();
    expect(packs.length).toBeGreaterThanOrEqual(6);
    expect(packs.some((p) => p.id === "wan-scail2-recast")).toBe(true);
    expect(packs.some((p) => p.id === "gesture-portal-flux")).toBe(true);
    expect(packs.some((p) => p.id === "krea-turbo-realtime")).toBe(true);
    expect(packs.some((p) => p.id === "openjutsu-h3")).toBe(true);
    expect(packs.some((p) => p.id === "directors-cut-h3-qwen")).toBe(true);
    expect(packs.some((p) => p.id === "zentrainer-flux-lora")).toBe(true);
  });

  it("retrieves a pack by id", () => {
    const pack = getModelPack("wan-scail2-recast");
    expect(pack).toBeDefined();
    expect(pack?.vramRequiredGb).toBe(24);
    expect(pack?.files.length).toBeGreaterThan(0);

    const directorsCut = getModelPack("directors-cut-h3-qwen");
    expect(directorsCut).toBeDefined();
    expect(directorsCut?.vramRequiredGb).toBe(32);
    expect(directorsCut?.files.some((f) => f.filename.includes("minimax_h3"))).toBe(true);
    expect(directorsCut?.files.some((f) => f.filename.includes("qwen_image"))).toBe(true);
  });

  it("throws when pack does not exist", () => {
    expect(() =>
      generateProvisioningScript("invalid-pack" as never),
    ).toThrowError(/no existe/);
  });

  it("generates bash provisioning script with parallel aria2c/curl commands", () => {
    const script = generateProvisioningScript("gesture-portal-flux", "/opt/comfy/models");
    expect(script).toContain("#!/usr/bin/env bash");
    expect(script).toContain('MODELS_DIR="/opt/comfy/models"');
    expect(script).toContain("flux2_klein_4b_distill_fp8.safetensors");
    expect(script).toContain("aria2c -x 8");
    expect(script).toContain("curl -L -C -");
  });

  it("validates installation status detecting missing vs installed files", () => {
    const pack = getModelPack("gesture-portal-flux")!;
    const allFiles = pack.files.map((f) => `/workspace/ComfyUI/models/${f.targetSubdir}/${f.filename}`);

    const completeCheck = validateModelPackInstallation("gesture-portal-flux", allFiles);
    expect(completeCheck.isComplete).toBe(true);
    expect(completeCheck.missingFiles).toHaveLength(0);

    const partialCheck = validateModelPackInstallation("gesture-portal-flux", [allFiles[0]]);
    expect(partialCheck.isComplete).toBe(false);
    expect(partialCheck.missingFiles.length).toBeGreaterThan(0);
    expect(partialCheck.installedFiles).toContain(pack.files[0].filename);
  });
});
