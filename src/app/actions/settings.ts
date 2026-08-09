"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

const ProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});

export async function updateProfile(formData: FormData) {
  const parsed = ProfileSchema.safeParse({
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    redirect("/settings?message=Escribe un nombre entre 2 y 80 caracteres.");
  }

  const { profile } = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ display_name: parsed.data.displayName })
    .eq("id", profile.id);

  if (error) {
    redirect(`/settings?message=${encodeURIComponent("No pudimos guardar el nombre.")}`);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?saved=1");
}
