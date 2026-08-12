import type { Metadata } from "next"
import { BrandKitsDashboard } from "@/components/brand-kits"
import { getBrandKitsForPage } from "@/lib/brand-kits/queries"
export const metadata: Metadata = { title: "Kits de marca · Bellas Artes", robots: { index: false, follow: false } }
export default async function BrandKitsPage() { const result = await getBrandKitsForPage(); return <BrandKitsDashboard kits={result.kits} error={result.error} /> }
