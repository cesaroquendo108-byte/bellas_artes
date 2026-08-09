import Link from "next/link";
import { AudioLines, Library, MicVocal, SlidersHorizontal } from "lucide-react";

const links = [
  { href: "/audio/tts", label: "Texto a voz", icon: AudioLines },
  { href: "/audio/voice-changer", label: "Cambiar voz", icon: MicVocal },
  { href: "/audio/my", label: "Mis audios", icon: Library },
  { href: "/video/audio", label: "Audio para video", icon: SlidersHorizontal },
];

export function AudioNav({ current }: { current: string }) {
  return <nav className="flex max-w-full gap-1 overflow-x-auto border-b border-white/[0.07] pb-3">
    {links.map((item) => <Link key={item.href} href={item.href} className={`flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition ${current === item.href ? "bg-violet-500/15 text-violet-200" : "text-slate-500 hover:bg-white/[0.04] hover:text-white"}`}><item.icon className="size-4" />{item.label}</Link>)}
  </nav>;
}

export function ProviderNotice({ setupPending, message }: { setupPending: boolean; message: string }) {
  return <div className="flex items-start gap-3 border-l-2 border-amber-400 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100">
    <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-300" />
    <div><p className="font-medium">{setupPending ? "Infraestructura pendiente de aplicar" : "Proveedor de audio no conectado"}</p><p className="mt-1 text-xs leading-5 text-amber-200/65">{setupPending ? "La interfaz está lista, pero la migración de Audio Suite aún no está aplicada en este entorno." : message} No se consumirán créditos.</p></div>
  </div>;
}
