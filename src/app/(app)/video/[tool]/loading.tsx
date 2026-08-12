import { Skeleton } from "@/components/ui/skeleton"

export default function VideoStudioLoading() {
  return <div className="workspace-surface grid min-h-[calc(100dvh-6rem)] grid-cols-1 gap-px overflow-hidden rounded-[24px] bg-[#e6ded1] lg:grid-cols-[320px_1fr_300px]"><Skeleton className="rounded-none bg-white/80" /><Skeleton className="min-h-96 rounded-none bg-[#eee9df]" /><Skeleton className="rounded-none bg-white/80" /></div>
}
