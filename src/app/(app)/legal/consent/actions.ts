"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/app/login/actions";
import { recordLegalConsent } from "@/lib/legal/consent";
import { requireUser } from "@/lib/auth";

export async function acceptLegalConsent(formData: FormData) {
  const nextPath = await safeNextPath(formData.get("next"));
  const termsAccepted = formData.get("termsAccepted") === "on";
  const moderationAccepted = formData.get("moderationAccepted") === "on";
  if (!termsAccepted || !moderationAccepted) {
    redirect(`/legal/consent?next=${encodeURIComponent(nextPath)}&error=required`);
  }

  const { user } = await requireUser();
  const requestHeaders = await headers();
  await recordLegalConsent({
    userId: user.id,
    ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip") ?? undefined,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
    source: "consent-page",
  });
  redirect(nextPath);
}
