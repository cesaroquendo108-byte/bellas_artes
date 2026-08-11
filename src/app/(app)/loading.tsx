import { Skeleton } from "@/components/ui/skeleton"

export default function PrivateSectionLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando sección">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56 bg-white/[0.06]" />
        <Skeleton className="h-4 w-full max-w-xl bg-white/[0.04]" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/3] rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  )
}
