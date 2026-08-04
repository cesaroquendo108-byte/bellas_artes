import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VAST_AI_API_KEY = process.env.VAST_AI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const { prompt, type, userId } = await req.json();

    if (!prompt || !userId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const isVideo = type === 'video';
    const cost = isVideo ? 20 : 1;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Deducir créditos de forma segura con la base de datos
    const { data, error } = await supabase.rpc('deduct_credits_for_generation', {
      p_user_id: userId,
      p_cost: cost,
      p_prompt: prompt
    });

    if (error || (data && data.error)) {
      console.error("Error al deducir créditos:", error || data.error);
      return NextResponse.json({ error: 'Créditos insuficientes o error de DB' }, { status: 402 });
    }

    // 2. Simular o llamar a Vast.ai / ComfyUI real
    let outputUrl = '';
    
    if (!VAST_AI_API_KEY) {
      // Mock para pruebas sin clave de Vast.ai
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate delay
      outputUrl = `https://dummyimage.com/1024x1024/27272a/8b5cf6.png&text=${encodeURIComponent(prompt.substring(0,20))}`;
    } else {
      // Aquí iría la llamada real al endpoint de la GPU de Vast.ai
      // Ejemplo: 
      // const vastRes = await fetch('http://[tu-ip-vast]:8188/prompt', { ... });
      
      // Como no tenemos el IP exacto aún según el plan (esperando ComfyUI endpoint real), hacemos un mock:
      await new Promise(resolve => setTimeout(resolve, 2000));
      outputUrl = `https://dummyimage.com/1024x1024/27272a/8b5cf6.png&text=${encodeURIComponent(prompt.substring(0,20))}`;
    }

    return NextResponse.json({
      success: true,
      outputUrl,
      remainingCredits: data.remaining_credits,
      message: 'Generación completada'
    });

  } catch (error) {
    console.error("Error en API generate:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
