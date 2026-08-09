import type { Metadata } from "next"

export const metadata: Metadata = { title: "Privacidad · Bellas Artes", alternates: { canonical: "/privacy" } }

export default function PrivacyPage() {
  return <article className="mx-auto max-w-3xl px-4 py-16 sm:px-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Legal</p><h1 className="mt-4 text-4xl font-semibold">Política de privacidad</h1><p className="mt-5 text-sm leading-7 text-slate-400">Bellas Artes utiliza los datos de cuenta necesarios para autenticarte, proteger tus proyectos y operar la biblioteca privada. Los assets privados no se incorporan a Inspire salvo que su propietario envíe una publicación y esta sea aprobada.</p><h2 className="mt-9 text-xl font-semibold">Contenido comunitario</h2><p className="mt-3 text-sm leading-7 text-slate-400">Las publicaciones aprobadas muestran el nombre público y avatar capturados al enviarlas. Nunca se publica el correo electrónico del autor.</p><h2 className="mt-9 text-xl font-semibold">Eliminación y retención</h2><p className="mt-3 text-sm leading-7 text-slate-400">Los recursos siguen la política de retención de la cuenta. Quitar un recurso de un Brand Kit elimina el vínculo, no necesariamente el asset original.</p></article>
}
