import { describe, expect, it } from "vitest";
import { evaluateGenerationAccess } from "./access";

const base = { kind: "image" as const, backendModel: "flux-schnell", now: new Date("2026-08-10T00:00:00Z") };

describe("generation rollout access", () => {
  it("mantiene admin como gate inicial", () => {
    expect(evaluateGenerationAccess({ ...base, mode: "admin", profile: { role: "user", plan_tier: "free" }, grant: null })).toMatchObject({ allowed: false, code: "GENERATION_ADMIN_ONLY" });
    expect(evaluateGenerationAccess({ ...base, mode: "admin", profile: { role: "admin", plan_tier: "free" }, grant: null })).toEqual({ allowed: true });
  });

  it("acepta sólo grants activos y limitados a la modalidad durante beta", () => {
    expect(evaluateGenerationAccess({ ...base, mode: "allowlist", profile: { role: "user", plan_tier: "free" }, grant: { enabled: true, access_level: "beta", allowed_kinds: ["image"] } })).toEqual({ allowed: true });
    expect(evaluateGenerationAccess({ ...base, mode: "allowlist", profile: { role: "user", plan_tier: "free" }, grant: { enabled: true, access_level: "beta", allowed_kinds: ["audio"] } })).toMatchObject({ allowed: false, code: "GENERATION_BETA_INVITE_REQUIRED" });
    expect(evaluateGenerationAccess({ ...base, mode: "allowlist", profile: { role: "user", plan_tier: "free" }, grant: { enabled: true, access_level: "beta", expires_at: "2026-08-09T00:00:00Z" } })).toMatchObject({ allowed: false });
    expect(evaluateGenerationAccess({ ...base, mode: "allowlist", profile: { role: "admin", plan_tier: "free" }, grant: null })).toMatchObject({ allowed: false, code: "GENERATION_BETA_INVITE_REQUIRED" });
    expect(evaluateGenerationAccess({ ...base, mode: "allowlist", profile: { role: "admin", plan_tier: "free" }, grant: { enabled: true, access_level: "service", allowed_kinds: ["image"] } })).toEqual({ allowed: true });
  });

  it("mantiene Flux Dev y Hunyuan 13B detrás de entitlement Pro/B2B", () => {
    expect(evaluateGenerationAccess({ ...base, mode: "public", backendModel: "flux-dev", profile: { role: "user", plan_tier: "free" }, grant: null })).toMatchObject({ allowed: false, code: "GENERATION_PREMIUM_REQUIRED" });
    expect(evaluateGenerationAccess({ ...base, mode: "public", backendModel: "hunyuan-video-13b", profile: { role: "user", plan_tier: "b2b" }, grant: null })).toEqual({ allowed: true });
  });

  it("mantiene PixArt-Sigma y SD3.5 reservados a administradores", () => {
    for (const backendModel of ["pixart-sigma", "sd35-medium"]) {
      expect(evaluateGenerationAccess({ ...base, mode: "public", backendModel, profile: { role: "user", plan_tier: "pro" }, grant: null })).toMatchObject({
        allowed: false,
        code: "GENERATION_ADMIN_ONLY",
      });
      expect(evaluateGenerationAccess({ ...base, mode: "public", backendModel, profile: { role: "admin", plan_tier: "free" }, grant: null })).toEqual({ allowed: true });
    }
  });
});
