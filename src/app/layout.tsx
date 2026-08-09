import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bellas Artes | AI Creator Suite",
  description: "Plataforma de generación de arte con IA para Venezuela",
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
