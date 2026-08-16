import "server-only";

const PAYMENT_RATE_MARGIN = 1.2;
const RATE_CACHE_SECONDS = 86_400;

type FinveMcpResponse = {
  error?: { code?: number; message?: string };
  result?: {
    content?: Array<{ type?: string; text?: string }>;
  };
};

type FinveExchangeRate = {
  date?: string;
  currency?: string;
  exchangeRate?: number;
  resolvedFrom?: string;
};

export function calculatePaymentRate(baseRate: number): number {
  if (!Number.isFinite(baseRate) || baseRate <= 0) {
    throw new Error("La tasa base no es válida.");
  }
  return Number((baseRate * PAYMENT_RATE_MARGIN).toFixed(2));
}

export function calculateBolivarAmount(priceUsd: number, paymentRate: number): number {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0 || !Number.isFinite(paymentRate) || paymentRate <= 0) {
    throw new Error("No se pudo calcular el monto en bolívares.");
  }
  return Math.round(priceUsd * paymentRate * 100) / 100;
}

export function formatBolivarAmount(amount: number): string {
  return `Bs ${amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseFinveRateResponse(payload: FinveMcpResponse): number {
  if (payload.error) throw new Error("Finve rechazó la consulta de tasa.");
  const text = payload.result?.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("Finve no devolvió una tasa utilizable.");

  const parsed = JSON.parse(text) as FinveExchangeRate[] | FinveExchangeRate;
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  const rate = first?.exchangeRate;
  if (!Number.isFinite(rate) || Number(rate) <= 0 || first?.currency !== "USD") {
    throw new Error("Finve devolvió una tasa inválida.");
  }
  return Number(rate);
}

export function currentCaracasDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function getBcvRate(): Promise<number> {
  const finveUrl = process.env.FINVE_MCP_API_URL?.trim();
  const finveKey = process.env.FINVE_MCP_API_KEY?.trim();
  if (!finveUrl || !finveKey) {
    throw new Error("La integración de precios de Finve no está configurada.");
  }

  const date = currentCaracasDate();
  const response = await fetch(normalizeMcpUrl(finveUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${finveKey}`,
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `bellas-artes-payment-rate-${date}`,
      method: "tools/call",
      params: {
        name: "lookup_exchange_rate",
        arguments: { date, currency: "USD" },
      },
    }),
    cache: "force-cache",
    next: {
      revalidate: RATE_CACHE_SECONDS,
      tags: [`finve-payment-rate-${date}`],
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`La consulta de precios de Finve falló (${response.status}).`);
  }
  return parseFinveRateResponse(await response.json() as FinveMcpResponse);
}

export async function getPaymentRate(): Promise<number> {
  return calculatePaymentRate(await getBcvRate());
}

function normalizeMcpUrl(value: string): string {
  const url = value.replace(/\/+$/, "");
  return url.endsWith("/mcp") ? url : `${url}/mcp`;
}
