import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { VastAdminClient, getVastAdminServerConfig } from "./vast-client";

const limits = {
  maxActiveInstances: 1,
  maxHourlyUsd: 0.6,
  maxRentalUsd: 1.2,
  minBalanceReserveUsd: 0.4,
  minReliability: 0.98,
  minGpuRamMb: 24_000,
};

describe("cliente administrativo Vast", () => {
  beforeEach(() => {
    vi.stubEnv("VAST_ADMIN_API_KEY", "scoped-test-key");
    vi.stubEnv("VAST_ADMIN_COMFY_TEMPLATE_HASH", "template-hash");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("lee credit o balance sin exponer datos de cuenta adicionales", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ balance: 0, credit: 2.95, can_pay: true, ssh_key: "private" }), { status: 200 })));
    await expect(new VastAdminClient().getAccount()).resolves.toEqual({ balanceUsd: 2.95, canPay: true });
  });

  it("normaliza ofertas verificadas y calcula bid más 10%", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ offers: [{
      id: 91,
      machine_id: 42,
      gpu_name: "RTX 4090",
      gpu_ram: 24_576,
      num_gpus: 1,
      reliability: 0.995,
      dph_total: 0.3,
      min_bid: 0.2,
      disk_space: 100,
      geolocation: "Test",
    }] }), { status: 200 })));
    const offers = await new VastAdminClient().searchOffers({ preset: "comfy-clean", market: "bid", ttlMinutes: 15, limits, fluxMachineId: null });
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ bidPriceUsd: 0.22, hourlyUsd: 0.32, projectedCostUsd: 0.08 });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      direct_port_count: { gte: 1 },
      disk_space: { gte: 60 },
      order: [["dph_total", "asc"]],
    });
    expect(body).not.toHaveProperty("id");
  });

  it("crea sólo con plantilla controlada, TTL externo y volumen fijo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, new_contract: 1234 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new VastAdminClient().createInstance({
      offerId: 91,
      label: "ba-admin:11111111-1111-4111-8111-111111111111",
      preset: "flux-cached",
      bidPriceUsd: null,
      templateHashId: "template-hash",
      fluxVolumeId: 47343353,
      fluxMountPath: "/workspace/ComfyUI/models/checkpoints",
    })).resolves.toBe(1234);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toEqual(expect.objectContaining({
      template_hash_id: "template-hash",
      disk: 60,
      runtype: "ssh_direct",
      volume_info: { create_new: false, volume_id: 47343353, mount_path: "/workspace/ComfyUI/models/checkpoints" },
    }));
    expect(body).not.toHaveProperty("env");
    expect(body).not.toHaveProperty("onstart");
  });

  it("revalida una oferta dentro de un conjunto estable sin confiar en el filtro id de Vast", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ offers: [{
      id: 91,
      machine_id: 42,
      gpu_name: "RTX 4090",
      gpu_ram: 24_576,
      num_gpus: 1,
      reliability: 0.995,
      dph_total: 0.3,
      disk_space: 100,
    }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const offers = await new VastAdminClient().searchOffers({
      preset: "comfy-clean",
      market: "on-demand",
      ttlMinutes: 15,
      limits,
      fluxMachineId: null,
      offerId: 91,
      offerMachineId: 42,
      limit: 2,
    });
    expect(offers.map((offer) => offer.id)).toEqual([91]);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.limit).toBe(100);
    expect(body.machine_id).toEqual({ eq: 42 });
    expect(body).not.toHaveProperty("id");
  });

  it("sólo publica comandos SSH sanitizados y rechaza proxies externos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ instances: [{
      id: 7,
      label: "external",
      actual_status: "running",
      gpu_name: "RTX 3090",
      gpu_totalram: 24_576,
      ssh_host: "ssh7.vast.ai",
      ssh_port: 12345,
      jupyter_url: "https://evil.example/token",
      jupyter_token: "secret",
    }] }), { status: 200 })));
    const instances = await new VastAdminClient().listInstances();
    expect(instances[0]).toMatchObject({
      sshCommand: "ssh -p 12345 root@ssh7.vast.ai",
      tunnelCommand: "ssh -N -L 8188:127.0.0.1:18188 -p 12345 root@ssh7.vast.ai",
      comfyUrl: null,
    });
    expect(JSON.stringify(instances)).not.toContain("secret");
  });

  it("mantiene límites fail-closed aunque el entorno intente ampliarlos", () => {
    vi.stubEnv("VAST_ADMIN_MAX_ACTIVE_INSTANCES", "9");
    vi.stubEnv("VAST_ADMIN_MAX_HOURLY_USD", "99");
    vi.stubEnv("VAST_ADMIN_MAX_RENTAL_USD", "99");
    expect(getVastAdminServerConfig().limits).toMatchObject({ maxActiveInstances: 1, maxHourlyUsd: 0.6, maxRentalUsd: 1.2 });
  });
});
