import Link from "next/link";
import {
  communityCategories,
  type CommunityCategory,
} from "@/lib/social/contracts";

const labels: Record<CommunityCategory, string> = {
  "marketing-advertising": "Marketing y publicidad",
  "film-stories": "Cine e historias",
  "music-video": "Video musical",
  animation: "Animación",
  ugc: "UGC",
  anime: "Anime",
};
export { labels as communityCategoryLabels };
export function InspireStickyNav() {
  return (
    <nav className="sticky top-16 z-40 -mx-4 overflow-x-auto border-y border-[#e6ded1] bg-[#fffdf8]/95 px-4 backdrop-blur-xl sm:-mx-7 sm:px-7">
      <div className="mx-auto flex min-w-max max-w-7xl gap-1 py-3">
        <Link
          href="/inspire"
          className="rounded-full px-4 py-2 text-xs text-[#817887] transition hover:bg-[#f8f4ff] hover:text-[#3a3342]"
        >
          Todo
        </Link>
        {communityCategories.map((category) => (
          <Link
            key={category}
            href={`/inspire?category=${category}`}
            className="rounded-full px-4 py-2 text-xs text-[#817887] transition hover:bg-[#f8f4ff] hover:text-[#3a3342]"
          >
            {labels[category]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
