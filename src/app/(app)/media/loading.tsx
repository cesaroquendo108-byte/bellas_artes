import { Skeleton } from "@/components/ui/skeleton"

export default function MediaLoading() {
  return <div className="-m-4 min-h-screen bg-[#080809] p-6 sm:-m-6 lg:-m-8"><Skeleton className="h-72 rounded-3xl bg-white/[0.04]" /><div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="aspect-square rounded-xl bg-white/[0.04]" />)}</div></div>
}
