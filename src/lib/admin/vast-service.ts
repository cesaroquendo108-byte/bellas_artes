import "server-only";

import { randomUUID } from "node:crypto";

import {
  calculateProjectedCost,
  classifyLifecycleHeartbeat,
  isTerminalVastLeaseState,
  validateOfferForRental,
  type CreateVastLeaseRequest,
  type VastAdminLease,
  type VastAdminMarket,
  type VastAdminOverview,
  type VastAdminPreset,
  type VastAdminTtlMinutes,
  type VastInstanceAction,
  type VastLeaseState,
} from "@/lib/admin/vast-contracts";
import {
  VastAdminClient,
  VastAdminError,
  getVastAdminServerConfig,
} from "@/lib/admin/vast-client";
import {
  auditVastAdminAction,
  getVastLeaseById,
  getVastLeaseByInstanceId,
  getVastLeaseByRequestId,
  getVastLifecycleHeartbeat,
  insertPendingVastLease,
  listVastAdminLeases,
  updateVastLease,
} from "@/lib/admin/vast-lease-store";
import { getVastLifecycleBackend, scheduleVastLeaseDestruction } from "@/lib/admin/vast-lifecycle-queue";
import { cacheVastOfferRoutes, getCachedVastOfferRoute } from "@/lib/admin/vast-offer-cache";

const ACTIVE_INSTANCE_STATES = new Set(["loading", "running", "stopped", "exited", "offline", "created"]);

export async function getVastAdminOverview(): Promise<VastAdminOverview> {
  const config = getVastAdminServerConfig();
  const [storedLeases, heartbeat] = await Promise.all([
    listVastAdminLeases(30).catch(() => []),
    getVastLifecycleHeartbeat().catch(() => ({ reportedStatus: null, observedAt: null, details: {} })),
  ]);
  const lifecycleState = classifyLifecycleHeartbeat(heartbeat);
  const lifecycle = {
    state: lifecycleState,
    observedAt: heartbeat.observedAt,
    summary: lifecycleSummary(lifecycleState),
  };
  const base: VastAdminOverview = {
    generatedAt: new Date().toISOString(),
    enabled: config.enabled,
    configured: config.configured,
    balanceUsd: null,
    canPay: false,
    activeManagedInstances: storedLeases.filter((lease) => !isTerminalVastLeaseState(lease.state)).length,
    activeAccountInstances: 0,
    currentHourlyUsd: 0,
    limits: config.limits,
    lifecycle,
    presets: presetStatuses(config, false),
    leases: storedLeases.map(publicLease),
    instances: [],
  };
  if (!config.apiConfigured) return base;

  try {
    const client = new VastAdminClient();
    const managed = new Map(
      storedLeases
        .filter((lease) => lease.vastInstanceId !== null)
        .map((lease) => [lease.vastInstanceId as number, lease.id]),
    );
    const [account, instances, fluxOffers] = await Promise.all([
      client.getAccount(),
      client.listInstances(managed),
      config.fluxMachineId && config.templateHashId && config.fluxVolumeId
        ? client.searchOffers({
          preset: "flux-cached",
          market: "on-demand",
          ttlMinutes: 15,
          limits: config.limits,
          fluxMachineId: config.fluxMachineId,
          limit: 1,
        }).catch(() => [])
        : Promise.resolve([]),
    ]);
    const activeInstances = instances.filter((instance) => isActiveProviderState(instance.status));
    return {
      ...base,
      balanceUsd: account.balanceUsd,
      canPay: account.canPay,
      activeManagedInstances: activeInstances.filter((instance) => instance.managed).length,
      activeAccountInstances: activeInstances.length,
      currentHourlyUsd: roundUsd(activeInstances.reduce((sum, instance) => sum + (instance.hourlyUsd ?? 0), 0)),
      presets: presetStatuses(config, fluxOffers.length > 0),
      instances,
    };
  } catch {
    return base;
  }
}

export async function searchVastRentalOffers(input: {
  preset: VastAdminPreset;
  market: VastAdminMarket;
  ttlMinutes: VastAdminTtlMinutes;
}) {
  const config = getVastAdminServerConfig();
  if (!config.apiConfigured) throw new VastAdminError("VAST_ADMIN_NOT_CONFIGURED", "La API administrativa de Vast.ai no está configurada.", 503);
  if (!config.templateHashId) throw new VastAdminError("VAST_TEMPLATE_NOT_CONFIGURED", "La plantilla segura de ComfyUI no está configurada.", 503);
  if (input.preset === "flux-cached" && (!config.fluxVolumeId || !config.fluxMachineId)) return [];
  const offers = await new VastAdminClient().searchOffers({
    ...input,
    limits: config.limits,
    fluxMachineId: config.fluxMachineId,
  });
  try {
    await cacheVastOfferRoutes(offers, input.preset, input.market);
  } catch {
    throw new VastAdminError("VAST_OFFER_CACHE_UNAVAILABLE", "No se pudo preparar la revalidación segura de ofertas.", 503, true);
  }
  return offers;
}

export async function createVastAdminLease(input: CreateVastLeaseRequest, operatorId: string) {
  const config = getVastAdminServerConfig();
  if (!config.enabled) throw new VastAdminError("VAST_ADMIN_DISABLED", "El alquiler administrativo de GPU está deshabilitado.", 409);
  if (!config.configured || !config.templateHashId) throw new VastAdminError("VAST_ADMIN_NOT_CONFIGURED", "La integración administrativa de Vast.ai no está completa.", 503);

  const existing = await getVastLeaseByRequestId(input.requestId);
  if (existing) return publicLease(existing);

  const heartbeat = await getVastLifecycleHeartbeat();
  if (classifyLifecycleHeartbeat(heartbeat) !== "healthy") {
    throw new VastAdminError("VAST_LIFECYCLE_UNHEALTHY", "El worker de autodestrucción no está saludable.", 503);
  }

  const cachedOffer = await getCachedVastOfferRoute(input.offerId);
  if (!cachedOffer || cachedOffer.preset !== input.preset || cachedOffer.market !== input.market) {
    throw new VastAdminError("VAST_OFFER_CHANGED", "La oferta seleccionada dejó de estar disponible.", 409);
  }

  const client = new VastAdminClient();
  const [account, accountInstances, offers, leases] = await Promise.all([
    client.getAccount(),
    client.listInstances(),
    client.searchOffers({
      preset: input.preset,
      market: input.market,
      ttlMinutes: input.ttlMinutes,
      limits: config.limits,
      fluxMachineId: config.fluxMachineId,
      offerMachineId: cachedOffer.machineId,
      limit: 10,
    }),
    listVastAdminLeases(100),
  ]);
  if (accountInstances.some((instance) => isActiveProviderState(instance.status))) {
    throw new VastAdminError("VAST_ACTIVE_INSTANCE_EXISTS", "Ya existe una GPU activa en la cuenta Vast.ai.", 409);
  }
  if (leases.some((lease) => !isTerminalVastLeaseState(lease.state))) {
    throw new VastAdminError("VAST_ACTIVE_INSTANCE_EXISTS", "Ya existe un alquiler administrado pendiente o activo.", 409);
  }
  const offer = offers[0];
  if (!offer) throw new VastAdminError("VAST_OFFER_CHANGED", "La oferta seleccionada dejó de estar disponible.", 409);
  if (offer.hourlyUsd > cachedOffer.hourlyUsd + 0.000001) {
    throw new VastAdminError("VAST_OFFER_CHANGED", "La oferta cambió de precio; vuelve a seleccionarla.", 409);
  }
  const offerIssue = validateOfferForRental({
    offer,
    preset: input.preset,
    limits: config.limits,
    fluxMachineId: config.fluxMachineId,
  });
  if (offerIssue) throw new VastAdminError("VAST_OFFER_CHANGED", "La oferta ya no cumple los límites de seguridad.", 409);
  const projectedCostUsd = calculateProjectedCost(offer.hourlyUsd, input.ttlMinutes);
  if (!account.canPay || projectedCostUsd > config.limits.maxRentalUsd || account.balanceUsd - projectedCostUsd < config.limits.minBalanceReserveUsd) {
    throw new VastAdminError("VAST_BUDGET_BLOCKED", "El saldo o el coste proyectado no cumple la reserva de seguridad.", 409);
  }

  const leaseId = randomUUID();
  const label = `ba-admin:${leaseId}`;
  const expiresAt = new Date(Date.now() + input.ttlMinutes * 60_000).toISOString();
  let lease;
  try {
    lease = await insertPendingVastLease({
      id: leaseId,
      requestId: input.requestId,
      operatorId,
      offerId: offer.id,
      preset: input.preset,
      market: input.market,
      label,
      gpuName: offer.gpuName,
      gpuRamMb: offer.gpuRamMb,
      hourlyCostUsd: offer.hourlyUsd,
      estimatedMaxCostUsd: projectedCostUsd,
      balanceBeforeUsd: account.balanceUsd,
      expiresAt,
    });
  } catch {
    const duplicate = await getVastLeaseByRequestId(input.requestId).catch(() => null);
    if (duplicate) return publicLease(duplicate);
    throw new VastAdminError("VAST_ACTIVE_INSTANCE_EXISTS", "No se pudo reservar el único cupo administrativo de GPU.", 409);
  }

  if (getVastLifecycleBackend() === "queue") {
    try {
      await scheduleVastLeaseDestruction(lease.id, lease.expiresAt);
    } catch {
      await updateVastLease(lease.id, {
        state: "failed",
        destroyedAt: new Date().toISOString(),
        errorCode: "VAST_LIFECYCLE_SCHEDULE_FAILED",
        errorMessage: "No se pudo programar la destrucción; no se solicitó ninguna GPU.",
      }).catch(() => undefined);
      throw new VastAdminError("VAST_LIFECYCLE_UNHEALTHY", "No se pudo programar la autodestrucción del alquiler.", 503);
    }
  }
  await auditVastAdminAction({
    actorId: operatorId,
    action: "vast.rental_requested",
    leaseId: lease.id,
    metadata: { preset: input.preset, market: input.market, hourlyUsd: offer.hourlyUsd, ttlMinutes: input.ttlMinutes },
  });

  let createdInstanceId: number | null = null;
  try {
    createdInstanceId = await client.createInstance({
      offerId: offer.id,
      label,
      expiresAt: lease.expiresAt,
      preset: input.preset,
      bidPriceUsd: input.market === "bid" ? offer.bidPriceUsd : null,
      templateHashId: config.templateHashId,
      fluxVolumeId: config.fluxVolumeId,
      fluxMountPath: config.fluxMountPath,
    });
    try {
      lease = await updateVastLease(lease.id, {
        state: "loading",
        vastInstanceId: createdInstanceId,
        lastSyncedAt: new Date().toISOString(),
        errorCode: null,
        errorMessage: null,
      });
    } catch (databaseError) {
      await client.destroyInstance(createdInstanceId).catch(() => undefined);
      await updateVastLease(lease.id, {
        state: "failed",
        destroyedAt: new Date().toISOString(),
        errorCode: "VAST_LEASE_PERSIST_FAILED",
        errorMessage: "La instancia fue destruida porque no se pudo persistir su identificador.",
      }).catch(() => undefined);
      throw databaseError;
    }
    try {
      await auditVastAdminAction({
        actorId: operatorId,
        action: "vast.instance_created",
        leaseId: lease.id,
        instanceId: createdInstanceId,
        metadata: { expiresAt },
      });
    } catch {
      await client.destroyInstance(createdInstanceId).catch(() => undefined);
      lease = await updateVastLease(lease.id, {
        state: "failed",
        destroyedAt: new Date().toISOString(),
        errorCode: "VAST_AUDIT_FAILED",
        errorMessage: "La instancia fue destruida porque no se pudo auditar su creación.",
      });
      throw new VastAdminError("VAST_AUDIT_FAILED", "No se pudo auditar la creación; la GPU fue destruida.", 503);
    }
    return publicLease(lease);
  } catch (error) {
    if (createdInstanceId) throw error;
    if (error instanceof VastAdminError && error.code === "VAST_TIMEOUT") {
      const reconciled = await reconcileLeaseByLabel(lease.id, label, client);
      if (reconciled) return publicLease(reconciled);
      lease = await updateVastLease(lease.id, {
        state: "reconciling",
        errorCode: "VAST_CREATE_UNCERTAIN",
        errorMessage: "Vast no confirmó a tiempo; el worker verificará la etiqueta antes de liberar el cupo.",
      });
      return publicLease(lease);
    }
    lease = await updateVastLease(lease.id, {
      state: "failed",
      destroyedAt: new Date().toISOString(),
      errorCode: error instanceof VastAdminError ? error.code : "VAST_CREATE_FAILED",
      errorMessage: safeOperationalMessage(error, "Vast.ai rechazó el alquiler."),
    });
    await auditVastAdminAction({
      actorId: operatorId,
      action: "vast.rental_failed",
      leaseId: lease.id,
      metadata: { errorCode: lease.errorCode },
    }).catch(() => undefined);
    throw error;
  }
}

export async function actOnVastAdminInstance(input: {
  instanceId: number;
  action: VastInstanceAction;
  confirmation: string;
  operatorId: string;
}) {
  const config = getVastAdminServerConfig();
  if (!config.enabled) throw new VastAdminError("VAST_ADMIN_DISABLED", "El control administrativo de GPU está deshabilitado.", 409);
  const lease = await getVastLeaseByInstanceId(input.instanceId);
  if (!lease) throw new VastAdminError("VAST_INSTANCE_UNMANAGED", "Esta instancia no fue creada por Bellas Artes.", 403);
  if (isTerminalVastLeaseState(lease.state)) return publicLease(lease);
  if (input.action === "destroy" && input.confirmation !== `DESTRUIR ${input.instanceId}`) {
    throw new VastAdminError("VAST_CONFIRMATION_REQUIRED", `Escribe DESTRUIR ${input.instanceId} para confirmar.`, 422);
  }
  if (input.action !== "destroy" && input.confirmation !== (input.action === "start" ? "INICIAR GPU" : "DETENER GPU")) {
    throw new VastAdminError("VAST_CONFIRMATION_REQUIRED", "La confirmación de la operación no coincide.", 422);
  }
  if (input.action === "start" && Date.parse(lease.expiresAt) <= Date.now()) {
    throw new VastAdminError("VAST_LEASE_EXPIRED", "El TTL del alquiler ya venció.", 409);
  }
  const client = new VastAdminClient();
  if (input.action === "destroy") {
    await updateVastLease(lease.id, { state: "destroying" });
    await client.destroyInstance(input.instanceId);
    const balance = await client.getAccount().catch(() => null);
    const updated = await updateVastLease(lease.id, {
      state: "destroyed",
      destroyedAt: new Date().toISOString(),
      balanceAfterUsd: balance?.balanceUsd ?? null,
      lastSyncedAt: new Date().toISOString(),
      errorCode: null,
      errorMessage: null,
    });
    await auditVastAdminAction({ actorId: input.operatorId, action: "vast.instance_destroyed", leaseId: lease.id, instanceId: input.instanceId });
    return publicLease(updated);
  }
  const nextState = input.action === "start" ? "running" : "stopped";
  await client.manageInstance(input.instanceId, nextState);
  const updated = await updateVastLease(lease.id, {
    state: nextState,
    lastSyncedAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  });
  await auditVastAdminAction({
    actorId: input.operatorId,
    action: input.action === "start" ? "vast.instance_started" : "vast.instance_stopped",
    leaseId: lease.id,
    instanceId: input.instanceId,
  });
  return publicLease(updated);
}

export async function expireVastAdminLease(leaseId: string) {
  let lease = await getVastLeaseById(leaseId);
  if (!lease || isTerminalVastLeaseState(lease.state)) return lease ? publicLease(lease) : null;
  const client = new VastAdminClient("lifecycle");
  let instanceId = lease.vastInstanceId;
  if (!instanceId) {
    const match = (await client.listInstances()).find((instance) => instance.label === lease?.label);
    instanceId = match?.id ?? null;
    if (instanceId) lease = await updateVastLease(lease.id, { vastInstanceId: instanceId, state: "destroying" });
  } else {
    lease = await updateVastLease(lease.id, { state: "destroying" });
  }
  if (instanceId) await client.destroyInstance(instanceId);
  lease = await updateVastLease(lease.id, {
    state: "destroyed",
    destroyedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  });
  await auditVastAdminAction({
    actorId: lease.operatorId,
    action: "vast.instance_expired",
    leaseId: lease.id,
    instanceId,
  });
  return publicLease(lease);
}

export async function reconcileVastAdminLeases() {
  if (process.env.VAST_ADMIN_LIFECYCLE_ENABLED !== "true") return { checked: 0, destroyed: 0, orphansDestroyed: 0 };
  const client = new VastAdminClient("lifecycle");
  const [leases, instances] = await Promise.all([listVastAdminLeases(100), client.listInstances()]);
  const activeLeases = leases.filter((lease) => !isTerminalVastLeaseState(lease.state));
  const leaseIdsByLabel = new Map(leases.map((lease) => [lease.label, lease]));
  let destroyed = 0;
  for (const lease of activeLeases) {
    if (Date.parse(lease.expiresAt) <= Date.now()) {
      await expireVastAdminLease(lease.id);
      destroyed += 1;
      continue;
    }
    const instance = instances.find((candidate) => candidate.id === lease.vastInstanceId || candidate.label === lease.label);
    if (instance) {
      const nextState = mapProviderState(instance.status);
      await updateVastLease(lease.id, {
        state: nextState,
        vastInstanceId: instance.id,
        lastSyncedAt: new Date().toISOString(),
        errorCode: null,
        errorMessage: null,
      });
      continue;
    }
    const ageMs = Date.now() - Date.parse(lease.createdAt);
    if (!lease.vastInstanceId && ageMs > 5 * 60_000) {
      await updateVastLease(lease.id, {
        state: "failed",
        destroyedAt: new Date().toISOString(),
        errorCode: "VAST_INSTANCE_NOT_FOUND",
        errorMessage: "Vast no reportó una instancia asociada después de cinco minutos.",
      });
    } else if (lease.vastInstanceId && ageMs > 2 * 60_000) {
      await updateVastLease(lease.id, {
        state: "destroyed",
        destroyedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
      });
    }
  }
  let orphansDestroyed = 0;
  for (const instance of instances) {
    if (!instance.label.startsWith("ba-admin:") || leaseIdsByLabel.has(instance.label)) continue;
    await client.destroyInstance(instance.id);
    orphansDestroyed += 1;
  }
  return { checked: activeLeases.length, destroyed, orphansDestroyed };
}

async function reconcileLeaseByLabel(leaseId: string, label: string, client: VastAdminClient) {
  const instance = (await client.listInstances()).find((candidate) => candidate.label === label);
  if (!instance) return null;
  return updateVastLease(leaseId, {
    state: mapProviderState(instance.status),
    vastInstanceId: instance.id,
    lastSyncedAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  });
}

function presetStatuses(config: ReturnType<typeof getVastAdminServerConfig>, fluxOfferAvailable: boolean) {
  return [
    {
      id: "comfy-clean" as const,
      name: "Laboratorio 3090 · imagen pública",
      description: "ComfyUI, 100 GB y bootstrap verificado para Flux Schnell, Klein 4B, Z-Image, SDXL y Real-ESRGAN.",
      available: Boolean(config.templateHashId),
      unavailableReason: config.templateHashId ? null : "Falta configurar la plantilla privada.",
    },
    {
      id: "flux-cached" as const,
      name: "Bellas Artes · Flux cacheado",
      description: "Monta el volumen persistente de Flux en su máquina compatible.",
      available: Boolean(config.templateHashId && config.fluxVolumeId && config.fluxMachineId && fluxOfferAvailable),
      unavailableReason: !config.fluxVolumeId || !config.fluxMachineId
        ? "El volumen Flux no está configurado."
        : fluxOfferAvailable
          ? null
          : "No hay una oferta compatible con la máquina del volumen.",
    },
  ];
}

function publicLease<T extends VastAdminLease & { operatorId?: string }>(lease: T): VastAdminLease {
  const safe: VastAdminLease & { operatorId?: string } = { ...lease };
  delete safe.operatorId;
  return safe;
}

function lifecycleSummary(state: ReturnType<typeof classifyLifecycleHeartbeat>) {
  if (state === "healthy") return "Autodestrucción disponible.";
  if (state === "degraded") return "Heartbeat retrasado; no se permiten alquileres.";
  if (state === "stale") return "Worker sin heartbeat reciente.";
  if (state === "stopped") return "Worker detenido intencionalmente.";
  if (state === "error") return "El worker reportó un error.";
  return "Worker de ciclo de vida sin configurar.";
}

function isActiveProviderState(status: string) {
  return ACTIVE_INSTANCE_STATES.has(status.toLowerCase());
}

function mapProviderState(status: string): VastLeaseState {
  const normalized = status.toLowerCase();
  if (normalized === "running") return "running";
  if (normalized === "stopped" || normalized === "exited" || normalized === "offline") return "stopped";
  if (normalized === "destroyed") return "destroyed";
  return "loading";
}

function safeOperationalMessage(error: unknown, fallback: string) {
  return error instanceof VastAdminError ? error.message : fallback;
}

function roundUsd(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
