import { NextResponse } from "next/server";
import { listPortalStyles, getPortalStyle, type PortalStyleId } from "@/lib/gesture-portal/styles";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") as PortalStyleId | null;

    if (id) {
      const style = getPortalStyle(id);
      if (!style) {
        return NextResponse.json(
          { success: false, error: `El estilo de portal "${id}" no existe.` },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, style });
    }

    const styles = listPortalStyles();
    return NextResponse.json({
      success: true,
      count: styles.length,
      styles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al consultar los estilos de GesturePortal";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
