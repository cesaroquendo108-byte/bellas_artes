import { cn } from "@/lib/utils";
import {
  statusLabels,
  type CapabilityStatus,
} from "@/lib/landing/content";

const statusStyles: Record<CapabilityStatus, string> = {
  available: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  admin_only: "border-[#8ac7fb] bg-[#e7f1fb] text-[#084f92]",
  beta: "border-cyan-300 bg-cyan-50 text-cyan-800",
  preparing: "border-[#ffd34d]/45 bg-[#ffd34d] text-[#172740]",
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
