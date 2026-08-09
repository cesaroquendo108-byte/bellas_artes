import { Skeleton } from "@/components/ui/skeleton"

export default function DirectorLoading() { return <div className="space-y-6"><Skeleton className="h-64 rounded-3xl" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-video rounded-2xl" />)}</div></div> }
