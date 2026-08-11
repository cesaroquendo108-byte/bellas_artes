"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOAuthRedirectBaseUrl } from "@/lib/auth-redirect";
import { createClient } from "@/utils/supabase/server";

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

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signup(formData: FormData) {
  const nextPath = await safeNextPath(formData.get("next"));
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
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    const query = new URLSearchParams({ config: "missing", next: nextPath });
    redirect(`/login?${query}`);
  }

  const redirectUrl = new URL("/auth/callback", getOAuthRedirectBaseUrl());
  redirectUrl.searchParams.set("next", nextPath);

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
