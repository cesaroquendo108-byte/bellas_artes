'use client';
import { useState } from 'react';
import { Loader2, Image as ImageIcon, Video, User, Globe, Music, Clapperboard, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Hero() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('image');

  const tabs = [
    { id: 'director', label: 'Director', icon: Clapperboard, isNew: true },
    { id: 'image', label: 'Imagen', icon: ImageIcon },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'character', label: 'Personaje', icon: User },
    { id: 'world', label: 'Mundo', icon: Globe },
    { id: 'audio', label: 'Audio', icon: Music },
  ];

  const handleGenerate = async () => {
    if (!prompt) return;
    setGenerating(true);
    setErrorMsg('');
    setResultUrl(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: activeTab })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setResultUrl(data.outputUrl);
      } else {
        setErrorMsg(data.error || 'Error generando contenido');
      }
    } catch {
      setErrorMsg('Error de conexión');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 md:px-6 max-w-[1200px] mx-auto flex flex-col items-center">
      
      <div className="relative mb-8 text-center mt-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">
          ¿Qué te gustaría crear hoy?
        </h1>
        
        <Sparkles className="absolute -top-8 -right-7 hidden h-12 w-12 text-primary/60 md:block" />
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-3 mb-10 w-full max-w-4xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3 rounded-[16px] font-medium transition-all duration-200",
              activeTab === tab.id 
                ? "bg-white text-black shadow-oa" 
                : "bg-background-neutral-soft text-text-icon-neutral-primary hover:bg-white/10 border border-normal-border"
            )}
          >
            <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-black" : "text-text-icon-neutral-secondary")} />
            {tab.label}
            {tab.isNew && (
              <span className="absolute -top-2 -right-2 bg-[#8b5cf6] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Nuevo
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="w-full max-w-3xl bg-background-neutral-soft border border-normal-border p-2 rounded-[20px] flex items-center gap-2 shadow-oa-inset transition-all focus-within:border-primary/50">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe lo que quieres generar..." 
          className="flex-1 bg-transparent border-none text-white px-4 py-3 outline-none placeholder:text-text-icon-neutral-secondary text-[15px]"
          disabled={generating}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <button 
          onClick={handleGenerate}
          disabled={generating || !prompt}
          className="bg-primary disabled:opacity-50 hover:bg-primary/90 text-white px-6 py-3 rounded-[14px] font-semibold transition flex items-center gap-2 shadow-oa"
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generar
        </button>
      </div>

      {errorMsg && (
        <p className="text-error-text mt-4 text-[13px]">{errorMsg}</p>
      )}

      {resultUrl && <p className="mt-6 text-sm text-muted-foreground">Resultado preparado.</p>}
    </div>
  );
}
