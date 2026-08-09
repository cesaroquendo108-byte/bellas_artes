import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() { return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="aspect-[3/4] rounded-2xl bg-white/[0.04]" />)}</div> }
