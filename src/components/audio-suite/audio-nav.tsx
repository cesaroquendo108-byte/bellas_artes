import Link from "next/link";
import { AudioLines, Library, MicVocal, SlidersHorizontal } from "lucide-react";
import { StatusPill } from "@/components/ui/motion-effects";

const links = [
  { href: "/audio/tts", label: "Texto a voz", icon: AudioLines },
  { href: "/audio/voice-changer", label: "Cambiar voz", icon: MicVocal },
  { href: "/audio/my", label: "Mis audios", icon: Library },
  { href: "/video/audio", label: "Audio para video", icon: SlidersHorizontal },
];

export function AudioNav({ current }: { current: string }) {
  return <nav className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-[#e6ded1] bg-white/70 p-1.5 shadow-sm">
    {links.map((item) => <Link key={item.href} href={item.href} className={`flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${current === item.href ? "bg-violet-100 text-violet-700 shadow-sm" : "text-[#756d7c] hover:bg-white hover:text-[#4c1d95]"}`}><item.icon className="size-4" />{item.label}</Link>)}
  </nav>;
}

export function ProviderNotice({ setupPending, message }: { setupPending: boolean; message: string }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
    <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" />
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{setupPending ? "Infraestructura pendiente de aplicar" : "Proveedor de audio no conectado"}</p><StatusPill state="preparing" tone="warning" /></div><p className="mt-1 text-xs leading-5 text-amber-800">{setupPending ? "La interfaz está lista, pero la migración de Audio Suite aún no está aplicada en este entorno." : message} No se consumirán créditos.</p></div>
  </div>;
}
