import { cn } from "@/lib/utils";
import {
  statusLabels,
  type CapabilityStatus,
} from "@/lib/landing/content";

const statusStyles: Record<CapabilityStatus, string> = {
  available: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  admin_only: "border-violet-300/20 bg-violet-400/10 text-violet-200",
  beta: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
  preparing: "border-white/10 bg-white/[0.05] text-zinc-400",
};

export function CapabilityStatusBadge({
  status,
  className,
}: {
  status: CapabilityStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide",
        statusStyles[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
