import type { MetadataRoute } from "next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bellasartes-xi.vercel.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/inspire", "/blog", "/tutorials", "/mcp"],
      disallow: [
        "/admin/",
        "/api/",
        "/assets",
        "/billing",
        "/brand-kits",
        "/community/publish",
        "/credits",
        "/dashboard",
        "/director",
        "/image",
        "/media",
        "/settings",
        "/story",
        "/video",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
