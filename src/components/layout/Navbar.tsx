'use client';
import { useState } from 'react';
import { Paintbrush, Sparkles, User, Coins } from "lucide-react";
import { PricingModal } from "@/components/pricing/PricingModal";

export function Navbar() {
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-xl">
            <Paintbrush className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Bellas <span className="animated-gradient-text">Artes</span></span>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition px-3 py-1.5 rounded-lg border border-white/10">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">0 Créditos</span>
          </button>
          <button 
            onClick={() => setIsPricingOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg font-medium transition shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Comprar Paquete</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-white/10 cursor-pointer hover:border-white/20 transition">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </nav>

      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </>
  );
}
