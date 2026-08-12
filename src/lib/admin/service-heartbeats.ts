import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

type HeartbeatStatus = "healthy" | "stopped" | "error";

export async function recordServiceHeartbeat(input: {
  serviceKey: string;
  status: HeartbeatStatus;
  details?: Record<string, string | number | boolean | null>;
}) {
  if (!/^[a-z0-9:-]{2,80}$/.test(input.serviceKey)) {
    throw new Error("SERVICE_HEARTBEAT_KEY_INVALID");
  }
  const observedAt = new Date().toISOString();
  const { error } = await createAdminClient().from("service_heartbeats").upsert({
    service_key: input.serviceKey,
    reported_status: input.status,
    details: input.details ?? {},
    observed_at: observedAt,
    updated_at: observedAt,
  }, { onConflict: "service_key" });
  if (error) throw new Error(`No se pudo registrar el heartbeat: ${error.message}`);
}
