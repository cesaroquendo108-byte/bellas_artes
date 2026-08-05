import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { Sparkles, ArrowRight, Play, Wand2, Layers, Music, Video, ChevronRight } from "lucide-react";

import { SidebarLayout } from "@/components/layout/SidebarLayout";

export default function Home() {
  const inspirations = [
    { title: "Marketing y Publicidad", desc: "Clips de campaña, tomas de producto y visuales de estilo para marcas y vendedores" },
    { title: "Películas y Relatos", desc: "Escenas cinematográficas, fotogramas y storyboards" },
    { title: "Video Musical", desc: "Visualizadores, videos líricos y portadas de álbumes" },
    { title: "Animación e Ilustración", desc: "Historias impulsadas por personajes, anime, ilustración y arte 3D" },
    { title: "UGC", desc: "Influencers IA, Contenido Generado por Usuario (UGC) y Redes Sociales" },
    { title: "Micro Drama", desc: "Melodramas intensos, giros impactantes y momentos de suspenso" },
    { title: "Anime", desc: "Retratos y videos al estilo anime, personajes" },
    { title: "Juegos y Arte Conceptual", desc: "Entornos de juego, mundos de fantasía, diseño de armas/armaduras, hojas de personaje" },
    { title: "Explicativos", desc: "Videos para explicar un producto, servicio o concepto" },
    { title: "Humor y Atmósfera", desc: "Arte cinematográfico, arte visual, imágenes panorámicas" },
  ];

  return (
    <main className="min-h-screen bg-black pb-24 flex flex-col">
      <Navbar />
      <SidebarLayout>
      <div className="pt-16">
      {/* Hot Summer Sale Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-primary text-white text-center py-2.5 px-4 text-[13px] md:text-sm font-medium mt-16 flex items-center justify-center gap-2">
        <span>🔥 ¡Oferta de Verano en los mejores modelos! Mejora tu plan antes del 7 de agosto para asegurar hasta 40% de DESCUENTO el resto de 2026</span>
        <button className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full font-bold transition ml-2">Mejorar Plan</button>
      </div>

      <Hero />
      
      {/* Promo Grid (Claude, 40% Off, MiniMax) */}
      <section className="px-4 md:px-6 max-w-[1200px] mx-auto mt-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Claude Card */}
          <div className="bg-background-neutral-soft border border-normal-border rounded-[16px] p-5 flex flex-col justify-between group cursor-pointer hover:border-normal-border-hover transition shadow-oa relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-32 h-32 opacity-20 pointer-events-none">
              <Sparkles className="w-full h-full text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white font-bold text-lg">Crea desde</span>
                <span className="text-[#ff6b6b] font-bold text-lg flex items-center gap-1"><Sparkles className="w-4 h-4"/> Claude</span>
                <span className="text-text-icon-neutral-secondary">/</span>
                <span className="text-white font-bold text-lg">ChatGPT</span>
              </div>
              <p className="text-text-icon-neutral-secondary text-sm mb-6 max-w-[90%]">
                Genera imágenes, video y personajes sin salir del chat.
              </p>
            </div>
            <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold w-max transition">
              Configurar MCP ↗
            </button>
          </div>

          {/* 40% OFF Card */}
          <div className="bg-gradient-to-br from-[#1a2f3f] to-[#0f1b29] border border-normal-border rounded-[16px] overflow-hidden group cursor-pointer hover:border-normal-border-hover transition shadow-oa relative">
            <img src="https://cdn.openart.ai/assets/internal/uploads/image_fRBhQME2_1200x675_1785398945074.webp" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" alt="Sale" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="relative h-full p-5 flex flex-col justify-end">
              <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 w-max mb-2">
                <span className="text-white text-[10px] font-bold uppercase tracking-wider">Mejora para desbloquear</span>
              </div>
              <h3 className="font-bold text-white text-xl leading-tight">Hasta 40% de DESCUENTO en los mejores modelos</h3>
            </div>
          </div>

          {/* MiniMax H3 Card */}
          <div className="bg-background-neutral-soft border border-normal-border rounded-[16px] overflow-hidden group cursor-pointer hover:border-normal-border-hover transition shadow-oa relative">
            <img src="https://cdn.openart.ai/assets/internal/uploads/image_iLDTHFIk_720x402_1782316634275.webp" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="MiniMax H3" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="relative h-full p-5 flex flex-col justify-end">
              <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 w-max mb-2">
                <span className="text-white text-[10px] font-bold uppercase tracking-wider">Desbloquea Ilimitado</span>
              </div>
              <h3 className="font-bold text-white text-lg leading-tight">MiniMax H3 Ilimitado: Crea Videos, Refina, Repite</h3>
            </div>
          </div>

        </div>
      </section>

      {/* Vibe Direct Now */}
      <section className="px-4 md:px-6 max-w-[1200px] mx-auto mb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Ambiente Directo Ahora</h2>
            <p className="text-text-icon-neutral-secondary">Elige un ambiente - El director se encarga de las tomas, cortes y sonido.</p>
          </div>
          <button className="text-text-icon-neutral-secondary hover:text-white transition flex items-center gap-1 font-medium">
            Más <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'Cortometraje', img: 'https://cdn.openart.ai/assets/internal/uploads/image_X3b0ngBP_640x480_1781525348430.webp' },
            { title: 'Video Musical', img: 'https://cdn.openart.ai/assets/internal/uploads/image_CM1nXcB__640x480_1781525348440.webp' },
            { title: 'Anuncio de Producto', img: 'https://cdn.openart.ai/assets/internal/uploads/image_66bog3Yc_720x540_1784202059856.webp' },
            { title: 'Recrear Anuncio', img: 'https://cdn.openart.ai/assets/internal/uploads/image_PsMBXGu1_640x480_1781525348693.webp' },
          ].map((item, i) => (
            <div key={i} className="group relative rounded-[16px] overflow-hidden cursor-pointer border border-normal-border aspect-[4/3]">
              <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                <span className="text-white font-bold text-lg">{item.title}</span>
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Play className="w-6 h-6 fill-current" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* OpenArt Suite */}
      <section className="px-4 md:px-6 max-w-[1200px] mx-auto mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">Suite OpenArt</h2>
          <button className="text-text-icon-neutral-secondary hover:text-white transition flex items-center gap-1 font-medium">
            Más <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'Toma Inteligente', desc: 'Hoja de storyboard + video cinematográfico', icon: Video, img: 'https://cdn.openart.ai/assets/internal/uploads/image_4OaTQFx6_1080x1080_1776885929223.webp' },
            { title: 'Recrear Anuncio', desc: 'Recrea cualquier anuncio con un nuevo producto', icon: Wand2, img: 'https://cdn.openart.ai/assets/internal/uploads/image_66bog3Yc_720x540_1784202059856.webp' },
            { title: 'VFX', desc: 'Enmascara regiones para proteger y regenerar', icon: Layers, img: 'https://cdn.openart.ai/assets/internal/feature-demos/2026-05-28/Video-InPaint-Thumbnail.webp' },
            { title: 'Crear Música', desc: 'Genera música original desde texto', icon: Music, img: 'https://cdn.openart.ai/assets/internal/uploads/image_TF9nhVdU_1080x1080_1776118140000.webp' },
          ].map((item, i) => (
            <div key={i} className="bg-background-neutral-soft border border-normal-border rounded-[16px] overflow-hidden group cursor-pointer hover:border-normal-border-hover transition">
              <div className="aspect-square relative overflow-hidden">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-4 h-4 text-text-icon-neutral-secondary" />
                  <h3 className="font-bold text-white text-[15px]">{item.title}</h3>
                </div>
                <p className="text-[13px] text-text-icon-neutral-secondary line-clamp-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest AI Models */}
      <section className="px-4 md:px-6 max-w-[1200px] mx-auto mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">Últimos Modelos de IA</h2>
          <button className="text-text-icon-neutral-secondary hover:text-white transition flex items-center gap-1 font-medium">
            Más <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'MiniMax H3', desc: 'Generación de video 2K con refinamiento iterativo', img: 'https://cdn.openart.ai/assets/internal/uploads/image_fRBhQME2_1200x675_1785398945074.webp' },
            { title: 'Seedream 5.0 Pro', desc: 'Generación avanzada de imágenes en alta resolución', img: 'https://cdn.openart.ai/assets/internal/uploads/image_4qs5elKO_874x492_1783511285134.webp' },
            { title: 'Nano Banana 2 Lite', desc: 'Generación de imágenes rápida y ligera', img: 'https://cdn.openart.ai/assets/internal/uploads/image_EenX7OkS_600x337_1782901287344.webp' },
            { title: 'Gemini Omni Flash', desc: 'Generación de video conversacional por Google', img: 'https://cdn.openart.ai/assets/internal/uploads/image_Tuv4xeLU_1024x576_1782833157395.webp' },
          ].map((item, i) => (
            <div key={i} className="group relative rounded-[16px] overflow-hidden cursor-pointer border border-normal-border aspect-[16/9]">
              <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-4">
                <h3 className="text-white font-bold text-[15px]">{item.title}</h3>
                <p className="text-[13px] text-text-icon-neutral-secondary">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Inspirations */}
      <section className="px-4 md:px-6 max-w-[1200px] mx-auto mb-20 border-t border-normal-border pt-16">
        <h2 className="text-3xl font-bold text-white mb-10 text-center">Inspiración</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inspirations.map((insp, i) => (
            <div key={i} className="bg-background-neutral-soft border border-normal-border rounded-[16px] p-6 hover:border-normal-border-hover transition group cursor-pointer flex flex-col h-full shadow-oa">
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">{insp.title}</h3>
              <p className="text-[14px] text-text-icon-neutral-secondary mb-6 flex-1">{insp.desc}</p>
              <div className="flex items-center text-[14px] font-bold text-white">
                Ver todo <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>
      </SidebarLayout>
    </main>
  );
}
