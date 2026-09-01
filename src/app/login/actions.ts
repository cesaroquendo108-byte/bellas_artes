"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOAuthRedirectBaseUrl } from "@/lib/auth-redirect";
import { createClient } from "@/utils/supabase/server";
import { recordLegalConsent } from "@/lib/legal/consent";

function hasRequiredConsent(formData: FormData) {
  return formData.get("termsAccepted") === "on" && formData.get("moderationAccepted") === "on";
}

function redirectForMissingConsent(nextPath: string): never {
  redirect(`/login?message=${encodeURIComponent("Debes aceptar los términos y las reglas de moderación para continuar.")}&next=${encodeURIComponent(nextPath)}`);
}

export async function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/dashboard";
  const path = value.trim();
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\") ||
    path.includes("\\") ||
    path.length > 500
  ) {
    return "/dashboard";
  }
  return path;
}

export async function login(formData: FormData) {
  const nextPath = await safeNextPath(formData.get("next"));
  if (!hasRequiredConsent(formData)) redirectForMissingConsent(nextPath);
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    const query = new URLSearchParams({ config: "missing", next: nextPath });
    redirect(`/login?${query}`);
  }

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    const query = new URLSearchParams({ message: "No se pudo autenticar usuario", next: nextPath });
    redirect(`/login?${query}`);
  }

  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("La sesión no está disponible.");
    await recordLegalConsent({ userId: currentUser.user.id, source: "login" });
  } catch {
    redirect(`/legal/consent?next=${encodeURIComponent(nextPath)}`);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signup(formData: FormData) {
  const nextPath = await safeNextPath(formData.get("next"));
  if (!hasRequiredConsent(formData)) redirectForMissingConsent(nextPath);
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    const query = new URLSearchParams({ config: "missing", next: nextPath });
    redirect(`/login?${query}`);
  }

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { data: authData, error } = await supabase.auth.signUp(data);

  if (error) {
    const query = new URLSearchParams({ message: "No se pudo registrar el usuario", next: nextPath });
    redirect(`/login?${query}`);
  }

  if (!authData.session) {
    const query = new URLSearchParams({
      notice: "Revisa tu correo para confirmar la cuenta antes de iniciar sesión.",
      next: nextPath,
    });
    redirect(`/login?${query}`);
  }

  if (!authData.user) {
    redirect(`/login?message=${encodeURIComponent("No se pudo completar el registro.")}&next=${encodeURIComponent(nextPath)}`);
  }

  try {
    await recordLegalConsent({ userId: authData.user.id, source: "signup" });
  } catch {
    redirect(`/legal/consent?next=${encodeURIComponent(nextPath)}`);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Permite cerrar la sesión local aunque falte la configuración del backend.
  }
  redirect("/login");
}

export async function loginWithGoogle(formData: FormData) {
  const nextPath = await safeNextPath(formData.get("next"));
  if (!hasRequiredConsent(formData)) redirectForMissingConsent(nextPath);
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    const query = new URLSearchParams({ config: "missing", next: nextPath });
    redirect(`/login?${query}`);
  }

  const redirectUrl = new URL("/auth/callback", getOAuthRedirectBaseUrl());
  redirectUrl.searchParams.set("next", `/legal/consent?next=${encodeURIComponent(nextPath)}`);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl.toString(),
    },
  });

  if (error) {
    const query = new URLSearchParams({ message: "No se pudo iniciar sesión con Google", next: nextPath });
    redirect(`/login?${query}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}
