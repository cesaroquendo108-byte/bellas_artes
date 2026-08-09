import { NextResponse } from "next/server";
import { z } from "zod";
import { deletePrivateObject } from "@/lib/storage/r2";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const renameSchema = z.object({ name: z.string().trim().min(1).max(160) }).strict();

async function ownAsset(id: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("assets").select("id,r2_key").eq("id", id).eq("user_id", userId).maybeSingle();
  return data;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const parsed = renameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ errorCode: "INVALID_NAME", message: "Escribe un nombre válido." }, { status: 422 });
  if (!await ownAsset(id, user.id)) return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
  const { error } = await createAdminClient().from("assets").update({ name: parsed.data.name }).eq("id", id).eq("user_id", user.id);
  return error ? NextResponse.json({ errorCode: "UPDATE_FAILED" }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const asset = await ownAsset(id, user.id);
  if (!asset) return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
  const { error } = await createAdminClient().from("assets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ errorCode: "DELETE_FAILED" }, { status: 500 });
  await deletePrivateObject(asset.r2_key).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
