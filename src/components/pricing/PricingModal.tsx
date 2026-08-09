'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';

export function PricingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-secondary/95 glass-panel rounded-3xl border border-white/10 p-8 overflow-hidden shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition z-10">
          <X className="w-5 h-5" />
        </button>
        
        <div className="mt-4 text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h2 className="mb-3 text-3xl font-bold text-white">Planes y créditos</h2>
          <p className="mb-7 text-muted-foreground">Consulta los paquetes vigentes y reporta tu pago desde un flujo protegido.</p>
          <Link
            href="/billing"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary/90"
          >
            Ver paquetes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
