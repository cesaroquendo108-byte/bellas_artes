import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import type { CommunityCategory, CommunityPost } from "@/lib/social/contracts";
import { CommunityPostCard } from "./community-post-card";
import { DragScroller } from "./drag-scroller";
import { communityCategoryLabels } from "./inspire-sticky-nav";

const descriptions: Record<CommunityCategory, string> = {
  "marketing-advertising": "Campañas, productos y narrativas comerciales.",
  "film-stories": "Escenas, trailers y universos cinematográficos.",
  "music-video": "Dirección visual para ritmo, performance y sonido.",
  animation: "Movimiento, ilustración y estilos animados.",
  ugc: "Contenido directo, social y centrado en personas.",
  anime: "Personajes, acción y mundos de estética anime.",
};
export function InspireCategoryRow({
  category,
  posts,
}: {
  category: CommunityCategory;
  posts: CommunityPost[];
}) {
  return (
    <section id={category} className="scroll-mt-36 py-9">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">
            {communityCategoryLabels[category]}
          </h2>
          <p className="mt-1 text-xs text-[#8d8293]">
            {descriptions[category]}
          </p>
        </div>
        <Link
          href={`/inspire?category=${category}`}
          className="flex min-w-fit items-center gap-1 text-xs text-[#6f6878] hover:text-[#6d28d9]"
        >
          Ver todo <ArrowRight className="size-3" />
        </Link>
      </div>
      {posts.length ? (
        <DragScroller>
          <div className="flex min-w-max gap-4">
            {posts.map((post) => (
              <CommunityPostCard key={post.id} post={post} />
            ))}
          </div>
        </DragScroller>
      ) : (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-[#e6ded1] text-center">
          <SearchX className="size-6 text-[#a097a4]" />
          <p className="mt-3 text-xs text-[#817887]">
            Aún no hay publicaciones aprobadas en esta categoría.
          </p>
        </div>
      )}
    </section>
  );
}
