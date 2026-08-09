"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/dashboard";
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 500) {
    return "/dashboard";
  }
  return path;
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const nextPath = safeNextPath(formData.get("next"));

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
  const supabase = await createClient();
  const nextPath = safeNextPath(formData.get("next"));

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    const query = new URLSearchParams({ message: "No se pudo registrar el usuario", next: nextPath });
    redirect(`/login?${query}`);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
