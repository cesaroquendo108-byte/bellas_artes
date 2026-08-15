import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { privateNoStoreHeaders, requireVastAdminApiSession } from "@/lib/admin/vast-api-auth";
import { getComfyTemplateCatalogEntry } from "@/lib/generation/comfy-template-catalog";

export const runtime = "nodejs";

const templateRoot = path.join(process.cwd(), "workflows", "templates", "vendor");
const catalogPathPrefix = "workflows/templates/vendor/";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireVastAdminApiSession();
  if (!auth.ok) return auth.response;

  const template = getComfyTemplateCatalogEntry((await context.params).id);
  if (!template) {
    return NextResponse.json(
      { errorCode: "COMFY_TEMPLATE_NOT_FOUND", message: "La plantilla solicitada no existe." },
      { status: 404, headers: privateNoStoreHeaders() },
    );
  }

  try {
    const relativePath = template.localPath.slice(catalogPathPrefix.length);
    const resolvedPath = path.join(templateRoot, relativePath);
    if (!template.localPath.startsWith(catalogPathPrefix) || !resolvedPath.startsWith(`${templateRoot}${path.sep}`)) {
      return NextResponse.json(
        { errorCode: "COMFY_TEMPLATE_INVALID_PATH", message: "La ruta de la plantilla no es válida." },
        { status: 503, headers: privateNoStoreHeaders() },
      );
    }

    const file = await readFile(resolvedPath);
    const sha256 = createHash("sha256").update(file).digest("hex");
    if (sha256 !== template.sha256) {
      return NextResponse.json(
        { errorCode: "COMFY_TEMPLATE_INTEGRITY_ERROR", message: "La plantilla no superó la validación de integridad." },
        { status: 503, headers: privateNoStoreHeaders() },
      );
    }

    return new NextResponse(file, {
      status: 200,
      headers: {
        ...privateNoStoreHeaders(),
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${template.downloadFilename}"`,
        "X-Content-Type-Options": "nosniff",
        "X-Comfy-Template-Sha256": sha256,
      },
    });
  } catch {
    return NextResponse.json(
      { errorCode: "COMFY_TEMPLATE_UNAVAILABLE", message: "No se pudo leer la plantilla privada." },
      { status: 503, headers: privateNoStoreHeaders() },
    );
  }
}
