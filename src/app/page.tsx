import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { Sparkles, ArrowRight, Play, Wand2, Layers, Music, Video, ChevronRight } from "lucide-react";

export default function Home() {
  const inspirations = [
    { title: "Marketing and Advertising", desc: "Campaign clips, product shots, and style visuals for brands and sellers" },
    { title: "Film & Stories", desc: "Cinematic scenes, stills, and storyboards" },
    { title: "Music Video", desc: "Visualizers, lyric videos, and album art" },
    { title: "Animation & Illustration", desc: "Character-driven stories, anime, illustration, and 3D art" },
    { title: "UGC", desc: "AI Influencer, UGC, Social Media Content" },
    { title: "Micro Drama", desc: "Intense melodrama, shocking twists, and cliffhangers" },
    { title: "Anime", desc: "Anime-style portraits and videos, characters" },
    { title: "Gaming and Concept Art", desc: "Game environments, fantasy worlds, weapon/armor design, character sheets, sci-fi landscapes" },
    { title: "Explainer", desc: "Videos to explain a product, service or a concept" },
    { title: "Mood and Atmosphere", desc: "Cinematic art, visual art, scenic imagery" },
  ];

  return (
    <main className="min-h-screen bg-black pb-24">
      <Navbar />
      
      {/* Hot Summer Sale Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-primary text-white text-center py-2.5 px-4 text-[13px] md:text-sm font-medium mt-16 flex items-center justify-center gap-2">
        <span>🔥 Hot Summer Sale for the hottest models! Upgrade by August 7 to lock in up to 40% OFF for the rest of 2026</span>
        <button className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full font-bold transition ml-2">Upgrade</button>
      </div>

      <Hero />
      
      {/* Create From Claude/ChatGPT Banner */}
      <section className="px-4 md:px-6 max-w-[1200px] mx-auto mt-8 mb-16">
        <div className="bg-background-neutral-soft border border-normal-border rounded-[20px] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-oa overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
          <div className="flex-1 z-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white tracking-wider uppercase">Create From Claude/ChatGPT</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Generate images, video, and characters without leaving the chat.</h2>
            <button className="bg-white text-black px-5 py-2.5 rounded-[12px] font-bold shadow-oa hover:bg-gray-100 transition">
              Set up MCP
            </button>
          </div>
          <div className="flex-1 z-10 flex justify-end">
            <img src="https://cdn.openart.ai/assets/internal/uploads/image_ZhIc8shX_874x491_1784212536451.webp" alt="Claude Integration" className="rounded-[12px] border border-normal-border shadow-oa w-full max-w-sm" />
          </div>
        </div>
      </section>

      {/* Vibe Direct Now */}
      <section className="px-4 md:px-6 max-w-[1200px] mx-auto mb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Vibe Direct Now</h2>
            <p className="text-text-icon-neutral-secondary">Pick a vibe - Director handles the shots, cuts, and sound.</p>
          </div>
          <button className="text-text-icon-neutral-secondary hover:text-white transition flex items-center gap-1 font-medium">
            More <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'Short Film', img: 'https://cdn.openart.ai/assets/internal/uploads/image_X3b0ngBP_640x480_1781525348430.webp' },
            { title: 'Music Video', img: 'https://cdn.openart.ai/assets/internal/uploads/image_CM1nXcB__640x480_1781525348440.webp' },
            { title: 'Product Ads', img: 'https://cdn.openart.ai/assets/internal/uploads/image_66bog3Yc_720x540_1784202059856.webp' },
            { title: 'Ad Remake', img: 'https://cdn.openart.ai/assets/internal/uploads/image_PsMBXGu1_640x480_1781525348693.webp' },
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

      {/* Unlock Unlimited */}
      <section className="px-4 md:px-6 max-w-[1200px] mx-auto mb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Unlock Unlimited</h2>
            <p className="text-text-icon-neutral-secondary">Up to 40% OFF for the hottest models</p>
          </div>
          <button className="text-text-icon-neutral-secondary hover:text-white transition flex items-center gap-1 font-medium">
            Upgrade to unlock <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-background-neutral-soft border border-normal-border rounded-[16px] overflow-hidden group cursor-pointer hover:border-normal-border-hover transition shadow-oa">
            <img src="https://cdn.openart.ai/assets/internal/uploads/image_iLDTHFIk_720x402_1782316634275.webp" className="w-full aspect-video object-cover" alt="MiniMax H3" />
            <div className="p-5">
              <h3 className="font-bold text-white text-[17px] mb-2">Unlimited MiniMax H3</h3>
              <p className="text-[14px] text-text-icon-neutral-secondary mb-5 h-10">Create Videos, Refine Every Detail, Repeat Until Perfect</p>
              <button className="bg-white text-black px-4 py-2.5 rounded-[10px] font-bold w-full hover:bg-gray-200 transition">Try Now</button>
            </div>
          </div>
          
          <div className="bg-background-neutral-soft border border-normal-border rounded-[16px] overflow-hidden group cursor-pointer hover:border-normal-border-hover transition shadow-oa">
            <img src="https://cdn.openart.ai/assets/internal/uploads/image_GPTImage2_1920x1080_1776806802000.webp" className="w-full aspect-video object-cover" alt="Seedance" />
            <div className="p-5">
              <h3 className="font-bold text-white text-[17px] mb-2">Seedance 2.0 Mini</h3>
              <p className="text-[14px] text-text-icon-neutral-secondary mb-5 h-10">2x Faster • 50% Cheaper</p>
              <button className="bg-white text-black px-4 py-2.5 rounded-[10px] font-bold w-full hover:bg-gray-200 transition">Try Now</button>
            </div>
          </div>
          
          <div className="bg-background-neutral-soft border border-normal-border rounded-[16px] overflow-hidden group cursor-pointer hover:border-normal-border-hover transition shadow-oa">
            <div className="w-full aspect-video bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.8)_0%,transparent_70%)]" />
              <Sparkles className="w-16 h-16 text-white/50" />
            </div>
            <div className="p-5">
              <h3 className="font-bold text-white text-[17px] mb-2">GPT Image 2.0</h3>
              <p className="text-[14px] text-text-icon-neutral-secondary mb-5 h-10">A New Era of Image Generation</p>
              <button className="bg-white text-black px-4 py-2.5 rounded-[10px] font-bold w-full hover:bg-gray-200 transition">Try Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* OpenArt Suite */}
      <section className="px-4 md:px-6 max-w-[1200px] mx-auto mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">OpenArt Suite</h2>
          <button className="text-text-icon-neutral-secondary hover:text-white transition flex items-center gap-1 font-medium">
            More <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'Smart Shot', desc: 'Storyboard sheet + cinematic video', icon: Video, img: 'https://cdn.openart.ai/assets/internal/uploads/image_4OaTQFx6_1080x1080_1776885929223.webp' },
            { title: 'Ad Remake', desc: 'Remake any ad with a new product', icon: Wand2, img: 'https://cdn.openart.ai/assets/internal/uploads/image_66bog3Yc_720x540_1784202059856.webp' },
            { title: 'VFX', desc: 'Mask regions to protect and regenerate', icon: Layers, img: 'https://cdn.openart.ai/assets/internal/feature-demos/2026-05-28/Video-InPaint-Thumbnail.webp' },
            { title: 'Create Music', desc: 'Generate original music from text', icon: Music, img: 'https://cdn.openart.ai/assets/internal/uploads/image_TF9nhVdU_1080x1080_1776118140000.webp' },
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
          <h2 className="text-3xl font-bold text-white">Latest AI Models</h2>
          <button className="text-text-icon-neutral-secondary hover:text-white transition flex items-center gap-1 font-medium">
            More <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'MiniMax H3', desc: '2K video generation with iterative refinement', img: 'https://cdn.openart.ai/assets/internal/uploads/image_fRBhQME2_1200x675_1785398945074.webp' },
            { title: 'Seedream 5.0 Pro', desc: 'Advanced high-resolution image generation', img: 'https://cdn.openart.ai/assets/internal/uploads/image_4qs5elKO_874x492_1783511285134.webp' },
            { title: 'Nano Banana 2 Lite', desc: 'Fast, lightweight image generation', img: 'https://cdn.openart.ai/assets/internal/uploads/image_EenX7OkS_600x337_1782901287344.webp' },
            { title: 'Gemini Omni Flash', desc: 'Conversational video generation by Google', img: 'https://cdn.openart.ai/assets/internal/uploads/image_Tuv4xeLU_1024x576_1782833157395.webp' },
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
        <h2 className="text-3xl font-bold text-white mb-10 text-center">Inspirations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inspirations.map((insp, i) => (
            <div key={i} className="bg-background-neutral-soft border border-normal-border rounded-[16px] p-6 hover:border-normal-border-hover transition group cursor-pointer flex flex-col h-full shadow-oa">
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">{insp.title}</h3>
              <p className="text-[14px] text-text-icon-neutral-secondary mb-6 flex-1">{insp.desc}</p>
              <div className="flex items-center text-[14px] font-bold text-white">
                See all <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
