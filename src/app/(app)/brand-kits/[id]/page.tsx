import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BrandKitEditor } from "@/components/brand-kits"
import { getBrandKitForPage } from "@/lib/brand-kits/queries"
export const metadata: Metadata = { title: "Editar Brand Kit · Bellas Artes", robots: { index: false, follow: false } }
export default async function BrandKitPage({ params }: { params: Promise<{ id: string }> }) { const kit = await getBrandKitForPage((await params).id); if (!kit) notFound(); return <div className="-m-4 sm:-m-6 lg:-m-8"><BrandKitEditor initialKit={kit} /></div> }
