import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArticleFrame } from "@/components/public-content/article-frame"
import { blogPosts, getBlogPost } from "@/lib/content/catalog"
export function generateStaticParams() { return blogPosts.map((post) => ({ slug: post.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const post = getBlogPost((await params).slug); if (!post) return {}; return { title: `${post.title} · Bellas Artes`, description: post.excerpt, alternates: { canonical: `/blog/${post.slug}` }, openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.publishedAt } } }
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) { const post = getBlogPost((await params).slug); if (!post) notFound(); const { Content } = post; return <ArticleFrame metadata={post} backHref="/blog" backLabel="Volver al Blog"><Content /></ArticleFrame> }
