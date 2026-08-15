import "server-only";

import {
  calculateBidPrice,
  calculateProjectedCost,
  type VastAdminLimits,
  type VastAdminMarket,
  type VastAdminPreset,
  type VastAdminTtlMinutes,
  type VastInstance,
  type VastOffer,
  isSupportedVastGpuFamily,
} from "@/lib/admin/vast-contracts";

const VAST_API_BASE = "https://console.vast.ai";
const VAST_LAB_DISK_GB = 100;
const VAST_LAB_BOOTSTRAP_URL = "https://raw.githubusercontent.com/cesaroquendo108-byte/bellas_artes/codex/consolidacion-final/infra/vast/bootstrap_3090_lab.sh";
const VAST_LAB_BOOTSTRAP_SHA256 = "80ac869d5d85de980f83d0022f537d81d76bc24552741792d92f5a9866bd86f1";

type VastApiMode = "admin" | "lifecycle";

export class VastAdminError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 503,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "VastAdminError";
  }
}

export type VastAdminServerConfig = {
  enabled: boolean;
  apiConfigured: boolean;
  configured: boolean;
  operatorEmail: string;
  templateHashId: string | null;
  fluxVolumeId: number | null;
  fluxMachineId: number | null;
  fluxMountPath: string;
  limits: VastAdminLimits;
};

type VastRaw = Record<string, unknown>;

export function getVastAdminServerConfig(): VastAdminServerConfig {
  const limits = {
    maxActiveInstances: boundedInteger(process.env.VAST_ADMIN_MAX_ACTIVE_INSTANCES, 1, 1, 1),
    maxHourlyUsd: boundedNumber(process.env.VAST_ADMIN_MAX_HOURLY_USD, 0.6, 0.01, 0.6),
    maxRentalUsd: boundedNumber(process.env.VAST_ADMIN_MAX_RENTAL_USD, 1.2, 0.01, 1.2),
    minBalanceReserveUsd: boundedNumber(process.env.VAST_ADMIN_MIN_BALANCE_RESERVE_USD, 0.4, 0.4, 100),
    minReliability: boundedNumber(process.env.VAST_ADMIN_MIN_RELIABILITY, 0.98, 0.98, 1),
    minGpuRamMb: boundedInteger(process.env.VAST_ADMIN_MIN_GPU_RAM_MB, 24_000, 24_000, 1_000_000),
  } satisfies VastAdminLimits;
  const apiKey = process.env.VAST_ADMIN_API_KEY?.trim();
  const templateHashId = process.env.VAST_ADMIN_COMFY_TEMPLATE_HASH?.trim() || null;
  return {
    enabled: process.env.VAST_ADMIN_ENABLED === "true",
    apiConfigured: Boolean(apiKey),
    configured: Boolean(apiKey && templateHashId),
    operatorEmail: (process.env.VAST_ADMIN_OPERATOR_EMAIL?.trim() || "cesaroquendo10@gmail.com").toLowerCase(),
    templateHashId,
    fluxVolumeId: positiveIntegerOrNull(process.env.VAST_ADMIN_FLUX_VOLUME_ID),
    fluxMachineId: positiveIntegerOrNull(process.env.VAST_ADMIN_FLUX_MACHINE_ID),
    fluxMountPath: process.env.VAST_ADMIN_FLUX_MOUNT_PATH?.trim() || "/workspace/ComfyUI/models/checkpoints",
    limits,
  };
}

export function isVastAdminOperator(email: string | null | undefined, config = getVastAdminServerConfig()) {
  return Boolean(email && email.trim().toLowerCase() === config.operatorEmail);
}

export class VastAdminClient {
  private readonly apiKey: string;

  constructor(mode: VastApiMode = "admin") {
    const primary = mode === "lifecycle" ? process.env.VAST_LIFECYCLE_API_KEY : process.env.VAST_ADMIN_API_KEY;
    const value = primary?.trim();
    if (!value) throw new VastAdminError("VAST_ADMIN_NOT_CONFIGURED", "La integración administrativa de Vast.ai no está configurada.", 503);
    this.apiKey = value;
  }

  async getAccount() {
    const payload = await this.request<VastRaw>("/api/v0/users/current/", { method: "GET" }, { retry: true });
    // Vast's marketplace account payload exposes spendable funds as `credit`.
    // Some accounts also return a bookkeeping `balance` of zero, so prefer credit.
    const balance = numberFrom(payload.credit, payload.balance);
    if (balance === null) throw new VastAdminError("VAST_BALANCE_INVALID", "Vast.ai no devolvió un saldo válido.", 502);
    return {
      balanceUsd: balance,
      canPay: typeof payload.can_pay === "boolean" ? payload.can_pay : balance > 0,
    };
  }

  async searchOffers(input: {
    preset: VastAdminPreset;
    market: VastAdminMarket;
    ttlMinutes: VastAdminTtlMinutes;
    limits: VastAdminLimits;
    fluxMachineId: number | null;
    offerId?: number;
    offerMachineId?: number;
    limit?: number;
  }): Promise<VastOffer[]> {
    const body: Record<string, unknown> = {
      limit: input.offerId ? 100 : Math.min(Math.max(input.limit ?? 30, 1), 50),
      type: input.market === "on-demand" ? "ondemand" : "bid",
      order: [["dph_total", "asc"]],
      verified: { eq: true },
      rentable: { eq: true },
      rented: { eq: false },
      num_gpus: { eq: 1 },
      gpu_ram: { gte: input.limits.minGpuRamMb },
      reliability: { gte: input.limits.minReliability },
      direct_port_count: { gte: 1 },
      disk_space: { gte: input.preset === "comfy-clean" ? VAST_LAB_DISK_GB : 60 },
    };
    if (input.offerMachineId) body.machine_id = { eq: input.offerMachineId };
    if (input.preset === "flux-cached") {
      if (!input.fluxMachineId) return [];
      body.machine_id = { eq: input.fluxMachineId };
    }
    const payload = await this.request<VastRaw>("/api/v0/bundles/", {
      method: "POST",
      body: JSON.stringify(body),
    }, { retry: true });
    return normalizeCollection(payload.offers)
      .map((offer) => sanitizeOffer(offer, input.market, input.ttlMinutes))
      .filter((offer): offer is VastOffer => Boolean(offer))
      .filter((offer) => isSupportedVastGpuFamily(offer.gpuName))
      .filter((offer) => !input.offerId || offer.id === input.offerId)
      .filter((offer) => offer.hourlyUsd <= input.limits.maxHourlyUsd)
      .sort((left, right) => left.hourlyUsd - right.hourlyUsd);
  }

  async listInstances(managedLeaseIds = new Map<number, string>()) {
    const payload = await this.request<VastRaw>("/api/v1/instances/", { method: "GET" }, { retry: true });
    return normalizeCollection(payload.instances)
      .map((instance) => sanitizeInstance(instance, managedLeaseIds.get(integerFrom(instance.id) ?? -1) ?? null))
      .filter((instance): instance is VastInstance => Boolean(instance));
  }

  async createInstance(input: {
    offerId: number;
    label: string;
    expiresAt: string;
    preset: VastAdminPreset;
    bidPriceUsd: number | null;
    templateHashId: string;
    fluxVolumeId: number | null;
    fluxMountPath: string;
  }) {
    const body: Record<string, unknown> = {
      template_hash_id: input.templateHashId,
      label: input.label,
      disk: input.preset === "comfy-clean" ? VAST_LAB_DISK_GB : 60,
      runtype: "ssh_direct",
      target_state: "running",
      cancel_unavail: true,
    };
    if (input.bidPriceUsd !== null) body.price = input.bidPriceUsd;
    const watchdog = buildInstanceWatchdogCommand(input.expiresAt);
    if (input.preset === "comfy-clean") {
      body.onstart = [watchdog, buildLabOnstartCommand()].join("\n");
    }
    if (input.preset === "flux-cached") {
      if (!input.fluxVolumeId) throw new VastAdminError("VAST_VOLUME_NOT_CONFIGURED", "El volumen Flux no está configurado.", 422);
      body.volume_info = { create_new: false, volume_id: input.fluxVolumeId, mount_path: input.fluxMountPath };
      body.onstart = watchdog;
    }
    const payload = await this.request<VastRaw>(`/api/v0/asks/${input.offerId}/`, {
      method: "PUT",
      body: JSON.stringify(body),
    }, { retry: false });
    const instanceId = integerFrom(payload.new_contract);
    if (!instanceId || payload.success === false) {
      throw new VastAdminError("VAST_CREATE_REJECTED", "Vast.ai no confirmó la creación de la instancia.", 502);
    }
    return instanceId;
  }

  async manageInstance(instanceId: number, state: "running" | "stopped") {
    await this.request(`/api/v0/instances/${instanceId}/`, {
      method: "PUT",
      body: JSON.stringify({ state }),
    }, { retry: true });
  }

  async destroyInstance(instanceId: number) {
    try {
      await this.request(`/api/v0/instances/${instanceId}/`, { method: "DELETE" }, { retry: true });
    } catch (error) {
      if (error instanceof VastAdminError && error.status === 404) return;
      throw error;
    }
  }

  private async request<T = VastRaw>(
    path: string,
    init: RequestInit,
    options: { retry: boolean },
  ): Promise<T> {
    const attempts = options.retry ? 3 : 1;
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(`${VAST_API_BASE}${path}`, {
          ...init,
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            accept: "application/json",
            ...(init.body ? { "content-type": "application/json" } : {}),
            ...init.headers,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        });
        const payload = await readJson(response);
        if (response.ok) return payload as T;
        const code = response.status === 429
          ? "VAST_RATE_LIMITED"
          : response.status === 404
            ? "VAST_NOT_FOUND"
            : response.status === 401 || response.status === 403
              ? "VAST_CREDENTIAL_REJECTED"
              : "VAST_PROVIDER_ERROR";
        const retryable = response.status === 429 || response.status >= 500;
        const error = new VastAdminError(code, safeProviderMessage(response.status), response.status, retryable);
        if (!retryable || attempt === attempts) throw error;
        lastError = error;
      } catch (error) {
        if (error instanceof VastAdminError && (!error.retryable || attempt === attempts)) throw error;
        if (error instanceof DOMException && error.name === "TimeoutError" && attempt === attempts) {
          throw new VastAdminError("VAST_TIMEOUT", "Vast.ai no respondió dentro del tiempo permitido.", 504, true);
        }
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** (attempt - 1))));
    }
    throw lastError instanceof Error
      ? lastError
      : new VastAdminError("VAST_PROVIDER_ERROR", "No se pudo contactar Vast.ai.", 503, true);
  }
}

function buildLabOnstartCommand() {
  return [
    "set -euo pipefail",
    `curl --fail --location --retry 5 --retry-all-errors --output /tmp/bellas-artes-3090-lab.sh '${VAST_LAB_BOOTSTRAP_URL}'`,
    `printf '%s  %s\\n' '${VAST_LAB_BOOTSTRAP_SHA256}' /tmp/bellas-artes-3090-lab.sh | sha256sum -c -`,
    "bash /tmp/bellas-artes-3090-lab.sh",
  ].join("\n");
}

function buildInstanceWatchdogCommand(expiresAt: string) {
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) throw new VastAdminError("VAST_TTL_INVALID", "El vencimiento del alquiler no es válido.", 422);
  const script = [
    "import os, sys, time, urllib.request",
    "expires_at = int(sys.argv[1])",
    "time.sleep(max(expires_at - int(time.time()), 0))",
    "instance_id = os.environ.get('CONTAINER_ID')",
    "api_key = os.environ.get('CONTAINER_API_KEY')",
    "if not instance_id or not api_key: raise SystemExit('INSTANCE_WATCHDOG_ENV_MISSING')",
    "request = urllib.request.Request(f'https://console.vast.ai/api/v0/instances/{instance_id}/', method='DELETE', headers={'Authorization': f'Bearer {api_key}'})",
    "with urllib.request.urlopen(request, timeout=30) as response: response.read()",
  ].join("\n");
  const encoded = Buffer.from(script, "utf8").toString("base64");
  const expiresAtSeconds = Math.floor(expiresAtMs / 1_000);
  return [
    `printf '%s' '${encoded}' | base64 -d > /tmp/bellas-artes-vast-watchdog.py`,
    `nohup python /tmp/bellas-artes-vast-watchdog.py ${expiresAtSeconds} >/tmp/bellas-artes-vast-watchdog.log 2>&1 &`,
  ].join("\n");
}

function sanitizeOffer(raw: VastRaw, market: VastAdminMarket, ttlMinutes: number): VastOffer | null {
  const id = integerFrom(raw.id, raw.ask_contract_id);
  const machineId = integerFrom(raw.machine_id);
  const gpuRamMb = numberFrom(raw.gpu_ram, raw.gpu_total_ram);
  const numGpus = integerFrom(raw.num_gpus);
  const reliability = numberFrom(raw.reliability, raw.reliability2, raw.expected_reliability);
  const dphTotal = numberFrom(raw.dph_total, raw.dph_total_adj, nestedNumber(raw, "search", "totalHour"));
  const minBid = numberFrom(raw.min_bid);
  const bidPrice = market === "bid" && minBid !== null ? calculateBidPrice(minBid) : null;
  const bidTotal = bidPrice !== null && dphTotal !== null && minBid !== null
    ? roundCostUp(dphTotal + Math.max(0, bidPrice - minBid))
    : bidPrice;
  const hourlyUsd = market === "bid" ? bidTotal : dphTotal;
  if (!id || !machineId || gpuRamMb === null || !numGpus || reliability === null || hourlyUsd === null) return null;
  return {
    id,
    machineId,
    gpuName: safeText(raw.gpu_name, "GPU NVIDIA"),
    gpuRamMb,
    numGpus,
    reliability,
    geolocation: safeText(raw.geolocation, "Ubicación no informada"),
    hourlyUsd,
    minBidUsd: minBid,
    bidPriceUsd: bidPrice,
    diskSpaceGb: numberFrom(raw.disk_space) ?? 0,
    inetDownMbps: numberFrom(raw.inet_down),
    inetUpMbps: numberFrom(raw.inet_up),
    market,
    projectedCostUsd: calculateProjectedCost(hourlyUsd, ttlMinutes),
  };
}

function sanitizeInstance(raw: VastRaw, leaseId: string | null): VastInstance | null {
  const id = integerFrom(raw.id);
  if (!id) return null;
  const sshHost = safeHost(raw.ssh_host) ?? safeHost(raw.public_ipaddr);
  const sshPort = integerFrom(raw.ssh_port, nestedNumber(raw, "ports", "22/tcp", "0", "HostPort"));
  const sshCommand = sshHost && sshPort ? `ssh -p ${sshPort} root@${sshHost}` : null;
  const proxyUrl = safeVastHttpsUrl(raw.jupyter_url, raw.instance_url, raw.proxy_url);
  return {
    id,
    label: safeText(raw.label, "Instancia sin etiqueta"),
    status: safeText(raw.actual_status, safeText(raw.cur_state, "desconocido")),
    gpuName: safeText(raw.gpu_name, "GPU NVIDIA"),
    gpuRamMb: numberFrom(raw.gpu_totalram, raw.gpu_ram) ?? 0,
    hourlyUsd: numberFrom(raw.dph_total, raw.dph_total_adj, raw.cost_per_hour),
    publicIp: safeHost(raw.public_ipaddr),
    sshHost,
    sshPort,
    sshCommand,
    tunnelCommand: sshHost && sshPort ? `ssh -N -L 8188:127.0.0.1:18188 -p ${sshPort} root@${sshHost}` : null,
    comfyUrl: proxyUrl,
    managed: Boolean(leaseId),
    leaseId,
  };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function normalizeCollection(value: unknown): VastRaw[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : [];
}

function roundCostUp(value: number) {
  return Math.ceil(value * 1_000_000) / 1_000_000;
}

function isRecord(value: unknown): value is VastRaw {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeProviderMessage(status: number) {
  if (status === 401 || status === 403) return "Vast.ai rechazó la credencial administrativa.";
  if (status === 404) return "El recurso de Vast.ai ya no existe.";
  if (status === 410) return "La oferta de Vast.ai dejó de estar disponible.";
  if (status === 429) return "Vast.ai limitó temporalmente las solicitudes.";
  return "Vast.ai devolvió un error operativo.";
}

function safeText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160) || fallback;
}

function safeHost(value: unknown) {
  if (typeof value !== "string") return null;
  const host = value.trim();
  return /^[a-zA-Z0-9.-]{1,253}$/.test(host) ? host : null;
}

function safeVastHttpsUrl(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && (url.hostname === "vast.ai" || url.hostname.endsWith(".vast.ai"))) {
        url.username = "";
        url.password = "";
        return url.toString();
      }
    } catch {
      // Ignorar URLs no válidas devueltas por el proveedor.
    }
  }
  return null;
}

function nestedNumber(record: VastRaw, ...path: string[]) {
  let current: unknown = record;
  for (const segment of path) {
    if (Array.isArray(current)) current = current[Number(segment)];
    else if (isRecord(current)) current = current[segment];
    else return null;
  }
  return numberFrom(current);
}

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function integerFrom(...values: unknown[]) {
  const value = numberFrom(...values);
  return value !== null && Number.isInteger(value) && value > 0 ? value : null;
}

function positiveIntegerOrNull(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function boundedNumber(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, minimum), maximum) : fallback;
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  return Math.round(boundedNumber(value, fallback, minimum, maximum));
}
