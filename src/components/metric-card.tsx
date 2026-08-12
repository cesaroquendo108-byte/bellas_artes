import { AnimatedMetric, SpotlightCard } from "@/components/ui/motion-effects";

export function MetricCard({
  label,
  value,
  numericValue,
  detail,
  icon,
  tone = "violet",
}: {
  label: string;
  value: string;
  numericValue?: number;
  detail?: string;
  icon?: React.ReactNode;
  tone?: "violet" | "fuchsia" | "cyan" | "neutral";
}) {
  return (
    <SpotlightCard className="ba-metric-card rounded-2xl" contentClassName="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="ba-metric-card__label text-sm">{label}</p>
        {icon ? <span className={`ba-metric-card__icon ba-metric-card__icon--${tone}`}>{icon}</span> : null}
      </div>
      <p className="ba-metric-card__value mt-3 text-2xl font-semibold tracking-tight">
        {typeof numericValue === "number" ? <AnimatedMetric value={numericValue} /> : value}
      </p>
      {detail && <p className="ba-metric-card__detail mt-2 text-xs">{detail}</p>}
    </SpotlightCard>
  );
}
