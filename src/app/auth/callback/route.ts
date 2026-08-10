import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Usar requestUrl.origin para redirigir localmente o en producción.
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } else {
      // Si hay error, redirige al login con el mensaje de error.
      return NextResponse.redirect(`${requestUrl.origin}/login?message=Error de autenticación`);
    }
  }

  // URL fallida o sin código
  return NextResponse.redirect(`${requestUrl.origin}/login?message=No se proporcionó código de autorización`);
}
