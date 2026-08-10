"use client";

import { useEffect, useState } from "react";
import type { GenerationJobResponse, GenerationStatus } from "./contracts";

export function getGenerationPollDelay(status: GenerationStatus | null, hidden: boolean) {
  if (status === "completed" || status === "failed" || status === "canceled") return null;
  return hidden ? 10000 : 2500;
}

export function useGenerationJob(jobId: string | null) {
  const [job, setJob] = useState<GenerationJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }
    let active = true;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`/api/generate/jobs/${jobId}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as GenerationJobResponse & { message?: string } | null;
        if (!response.ok) throw new Error(payload?.message ?? "No se pudo consultar el job.");
        if (!payload) throw new Error("El endpoint devolvió una respuesta vacía.");
        if (!active) return;
        setJob(payload);
        setError(null);
        const delay = getGenerationPollDelay(payload.status, document.visibilityState === "hidden");
        if (delay !== null) timer = window.setTimeout(poll, delay);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No se pudo consultar el job.");
        timer = window.setTimeout(poll, document.visibilityState === "hidden" ? 15000 : 5000);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [jobId]);

  return { job, error };
}
