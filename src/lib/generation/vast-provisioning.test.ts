import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vast Flux provisioning", () => {
  const script = readFileSync(resolve(process.cwd(), "infra/vast/provision_flux_schnell.sh"), "utf8");

  it("bloquea cachés efímeras antes de provisionar el modelo", () => {
    const guardIndex = script.indexOf("assert_persistent_cache_mount\n(");
    const provisionIndex = script.indexOf("provision_model\n");
    expect(script).toContain("CACHE_VOLUME_NOT_MOUNTED");
    expect(script).toContain('mount_target" == "/"');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(provisionIndex).toBeGreaterThan(guardIndex);
  });

  it("mantiene checksum y tamaño fijados", () => {
    expect(script).toContain('expected_size="17236328572"');
    expect(script).toContain('expected_sha256="ead426278b49030e9da5df862994f25ce94ab2ee4df38b556ddddb3db093bf72"');
  });
});
