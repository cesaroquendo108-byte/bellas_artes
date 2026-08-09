import Link from "next/link"
import { communityCategories, type CommunityCategory } from "@/lib/social/contracts"

const labels: Record<CommunityCategory, string> = { "marketing-advertising": "Marketing & Advertising", "film-stories": "Film & Stories", "music-video": "Music Video", animation: "Animation", ugc: "UGC", anime: "Anime" }
export { labels as communityCategoryLabels }
export function InspireStickyNav() { return <nav className="sticky top-16 z-40 -mx-4 overflow-x-auto border-y border-white/[0.07] bg-[#080809]/90 px-4 backdrop-blur-xl sm:-mx-7 sm:px-7"><div className="mx-auto flex min-w-max max-w-7xl gap-1 py-3"><Link href="/inspire" className="rounded-full px-4 py-2 text-xs text-slate-500 transition hover:bg-white/[0.05] hover:text-white">All</Link>{communityCategories.map((category) => <Link key={category} href={`/inspire?category=${category}`} className="rounded-full px-4 py-2 text-xs text-slate-500 transition hover:bg-white/[0.05] hover:text-white">{labels[category]}</Link>)}</div></nav> }
