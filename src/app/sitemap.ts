import type { MetadataRoute } from "next"

import { blogPosts, tutorials } from "@/lib/content/catalog"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bellasartes-xi.vercel.app"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/inspire", "/blog", "/tutorials", "/mcp", "/privacy", "/terms"]
  const entries: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/inspire" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8,
  }))

  entries.push(
    ...blogPosts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...tutorials.map((tutorial) => ({
      url: `${siteUrl}/tutorials/${tutorial.slug}`,
      lastModified: new Date(tutorial.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  )

  return entries
}
