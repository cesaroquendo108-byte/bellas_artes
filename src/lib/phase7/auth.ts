import "server-only"

import { PhaseSevenError } from "@/lib/phase7/http"
import { createClient } from "@/utils/supabase/server"

export async function requireApiSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, status: 401 as const }
  }

  return { ok: true as const, supabase, user }
}

export async function requireAdminApiSession() {
  const session = await requireApiSession()
  if (!session.ok) return session

  const { data, error } = await session.supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle()

  if (error) throw new PhaseSevenError("DATABASE_ERROR", error.message)
  if (data?.role !== "admin") {
    return { ok: false as const, status: 403 as const }
  }

  return session
}
