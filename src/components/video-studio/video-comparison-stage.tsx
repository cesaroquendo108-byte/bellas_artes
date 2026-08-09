import { ScanLine } from "lucide-react"

export function VideoComparisonStage() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-center border-l border-violet-400/50 bg-[#0d0d10]/90">
      <div className="text-center"><ScanLine className="mx-auto size-6 text-violet-300" /><p className="mt-2 text-xs text-slate-400">Resultado IA</p><p className="mt-1 text-[10px] text-slate-600">Proveedor no conectado</p></div>
    </div>
  )
}
