import type { Metadata } from "next"

export const metadata: Metadata = { title: "Términos · Bellas Artes", alternates: { canonical: "/terms" } }

export default function TermsPage() {
  return <article className="mx-auto max-w-3xl px-4 py-16 sm:px-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Legal</p><h1 className="mt-4 text-4xl font-semibold">Términos de uso</h1><p className="mt-5 text-sm leading-7 text-slate-400">Al utilizar Bellas Artes declaras que tienes derecho a subir y compartir los recursos que incorporas a la plataforma. El contenido enviado a Inspire queda sujeto a revisión administrativa antes de ser visible públicamente.</p><h2 className="mt-9 text-xl font-semibold">Uso responsable</h2><p className="mt-3 text-sm leading-7 text-slate-400">No debes publicar contenido ilegal, engañoso, abusivo ni recursos sobre los que no tengas autorización. La moderación puede rechazar u ocultar una publicación.</p><h2 className="mt-9 text-xl font-semibold">Integraciones preparadas</h2><p className="mt-3 text-sm leading-7 text-slate-400">Las superficies marcadas como no configuradas o próximamente no representan un proveedor activo ni consumen créditos.</p></article>
}
