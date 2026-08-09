import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArticleFrame } from "@/components/public-content/article-frame"
import { getTutorial, tutorials } from "@/lib/content/catalog"
export function generateStaticParams() { return tutorials.map((tutorial) => ({ slug: tutorial.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const tutorial = getTutorial((await params).slug); if (!tutorial) return {}; return { title: `${tutorial.title} · Tutorials`, description: tutorial.excerpt, alternates: { canonical: `/tutorials/${tutorial.slug}` } } }
export default async function TutorialPage({ params }: { params: Promise<{ slug: string }> }) { const tutorial = getTutorial((await params).slug); if (!tutorial) notFound(); const { Content } = tutorial; return <ArticleFrame metadata={tutorial} backHref="/tutorials" backLabel="Volver a Tutorials"><Content /></ArticleFrame> }
