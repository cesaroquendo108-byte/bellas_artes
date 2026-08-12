import { Skeleton } from "@/components/ui/skeleton"

export default function MediaLoading() {
  return <div className="workspace-page"><Skeleton className="h-72 rounded-[30px] bg-white/70" /><div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="aspect-square rounded-2xl bg-white/70" />)}</div></div>
}
