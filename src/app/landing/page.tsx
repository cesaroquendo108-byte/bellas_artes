'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronDown, Plus, X } from 'lucide-react';
import './landing.css';

/* ─── constants ─── */
const HERO_VIDEO = 'https://cdn.openart.ai/cdn-cgi/media/mode=video,width=1280,fit=scale-down/https://cdn.openart.ai/pageforge/openart-home/media-source/v3/hero-video-replacement.mp4';
const HERO_POSTER = 'https://cdn.openart.ai/cdn-cgi/image/format=auto,width=960,fit=scale-down,dpr=1,quality=80,metadata=none,sharpen=1/pageforge/openart-home/hero-showcase/hero-frame-2-bg.webp';

const PARTNERS = [
  'Google', 'Netflix', 'Canva', 'Disney', 'Samsung', 'Roblox',
  'Adidas', 'Adobe', 'Amazon', 'Microsoft', 'Puma', 'EA',
];

const FEATURE_PILLS = [
  { label: 'Director', id: 'director' },
  { label: 'Generador de Video', id: 'video' },
  { label: 'Generador de Imágenes', id: 'image' },
  { label: 'Toma Inteligente', id: 'smart-shot' },
  { label: 'Control de Movimiento', id: 'motion' },
];

const FEATURE_MEDIA: Record<string, { video: string; poster: string; title: string; desc: string }> = {
  director: {
    video: HERO_VIDEO,
    poster: HERO_POSTER,
    title: 'Director de IA',
    desc: 'Crea cortometrajes, videos musicales y anuncios cinematográficos desde texto.',
  },
  video: {
    video: HERO_VIDEO,
    poster: HERO_POSTER,
    title: 'Generador de Video',
    desc: 'Convierte texto o imágenes en videos cinematográficos con los mejores modelos de IA.',
  },
  image: {
    video: 'https://cdn.openart.ai/cdn-cgi/media/mode=video,width=1280,fit=scale-down/https://cdn.openart.ai/pageforge/openart-home/media-source/v1/smart-shot.mp4',
    poster: 'https://cdn.openart.ai/cdn-cgi/media/mode=frame,time=1s,width=1280,fit=scale-down,format=jpg/https://cdn.openart.ai/pageforge/openart-home/media-source/v1/smart-shot.mp4',
    title: 'Generador de Imágenes',
    desc: 'Crea imágenes con más de 100 modelos de IA: Seedream 5.0, GPT Image, Grok y más.',
  },
  'smart-shot': {
    video: 'https://cdn.openart.ai/cdn-cgi/media/mode=video,width=1280,fit=scale-down/https://cdn.openart.ai/pageforge/openart-home/media-source/v1/smart-shot.mp4',
    poster: 'https://cdn.openart.ai/cdn-cgi/media/mode=frame,time=1s,width=1280,fit=scale-down,format=jpg/https://cdn.openart.ai/pageforge/openart-home/media-source/v1/smart-shot.mp4',
    title: 'Toma Inteligente',
    desc: 'Storyboard + video cinematográfico generado con IA en un solo clic.',
  },
  motion: {
    video: 'https://cdn.openart.ai/cdn-cgi/media/mode=video,width=1280,fit=scale-down/https://cdn.openart.ai/pageforge/openart-home/media-source/v1/replace-background.mp4',
    poster: 'https://cdn.openart.ai/cdn-cgi/media/mode=frame,time=1s,width=1280,fit=scale-down,format=jpg/https://cdn.openart.ai/pageforge/openart-home/media-source/v1/replace-background.mp4',
    title: 'Control de Movimiento',
    desc: 'Aplica movimiento preciso desde videos de referencia a tus creaciones.',
  },
};

const AI_MODELS = [
  { name: 'Veo 3 (Google)', desc: 'Videos cinematográficos con audio nativo generado por IA', img: 'https://cdn.openart.ai/assets/internal/uploads/image_PGRJom1C_1200x630_1776245286893.webp' },
  { name: 'GPT Image 2', desc: 'Generación de imágenes avanzada por OpenAI', img: 'https://cdn.openart.ai/assets/internal/uploads/image_SmartShot_1920x1080_1777926586860.webp' },
  { name: 'Seedream 5.0', desc: 'Imágenes hiperrealistas de alta resolución', img: 'https://cdn.openart.ai/assets/internal/uploads/image_wJ9zL0Gp_1920x750_1774504647681.webp' },
  { name: 'Seedance 2.0', desc: 'Generación de video con control de movimiento', img: 'https://cdn.openart.ai/assets/internal/uploads/image_PGRJom1C_1200x630_1776245286893.webp' },
];

const FAQ_ITEMS = [
  { q: '¿Qué es Bellas Artes IA?', a: 'Bellas Artes es una plataforma todo-en-uno para crear imágenes y videos con IA. Ya sea que quieras un anuncio de producto, un reel de TikTok, un cortometraje o un personaje virtual, puedes hacerlo todo aquí, sin software de edición especializado ni conocimientos técnicos.' },
  { q: '¿Es gratis?', a: 'Sí. Puedes empezar a crear gratis con un plan de prueba, con créditos diarios y sin tarjeta de crédito. Los planes de pago desbloquean los modelos de IA más potentes, generación de video más larga y exportaciones de mayor calidad.' },
  { q: '¿Puedo usar lo que creo para mi negocio o marca?', a: 'Sí. Eres dueño completo de lo que creas y puedes usarlo como quieras: en anuncios, en redes sociales, en trabajo para clientes, en merchandising, o donde sea. Sin regalías, sin atribución requerida.' },
  { q: '¿Qué modelos de IA usa la plataforma?', a: 'Reunimos los mejores modelos de IA en un solo lugar, incluyendo Seedream 5.0, Seedance 2.0, Google Veo 3, GPT Image 2, Sora 2, Kling 3.0, Grok Imagine, y más. En vez de pagar por varias herramientas separadas, las tienes todas bajo una sola suscripción.' },
  { q: '¿Puedo crear el mismo personaje en diferentes escenas y videos?', a: '¡Sí! Esta es una de las funciones más populares. Crea un personaje una vez y colócalo en cualquier outfit, escena o video con la misma cara y aspecto cada vez. Es como los creadores construyen influencers IA y mascotas de marca.' },
  { q: '¿Mis videos se ajustan a TikTok, Reels y YouTube?', a: 'Sí. Exportamos en todos los formatos y relaciones de aspecto que necesitas: vertical para TikTok, Reels y Shorts; panorámico para YouTube y anuncios; cuadrado para Instagram; y ratios cinematográficos para cine.' },
];

/* ─── component ─── */
export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState('director');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const featureVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    heroVideoRef.current?.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (featureVideoRef.current) {
      featureVideoRef.current.load();
      featureVideoRef.current.play().catch(() => {});
    }
  }, [activeFeature]);

  const feat = FEATURE_MEDIA[activeFeature];

  return (
    <div className="landing-page">
      {/* ══════ ANNOUNCEMENT BAR ══════ */}
      <div className="landing-announcement">
        <div className="landing-announcement-inner">
          <p>Tus Modelos Favoritos — Todos en Un Solo Lugar, con Generaciones Ilimitadas.</p>
          <a href="/" className="landing-announcement-cta">
            ¡Oferta por Tiempo Limitado hasta 27% OFF! ›
          </a>
        </div>
      </div>

      {/* ══════ NAV ══════ */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="landing-logo">
            <span className="landing-logo-icon">✦</span>
            <span className="landing-logo-text">Bellas Artes</span>
          </a>
          <div className="landing-nav-links">
            <a href="/">Herramientas IA</a>
            <a href="/">Modelos IA</a>
            <a href="/">Características</a>
            <a href="/">Precios</a>
          </div>
          <a href="/" className="landing-nav-cta">
            Empezar Gratis <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ══════ HERO ══════ */}
      <section className="landing-hero">
        <div className="landing-hero-glow" />
        <div className="landing-hero-grid-bg" />

        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            <span>Donde las Ideas</span>
            <span>se Convierten en</span>
            <span className="landing-hero-title-accent">Historias Visuales</span>
          </h1>
          <p className="landing-hero-sub">
            Tu plataforma de creación con IA todo-en-uno que da vida a personajes, historias, marcas y mundos.
          </p>
          <a href="/" className="landing-hero-cta">
            <span className="landing-hero-cta-main">Empieza a Crear Ahora</span>
            <span className="landing-hero-cta-sub">¡Es gratis! →</span>
          </a>
        </div>

        {/* Hero Video */}
        <div className="landing-hero-video-wrap">
          <div className="landing-hero-video-frame">
            <video
              ref={heroVideoRef}
              className="landing-hero-video"
              src={HERO_VIDEO}
              poster={HERO_POSTER}
              muted
              loop
              playsInline
              preload="auto"
            />
          </div>
        </div>
      </section>

      {/* ══════ SOCIAL PROOF / PARTNER LOGOS ══════ */}
      <section className="landing-social-proof">
        <p className="landing-social-proof-label">
          Amado por <strong>10M+</strong> creadores, marcas y estudios en todo el mundo
        </p>
        <div className="landing-marquee">
          <div className="landing-marquee-track">
            {[...PARTNERS, ...PARTNERS, ...PARTNERS].map((p, i) => (
              <span key={i} className="landing-partner-logo">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ FEATURES CAROUSEL ══════ */}
      <section className="landing-features">
        <h2 className="landing-section-heading">
          Todo lo que necesitas para crear contenido <span className="landing-accent">increíble</span>
        </h2>

        {/* Feature pills */}
        <div className="landing-feature-pills">
          {FEATURE_PILLS.map((pill) => (
            <button
              key={pill.id}
              className={`landing-feature-pill ${activeFeature === pill.id ? 'is-active' : ''}`}
              onClick={() => setActiveFeature(pill.id)}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Feature media */}
        <div className="landing-feature-showcase">
          <div className="landing-feature-card">
            <video
              ref={featureVideoRef}
              key={activeFeature}
              className="landing-feature-video"
              src={feat.video}
              poster={feat.poster}
              muted
              loop
              playsInline
              preload="auto"
            />
          </div>
          <div className="landing-feature-info">
            <h3>{feat.title}</h3>
            <p>{feat.desc}</p>
            <a href="/" className="landing-feature-try">
              Probar Ahora <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════ AI MODELS GRID ══════ */}
      <section className="landing-models">
        <h2 className="landing-section-heading">
          Los <span className="landing-accent">Mejores Modelos de IA</span> en Un Solo Lugar
        </h2>
        <p className="landing-section-sub">
          Más de 100 modelos de Google, OpenAI, ByteDance y más — todos bajo una sola suscripción.
        </p>

        <div className="landing-models-grid">
          {AI_MODELS.map((m, i) => (
            <div key={i} className="landing-model-card">
              <div className="landing-model-img-wrap">
                <img src={m.img} alt={m.name} loading="lazy" />
              </div>
              <div className="landing-model-info">
                <h3>{m.name}</h3>
                <p>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="landing-models-cta-row">
          <a href="/" className="landing-models-cta">
            Ver Todos los Modelos <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ══════ STATS BAND ══════ */}
      <section className="landing-stats">
        <div className="landing-stats-inner">
          <div className="landing-stat">
            <span className="landing-stat-number">10M+</span>
            <span className="landing-stat-label">Creadores</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-number">100+</span>
            <span className="landing-stat-label">Modelos de IA</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-number">500M+</span>
            <span className="landing-stat-label">Creaciones</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-number">4.9★</span>
            <span className="landing-stat-label">Calificación</span>
          </div>
        </div>
      </section>

      {/* ══════ FAQ ══════ */}
      <section className="landing-faq">
        <h2 className="landing-section-heading">Preguntas Frecuentes</h2>
        <div className="landing-faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={i}
              className="landing-faq-item"
              open={openFaq === i}
              onClick={(e) => { e.preventDefault(); setOpenFaq(openFaq === i ? null : i); }}
            >
              <summary className="landing-faq-q">
                <span>{item.q}</span>
                <span className={`landing-faq-icon ${openFaq === i ? 'is-open' : ''}`}>
                  <Plus className="w-5 h-5" />
                </span>
              </summary>
              {openFaq === i && (
                <div className="landing-faq-a">
                  <p>{item.a}</p>
                </div>
              )}
            </details>
          ))}
        </div>
      </section>

      {/* ══════ FINAL CTA ══════ */}
      <section className="landing-final-cta">
        <div className="landing-final-cta-glow" />
        <h2>¿Listo para crear algo increíble?</h2>
        <p>Empieza gratis. Sin tarjeta de crédito. Sin límites de creatividad.</p>
        <a href="/" className="landing-hero-cta">
          <span className="landing-hero-cta-main">Empieza a Crear Ahora</span>
          <span className="landing-hero-cta-sub">¡Es gratis! →</span>
        </a>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-logo-icon">✦</span>
            <span className="landing-logo-text">Bellas Artes</span>
            <p>Plataforma de creación con IA todo-en-uno.</p>
          </div>
          <div className="landing-footer-links">
            <div>
              <h4>Producto</h4>
              <a href="/">Generador de Imágenes</a>
              <a href="/">Generador de Video</a>
              <a href="/">Director IA</a>
              <a href="/">Audio IA</a>
            </div>
            <div>
              <h4>Recursos</h4>
              <a href="/">Blog</a>
              <a href="/">Tutoriales</a>
              <a href="/">API</a>
              <a href="/">Comunidad</a>
            </div>
            <div>
              <h4>Empresa</h4>
              <a href="/">Sobre Nosotros</a>
              <a href="/">Precios</a>
              <a href="/">Contacto</a>
              <a href="/">Términos</a>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>© 2026 Bellas Artes. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
