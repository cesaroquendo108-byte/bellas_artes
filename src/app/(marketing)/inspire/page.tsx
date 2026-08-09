import type { Metadata } from "next"
import { InspireFeed } from "@/components/social"
import { communityCategories, type CommunityCategory } from "@/lib/social/contracts"
import { getPublishedPostsForPage } from "@/lib/social/posts"
export const metadata: Metadata = { title: "Inspire · Bellas Artes", description: "Galería pública de creaciones aprobadas por la comunidad.", alternates: { canonical: "/inspire" } }
export default async function InspirePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) { const category = (await searchParams).category; const selectedCategory = communityCategories.includes(category as CommunityCategory) ? category as CommunityCategory : undefined; const result = await getPublishedPostsForPage({ category: selectedCategory, limit: selectedCategory ? 24 : 40 }); return <InspireFeed key={selectedCategory ?? "all"} posts={result.posts} nextCursor={result.nextCursor} error={result.error} selectedCategory={selectedCategory} /> }
