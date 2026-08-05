'use client';
import { useState, useEffect } from 'react';
import { Sparkles, X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@supabase/supabase-js';

const packages = [
  { id: 'curioso', name: 'Curioso', priceUsd: 2, credits: 400, popular: false, description: 'Perfecto para probar y generar tus primeras ideas.' },
  { id: 'creador', name: 'Creador', priceUsd: 5, credits: 1200, popular: true, description: 'Para creadores activos que necesitan volumen constante.' },
  { id: 'agencia', name: 'Agencia', priceUsd: 15, credits: 5000, popular: false, description: 'Alto volumen para editores de video y agencias creativas.' }
];

export function PricingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [bcvRate, setBcvRate] = useState<number>(752.09);
  const [uploading, setUploading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'manual' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/bcv-rate')
        .then(res => res.json())
        .then(data => { if (data?.rate) setBcvRate(data.rate); })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPkg) return;
    
    setUploading(true);
    setPaymentStatus('idle');
    setErrorMsg('');

    try {
      // Create a dummy user ID for MVP testing since we don't have auth enforced in UI yet
      const userId = "00000000-0000-0000-0000-000000000000"; 
      
      // In a real scenario with Supabase keys configured, we would upload to storage:
      // const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      // const { data, error } = await supabase.storage.from('receipts').upload(`${userId}/${Date.now()}.png`, file);
      // const filePath = data.path;

      // Mock file path for local testing without real Supabase connection
      const mockFilePath = `mock/${Date.now()}.png`;

      // Call our API to analyze the proof
      const res = await fetch('/api/payments/analyze-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: mockFilePath,
          packageId: selectedPkg,
          userId: userId,
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        if (result.status === 'approved') setPaymentStatus('success');
        else setPaymentStatus('manual');
      } else {
        setPaymentStatus('error');
        setErrorMsg(result.error || 'Error procesando el pago');
      }
    } catch (err: any) {
      setPaymentStatus('error');
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-secondary/95 glass-panel rounded-3xl border border-white/10 p-6 overflow-hidden shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition z-10">
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-8 mt-4">
          <h2 className="text-3xl font-bold text-white mb-2">Potencia tu <span className="animated-gradient-text">Creatividad</span></h2>
          <p className="text-muted-foreground">Paga cómodamente en Bolívares vía Pago Móvil y recibe tus créditos al instante.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {packages.map((pkg) => {
            const finalBsPrice = (pkg.priceUsd * bcvRate).toFixed(2);
            return (
              <div 
                key={pkg.id} 
                onClick={() => setSelectedPkg(pkg.id)}
                className={cn(
                  "relative flex flex-col p-5 rounded-2xl cursor-pointer transition-all duration-300",
                  selectedPkg === pkg.id 
                    ? "bg-primary/20 border-2 border-primary shadow-[0_0_20px_rgba(139,92,246,0.3)] scale-[1.02]" 
                    : "bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10"
                )}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    Más Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-1">{pkg.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-extrabold text-white">${pkg.priceUsd}</span>
                  <span className="text-muted-foreground text-sm">USD</span>
                </div>
                <div className="text-sm font-medium text-green-400 mb-3 bg-green-400/10 px-2 py-1 rounded-md self-start">
                  Bs. {finalBsPrice} <span className="text-xs text-green-400/70">(Tasa BCV del día)</span>
                </div>
                <p className="text-muted-foreground text-sm flex-1">{pkg.description}</p>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-bold text-white">{pkg.credits} Créditos</span>
                </div>
              </div>
            );
          })}
        </div>

        {selectedPkg && (
          <div className="bg-black/40 rounded-2xl p-5 border border-white/5 animate-in slide-in-from-bottom-4 duration-300">
            <h4 className="text-lg font-semibold text-white mb-4">Verificación de Pago Móvil</h4>
            
            {paymentStatus === 'success' && (
              <div className="flex flex-col items-center justify-center p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
                <p className="text-green-500 font-bold text-lg">¡Pago Validado!</p>
                <p className="text-green-500/80 text-sm">Tus créditos han sido añadidos a tu cuenta.</p>
              </div>
            )}

            {paymentStatus === 'manual' && (
              <div className="flex flex-col items-center justify-center p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <AlertCircle className="w-12 h-12 text-yellow-500 mb-2" />
                <p className="text-yellow-500 font-bold text-lg">Revisión Manual Requerida</p>
                <p className="text-yellow-500/80 text-sm">La IA no pudo validar el capture, pero un humano lo verificará pronto.</p>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="flex flex-col items-center justify-center p-6 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-red-500 font-bold">{errorMsg}</p>
              </div>
            )}

            {(paymentStatus === 'idle' || paymentStatus === 'error') && (
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                <div className="flex-1 bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-sm text-muted-foreground mb-3">Transfiere a:</p>
                  <div className="grid grid-cols-2 gap-y-2 text-sm text-white font-medium">
                    <span className="text-muted-foreground">Banco:</span> <span>Banesco (0134)</span>
                    <span className="text-muted-foreground">Teléfono:</span> <span>0414-1234567</span>
                    <span className="text-muted-foreground">Cédula:</span> <span>V-12345678</span>
                    <span className="text-muted-foreground">Monto exacto:</span> 
                    <span className="text-green-400 font-bold text-lg">
                      Bs. {(packages.find(p => p.id === selectedPkg)!.priceUsd * bcvRate).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className={cn(
                    "flex flex-col items-center justify-center w-full h-full min-h-[120px] border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/5 transition",
                    uploading ? "opacity-50 pointer-events-none" : "hover:border-primary/50"
                  )}>
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      {uploading ? (
                        <>
                          <Loader2 className="w-8 h-8 text-primary mb-2 animate-spin" />
                          <p className="text-sm text-white font-medium">Validando con IA...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-primary mb-2" />
                          <p className="text-sm text-white font-medium mb-1">Subir Capture de Pago</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG (Automático con IA)</p>
                        </>
                      )}
                    </div>
                    <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
