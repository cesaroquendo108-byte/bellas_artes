import { describe, expect, it } from "vitest";
import { bindWorkflow, loadWorkflowManifest, validateWorkflowAssets, validateWorkflowGraph, validateWorkflowRequest } from "./workflow-manifests";
import { loadWorkflow } from "./workflows";

describe("workflow manifests", () => {
  it("aplica bindings explícitos de Flux Schnell sin mutar la plantilla", () => {
    const template = loadWorkflow("image/flux-schnell-v1");
    const bound = bindWorkflow({
      workflow: template,
      manifest: loadWorkflowManifest("image/flux-schnell-v1"),
      request: {
        prompt: "retrato de prueba",
        negativePrompt: "texto",
        seed: 7,
        steps: 4,
        cfgScale: 1,
        width: 512,
        height: 512,
      },
      referenceUrls: [],
    });

    expect(bound).toHaveProperty("6.inputs.text", "retrato de prueba");
    expect(bound).toHaveProperty("7.inputs.text", "texto");
    expect(bound).toHaveProperty("3.inputs.seed", 7);
    expect(bound).toHaveProperty("5.inputs.width", 512);
    expect(template).toHaveProperty("6.inputs.text", expect.not.stringContaining("prueba"));
  });

  it("rechaza grafos que no contienen los nodos declarados", () => {
    expect(validateWorkflowGraph("image/flux-schnell-v1", {})).toBe(false);
  });

  it("declara límites distintos para video estándar y Pro/B2B", () => {
    expect(loadWorkflowManifest("video/hunyuan-8.3b-t2v-v1").limits.minimumVramGb).toBe(48);
    expect(loadWorkflowManifest("video/hunyuan-13b-t2v-v1").limits.minimumVramGb).toBe(80);
  });

  it("rechaza duración, frames y MIME fuera del contrato", () => {
    const manifest = loadWorkflowManifest("video/hunyuan-8.3b-i2v-v1");
    expect(() => validateWorkflowRequest(manifest, { parameters: { duration: 11 } })).toThrow(/duración/);
    expect(() => validateWorkflowRequest(manifest, { parameters: { frames: 301 } })).toThrow(/frames/);
    expect(() => validateWorkflowAssets(manifest, [{ mime_type: "application/pdf" }])).toThrow(/MIME/);
  });
});
