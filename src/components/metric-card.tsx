export function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p>{detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}</article>;
}

