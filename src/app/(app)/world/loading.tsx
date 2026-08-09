import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() { return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="aspect-square rounded-2xl bg-white/[0.04]" />)}</div> }
