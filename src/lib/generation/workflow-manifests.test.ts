import { describe, expect, it } from "vitest";
import { bindWorkflow, hasWorkflowManifest, loadWorkflowManifest, validateWorkflowAssets, validateWorkflowGraph, validateWorkflowRequest } from "./workflow-manifests";
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

  it("rechaza nodos sin tipo, conexiones rotas y salidas incompatibles", () => {
    const template = loadWorkflow("image/flux-schnell-v1");
    const missingType = structuredClone(template);
    delete (missingType["6"] as { class_type?: string }).class_type;
    expect(validateWorkflowGraph("image/flux-schnell-v1", missingType)).toBe(false);

    const brokenConnection = structuredClone(template);
    (brokenConnection["8"] as { inputs: Record<string, unknown> }).inputs.samples = ["missing", 0];
    expect(validateWorkflowGraph("image/flux-schnell-v1", brokenConnection)).toBe(false);

    const wrongOutput = structuredClone(template);
    (wrongOutput["9"] as { class_type: string }).class_type = "PreviewImage";
    expect(validateWorkflowGraph("image/flux-schnell-v1", wrongOutput)).toBe(false);
  });

  it("declara límites distintos para video estándar y Pro/B2B", () => {
    expect(loadWorkflowManifest("video/hunyuan-8.3b-t2v-v1").limits.minimumVramGb).toBe(48);
    expect(loadWorkflowManifest("video/hunyuan-13b-t2v-v1").limits.minimumVramGb).toBe(80);
  });

  it("mantiene manifests de modelos abiertos sin fingir que existe un grafo exportado", () => {
    expect(hasWorkflowManifest("image/pixart-sigma-v1")).toBe(true);
    expect(hasWorkflowManifest("image/sd35-medium-v1")).toBe(true);
    expect(validateWorkflowGraph("image/pixart-sigma-v1", {})).toBe(false);
    expect(loadWorkflowManifest("image/sd35-medium-v1").limits.minimumVramGb).toBe(24);
  });

  it("rechaza duración, frames y MIME fuera del contrato", () => {
    const manifest = loadWorkflowManifest("video/hunyuan-8.3b-i2v-v1");
    expect(() => validateWorkflowRequest(manifest, { parameters: { duration: 11 } })).toThrow(/duración/);
    expect(() => validateWorkflowRequest(manifest, { parameters: { frames: 301 } })).toThrow(/frames/);
    expect(() => validateWorkflowAssets(manifest, { source: [{ mime_type: "application/pdf" }], reference: [] })).toThrow(/MIME/);
  });

  it("conserva el rol y el orden de fuentes y referencias", () => {
    const manifest = loadWorkflowManifest("video/hunyuan-8.3b-replace-character-v1");
    const graph = Object.fromEntries(manifest.bindings.map((binding) => [binding.nodeId, { inputs: {} }]));
    const bound = bindWorkflow({
      workflow: graph,
      manifest,
      request: { prompt: "reemplazo", parameters: {} },
      sourceUrls: ["https://signed.example/source.mp4"],
      referenceUrls: ["https://signed.example/character.png"],
    });

    expect(bound).toHaveProperty("source.inputs.url", "https://signed.example/source.mp4");
    expect(bound).toHaveProperty("reference.inputs.url", "https://signed.example/character.png");
    expect(() => validateWorkflowAssets(manifest, {
      source: [{ mime_type: "video/mp4", metadata: { durationSeconds: 8 } }],
      reference: [{ mime_type: "image/png" }],
    })).not.toThrow();
    expect(() => validateWorkflowAssets(manifest, {
      source: [{ mime_type: "image/png" }],
      reference: [{ mime_type: "video/mp4" }],
    })).toThrow(/MIME/);
  });

  it("rechaza un asset fuente requerido antes de llamar a la GPU", () => {
    const manifest = loadWorkflowManifest("audio/rvc-v1");
    expect(() => validateWorkflowAssets(manifest, { source: [], reference: [] })).toThrow(/Falta el asset source/);
  });
});
