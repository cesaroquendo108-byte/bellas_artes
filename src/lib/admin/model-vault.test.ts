import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ADMIN_MODEL_BENCHMARK } from "./model-benchmark";

type VaultManifest = {
  schemaVersion: number;
  models: Array<{
    id: string;
    access: string;
    estimatedInstallGb: number;
    packages: Array<Record<string, unknown>>;
  }>;
};

type InstallState = {
  models: Record<string, { state: string; note: string }>;
};

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "infra/models/model-vault.json"), "utf8"),
) as VaultManifest;
const installState = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "infra/models/model-install-state.json"), "utf8"),
) as InstallState;

describe("model vault manifest", () => {
  it("covers every model exposed by the private benchmark", () => {
    expect(new Set(manifest.models.map((model) => model.id))).toEqual(
      new Set(ADMIN_MODEL_BENCHMARK.map((model) => model.id)),
    );
  });

  it("pins every source and declares a positive storage estimate", () => {
    for (const model of manifest.models) {
      expect(model.estimatedInstallGb).toBeGreaterThan(0);
      expect(model.packages.length).toBeGreaterThan(0);
      for (const pkg of model.packages) {
        if (pkg.type === "git" || pkg.type === "huggingface" || pkg.type === "modelscope") {
          expect(pkg.revision).toMatch(/^[a-f0-9]{40}$/);
        }
      }
    }
  });

  it("keeps research-only families explicitly classified", () => {
    for (const id of ["flux-dev", "flux2-klein-9b", "f5-tts-official", "wai-ani-ponyxl"]) {
      expect(manifest.models.find((model) => model.id === id)?.access).toMatch(/research/);
    }
  });

  it("publishes a sanitized installation state for every private candidate", () => {
    expect(new Set(Object.keys(installState.models))).toEqual(
      new Set(ADMIN_MODEL_BENCHMARK.map((model) => model.id)),
    );
    for (const value of Object.values(installState.models)) {
      expect(value.state).toMatch(/^(installed|installing|partial|queued|gated|blocked)$/);
      expect(value.note.length).toBeGreaterThan(10);
    }
  });
});
