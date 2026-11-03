import { describe, expect, it } from "vitest";
import {
  auditWorkflowGraph,
  auditWorkflowJson,
  classifyNode,
} from "./node-watch";

describe("NodeWatch Dependency Health Engine", () => {
  it("classifies core ComfyUI nodes correctly", () => {
    const loadImg = classifyNode("LoadImage");
    expect(loadImg.category).toBe("core");
    expect(loadImg.packName).toBe("ComfyUI-Core");

    const ksampler = classifyNode("KSamplerSelect");
    expect(ksampler.category).toBe("core");
  });

  it("classifies verified active community nodes", () => {
    const vhs = classifyNode("VHS_LoadVideo");
    expect(vhs.category).toBe("verified_active");
    expect(vhs.packName).toBe("ComfyUI-VideoHelperSuite");

    const scail = classifyNode("SCAIL2_Recast");
    expect(scail.category).toBe("verified_active");
  });

  it("flags abandoned nodes and absorbed obsolete nodes", () => {
    const wasSave = classifyNode("Was_Image_Save");
    expect(wasSave.category).toBe("abandoned_danger");
    expect(wasSave.nativeReplacement).toBe("SaveImage");

    const crSwitch = classifyNode("CR_ImageInputSwitch");
    expect(crSwitch.category).toBe("absorbed_obsolete");
    expect(crSwitch.recommendation).toContain("ComfyUI Core");
  });

  it("audits a clean native workflow and returns HEALTHY status with 100 score", () => {
    const cleanWorkflow = {
      "1": { class_type: "LoadImage" },
      "2": { class_type: "UNETLoader" },
      "3": { class_type: "CLIPLoader" },
      "4": { class_type: "VAELoader" },
      "5": { class_type: "BasicGuider" },
      "6": { class_type: "SamplerCustomAdvanced" },
      "7": { class_type: "VAEDecode" },
      "8": { class_type: "SaveVideo" },
    };

    const report = auditWorkflowGraph(cleanWorkflow);
    expect(report.status).toBe("HEALTHY");
    expect(report.healthScore).toBe(100);
    expect(report.totalNodes).toBe(8);
    expect(report.flaggedNodes).toHaveLength(0);
    expect(report.breakdown.core).toBe(8);
  });

  it("detects critical rot in workflows containing abandoned custom nodes", () => {
    const rottenWorkflow = {
      "1": { class_type: "LoadImage" },
      "2": { class_type: "Efficiency_Loader" }, // abandoned_danger
      "3": { class_type: "Was_Image_Save" }, // abandoned_danger
      "4": { class_type: "CR_ImageInputSwitch" }, // absorbed_obsolete
    };

    const report = auditWorkflowGraph(rottenWorkflow);
    expect(report.status).toBe("CRITICAL_ROT");
    expect(report.healthScore).toBeLessThan(50);
    expect(report.flaggedNodes.length).toBe(3);
    expect(report.summary).toContain("Peligro de rotura");
  });

  it("parses and audits JSON string input properly", () => {
    const jsonStr = JSON.stringify({
      "10": { class_type: "LoadImage" },
      "20": { class_type: "VHS_VideoCombine" },
    });

    const report = auditWorkflowJson(jsonStr);
    expect(report.status).toBe("HEALTHY");
    expect(report.totalNodes).toBe(2);
    expect(report.uniqueClassTypes).toBe(2);
  });

  it("throws on invalid JSON string", () => {
    expect(() => auditWorkflowJson("invalid { json")).toThrowError(/Error de sintaxis JSON/);
  });
});
