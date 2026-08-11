import type { Metadata } from "next";

import { LandingPage } from "@/components/landing";
import { faqs } from "@/lib/landing/content";

import "./landing-v1.css";

export const metadata: Metadata = {
  title: "Bellas Artes · Estudio creativo IA para Venezuela",
  description:
    "Crea y organiza imágenes, video, personajes, mundos y audio en una suite creativa con IA diseñada para Venezuela.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Bellas Artes · De una idea a una historia visual",
    description:
      "Imagen, video, personajes, mundos y voz en una experiencia creativa con estados claros y assets privados.",
    url: "/",
    siteName: "Bellas Artes",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bellas Artes · Estudio creativo IA",
    description: "De una idea a una historia visual.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Bellas Artes",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      inLanguage: "es-VE",
      description:
        "Suite creativa para organizar flujos de imagen, video, personajes, mundos y audio con inteligencia artificial.",
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/LimitedAvailability",
        description: "Acceso anticipado con generación restringida.",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
