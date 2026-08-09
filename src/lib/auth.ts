import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id,email,role,plan_tier,display_name")
    .eq("id", user.id)
    .single();

  return {
    user,
    profile: {
      id: user.id,
      email: profile?.email ?? user.email ?? "",
      role: profile?.role === "admin" ? "admin" as const : "user" as const,
      planTier: profile?.plan_tier ?? "free",
      displayName: profile?.display_name ?? null,
    },
  };
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile.role !== "admin") redirect("/dashboard");
  return session;
}
