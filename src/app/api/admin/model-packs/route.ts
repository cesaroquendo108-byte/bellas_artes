import { NextResponse } from "next/server";
import {
  listModelPacks,
  getModelPack,
  generateProvisioningScript,
  type ModelPackId,
} from "@/lib/generation/model-packs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") as ModelPackId | null;
    const generateScript = url.searchParams.get("script") === "true";
    const modelsDir = url.searchParams.get("modelsDir") || undefined;

    if (id) {
      const pack = getModelPack(id);
      if (!pack) {
        return NextResponse.json(
          { success: false, error: `El paquete de modelos "${id}" no existe.` },
          { status: 404 },
        );
      }

      let script: string | undefined;
      if (generateScript) {
        script = generateProvisioningScript(id, modelsDir);
      }

      return NextResponse.json({
        success: true,
        pack,
        script,
      });
    }

    const packs = listModelPacks();
    return NextResponse.json({
      success: true,
      count: packs.length,
      packs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al consultar los paquetes de modelos";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
