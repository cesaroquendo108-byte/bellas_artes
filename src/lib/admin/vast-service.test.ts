import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getAccount: vi.fn(),
  listInstances: vi.fn(),
  searchOffers: vi.fn(),
  createInstance: vi.fn(),
  manageInstance: vi.fn(),
  destroyInstance: vi.fn(),
  getVastLeaseByRequestId: vi.fn(),
  getVastLifecycleHeartbeat: vi.fn(),
  listVastAdminLeases: vi.fn(),
  insertPendingVastLease: vi.fn(),
  updateVastLease: vi.fn(),
  auditVastAdminAction: vi.fn(),
  getVastLeaseByInstanceId: vi.fn(),
  getVastLeaseById: vi.fn(),
  scheduleVastLeaseDestruction: vi.fn(),
  cacheVastOfferRoutes: vi.fn(),
  getCachedVastOfferRoute: vi.fn(),
}));

vi.mock("@/lib/admin/vast-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/vast-client")>("@/lib/admin/vast-client");
  return {
    ...actual,
    getVastAdminServerConfig: () => ({
      enabled: true,
      apiConfigured: true,
      configured: true,
      operatorEmail: "cesaroquendo10@gmail.com",
      templateHashId: "template-hash",
      fluxVolumeId: 47343353,
      fluxMachineId: 25442,
      fluxMountPath: "/workspace/ComfyUI/models/checkpoints",
      limits: { maxActiveInstances: 1, maxHourlyUsd: 0.6, maxRentalUsd: 1.2, minBalanceReserveUsd: 0.4, minReliability: 0.98, minGpuRamMb: 24_000 },
    }),
    VastAdminClient: class {
      getAccount = mocks.getAccount;
      listInstances = mocks.listInstances;
      searchOffers = mocks.searchOffers;
      createInstance = mocks.createInstance;
      manageInstance = mocks.manageInstance;
      destroyInstance = mocks.destroyInstance;
    },
  };
});
vi.mock("@/lib/admin/vast-lease-store", () => ({
  getVastLeaseByRequestId: mocks.getVastLeaseByRequestId,
  getVastLifecycleHeartbeat: mocks.getVastLifecycleHeartbeat,
  listVastAdminLeases: mocks.listVastAdminLeases,
  insertPendingVastLease: mocks.insertPendingVastLease,
  updateVastLease: mocks.updateVastLease,
  auditVastAdminAction: mocks.auditVastAdminAction,
  getVastLeaseByInstanceId: mocks.getVastLeaseByInstanceId,
  getVastLeaseById: mocks.getVastLeaseById,
}));
vi.mock("@/lib/admin/vast-lifecycle-queue", () => ({ scheduleVastLeaseDestruction: mocks.scheduleVastLeaseDestruction }));
vi.mock("@/lib/admin/vast-offer-cache", () => ({
  cacheVastOfferRoutes: mocks.cacheVastOfferRoutes,
  getCachedVastOfferRoute: mocks.getCachedVastOfferRoute,
}));

import { actOnVastAdminInstance, createVastAdminLease, expireVastAdminLease, reconcileVastAdminLeases } from "./vast-service";

const request = {
  requestId: "11111111-1111-4111-8111-111111111111",
  offerId: 91,
  preset: "comfy-clean" as const,
  market: "on-demand" as const,
  ttlMinutes: 15 as const,
  confirmation: "ALQUILAR GPU" as const,
};
const offer = {
  id: 91,
  machineId: 42,
  gpuName: "RTX 4090",
  gpuRamMb: 24_576,
  numGpus: 1,
  reliability: 0.995,
  geolocation: "Test",
  hourlyUsd: 0.4,
  minBidUsd: null,
  bidPriceUsd: null,
  diskSpaceGb: 100,
  inetDownMbps: 1000,
  inetUpMbps: 1000,
  market: "on-demand" as const,
  projectedCostUsd: 0.1,
};

function lease(state = "pending") {
  const now = new Date();
  return {
    operatorId: "admin",
    id: "22222222-2222-4222-8222-222222222222",
    requestId: request.requestId,
    vastInstanceId: state === "pending" ? null : 555,
    preset: request.preset,
    market: request.market,
    state,
    label: "ba-admin:22222222-2222-4222-8222-222222222222",
    gpuName: offer.gpuName,
    gpuRamMb: offer.gpuRamMb,
    hourlyCostUsd: offer.hourlyUsd,
    estimatedMaxCostUsd: 0.1,
    balanceBeforeUsd: 2.95,
    balanceAfterUsd: null,
    expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    destroyedAt: null,
    errorCode: null,
    errorMessage: null,
  };
}

describe("servicio de alquiler Vast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VAST_ADMIN_LIFECYCLE_ENABLED", "true");
    mocks.getVastLeaseByRequestId.mockResolvedValue(null);
    mocks.getVastLifecycleHeartbeat.mockResolvedValue({ reportedStatus: "healthy", observedAt: new Date().toISOString(), details: {} });
    mocks.getCachedVastOfferRoute.mockResolvedValue({ machineId: offer.machineId, hourlyUsd: offer.hourlyUsd, preset: request.preset, market: request.market });
    mocks.getAccount.mockResolvedValue({ balanceUsd: 2.95, canPay: true });
    mocks.listInstances.mockResolvedValue([]);
    mocks.searchOffers.mockResolvedValue([offer]);
    mocks.listVastAdminLeases.mockResolvedValue([]);
    mocks.insertPendingVastLease.mockResolvedValue(lease());
    mocks.createInstance.mockResolvedValue(555);
    mocks.updateVastLease.mockImplementation(async (_id, values) => ({ ...lease(values.state ?? "loading"), vastInstanceId: values.vastInstanceId ?? 555 }));
    mocks.scheduleVastLeaseDestruction.mockResolvedValue({ id: "job" });
    mocks.auditVastAdminAction.mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("falla cerrado cuando el worker de autodestrucción está viejo", async () => {
    mocks.getVastLifecycleHeartbeat.mockResolvedValue({ reportedStatus: "healthy", observedAt: "2020-01-01T00:00:00.000Z", details: {} });
    await expect(createVastAdminLease(request, "admin")).rejects.toMatchObject({ code: "VAST_LIFECYCLE_UNHEALTHY" });
    expect(mocks.createInstance).not.toHaveBeenCalled();
  });

  it("rechaza ofertas que no fueron seleccionadas mediante la búsqueda segura", async () => {
    mocks.getCachedVastOfferRoute.mockResolvedValue(null);
    await expect(createVastAdminLease(request, "admin")).rejects.toMatchObject({ code: "VAST_OFFER_CHANGED" });
    expect(mocks.createInstance).not.toHaveBeenCalled();
  });

  it("protege la reserva real antes de alquilar", async () => {
    mocks.getAccount.mockResolvedValue({ balanceUsd: 0.45, canPay: true });
    await expect(createVastAdminLease(request, "admin")).rejects.toMatchObject({ code: "VAST_BUDGET_BLOCKED" });
    expect(mocks.insertPendingVastLease).not.toHaveBeenCalled();
  });

  it("persiste primero, programa TTL y después acepta la oferta", async () => {
    const result = await createVastAdminLease(request, "admin");
    expect(result.state).toBe("loading");
    expect(mocks.insertPendingVastLease).toHaveBeenCalledBefore(mocks.createInstance);
    expect(mocks.scheduleVastLeaseDestruction).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    expect(mocks.createInstance).toHaveBeenCalledWith(expect.objectContaining({ offerId: 91, templateHashId: "template-hash" }));
  });

  it("no permite actuar sobre una instancia externa", async () => {
    mocks.getVastLeaseByInstanceId.mockResolvedValue(null);
    await expect(actOnVastAdminInstance({ instanceId: 999, action: "destroy", confirmation: "DESTRUIR 999", operatorId: "admin" }))
      .rejects.toMatchObject({ code: "VAST_INSTANCE_UNMANAGED" });
    expect(mocks.destroyInstance).not.toHaveBeenCalled();
  });

  it("destruye al vencer incluso si la instancia estaba detenida", async () => {
    const runningLease = lease("stopped");
    mocks.getVastLeaseById.mockResolvedValue(runningLease);
    mocks.updateVastLease.mockImplementation(async (_id, values) => ({ ...runningLease, ...{
      state: values.state ?? runningLease.state,
      destroyedAt: values.destroyedAt ?? runningLease.destroyedAt,
    } }));
    await expireVastAdminLease(runningLease.id);
    expect(mocks.destroyInstance).toHaveBeenCalledWith(555);
    expect(mocks.updateVastLease).toHaveBeenLastCalledWith(runningLease.id, expect.objectContaining({ state: "destroyed" }));
    expect(mocks.auditVastAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "vast.instance_expired", actorId: "admin" }));
  });

  it("deja intactas las instancias externas durante reconciliación", async () => {
    mocks.listVastAdminLeases.mockResolvedValue([]);
    mocks.listInstances.mockResolvedValue([{ id: 8, label: "manual-lab", status: "running", managed: false }]);
    await reconcileVastAdminLeases();
    expect(mocks.destroyInstance).not.toHaveBeenCalled();
  });
});
