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

describe("Vast 3090 lab bootstrap", () => {
  const script = readFileSync(resolve(process.cwd(), "infra/vast/bootstrap_3090_lab.sh"), "utf8");

  it("fija todas las revisiones de pesos y elimina resolve/main", () => {
    const modelUrls = [...script.matchAll(/https:\/\/huggingface\.co\/[^"\s]+/g)].map(([url]) => url);
    expect(modelUrls).toHaveLength(11);
    expect(modelUrls.every((url) => /\/resolve\/[0-9a-f]{7,40}\//.test(url))).toBe(true);
    expect(script).not.toMatch(/huggingface\.co\/[^"\s]+\/resolve\/main\//);
  });

  it("verifica SHA-256 antes de publicar cada peso", () => {
    expect(script.split("\n").filter((line) => line === "  download_verified \\")).toHaveLength(11);
    expect(script).toContain('printf \'%s  %s\\n\' "$expected_sha256" "$destination.partial" | sha256sum -c -');
    expect(script.indexOf('sha256sum -c -\n  mv "$destination.partial"')).toBeGreaterThan(-1);
  });
});
