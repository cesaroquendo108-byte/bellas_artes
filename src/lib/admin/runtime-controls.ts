import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export type GenerationRuntimeControl = {
  emergencyPaused: boolean;
  pauseReason: string | null;
  pausedAt: string | null;
};

export async function getGenerationRuntimeControl(): Promise<GenerationRuntimeControl> {
  const { data, error } = await createAdminClient()
    .from("platform_runtime_controls")
    .select("emergency_paused,pause_reason,paused_at")
    .eq("control_key", "generation")
    .maybeSingle();

  if (error) throw new Error(`No se pudo consultar el control de generación: ${error.message}`);
  return {
    emergencyPaused: Boolean(data?.emergency_paused),
    pauseReason: typeof data?.pause_reason === "string" ? data.pause_reason : null,
    pausedAt: typeof data?.paused_at === "string" ? data.paused_at : null,
  };
}

export async function isGenerationEmergencyPaused() {
  return (await getGenerationRuntimeControl()).emergencyPaused;
}

export async function pauseGenerationRuntime(actorId: string, reason: string) {
  const { data, error } = await createAdminClient().rpc("pause_generation_runtime", {
    p_actor: actorId,
    p_reason: reason,
  });
  if (error) throw new Error(`No se pudo pausar la generación: ${error.message}`);
  return data as {
    controlKey: "generation";
    emergencyPaused: true;
    pauseReason: string;
    pausedAt: string;
    changed: boolean;
  };
}
