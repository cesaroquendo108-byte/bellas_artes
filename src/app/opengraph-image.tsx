import { ImageResponse } from "next/og";

export const alt = "Bellas Artes · De una idea a una historia visual";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "radial-gradient(circle at 78% 16%, #5b21b6 0%, transparent 34%), radial-gradient(circle at 18% 84%, #9d174d 0%, transparent 36%), #080809",
        color: "white",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: "72px 88px",
        position: "relative",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 1024, width: "100%" }}>
        <div style={{ alignItems: "center", display: "flex", fontSize: 30, fontWeight: 700, gap: 14 }}>
          <span style={{ alignItems: "center", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", borderRadius: 18, display: "flex", fontSize: 21, height: 56, justifyContent: "center", width: 56 }}>BA</span>
          Bellas Artes
        </div>
        <div style={{ fontSize: 82, fontWeight: 700, letterSpacing: -4, lineHeight: 0.98, marginTop: 62, maxWidth: 950 }}>
          De una idea a una historia visual.
        </div>
        <div style={{ color: "#b6b6c2", fontSize: 27, lineHeight: 1.4, marginTop: 34 }}>
          Imagen, video, personajes, mundos y voz en un estudio creativo diseñado para Venezuela.
        </div>
        <div style={{ color: "#f0abfc", display: "flex", fontSize: 20, marginTop: 54 }}>Acceso anticipado · bellasartes-xi.vercel.app</div>
      </div>
    </div>,
    size,
  );
}
