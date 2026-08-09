import { login, signup } from "./actions";
import { Navbar } from "@/components/layout/Navbar";
import { Sparkles, Mail, Lock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    notice?: string;
    config?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const configMissing = params.config === "missing";
  
  return (
    <main className="min-h-screen bg-black flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col justify-center items-center px-4 pt-16">
        
        <div className="w-full max-w-md bg-background-neutral-soft border border-normal-border p-8 rounded-2xl shadow-oa relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-2">Entrar a Bellas Artes</h2>
            <p className="text-text-icon-neutral-secondary text-center text-sm mb-8">
              Tu estudio de generación IA en Venezuela.
            </p>

            <form className="flex flex-col gap-4">
              <input type="hidden" name="next" value={params.next ?? ""} />
              <div>
                <label className="text-sm font-medium text-text-icon-neutral-secondary mb-1 block" htmlFor="email">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-text-icon-neutral-secondary" />
                  </div>
                  <input
                    className="w-full bg-background-neutral-soft border border-normal-border rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition"
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-icon-neutral-secondary mb-1 block" htmlFor="password">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-icon-neutral-secondary" />
                  </div>
                  <input
                    className="w-full bg-background-neutral-soft border border-normal-border rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition"
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {params?.message && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                  {params.message}
                </div>
              )}

              {params.notice && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-sm text-emerald-300">
                  {params.notice}
                </div>
              )}

              {configMissing && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-center text-sm text-amber-200">
                  La autenticación todavía no está configurada en este entorno. Comprueba las variables de Supabase.
                </div>
              )}

              <div className="flex flex-col gap-2 mt-4">
                <button
                  formAction={login}
                  disabled={configMissing}
                  className="w-full bg-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-primary/20"
                >
                  Iniciar Sesión
                </button>
                <button
                  formAction={signup}
                  disabled={configMissing}
                  className="w-full bg-transparent border border-normal-border hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition"
                >
                  Registrarme
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <p className="text-text-icon-neutral-secondary text-xs mt-8 text-center max-w-sm">
          Al iniciar sesión, aceptas nuestros Términos de Servicio y Política de Privacidad. Pagos locales seguros.
        </p>

      </div>
    </main>
  );
}
