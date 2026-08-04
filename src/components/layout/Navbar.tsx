'use client';
import { useState } from 'react';
import { Paintbrush, Sparkles, User, Coins, Search, Menu } from "lucide-react";
import { PricingModal } from "@/components/pricing/PricingModal";

export function Navbar() {
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#000000] border-b border-normal-border h-16 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="bg-primary/20 p-2 rounded-xl">
              <Paintbrush className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white hidden md:block">Bellas <span className="animated-gradient-text">Artes</span></span>
          </div>
          
          <div className="hidden md:flex relative group">
            <Search className="w-4 h-4 text-text-icon-neutral-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search images, videos, models..." 
              className="bg-background-neutral-soft border border-normal-border hover:border-normal-border-hover text-white text-sm rounded-full pl-10 pr-4 py-2 w-64 md:w-96 outline-none transition-all focus:border-primary/50 focus:bg-background-container"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button className="hidden md:flex items-center gap-2 bg-background-neutral-soft hover:bg-white/10 transition px-3 py-1.5 rounded-full border border-normal-border">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-text-icon-neutral-primary">0</span>
          </button>
          
          <button 
            onClick={() => setIsPricingOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-full text-sm font-bold transition shadow-oa"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upgrade</span>
          </button>
          
          <div className="w-9 h-9 rounded-full bg-background-neutral-soft flex items-center justify-center border border-normal-border cursor-pointer hover:border-normal-border-hover transition">
            <User className="w-4 h-4 text-text-icon-neutral-secondary" />
          </div>
          
          <button className="md:hidden p-2 text-text-icon-neutral-secondary">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </>
  );
}
