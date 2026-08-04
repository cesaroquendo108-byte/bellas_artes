'use client';
import { useState } from 'react';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Hero() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setGenerating(true);
    setErrorMsg('');
    setResultUrl(null);

    try {
      // Dummy user ID for local tests without auth
      const userId = "00000000-0000-0000-0000-000000000000";
      
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'image', userId })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setResultUrl(data.outputUrl);
      } else {
        setErrorMsg(data.error || 'Error generando imagen');
      }
    } catch (err) {
      setErrorMsg('Error de conexión');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
        <span className="text-sm font-medium text-white/80">Generación IA activa en Venezuela</span>
      </div>
      
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl text-white">
        Libera tu imaginación con <br className="hidden md:block" />
        <span className="animated-gradient-text">Inteligencia Artificial</span>
      </h1>
      
      <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl">
        Crea imágenes y videos espectaculares en segundos. Sin suscripciones en dólares, 
        paga fácilmente con <span className="text-white font-medium">Pago Móvil</span> y obtén tus créditos al instante.
      </p>
      
      <div className="w-full max-w-2xl bg-white/5 border border-white/10 p-2 rounded-2xl flex items-center gap-2 mb-4 backdrop-blur-md">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe la imagen que quieres generar (ej: Un turpial cyberpunk...)" 
          className="flex-1 bg-transparent border-none text-white px-4 py-3 outline-none placeholder:text-white/30"
          disabled={generating}
        />
        <button 
          onClick={handleGenerate}
          disabled={generating || !prompt}
          className="bg-primary disabled:opacity-50 hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-semibold text-lg transition flex items-center gap-2"
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          Crear
        </button>
      </div>

      {errorMsg && (
        <p className="text-red-400 font-medium mb-4">{errorMsg}</p>
      )}

      {resultUrl && (
        <div className="mt-8 p-2 bg-white/5 border border-white/10 rounded-2xl max-w-md animate-in fade-in zoom-in duration-500">
          <img src={resultUrl} alt="Generado por IA" className="rounded-xl w-full h-auto shadow-2xl" />
        </div>
      )}
    </div>
  );
}
