import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, getUser } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({ createClient }));

import { POST } from "./route";

describe("POST /api/generate legacy", () => {
  beforeEach(() => {
    createClient.mockReset();
    getUser.mockReset();
    createClient.mockResolvedValue({ auth: { getUser } });
  });

  it("rechaza JSON inválido antes de abrir una sesión", async () => {
    const response = await POST(new Request("http://local/api/generate", {
      method: "POST",
      body: "{",
    }));

    expect(response.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rechaza userId proporcionado por el cliente", async () => {
    const response = await POST(new Request("http://local/api/generate", {
      method: "POST",
      body: JSON.stringify({ userId: "otro" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ creditsConsumed: 0 });
  });

  it("declara la autenticación no configurada sin consumir créditos", async () => {
    createClient.mockRejectedValue(new Error("missing env"));
    const response = await POST(new Request("http://local/api/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "prueba" }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "AUTH_NOT_CONFIGURED",
      creditsConsumed: 0,
    });
  });

  it("rechaza usuarios anónimos", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(new Request("http://local/api/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "prueba" }),
    }));

    expect(response.status).toBe(401);
  });

  it("mantiene retirado el endpoint genérico para usuarios autenticados", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const response = await POST(new Request("http://local/api/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "prueba" }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "GENERATION_NOT_AVAILABLE",
      creditsConsumed: 0,
    });
  });
});
