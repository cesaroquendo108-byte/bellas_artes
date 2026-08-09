import type { Metadata } from "next"
import { BlogIndex } from "@/components/public-content/blog-index"
import { blogPosts } from "@/lib/content/catalog"
export const metadata: Metadata = { title: "Bellas Artes · Blog", description: "Historias, novedades y guías para creadores con IA.", alternates: { canonical: "/blog" } }
export default function BlogPage() { return <BlogIndex posts={blogPosts.map(({ Content, ...metadata }) => { void Content; return metadata })} /> }
