import { Skeleton } from "@/components/ui/skeleton"

export default function VideoStudioLoading() {
  return <div className="-m-4 grid min-h-[calc(100dvh-1rem)] grid-cols-1 gap-px bg-white/[0.05] sm:-m-6 lg:-m-8 lg:grid-cols-[320px_1fr_300px]"><Skeleton className="rounded-none bg-[#0d0d10]" /><Skeleton className="min-h-96 rounded-none bg-[#09090b]" /><Skeleton className="rounded-none bg-[#0d0d10]" /></div>
}
