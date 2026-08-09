import { Skeleton } from "@/components/ui/skeleton"

export default function ImageStudioLoading() {
  return (
    <div className="-m-4 grid min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#0a0a0a] sm:-m-6 lg:-m-8 lg:grid-cols-[400px_1fr]">
      <div className="hidden space-y-5 border-r border-white/[0.06] bg-[#101012] p-5 lg:block">
        <Skeleton className="h-10 w-44 bg-white/[0.06]" />
        <Skeleton className="h-9 w-full bg-white/[0.06]" />
        <Skeleton className="h-9 w-full bg-white/[0.06]" />
        <Skeleton className="h-32 w-full bg-white/[0.06]" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-24 bg-white/[0.06]" />
          <Skeleton className="h-24 bg-white/[0.06]" />
          <Skeleton className="h-24 bg-white/[0.06]" />
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <Skeleton className="mb-6 h-10 w-full max-w-sm bg-white/[0.06]" />
        <div className="columns-2 gap-4 xl:columns-3">
          {[320, 240, 360, 280, 340, 260].map((height, index) => (
            <Skeleton key={index} className="mb-4 w-full break-inside-avoid bg-white/[0.06]" style={{ height }} />
          ))}
        </div>
      </div>
    </div>
  )
}
