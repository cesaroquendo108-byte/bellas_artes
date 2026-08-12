import { describe, expect, it } from "vitest";

import {
  calculateGenerationSuccessRate,
  classifyHeartbeat,
  getAdminDashboardSince,
  maskAdminUserLabel,
  parseAdminDashboardWindow,
} from "./contracts";

describe("admin dashboard contracts", () => {
  it("acepta sólo las ventanas públicas y usa 24h como fallback", () => {
    expect(parseAdminDashboardWindow("7d")).toBe("7d");
    expect(parseAdminDashboardWindow("90d")).toBe("24h");
    expect(parseAdminDashboardWindow(null)).toBe("24h");
  });

  it("calcula el inicio de cada ventana sin depender del cliente", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    expect(getAdminDashboardSince("24h", now).toISOString()).toBe("2026-08-11T12:00:00.000Z");
    expect(getAdminDashboardSince("7d", now).toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });

  it("excluye cancelados del porcentaje de éxito", () => {
    expect(calculateGenerationSuccessRate(9, 1)).toBe(90);
    expect(calculateGenerationSuccessRate(0, 0)).toBe(0);
  });

  it("clasifica heartbeats con umbrales 90/180 segundos", () => {
    const now = new Date("2026-08-12T12:03:00.000Z");
    expect(classifyHeartbeat("healthy", "2026-08-12T12:02:00.000Z", now)).toBe("healthy");
    expect(classifyHeartbeat("healthy", "2026-08-12T12:01:00.000Z", now)).toBe("degraded");
    expect(classifyHeartbeat("healthy", "2026-08-12T11:59:00.000Z", now)).toBe("stale");
    expect(classifyHeartbeat("stopped", "2026-08-12T12:03:00.000Z", now)).toBe("stopped");
    expect(classifyHeartbeat("error", "2026-08-12T12:03:00.000Z", now)).toBe("error");
  });

  it("abrevia la identidad en la vista general", () => {
    expect(maskAdminUserLabel("cesaroquendo10@gmail.com", "user-id")).toBe("ces•••••@gmail.com");
    expect(maskAdminUserLabel(null, "1234567890")).toBe("Usuario 12345678");
  });
});
