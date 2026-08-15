import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  COMFY_TEMPLATE_CATALOG,
  getComfyTemplateCatalogEntry,
  summarizeComfyTemplateCatalog,
} from "./comfy-template-catalog";

describe("private ComfyUI template catalog", () => {
  it("vendors a unique, pinned and operator-only catalog", () => {
    expect(COMFY_TEMPLATE_CATALOG).toHaveLength(20);
    expect(new Set(COMFY_TEMPLATE_CATALOG.map((entry) => entry.id)).size).toBe(20);
    expect(COMFY_TEMPLATE_CATALOG.every((entry) => entry.adminOnly && entry.importReady)).toBe(true);

    for (const entry of COMFY_TEMPLATE_CATALOG) {
      expect(entry.sourceCommit).toMatch(/^[a-f0-9]{40}$/);
      expect(entry.sourceFileUrl).toContain(entry.sourceCommit);
      expect(entry.starsSnapshot).toBeGreaterThan(500);
      expect(entry.localPath).toMatch(/^workflows\/templates\/vendor\//);
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("validates every vendored workflow JSON against its recorded SHA-256", () => {
    for (const entry of COMFY_TEMPLATE_CATALOG) {
      const file = fs.readFileSync(path.join(process.cwd(), entry.localPath));
      expect(createHash("sha256").update(file).digest("hex"), entry.id).toBe(entry.sha256);

      const workflow = JSON.parse(file.toString("utf8")) as { nodes?: unknown };
      expect(Array.isArray(workflow.nodes), entry.id).toBe(true);
      expect((workflow.nodes as unknown[]).length, entry.id).toBeGreaterThan(0);
    }
  });

  it("keeps readiness honest instead of presenting UI templates as executable API graphs", () => {
    expect(COMFY_TEMPLATE_CATALOG.some((entry) => entry.readiness === "mapping_required")).toBe(true);
    expect(COMFY_TEMPLATE_CATALOG.some((entry) => entry.readiness === "custom_nodes_required")).toBe(true);
    expect(COMFY_TEMPLATE_CATALOG.some((entry) => entry.readiness === "weights_missing")).toBe(true);
    expect(COMFY_TEMPLATE_CATALOG.some((entry) => entry.readiness === "research_only")).toBe(true);
    expect(getComfyTemplateCatalogEntry("hunyuan15-720p-i2v")).toMatchObject({
      readiness: "weights_missing",
      importReady: true,
    });
    expect(summarizeComfyTemplateCatalog()).toMatchObject({
      total: 20,
      repositories: 3,
      image: 11,
      video: 5,
      character: 1,
      postprocess: 3,
    });
  });

  it("records the broader GitHub review separately from vendored templates", async () => {
    const { REVIEWED_COMFY_REPOSITORIES } = await import("./comfy-template-catalog");

    expect(REVIEWED_COMFY_REPOSITORIES.length).toBeGreaterThanOrEqual(9);
    expect(REVIEWED_COMFY_REPOSITORIES.find((entry) => entry.repository === "ZHO-ZHO-ZHO/ComfyUI-Workflows-ZHO")).toMatchObject({
      workflowCount: 17,
      imported: false,
    });
    expect(REVIEWED_COMFY_REPOSITORIES.every((entry) => entry.imported === false)).toBe(true);
  });
});
