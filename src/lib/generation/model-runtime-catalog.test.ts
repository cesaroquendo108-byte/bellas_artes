import { describe, expect, it } from "vitest";

import runtimeRequirements from "../../../infra/models/model-runtime-requirements.json";
import { hasWorkflowManifest } from "./workflow-manifests";

import {
  getModelRuntimeEntry,
  getModelRuntimeEntryForBackendModel,
  listModelRuntimeCatalog,
  summarizeModelRuntime,
} from "./model-runtime-catalog";

describe("model runtime catalog", () => {
  it("registra los 22 paquetes del vault y los mantiene privados", () => {
    const models = listModelRuntimeCatalog();
    expect(models).toHaveLength(22);
    expect(new Set(models.map((model) => model.id)).size).toBe(22);
    expect(models.every((model) => model.adminOnly)).toBe(true);
    expect(getModelRuntimeEntry("flux-schnell")).toMatchObject({
      vault: "primary",
      engine: "comfyui-api",
      hardwareProfile: "gpu24",
      commercialPolicy: "eligible",
      workflowConfigured: true,
      status: "workflow_ready",
      installState: "partial",
      canRunAdminSmoke: false,
    });
  });

  it("mantiene requisitos operativos y bindings en una relación uno a uno", () => {
    expect(runtimeRequirements.models.map((model) => model.id).sort()).toEqual(
      listModelRuntimeCatalog().map((model) => model.id).sort(),
    );
    for (const requirement of runtimeRequirements.models) {
      expect(getModelRuntimeEntry(requirement.id)?.workflowVersions).toEqual(requirement.workflowVersions);
    }
  });

  it("versiona cada operación nativa antes de permitir el transporte HTTP", () => {
    const nativeRequirements = runtimeRequirements.models.filter((model) => model.engine === "native-api");
    expect(nativeRequirements).toHaveLength(9);
    for (const requirement of nativeRequirements) {
      expect(requirement.workflowVersions.length).toBeGreaterThan(0);
      expect(requirement.workflowVersions.every(hasWorkflowManifest)).toBe(true);
    }
  });

  it("distingue un workflow ejecutable, un contrato y un reemplazo", () => {
    expect(getModelRuntimeEntry("flux2-klein-4b")).toMatchObject({
      status: "workflow_pending",
      workflowConfigured: false,
      canRunAdminSmoke: false,
    });
    expect(getModelRuntimeEntry("real-esrgan")).toMatchObject({
      role: "postprocess",
      status: "component_pending",
    });
    expect(getModelRuntimeEntry("cmu-openpose")).toMatchObject({ status: "replaced" });
    expect(getModelRuntimeEntry("hunyuan-video-15-83b")).toMatchObject({
      installState: "partial",
      engine: "native-api",
      hardwareProfile: "gpu48",
      canRunAdminSmoke: false,
    });
    expect(getModelRuntimeEntry("qwen-image")).toMatchObject({ hardwareProfile: "gpu80" });
    expect(getModelRuntimeEntryForBackendModel("hunyuan-video-8.3b")).toMatchObject({
      id: "hunyuan-video-15-83b",
      engine: "native-api",
    });
    expect(getModelRuntimeEntryForBackendModel("unknown")).toBeNull();
    expect(summarizeModelRuntime()).toMatchObject({
      total: 22,
      workflowReady: 1,
      smokeReady: 0,
      replaced: 2,
    });
  });
});
