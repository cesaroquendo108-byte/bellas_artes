import type { Metadata } from "next"
import { TutorialsIndex } from "@/components/public-content/tutorials-index"
import { tutorials } from "@/lib/content/catalog"
export const metadata: Metadata = { title: "Tutorials · Bellas Artes", description: "Guías paso a paso para crear y editar con Bellas Artes.", alternates: { canonical: "/tutorials" } }
export default function TutorialsPage() { return <TutorialsIndex tutorials={tutorials.map(({ Content, ...metadata }) => { void Content; return metadata })} /> }
