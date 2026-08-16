import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getOAuthRedirectBaseUrl } from "@/lib/auth-redirect";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(getOAuthRedirectBaseUrl()),
  title: "Bellas Artes | Suite creativa con IA",
  description: "Plataforma de generación de arte con IA para Venezuela",
  openGraph: {
    title: "Bellas Artes | Suite creativa con IA",
    description: "Imagen, video, personajes, narrativa y recursos de marca en un solo estudio creativo.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-primary/30 selection:text-white`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
