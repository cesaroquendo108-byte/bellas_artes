import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { validateMediaFile } from "@/lib/audio/validation";
import { deletePrivateObject, getPrivateObjectUrl, uploadPrivateObject } from "@/lib/storage/r2";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 90) || "archivo";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File) || (kind !== "audio" && kind !== "video")) {
    return NextResponse.json({ errorCode: "INVALID_UPLOAD", message: "Selecciona un archivo compatible." }, { status: 422 });
  }
  const error = validateMediaFile(file, kind);
  if (error) return NextResponse.json({ errorCode: "INVALID_FILE", message: error }, { status: 422 });

  const key = `users/${user.id}/${kind}/${randomUUID()}-${safeName(file.name)}`;
  try {
    await uploadPrivateObject({ key, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type, metadata: { owner: user.id } });
    const admin = createAdminClient();
    const { data, error: insertError } = await admin.from("assets").insert({
      user_id: user.id,
      type: kind,
      name: file.name.slice(0, 160),
      r2_key: key,
      mime_type: file.type,
      bytes: file.size,
      metadata: { source: "audio_suite" },
    }).select("id,name,type,mime_type,created_at").single();
    if (insertError || !data) {
      await deletePrivateObject(key).catch(() => undefined);
      throw insertError ?? new Error("No se pudo registrar el archivo.");
    }
    return NextResponse.json({ asset: data, signedUrl: await getPrivateObjectUrl(key) }, { status: 201 });
  } catch {
    return NextResponse.json({ errorCode: "STORAGE_UNAVAILABLE", message: "El almacenamiento privado todavía no está configurado en este entorno." }, { status: 503 });
  }
}
