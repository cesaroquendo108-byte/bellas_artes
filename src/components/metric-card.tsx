import { AnimatedMetric, SpotlightCard } from "@/components/ui/motion-effects";

export function MetricCard({
  label,
  value,
  numericValue,
  detail,
}: {
  label: string;
  value: string;
  numericValue?: number;
  detail?: string;
}) {
  return (
    <SpotlightCard className="rounded-2xl" contentClassName="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {typeof numericValue === "number" ? <AnimatedMetric value={numericValue} /> : value}
      </p>
      {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
    </SpotlightCard>
  );
}
