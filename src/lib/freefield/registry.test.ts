import { describe, expect, it } from "vitest";
import {
  applyTemplate,
  buildFreefieldWorkflow,
  coerceInputValue,
  getFreefieldApp,
  listFreefieldApps,
  searchFreefieldApps,
} from "./registry";

describe("Freefield Registry en Bellas Artes", () => {
  it("carga la lista completa de aplicaciones de Freefield", () => {
    const apps = listFreefieldApps();
    expect(apps.length).toBeGreaterThanOrEqual(120);

    const recast = apps.find((app) => app.id === "recast");
    expect(recast).toBeDefined();
    expect(recast?.name).toBe("Recast");
    expect(recast?.section).toBe("video");
    expect(recast?.higgsfield_feature).toBe("Character swap");

    const genjutsu = apps.find((app) => app.id === "genjutsu");
    expect(genjutsu).toBeDefined();
    expect(genjutsu?.name).toBe("Genjutsu");
    expect(genjutsu?.section).toBe("video");
  });

  it("permite filtrar y buscar aplicaciones por texto o sección", () => {
    const videoApps = searchFreefieldApps({ section: "video" });
    expect(videoApps.length).toBeGreaterThan(0);
    expect(videoApps.every((app) => app.section === "video")).toBe(true);

    const characterResults = searchFreefieldApps({ query: "character" });
    expect(characterResults.length).toBeGreaterThan(0);
    expect(characterResults.some((app) => app.id === "character-swap" || app.id === "recast")).toBe(true);
  });

  it("obtiene los detalles completos y el grafo ComfyUI de una app", () => {
    const app = getFreefieldApp("genjutsu");
    expect(app).not.toBeNull();
    expect(app?.inputs.length).toBeGreaterThan(0);
    expect(app?.graph).toBeDefined();
    expect(typeof app?.graph).toBe("object");
  });

  it("aplica plantillas de texto a variables", () => {
    const template = "{value}, cinematográfico, hiperrealista, ángulo {angle}";
    const res = applyTemplate(template, { angle: "picado" }, "primer plano");
    expect(res).toBe("primer plano, cinematográfico, hiperrealista, ángulo picado");
  });

  it("coacciona valores de entrada correctamente según el tipo", () => {
    const numInput = { id: "steps", type: "number" as const, label: "Pasos", min: 1, max: 50 };
    expect(coerceInputValue(numInput, "20")).toBe(20);
    expect(() => coerceInputValue(numInput, "60")).toThrow();

    const toggleInput = { id: "fast", type: "toggle" as const, label: "Rápido" };
    expect(coerceInputValue(toggleInput, "true")).toBe(true);
    expect(coerceInputValue(toggleInput, false)).toBe(false);
  });

  it("construye un flujo ComfyUI vinculado para Recast (SCAIL-2)", () => {
    const result = buildFreefieldWorkflow("recast", {
      clip: "https://r2.bellasartes.com/clips/test_dance.mp4",
      character: "https://r2.bellasartes.com/characters/cesar_portrait.png",
      prompt: "Un hombre caminando por el parque, luz natural",
      target: "hombre",
      fast: true,
    });

    expect(result.app.id).toBe("recast");
    expect(result.prompt).toBeDefined();
    expect(result.resolvedValues.prompt).toBe("Un hombre caminando por el parque, luz natural");

    // Verificar que los nodos del grafo recibieron las entradas
    expect(result.prompt["155"]?.inputs?.file).toBe("https://r2.bellasartes.com/clips/test_dance.mp4");
    expect(result.prompt["30"]?.inputs?.image).toBe("https://r2.bellasartes.com/characters/cesar_portrait.png");
    expect(result.prompt["213:3"]?.inputs?.text).toBe("Un hombre caminando por el parque, luz natural");
  });

  it("construye un flujo ComfyUI vinculado para Director's Cut Studio", () => {
    const result = buildFreefieldWorkflow("directors-cut", {
      character: "https://r2.bellasartes.com/cast/cesar.jpg",
      wardrobe: "https://r2.bellasartes.com/wardrobe/suit.jpg",
      location: "https://r2.bellasartes.com/loc/bank.jpg",
      prompt: "subject_definitions:\n<Subject 1> is Cesar...",
      aspect_ratio: "9:16 (Vertical)",
      duration: 6,
    });

    expect(result.app.id).toBe("directors-cut");
    expect(result.prompt["139"]?.inputs?.image).toBe("https://r2.bellasartes.com/cast/cesar.jpg");
    expect(result.prompt["137"]?.inputs?.image).toBe("https://r2.bellasartes.com/wardrobe/suit.jpg");
    expect(result.prompt["147"]?.inputs?.image).toBe("https://r2.bellasartes.com/loc/bank.jpg");
    expect(result.prompt["138"]?.inputs?.value).toBe("subject_definitions:\n<Subject 1> is Cesar...");
    expect(result.prompt["115"]?.inputs?.aspect_ratio).toBe("9:16 (Vertical)");
    expect(result.prompt["132"]?.inputs?.value).toBe(6);
  });

  it("construye un flujo ComfyUI vinculado para ZenTrainer LoRA Studio", () => {
    const result = buildFreefieldWorkflow("zentrainer", {
      dataset_folder: "/workspace/datasets/cesar_portraits",
      trigger_word: "cesar_suit",
      model_type: "flux-dev",
      steps: 1200,
      learning_rate: 0.0001,
      rank: 32,
    });

    expect(result.app.id).toBe("zentrainer");
    expect(result.prompt["1"]?.inputs?.folder).toBe("/workspace/datasets/cesar_portraits");
    expect(result.prompt["2"]?.inputs?.trigger_word).toBe("cesar_suit");
    expect(result.prompt["2"]?.inputs?.steps).toBe(1200);
    expect(result.prompt["2"]?.inputs?.rank).toBe(32);
  });

  it("construye un flujo ComfyUI vinculado para SplitFrame AI Crew Studio", () => {
    const result = buildFreefieldWorkflow("splitframe", {
      prompt: "Cinematic shot of trader looking at multiple monitors",
      duration: 3.5,
      pacing: "fast-paced",
      aspect_ratio: "9:16 (Vertical)",
      seed: 99,
    });

    expect(result.app.id).toBe("splitframe");
    expect(result.prompt["3"]?.inputs?.prompt).toBe("Cinematic shot of trader looking at multiple monitors");
    expect(result.prompt["4"]?.inputs?.duration_seconds).toBe(3.5);
    expect(result.prompt["5"]?.inputs?.pacing).toBe("fast-paced");
    expect(result.prompt["6"]?.inputs?.seed).toBe(99);
  });

  it("construye un flujo ComfyUI vinculado para EffectCraft Storyboard Studio", () => {
    const result = buildFreefieldWorkflow("effectcraft", {
      marker_name: "Shot 02 - Close Up",
      prompt: "Close up on trading desk terminal",
      duration: 4,
      fps: 30,
      seed: 77,
    });

    expect(result.app.id).toBe("effectcraft");
    expect(result.prompt["1"]?.inputs?.marker_name).toBe("Shot 02 - Close Up");
    expect(result.prompt["1"]?.inputs?.duration_seconds).toBe(4);
    expect(result.prompt["3"]?.inputs?.prompt).toBe("Close up on trading desk terminal");
    expect(result.prompt["10"]?.inputs?.fps).toBe(30);
    expect(result.prompt["6"]?.inputs?.seed).toBe(77);
  });
});
